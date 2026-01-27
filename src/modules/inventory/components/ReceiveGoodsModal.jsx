import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea"; // Import Textarea
import { Loader2, PackageCheck, User, FileText } from "lucide-react"; // Import Icons
import { toast } from "sonner";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function ReceiveGoodsModal({
  isOpen,
  onClose,
  poData,
  onSuccess,
}) {
  const { authState } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFinal, setIsFinal] = useState(false);

  // --- NEW STATE: HEADER INPUT ---
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch Items PO saat modal dibuka
  useEffect(() => {
    if (isOpen && poData) {
      // Reset Form Header setiap buka modal baru
      setReceivedBy(authState.user?.user_metadata?.full_name || ""); // Default isi nama user login
      setNotes("");

      const fetchItems = async () => {
        const { data } = await supabase
          .schema("inventory")
          .from("purchase_items")
          .select("*, products(name, unit, purchase_unit)")
          .eq("po_id", poData.id);

        if (data) {
          const preparedItems = data.map((item) => ({
            ...item,
            input_qty: item.quantity - (item.qty_received || 0),
            _sisa: item.quantity - (item.qty_received || 0),
          }));
          setItems(preparedItems);
        }
      };
      fetchItems();
    }
  }, [isOpen, poData, authState.user]);

  // Logic Auto-Detect Status Final
  useEffect(() => {
    if (items.length === 0) return;
    let allComplete = true;
    for (const item of items) {
      const input = parseFloat(item.input_qty || 0);
      const sisa = item._sisa;
      if (input < sisa) {
        allComplete = false;
        break;
      }
    }
    setIsFinal(allComplete);
  }, [items]);

  const handleQtyChange = (index, val) => {
    const newItems = [...items];
    newItems[index].input_qty = val < 0 ? 0 : val;
    setItems(newItems);
  };

  const handleSubmit = async () => {
    // 1. VALIDASI NAMA PENERIMA (WAJIB)
    if (!receivedBy.trim()) {
      return toast.error("Nama Penerima wajib diisi!");
    }

    setLoading(true);
    try {
      const receivedPayload = items
        .filter((i) => i.input_qty > 0)
        .map((i) => ({
          product_id: i.product_id,
          qty_received: parseFloat(i.input_qty),
        }));

      if (receivedPayload.length === 0) {
        setLoading(false);
        return toast.error(
          "Masukkan jumlah barang yang diterima minimal satu.",
        );
      }

      // 2. PANGGIL FUNCTION (Updated Parameter)
      const { error } = await supabase.rpc("process_goods_receipt", {
        p_po_id: poData.id,
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
        p_items_received: receivedPayload,
        p_is_final: isFinal,

        // --- DATA BARU ---
        p_received_by: receivedBy,
        p_notes: notes,
      });

      if (error) throw error;

      toast.success("Barang berhasil diterima (GRN)!");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <PackageCheck className="h-6 w-6 text-blue-600" /> Penerimaan Barang
            (GRN)
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            PO:{" "}
            <span className="font-mono font-bold text-slate-700">
              {poData?.purchase_number}
            </span>{" "}
            • Gudang:{" "}
            <span className="font-semibold text-slate-700">
              {poData?.warehouses?.name}
            </span>
          </p>
        </DialogHeader>

        <div className="py-2 overflow-y-auto max-h-[70vh] px-1">
          {/* --- BAGIAN INPUT HEADER (BARU) --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" /> Nama Penerima{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Contoh: Pak Budi (Gudang)"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" /> Catatan
                Penerimaan
              </Label>
              <Input
                placeholder="Contoh: Dus penyok, tapi isi aman..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          {/* TABEL BARANG */}
          <div className="border rounded-md overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 font-medium">
                <tr>
                  <th className="p-3 text-left">Produk</th>
                  <th className="p-3 text-center">Ord</th>
                  <th className="p-3 text-center">Terima</th>
                  <th className="p-3 text-center w-[120px]">Input Fisik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const sisa = item._sisa;
                  const isCompleted = sisa <= 0;

                  return (
                    <tr
                      key={item.id}
                      className={
                        isCompleted ? "opacity-50 bg-gray-50" : "bg-white"
                      }
                    >
                      <td className="p-3">
                        <div className="font-medium text-slate-800">
                          {item.products?.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Unit:{" "}
                          {item.products?.purchase_unit || item.products?.unit}
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600">
                        {item.quantity}
                      </td>
                      <td className="p-3 text-center font-mono text-blue-600 font-medium">
                        {item.qty_received || 0}
                      </td>
                      <td className="p-3">
                        {isCompleted ? (
                          <div className="text-center text-xs font-bold text-green-600 bg-green-50 py-1 rounded border border-green-100">
                            LENGKAP
                          </div>
                        ) : (
                          <>
                            <Input
                              type="number"
                              className="text-center h-9 font-bold text-slate-900 border-blue-200 focus:border-blue-500"
                              min="0"
                              value={item.input_qty}
                              onChange={(e) =>
                                handleQtyChange(idx, e.target.value)
                              }
                            />
                            <div className="text-[10px] text-center text-muted-foreground mt-1">
                              Sisa: {sisa}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Opsi Finalisasi */}
          <div
            className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
              isFinal
                ? "bg-green-50 border-green-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <Checkbox
              id="final_check"
              checked={isFinal}
              onCheckedChange={setIsFinal}
              className="mt-1"
            />
            <div className="grid gap-1">
              <Label
                htmlFor="final_check"
                className="font-bold cursor-pointer text-base"
              >
                {isFinal
                  ? "Tandai PO SELESAI (Completed)"
                  : "Biarkan PO Terbuka (Partial)"}
              </Label>
              <p className="text-sm text-muted-foreground leading-snug">
                {isFinal
                  ? "PO akan ditutup. Sisa stok yang belum dikirim dianggap batal/selesai."
                  : "PO tetap aktif menunggu pengiriman sisa barang berikutnya."}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PackageCheck className="mr-2 h-4 w-4" />
            )}
            Konfirmasi Terima
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
