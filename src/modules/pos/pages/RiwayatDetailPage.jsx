// src/pages/RiwayatDetailPage.jsx (VERSI FINAL & INTEGRASI REQUEST VOID/REFUND)

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Struk from "@/components/struk/Struk";

import { toast } from "sonner";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import {
  Loader2,
  Printer,
  MessageSquare,
  AlertTriangle,
  History,
  Ban,
  XCircle,
} from "lucide-react"; // Tambah Icon
import { Badge } from "@/components/ui/Badge.jsx";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog.jsx";
import { Label } from "@/components/ui/Label.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/Radio-group"; // Tambah RadioGroup

const formatRupiah = (value) => Number(value ?? 0).toLocaleString("id-ID");

export default function RiwayatDetailPage() {
  const { kode_invoice } = useParams();
  const navigate = useNavigate();
  const { authState } = useAuth();

  const [transaksi, setTransaksi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // STATE UNTUK REQUEST VOID/REFUND
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [cancelType, setCancelType] = useState("void"); // 'void' atau 'refund'
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // STATE UNTUK WA
  const [loadingWA, setLoadingWA] = useState(false);

  // ==========================================================
  // FETCH DATA
  // ==========================================================
  const fetchDetail = useCallback(async () => {
    if (!kode_invoice || !authState.business_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      let query = supabase
        .from("orders")
        .select(
          `
          *, 
          tipe_order, 
          pickup_date, 
          customers!inner(id, name, tipe_pelanggan, id_identitas_bisnis, phone_number), 
          branches(id, name, address, phone_number), 
          order_items(*, packages(*, services(name)))
        `
        )
        .eq("invoice_code", kode_invoice)
        .eq("business_id", authState.business_id);

      if (authState.role !== "owner") {
        query = query.eq("branch_id", authState.branch_id);
      }
      const { data, error } = await query.single();
      if (error) throw error;
      setTransaksi(data);
    } catch (err) {
      console.error("Gagal ambil detail:", err);
      setError("Gagal memuat detail transaksi atau transaksi tidak ditemukan.");
    } finally {
      setLoading(false);
    }
  }, [
    kode_invoice,
    authState.business_id,
    authState.role,
    authState.branch_id,
  ]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // ==========================================================
  // HANDLE REQUEST CANCELLATION (VOID/REFUND)
  // ==========================================================
  const handleOpenRequestModal = () => {
    setCancelType("void"); // Default
    setCancelReason("");
    setRequestModalOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!cancelReason.trim())
      return toast.error("Wajib isi alasan pembatalan!");

    setIsSubmittingCancel(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          cancellation_status: "requested",
          cancellation_type: cancelType,
          cancellation_reason: cancelReason,
          cancellation_requested_at: new Date(),
          cancellation_requested_by: authState.user.id,
        })
        .eq("id", transaksi.id);

      if (error) throw error;

      toast.success("Pengajuan pembatalan terkirim. Menunggu Approval Owner.");
      setRequestModalOpen(false);
      fetchDetail(); // Refresh data biar status berubah di UI
    } catch (error) {
      toast.error("Gagal mengajukan pembatalan: " + error.message);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // ==========================================================
  // FITUR LAIN (PRINT & WA)
  // ==========================================================
  const handleBukaPrintTab = () => {
    if (!transaksi) {
      toast.error("Data detail transaksi tidak ditemukan.");
      return;
    }
    const dataToPrint = {
      detailTransaksiSukses: transaksi,
      authStatePengaturan: authState.pengaturan,
    };
    sessionStorage.setItem("dataStrukToPrint", JSON.stringify(dataToPrint));
    window.open("/print-struk", "_blank");
  };

  const handleKirimWA = async () => {
    if (!transaksi || loadingWA) return;
    setLoadingWA(true);

    try {
      const { data, error } = await supabase.rpc("generate_wa_message", {
        payload: {
          invoice_code: transaksi.invoice_code,
          tipe_pesan: "struk",
        },
      });

      if (error) throw error;
      if (data.message) throw new Error(data.message);

      const { pesan, nomor_hp } = data;
      const nomorHPNormalized = (nomor_hp || "").trim();
      if (!nomorHPNormalized) {
        toast.error("Nomor HP pelanggan tidak ditemukan atau tidak valid.");
        setLoadingWA(false);
        return;
      }

      const nomorHPFormatted = nomorHPNormalized.startsWith("0")
        ? "62" + nomorHPNormalized.substring(1)
        : nomorHPNormalized;

      const url = `https://api.whatsapp.com/send?phone=${nomorHPFormatted}&text=${encodeURIComponent(
        pesan
      )}`;

      window.open(url, "_blank");
    } catch (error) {
      console.error("DEBUG kirimWA:", error);
      toast.error(error.message || "Gagal membuat pesan WA.");
    } finally {
      setLoadingWA(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="p-4 text-center">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Kembali
        </Button>
      </div>
    );

  if (!transaksi)
    return (
      <div className="p-4 text-center">
        <p>Tidak ada data transaksi ditemukan.</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Kembali
        </Button>
      </div>
    );

  return (
    <div className="space-y-6 p-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Detail Transaksi</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            ← Kembali
          </Button>

          <Button
            variant="outline"
            onClick={handleBukaPrintTab}
            disabled={!transaksi || transaksi.cancellation_status === "void"} // Disable kalau sudah void
          >
            <Printer className="mr-2 h-4 w-4" />
            Cetak Struk
          </Button>

          <Button
            variant="default"
            onClick={handleKirimWA}
            disabled={loadingWA || transaksi.cancellation_status === "void"} // Disable kalau sudah void
          >
            {loadingWA ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim...
              </>
            ) : (
              <>
                <MessageSquare className="mr-2 h-4 w-4" /> Kirim WA
              </>
            )}
          </Button>

          {/* TOMBOL REQUEST PEMBATALAN (Hanya muncul jika status normal) */}
          {(transaksi.cancellation_status === "normal" ||
            !transaksi.cancellation_status ||
            transaksi.cancellation_status === "rejected") && (
            <Button variant="destructive" onClick={handleOpenRequestModal}>
              <AlertTriangle className="mr-2 h-4 w-4" /> Ajukan Pembatalan
            </Button>
          )}
        </div>
      </div>

      {/* 1. INDIKATOR MENUNGGU */}
      {transaksi.cancellation_status === "requested" && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md flex items-center gap-3 text-yellow-800 mb-4">
          <History className="h-6 w-6" />
          <div>
            <p className="font-bold">Menunggu Approval</p>
            <p className="text-sm">
              Permintaan {transaksi.cancellation_type?.toUpperCase()} sedang
              ditinjau.
            </p>
          </div>
        </div>
      )}

      {/* 2. INDIKATOR DITOLAK (INI YANG BARU) */}
      {transaksi.cancellation_status === "rejected" && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md flex flex-col gap-2 text-red-800 mb-4">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6" />
            <div>
              <p className="font-bold">Permintaan Ditolak</p>
              <p className="text-sm">Silakan ajukan ulang jika perlu.</p>
            </div>
          </div>
          {transaksi.cancellation_rejection_reason && (
            <div className="bg-white/50 p-2 rounded text-sm italic border border-red-100 ml-9">
              "Pesan Finance: {transaksi.cancellation_rejection_reason}"
            </div>
          )}
        </div>
      )}

      {/* 3. INDIKATOR DISETUJUI */}
      {(transaksi.cancellation_status === "approved" ||
        transaksi.payment_status === "Void" ||
        transaksi.payment_status === "Refunded") && (
        <div className="bg-slate-100 border border-slate-300 p-4 rounded-md flex items-center gap-3 text-slate-700 mb-4">
          <Ban className="h-6 w-6" />
          <div>
            <p className="font-bold">
              Transaksi Sudah Dibatalkan ({transaksi.payment_status})
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Preview Struk */}
        <div className="lg:col-span-1 flex justify-center">
          <div className="w-[220px] opacity-90 hover:opacity-100 transition-opacity">
            <Struk transaksi={transaksi} pengaturan={authState.pengaturan} />
          </div>
        </div>

        {/* RIGHT: Detail Data */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Invoice</div>
                  <div className="font-mono font-semibold">
                    {transaksi.invoice_code}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tanggal Diterima</div>
                  <div>
                    {new Date(transaksi.created_at).toLocaleString("id-ID")}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Pelanggan</div>
                  <div>{transaksi.customers?.name || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status Pembayaran</div>
                  <div className="mt-1">
                    <Badge
                      variant={
                        transaksi.payment_status === "Lunas"
                          ? "success"
                          : "warning"
                      }
                    >
                      {transaksi.payment_status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Metode Pembayaran</div>
                  <div>{transaksi.payment_method || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Cabang</div>
                  <div>{transaksi.branches?.name || "-"}</div>
                </div>

                <div className="col-span-2 pt-2 border-t mt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Grand Total</span>
                    <span>Rp {formatRupiah(transaksi.grand_total)}</span>
                  </div>
                </div>

                {transaksi.notes && (
                  <div className="col-span-2 bg-slate-50 p-2 rounded text-xs text-slate-600">
                    <span className="font-bold">Catatan:</span>{" "}
                    {transaksi.notes}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rincian Paket</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="pb-2">Layanan</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transaksi.order_items?.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="py-2">{item.packages?.name || "Item"}</td>
                      <td className="py-2 text-center">
                        {item.quantity} {item.packages?.unit}
                      </td>
                      <td className="py-2 text-right">
                        Rp {formatRupiah(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- MODAL REQUEST CANCELLATION --- */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Ajukan Pembatalan
            </DialogTitle>
            <DialogDescription>
              Permintaan ini memerlukan persetujuan Owner/Finance. <br />
              Saldo/Laporan belum akan berubah sampai disetujui.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <Label>Jenis Pembatalan</Label>
              <RadioGroup
                value={cancelType}
                onValueChange={setCancelType}
                className="flex flex-col gap-2"
              >
                <div
                  className={`flex items-center space-x-2 border p-3 rounded cursor-pointer transition-colors ${
                    cancelType === "void"
                      ? "border-red-500 bg-red-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <RadioGroupItem value="void" id="r-void" />
                  <Label htmlFor="r-void" className="cursor-pointer w-full">
                    <div className="font-bold">VOID (Batal Transaksi)</div>
                    <div className="text-xs text-muted-foreground">
                      Kesalahan input hari ini / Batal beli.
                    </div>
                  </Label>
                </div>
                <div
                  className={`flex items-center space-x-2 border p-3 rounded cursor-pointer transition-colors ${
                    cancelType === "refund"
                      ? "border-red-500 bg-red-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <RadioGroupItem value="refund" id="r-refund" />
                  <Label htmlFor="r-refund" className="cursor-pointer w-full">
                    <div className="font-bold">REFUND (Pengembalian Dana)</div>
                    <div className="text-xs text-muted-foreground">
                      Komplain pelanggan / Ganti rugi di kemudian hari.
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="void-reason">
                Alasan <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="void-reason"
                placeholder="Contoh: Salah input nominal, baju luntur, pelanggan komplain..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRequestModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitRequest}
              disabled={isSubmittingCancel}
            >
              {isSubmittingCancel ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Kirim Pengajuan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
