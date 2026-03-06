import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/Alert-dialog"; // <-- IMPORT ALERT DIALOG
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  CreditCard,
  Banknote,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Package,
} from "lucide-react";

// --- HELPER COMPONENT: ITEM LIST RINGKAS ---
const SimpleItemList = ({ items }) => (
  <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-sm">
    <p className="text-xs font-bold text-slate-500 mb-2 uppercase">
      Rincian Barang:
    </p>
    <ul className="space-y-2">
      {items?.map((item, idx) => {
        const rawService = item.packages?.services;
        let serviceName = "Tanpa Layanan";

        if (rawService) {
          if (Array.isArray(rawService)) {
            serviceName = rawService[0]?.name;
          } else {
            serviceName = rawService?.name;
          }
        }

        return (
          <li
            key={idx}
            className="flex justify-between items-start border-b border-slate-100 last:border-0 pb-2 last:pb-0"
          >
            <div>
              <span className="block font-medium text-slate-800">
                {item.packages?.name || "Item Tanpa Nama"}
              </span>
              <span className="inline-block mt-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                {serviceName || "Layanan Reguler"}
              </span>
            </div>
            <span className="font-mono font-bold text-slate-700 mt-1">
              x{item.quantity} {item.packages?.unit || "pcs"}
            </span>
          </li>
        );
      })}
    </ul>
  </div>
);

