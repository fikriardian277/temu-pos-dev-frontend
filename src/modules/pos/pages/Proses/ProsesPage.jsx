import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  QrCode,
  Search,
  Smartphone,
  X,
  CheckCircle,
  PackageCheck,
} from "lucide-react"; // Tambah icon baru
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog"; // Import Dialog standard

// Import Komponen Pendukung
import QRScannerAction from "./components/QRScannerAction";
import {
  PaymentDialog,
  StartWashingDialog,
  VerifyQtyDialog,
} from "./components/ActionDialogs";

function ProsesPage() {
  const { authState } = useAuth();

  // State Data
  const [transaksi, setTransaksi] = useState([]);
  const [loading, setLoading] = useState(true);

  // State Modal & Aksi
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isWashingModalOpen, setIsWashingModalOpen] = useState(false);
  const [isVerifyQtyOpen, setIsVerifyQtyOpen] = useState(false);

  // State Modal Konfirmasi Baru
  const [isConfirmFinishOpen, setIsConfirmFinishOpen] = useState(false);
  const [confirmActionType, setConfirmActionType] = useState(null); // 'ready_pickup' atau 'complete'

  const [currentTx, setCurrentTx] = useState(null);

  // State Search Manual (Live Search)
  const [manualSearch, setManualSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // --- DATA FETCHING (BACKGROUND) ---
  const fetchData = useCallback(async () => {
    if (!authState.business_id) return;
    try {
      // Load SEMUA active orders
      const { data, error } = await supabase.rpc("get_active_orders", {
        p_business_id: authState.business_id,
        p_role: authState.role,
        p_branch_id: authState.branch_id,
        p_search_term: "",
      });
      if (error) throw error;
      setTransaksi(data || []);
    } catch (err) {
      console.error("Background sync error:", err);
    } finally {
      setLoading(false);
    }
  }, [authState.business_id, authState.role, authState.branch_id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // --- HANDLER UPDATE STATUS ---
  const handleUpdateStatus = async (txId, newStatus) => {
    const id = typeof txId === "object" ? txId.id : txId;
    const toastId = toast.loading("Mengupdate status...");

    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ process_status: newStatus })
        .eq("id", id)
        .select("*, customers(name), order_items(*, packages(name, unit))")
        .single();

      if (error) throw error;

      setTransaksi((prev) => prev.map((t) => (t.id === id ? data : t)));

      toast.dismiss(toastId);
      if (newStatus === "Siap Diambil") {
        toast.success("✅ Order siap diambil!");
      } else {
        toast.success(`Status berubah: ${newStatus}`);
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Gagal update: " + error.message);
    } finally {
      setIsVerifyQtyOpen(false);
      setIsConfirmFinishOpen(false); // Tutup modal konfirmasi
    }
  };

  // --- LOGIC CONFIRM START WASHING ---
  const confirmStartWashing = async (txId, updateData) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", txId);
      if (error) throw error;
      toast.success("🚀 Proses Cuci Dimulai!");
      setTransaksi((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, ...updateData } : t)),
      );
    } catch (e) {
      toast.error("Gagal update: " + e.message);
    } finally {
      setIsWashingModalOpen(false);
    }
  };

  // --- LOGIC PELUNASAN ---
  const handleSelesaikan = (tx) => {
    if (tx.payment_status === "Belum Lunas") {
      setCurrentTx(tx);
      setIsPaymentModalOpen(true);
    } else {
      // Jika sudah lunas, tampilkan modal konfirmasi dulu sebelum finalize
      setCurrentTx(tx);
      setConfirmActionType("complete");
      setIsConfirmFinishOpen(true);
    }
  };

  const finalizeOrder = async (txId, paymentData = {}) => {
    const toastId = toast.loading("Memproses pelunasan...");

    try {
      // 1. Tentukan Metode Bayar
      const method = paymentData.payment_method || "Cash";

      // 2. PANGGIL RPC BACKEND BUAT LUNASIN DUITNYA
      const { error: paymentError } = await supabase.rpc(
        "settle_order_payment",
        {
          p_order_id: txId,
          p_payment_method: method,
          p_user_id: authState.user.id,
        },
      );

      if (paymentError) throw paymentError;

      // 3. [TAMBAHAN BARU] OTOMATIS UBAH STATUS PROSES JADI "SELESAI" DI DATABASE
      const { error: statusError } = await supabase
        .from("orders")
        .update({ process_status: "Selesai" })
        .eq("id", txId);

      if (statusError) throw statusError;

      toast.success("🎉 Order Lunas & Selesai Diambil!");

      // 4. Hapus order dari daftar transaksi aktif di layar (karena udah beres)
      setTransaksi((prev) => prev.filter((t) => t.id !== txId));
    } catch (error) {
      console.error(error);
      toast.error("Gagal pelunasan: " + error.message);
    } finally {
      toast.dismiss(toastId);
      setIsPaymentModalOpen(false);
      setIsConfirmFinishOpen(false);
    }
  };

  // --- 1. HANDLE LIVE SEARCH ---
  const handleSearchInput = (e) => {
    const keyword = e.target.value;
    setManualSearch(keyword);

    if (keyword.length < 2) {
      setSearchResults([]);
      return;
    }

    const lowerKey = keyword.toLowerCase();
    const results = transaksi.filter(
      (t) =>
        t.invoice_code.toLowerCase().includes(lowerKey) ||
        t.customers?.name?.toLowerCase().includes(lowerKey),
    );
    setSearchResults(results);
  };

  // --- 2. EXECUTE ACTION (DIPANGGIL SAAT PILIH ITEM / SCAN) ---
  const processSelectedOrder = async (txPartial) => {
    // Bersihkan pencarian
    setManualSearch("");
    setSearchResults([]);

    if (!txPartial) {
      toast.error("❌ Order tidak ditemukan.");
      return;
    }

    // --- FITUR BARU: FETCH DETAIL ON DEMAND ---
    // Kita tarik data lengkap (termasuk paket & unit) biar modal gak kosong
    const toastId = toast.loading("Memuat detail order...");

    try {
      // KITA GUNAKAN WILDCARD (*) BIAR SEMUA ID RELASI KEPANGGIL
      const { data: fullTx, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          customers (name, phone_number),
          order_items (
            *, 
            packages (
              *,
              services (name) 
            ) 
          )
        `,
        )
        .eq("id", txPartial.id)
        .single();

      if (error) throw error;

      toast.dismiss(toastId);

      // Pakai data yang baru ditarik (fullTx), bukan data parsial dari list
      const tx = fullTx;

      // Router Aksi Berdasarkan Status
      switch (tx.process_status) {
        case "Diterima":
          setCurrentTx(tx);
          setIsWashingModalOpen(true);
          break;

        case "Proses Cuci":
          setCurrentTx(tx);
          // Set tipe konfirmasi (Siap Diambil)
          setConfirmActionType("ready_pickup");
          setIsVerifyQtyOpen(true);
          break;

        case "Siap Diambil":
        case "Proses Pengantaran":
          handleSelesaikan(tx);
          break;

        default:
          toast.warning(
            `Status ${tx.process_status} tidak punya aksi otomatis.`,
          );
      }
    } catch (err) {
      toast.dismiss(toastId);
      console.error("Gagal load detail:", err);
      toast.error("Gagal memuat detail barang.");
    }
  };

  const handleScanResult = (invoiceCode) => {
    const tx = transaksi.find((t) => t.invoice_code === invoiceCode);
    if (!tx) {
      toast.error("QR Code tidak dikenali di daftar aktif.");
      return;
    }
    processSelectedOrder(tx);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Diterima":
        return "bg-slate-200 text-slate-700";
      case "Proses Cuci":
        return "bg-blue-100 text-blue-700";
      case "Siap Diambil":
        return "bg-green-100 text-green-700";
      case "Proses Pengantaran":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100";
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200 overflow-visible relative">
        <CardContent className="flex flex-col items-center pt-10 pb-10 px-6 text-center space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              Scan Production
            </h1>
            <p className="text-sm text-slate-500">
              Scan QR Struk atau Cari Manual di bawah
              <br />
              untuk update status order.
            </p>
          </div>

          {/* Tombol Scan Gede */}
          <div className="w-full transform transition-transform active:scale-95">
            <div className="scale-125 origin-center">
              <QRScannerAction onScanResult={handleScanResult} />
            </div>
            <p className="text-xs text-slate-400 mt-6">
              Tekan tombol di atas untuk membuka kamera
            </p>
          </div>

          <div className="relative w-full py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">
                Atau cari manual
              </span>
            </div>
          </div>

          {/* INPUT MANUAL + DROPDOWN HASIL */}
          <div className="w-full relative">
            <div className="flex w-full gap-2 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ketik Nama / Invoice..."
                className="pl-9"
                value={manualSearch}
                onChange={handleSearchInput}
                autoComplete="off"
              />
              {manualSearch && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 h-9 w-9"
                  onClick={() => {
                    setManualSearch("");
                    setSearchResults([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* DROPDOWN HASIL PENCARIAN */}
            {manualSearch.length >= 2 && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-lg shadow-lg border border-slate-200 max-h-60 overflow-y-auto z-50 text-left">
                {searchResults.length > 0 ? (
                  searchResults.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => processSelectedOrder(tx)}
                      className="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors flex justify-between items-center group"
                    >
                      <div>
                        <p className="font-bold text-sm text-slate-800">
                          {tx.customers?.name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {tx.invoice_code}
                        </p>
                      </div>
                      <Badge
                        className={`${getStatusColor(
                          tx.process_status,
                        )} border-0 group-hover:bg-white`}
                      >
                        {tx.process_status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-slate-400">
                    Tidak ditemukan order aktif.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-4 py-2 rounded-full">
            <Smartphone className="h-3 w-3" />
            <span>
              {loading
                ? "Menyinkronkan data..."
                : `${transaksi.length} Order Aktif dalam antrian`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* --- MODALS --- */}

      {/* 1. Modal Pelunasan (Sudah ada) */}
      <PaymentDialog
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        transaction={currentTx}
        onConfirm={finalizeOrder}
      />

      {/* 2. Modal Start Washing (Updated di ActionDialogs nanti) */}
      <StartWashingDialog
        isOpen={isWashingModalOpen}
        onClose={() => setIsWashingModalOpen(false)}
        transaction={currentTx}
        onConfirm={confirmStartWashing}
      />

      {/* 3. Modal Verify Qty (Updated di ActionDialogs nanti) */}
      <VerifyQtyDialog
        isOpen={isVerifyQtyOpen}
        onClose={() => setIsVerifyQtyOpen(false)}
        transaction={currentTx}
        onConfirm={handleUpdateStatus}
      />

      {/* 4. MODAL BARU: Konfirmasi Selesai / Diambil (Jika sudah lunas) */}
      <Dialog open={isConfirmFinishOpen} onOpenChange={setIsConfirmFinishOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmActionType === "complete" ? (
                <>
                  <PackageCheck className="text-green-600" /> Pesanan Diambil?
                </>
              ) : (
                <>
                  <CheckCircle className="text-blue-600" /> Selesai Cuci?
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Konfirmasi perubahan status untuk pesanan ini.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Pelanggan</span>
              <span className="font-bold text-slate-800">
                {currentTx?.customers?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Invoice</span>
              <span className="font-mono text-slate-700">
                {currentTx?.invoice_code}
              </span>
            </div>
            <div className="border-t border-slate-200 my-2 pt-2">
              <p className="text-xs text-slate-500 mb-1">Item:</p>
              <ul className="text-sm font-medium list-disc pl-4 space-y-1">
                {currentTx?.order_items?.map((item, idx) => (
                  <li key={idx}>
                    {item.quantity} {item.packages?.unit} {item.packages?.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setIsConfirmFinishOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => {
                // 👇 FIX NYA DI SINI BRE 👇
                if (confirmActionType === "complete") {
                  // KARENA UDAH LUNAS: Langsung update status prosesnya aja jadi Selesai.
                  // JANGAN panggil finalizeOrder() biar gak nabrak RPC pembayaran.
                  handleUpdateStatus(currentTx.id, "Selesai");
                } else {
                  // Untuk kasus lain (misalnya konfirmasi Siap Diambil)
                  handleUpdateStatus(currentTx.id, "Selesai");
                }
              }}
            >
              Ya, Konfirmasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProsesPage;
