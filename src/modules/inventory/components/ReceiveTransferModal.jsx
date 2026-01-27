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
import { Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function ReceiveTransferModal({
  isOpen,
  onClose,
  transferData,
  onSuccess,
}) {
  const { authState } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // FETCH ITEMS & HITUNG SISA
  useEffect(() => {
    if (isOpen && transferData) {
      const fetchItems = async () => {
        const { data } = await supabase
          .schema("inventory")
          .from("transfer_items")
          .select("*, products(name, unit)")
          .eq("transfer_id", transferData.id);

        if (data) {
          // LOGIC BARU: Hitung Sisa
          const preparedItems = data.map((item) => {
            const receivedSoFar = item.qty_received || 0;
            const remaining = item.quantity - receivedSoFar;

            return {
              ...item,
              // Default input = Sisa yang belum diterima
              // Kalau sisa < 0 (aneh), set 0
              input_qty: remaining > 0 ? remaining : 0,
              _sisa: remaining, // Simpan sisa buat validasi UI
            };
          });
          setItems(preparedItems);
        }
      };
      fetchItems();
    }
  }, [isOpen, transferData]);

  const handleQtyChange = (index, val) => {
    const newItems = [...items];
    newItems[index].input_qty = val;
    setItems(newItems);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Filter: Hanya kirim item yang inputnya > 0
      const payload = items
        .filter((i) => parseFloat(i.input_qty) > 0)
        .map((i) => ({
          product_id: i.product_id,
          qty_received: parseFloat(i.input_qty),
        }));

      if (payload.length === 0) {
        setLoading(false);
        return toast.error("Masukkan jumlah diterima minimal satu barang.");
      }

      const { error } = await supabase.rpc("process_transfer_receipt", {
        p_transfer_id: transferData.id,
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
        p_items_received: payload,
      });

      if (error) throw error;
      toast.success("Barang diterima! Stok gudang bertambah.");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" /> Terima Barang Transfer
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {transferData?.transfer_number} • Dari: {transferData?.source?.name}
          </p>
        </DialogHeader>

        <div className="py-4 border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Produk</th>
                <th className="p-2 text-center">Dikirim</th>
                <th className="p-2 text-center">Sudah Terima</th>
                <th className="p-2 text-center w-[120px]">Terima Skrng</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, idx) => (
                <tr
                  key={item.id}
                  className={item._sisa === 0 ? "bg-green-50 opacity-60" : ""}
                >
                  <td className="p-2 font-medium">
                    {item.products?.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({item.products?.unit})
                    </span>
                  </td>
                  <td className="p-2 text-center font-mono">{item.quantity}</td>
                  <td className="p-2 text-center font-mono text-blue-600 font-bold">
                    {item.qty_received || 0}
                  </td>
                  <td className="p-2">
                    {item._sisa > 0 ? (
                      <>
                        <Input
                          type="number"
                          className="text-center h-8"
                          min="0"
                          value={item.input_qty}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                        />
                        <div className="text-[10px] text-center text-muted-foreground mt-1">
                          Max Sisa: {item._sisa}
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-xs text-green-600 font-bold">
                        Lengkap
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground bg-yellow-50 p-2 rounded border border-yellow-100">
          ⚠️ <b>Note:</b> Masukkan jumlah fisik yang baru datang hari ini saja.{" "}
          <br />
          Jika barang kurang (selisih), biarkan sisa dan klik konfirmasi. Status
          akan menjadi PARTIAL.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
            Konfirmasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