// ==================================================
// 1. MODAL PELUNASAN
// ==================================================
export function PaymentDialog({ isOpen, onClose, transaction, onConfirm }) {
  const [method, setMethod] = useState("Cash");
  const [alertOpen, setAlertOpen] = useState(false); // State buat Pop-up ke-2

  useEffect(() => {
    if (isOpen) {
      setMethod("Cash");
      setAlertOpen(false);
    }
  }, [isOpen]);

  if (!transaction) return null;

  const handleConfirmFinal = () => {
    setAlertOpen(false);
    onConfirm(transaction.id, { payment_method: method });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pelunasan Order</DialogTitle>
            <DialogDescription>
              Invoice:{" "}
              <span className="font-mono font-bold text-primary">
                {transaction.invoice_code}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            <div className="text-center p-6 bg-slate-50 border border-slate-100 rounded-xl">
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
                Total Tagihan
              </p>
              <p className="text-3xl font-extrabold text-slate-900">
                Rp {transaction.grand_total.toLocaleString("id-ID")}
              </p>
            </div>

            <div className="space-y-3">
              <Label>Metode Pembayaran</Label>
              <div className="grid grid-cols-3 gap-3">
                {["Cash", "QRIS", "Transfer"].map((m) => (
                  <Button
                    key={m}
                    variant={method === m ? "default" : "outline"}
                    onClick={() => setMethod(m)}
                    className={`h-16 flex flex-col gap-1 ${
                      method === m
                        ? m === "Cash"
                          ? "bg-green-600 hover:bg-green-700"
                          : m === "QRIS"
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-purple-600 hover:bg-purple-700"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {m === "Cash" && <Banknote className="h-5 w-5" />}
                    {m === "QRIS" && <QrCode className="h-5 w-5" />}
                    {m === "Transfer" && <CreditCard className="h-5 w-5" />}
                    <span className="text-xs">{m}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <Button
              onClick={() => setAlertOpen(true)} // Buka pop-up ke-2
              className="bg-slate-900 text-white"
            >
              Konfirmasi Lunas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- POP-UP KE-2 (ALERT DIALOG) --- */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Konfirmasi Pembayaran
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-700">
              Apakah Anda yakin pelanggan sudah membayar LUNAS sebesar{" "}
              <b className="text-slate-900">
                Rp {transaction.grand_total.toLocaleString("id-ID")}
              </b>{" "}
              menggunakan <b className="text-slate-900">{method}</b>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal, Cek Lagi</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmFinal}
              className="bg-green-600 hover:bg-green-700"
            >
              Ya, Sudah Lunas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ==================================================
// 2. MODAL MULAI CUCI
// ==================================================
export function StartWashingDialog({
  isOpen,
  onClose,
  transaction,
  onConfirm,
}) {
  const [pcsCount, setPcsCount] = useState("");
  const [note, setNote] = useState("");
  const [alertOpen, setAlertOpen] = useState(false); // State buat Pop-up ke-2

  useEffect(() => {
    if (isOpen) {
      setPcsCount("");
      setNote("");
      setAlertOpen(false);
    }
  }, [isOpen]);

  if (!transaction) return null;

  const handleOpenAlert = () => {
    if (!pcsCount) return alert("Isi jumlah pcs dulu!");
    setAlertOpen(true);
  };

  const handleConfirmFinal = () => {
    setAlertOpen(false);
    onConfirm(transaction.id, {
      process_status: "Proses Cuci",
      total_piece_count: parseInt(pcsCount),
      washer_note: note,
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Mulai Proses Cuci
            </DialogTitle>
            <DialogDescription>
              Cek kelengkapan barang sebelum masuk mesin.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded border border-blue-100">
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase">
                  Pelanggan
                </p>
                <p className="font-semibold text-slate-800">
                  {transaction.customers?.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600 font-bold uppercase">
                  Invoice
                </p>
                <p className="font-mono text-slate-700">
                  {transaction.invoice_code}
                </p>
              </div>
            </div>

            <SimpleItemList items={transaction.order_items} />

            <div className="space-y-3 pt-2 border-t">
              <div>
                <Label>Hitung Jumlah Fisik (Pcs) *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={pcsCount}
                  onChange={(e) => setPcsCount(e.target.value)}
                  autoFocus
                  className="text-lg font-bold"
                />
              </div>
              <div>
                <Label>Catatan (Noda/Sobek)</Label>
                <Textarea
                  placeholder="Keterangan kondisi baju..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-20"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={handleOpenAlert}>Mulai Cuci</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- POP-UP KE-2 (ALERT DIALOG) --- */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Verifikasi Fisik
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-700">
              Apakah Anda yakin jumlah fisik barang adalah{" "}
              <b className="text-slate-900">{pcsCount} Pcs</b>? Data ini akan
              dikunci sebagai acuan saat barang selesai.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cek Ulang</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmFinal}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Ya, Lanjutkan Cuci
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ==================================================
// 3. MODAL VERIFIKASI SELESAI
// ==================================================
export function VerifyQtyDialog({ isOpen, onClose, transaction, onConfirm }) {
  const [alertOpen, setAlertOpen] = useState(false); // State buat Pop-up ke-2

  useEffect(() => {
    if (isOpen) setAlertOpen(false);
  }, [isOpen]);

  if (!transaction) return null;

  const handleConfirmFinal = () => {
    setAlertOpen(false);
    onConfirm(transaction.id, "Siap Diambil");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" /> Verifikasi Hasil Cuci
            </DialogTitle>
            <DialogDescription>
              Pastikan barang lengkap sebelum packing.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-200">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">
                  Pelanggan
                </p>
                <p className="font-semibold text-slate-800">
                  {transaction.customers?.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-bold uppercase">
                  Invoice
                </p>
                <p className="font-mono text-slate-700">
                  {transaction.invoice_code}
                </p>
              </div>
            </div>

            <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-800 uppercase font-bold tracking-wider mb-1">
                Total Qty Awal (Check-in)
              </p>
              <div className="text-4xl font-extrabold text-slate-800">
                {transaction.total_piece_count || 0}
                <span className="text-base font-medium text-slate-500 ml-1">
                  Pcs
                </span>
              </div>
              {transaction.washer_note && (
                <div className="mt-2 pt-2 border-t border-amber-200">
                  <p className="text-xs italic text-slate-600">
                    Note: "{transaction.washer_note}"
                  </p>
                </div>
              )}
            </div>

            <SimpleItemList items={transaction.order_items} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <Button
              onClick={() => setAlertOpen(true)} // Buka pop-up ke-2
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Sesuai, Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- POP-UP KE-2 (ALERT DIALOG) --- */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Pastikan Kelengkapan!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-700">
              Apakah Anda yakin barang sudah di-packing lengkap sesuai dengan
              jumlah awal (
              <b className="text-slate-900">
                {transaction.total_piece_count} Pcs
              </b>
              ) dan siap diambil oleh pelanggan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cek Ulang</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmFinal}
              className="bg-green-600 hover:bg-green-700"
            >
              Ya, Sudah Lengkap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
