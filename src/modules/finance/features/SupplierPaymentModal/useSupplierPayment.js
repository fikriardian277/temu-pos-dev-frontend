import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { toast } from "sonner";

export const useSupplierPayment = (
  payableData,
  poData,
  authState,
  onSuccess,
  onClose,
) => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);

  // Tentukan Mode: Advance (DP) atau Settlement (Pelunasan)
  const mode = poData ? "advance" : "settlement";
  // const targetData = poData || payableData; // (Tidak dipakai di logic bawah, tapi biarkan jika butuh)

  // Form State
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [accountId, setAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [amountToPay, setAmountToPay] = useState(0);
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState(null);

  // Helper Base64
  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  useEffect(() => {
    const initData = async () => {
      if (!authState.business_id) return;

      // 1. Load Akun (Hanya Akun Aktif)
      const { data: accData } = await supabase
        .schema("finance")
        .from("accounts")
        .select("id, name, type:account_type")
        .eq("business_id", authState.business_id)
        .eq("is_active", true);
      setAccounts(accData || []);

      // Default Amount Logic
      if (mode === "settlement" && payableData) {
        setAmountToPay(payableData.remaining_amount || 0);
      } else if (mode === "advance" && poData) {
        // Default ke nominal DP yang diminta, atau 0
        setAmountToPay(poData.dp_amount || 0);
      }
    };
    initData();
  }, [authState.business_id, payableData, poData, mode]);

  const handleSubmit = async () => {
    // 1. VALIDASI INPUT
    if (!accountId) return toast.error("Pilih akun pembayaran.");
    if (amountToPay <= 0) return toast.error("Nominal tidak valid.");

    // Validasi Sisa Hutang (Mode Pelunasan)
    if (
      mode === "settlement" &&
      amountToPay > (payableData.remaining_amount || 0)
    ) {
      return toast.error("Pembayaran melebihi sisa hutang.");
    }
    // Validasi Total PO (Mode DP)
    if (mode === "advance" && amountToPay > (poData.total_amount || 0)) {
      return toast.error("DP tidak boleh melebihi total nilai PO.");
    }

    setLoading(true);
    try {
      let proofUrl = "";

      // 2. UPLOAD BUKTI (DYNAMIC SETTINGS)
      if (proofFile) {
        // --- AMBIL PENGATURAN DARI AUTHSTATE ---
        const settings = authState.pengaturan || {};
        const GAS_UPLOAD_URL = settings.link_invoice_script;

        // Prioritas Folder: Supplier Payment -> Fallback ke Expense -> Fallback Kosong
        let TARGET_FOLDER_ID =
          settings.supplier_payment_drive_folder_id ||
          settings.expense_drive_folder_id;

        // Validasi Link Script
        if (!GAS_UPLOAD_URL) {
          throw new Error("Link Script Upload belum disetting di Pengaturan!");
        }

        // Bersihkan ID Folder (Jaga-jaga user paste link lengkap)
        if (TARGET_FOLDER_ID && TARGET_FOLDER_ID.includes("folders/")) {
          const parts = TARGET_FOLDER_ID.split("folders/");
          if (parts.length > 1) {
            TARGET_FOLDER_ID = parts[1].split("?")[0];
          }
        }

        toast.info("Mengupload bukti...");
        const base64Str = await toBase64(proofFile);

        const response = await fetch(GAS_UPLOAD_URL, {
          method: "POST",
          body: JSON.stringify({
            filename: `supp_pay_${Date.now()}_${proofFile.name}`,
            mimeType: proofFile.type,
            base64: base64Str,
            folderType: "supplier_payment", // Folder type identifier
            targetFolderId: TARGET_FOLDER_ID, // ID Folder Dinamis
          }),
        });

        const result = await response.json();
        if (result.status === "success") {
          proofUrl = result.url;
        } else {
          throw new Error("Gagal upload bukti: " + result.message);
        }
      }

      // Gabungkan Notes dengan Link Bukti (Opsional, kalau mau di notes juga)
      // Tapi biasanya proofUrl dikirim terpisah kalau RPC support,
      // berhubung RPC lama lu simpan di notes/proof_url, kita sesuaikan.

      // Catatan: Function 'pay_supplier_debt' dan 'process_bill_payment' di database
      // mungkin punya parameter p_proof_url atau tidak.
      // Kalau tidak punya, triknya simpan di notes.
      // Kalau punya, kirim ke parameter tsb.

      // Asumsi code lama lu nyimpen url di notes atau logic rpc handling.
      // Di kode lama lu: const finalNotes = notes + (proofUrl ? ` [Bukti: ${proofUrl}]` : "");
      // Kita pertahankan cara itu biar aman (backward compatible).
      const finalNotes = notes + (proofUrl ? ` [Bukti: ${proofUrl}]` : "");

      // 3. EKSEKUSI RPC SESUAI MODE & TIPE DATA
      let rpcName = "";
      let payload = {};

      if (mode === "advance") {
        // --- KASUS A: BAYAR DP PO ---
        rpcName = "pay_po_dp";
        payload = {
          p_po_id: poData.id,
          p_account_id: parseInt(accountId),
          p_amount: parseFloat(amountToPay),
          p_user_id: authState.user.id,
          p_business_id: authState.business_id,
          // Tambahan jika RPC 'pay_po_dp' support parameter url
          // p_proof_url: proofUrl
        };
      } else {
        // --- KASUS B: BAYAR HUTANG (AP) ---

        // CEK JENIS TAGIHAN DARI VIEW (Asset vs Inventory)
        if (payableData.reference_type === "asset_request") {
          // >>> 1. BAYAR ASET (Bills) <<<
          rpcName = "process_bill_payment";
          payload = {
            p_bill_id: payableData.id,
            p_payment_amount: parseFloat(amountToPay),
            p_payment_account_id: parseInt(accountId),
            p_payment_date: paymentDate,
            p_notes: finalNotes, // Bukti masuk ke notes
            p_user_id: authState.user.id,
          };
        } else {
          // >>> 2. BAYAR STOK/GR (Payables) <<<
          rpcName = "pay_supplier_debt";
          payload = {
            p_payable_id: payableData.id,
            p_account_id: parseInt(accountId),
            p_amount: parseFloat(amountToPay),
            p_payment_date: paymentDate,
            p_notes: finalNotes, // Bukti masuk ke notes
            p_user_id: authState.user.id,
            p_business_id: authState.business_id,
          };
        }
      }

      // 4. TEMBAK KE SUPABASE
      console.log(`Calling RPC: ${rpcName}`, payload);
      const { error } = await supabase.rpc(rpcName, payload);

      if (error) throw error;

      toast.success(
        mode === "advance" ? "DP Berhasil Dibayar!" : "Pelunasan Berhasil!",
      );
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Payment Error:", err);
      toast.error("Gagal memproses pembayaran: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    mode,
    // targetData, // Unused tapi biarkan
    loading,
    accounts,
    paymentDate,
    setPaymentDate,
    accountId,
    setAccountId,
    paymentMethod,
    setPaymentMethod,
    amountToPay,
    setAmountToPay,
    notes,
    setNotes,
    proofFile,
    setProofFile,
    handleSubmit,
  };
};
