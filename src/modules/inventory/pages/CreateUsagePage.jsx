import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Beaker,
  Loader2,
  User,
  AlertTriangle, // Icon buat warning di modal
  PackageOpen, // Icon buat header
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge"; // Tambah Badge biar cantik
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog"; // Import Dialog modern

export default function CreateUsagePage() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Data Master
  const [warehouses, setWarehouses] = useState([]);
  const [productList, setProductList] = useState([]);

  // Form Header
  const [selectedWh, setSelectedWh] = useState("");
  const [usageDate, setUsageDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [consumedBy, setConsumedBy] = useState("");
  const [notes, setNotes] = useState("");

  // Form Item
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState(1);

  // Cart
  const [cart, setCart] = useState([]);

  // UI State
  const [confirmOpen, setConfirmOpen] = useState(false); // State buat Modal Konfirmasi

  // 1. Fetch Gudang
  useEffect(() => {
    const fetchWh = async () => {
      if (!authState.business_id) return;
      const { data } = await supabase
        .schema("inventory")
        .from("warehouses")
        .select("*")
        .eq("business_id", authState.business_id)
        .eq("is_active", true);

      if (authState.role !== "owner" && data) {
        const myWh = data.find((w) => w.branch_id === authState.branch_id);
        if (myWh) {
          setWarehouses([myWh]);
          setSelectedWh(myWh.id);
        } else {
          toast.error("Akun Anda tidak terhubung ke gudang manapun.");
        }
      } else {
        setWarehouses(data || []);
      }
    };
    fetchWh();
  }, [authState.business_id, authState.role, authState.branch_id]);

  // 2. Fetch Produk
  useEffect(() => {
    if (!selectedWh) {
      setProductList([]);
      return;
    }
    const fetchStock = async () => {
      const { data } = await supabase
        .schema("inventory")
        .from("inventory_items")
        .select("product_id, quantity, products(name, unit, sku)")
        .eq("warehouse_id", selectedWh)
        .gt("quantity", 0);
      setProductList(data || []);
      setCart([]);
    };
    fetchStock();
  }, [selectedWh]);

  // 3. Add Item
  const handleAddItem = () => {
    if (!selectedProduct || qty <= 0)
      return toast.error("Pilih produk & jumlah yang valid.");

    const stockItem = productList.find((i) => i.product_id == selectedProduct);
    if (!stockItem) return;

    if (qty > stockItem.quantity)
      return toast.error(
        `Stok tidak cukup. Hanya tersedia ${stockItem.quantity} ${stockItem.products.unit}`,
      );

    if (cart.find((i) => i.product_id === stockItem.product_id))
      return toast.error("Produk ini sudah ada di daftar.");

    setCart([
      ...cart,
      {
        product_id: stockItem.product_id,
        name: stockItem.products.name,
        unit: stockItem.products.unit,
        current_qty: stockItem.quantity,
        use_qty: parseFloat(qty),
      },
    ]);
    setSelectedProduct("");
    setQty(1);
  };

  // 4. Validasi Sebelum Buka Modal
  const handlePreSubmit = () => {
    if (!selectedWh) return toast.error("Pilih Gudang/Outlet terlebih dahulu.");
    if (!consumedBy.trim())
      return toast.error("Wajib isi nama Staff yang mengambil barang.");
    if (cart.length === 0) return toast.error("Daftar barang masih kosong.");

    // Buka Modal Konfirmasi Modern
    setConfirmOpen(true);
  };

  // 5. Proses Submit (Dipanggil dari Modal)
  const handleConfirmSubmit = async () => {
    setLoading(true);
    try {
      const { data: docNumber } = await supabase.rpc("generate_doc_number", {
        p_business_id: authState.business_id,
        p_type: "USE",
      });

      // Insert Header
      const { data: header, error: headErr } = await supabase
        .schema("inventory")
        .from("usage_records")
        .insert({
          business_id: authState.business_id,
          usage_number: docNumber,
          warehouse_id: selectedWh,
          usage_date: usageDate,
          consumed_by: consumedBy,
          status: "draft",
          notes: notes,
          created_by: authState.user.id,
        })
        .select()
        .single();

      if (headErr) throw headErr;

      // Insert Items
      const itemsPayload = cart.map((i) => ({
        business_id: authState.business_id,
        usage_id: header.id,
        product_id: i.product_id,
        quantity: i.use_qty,
      }));

      const { error: itemErr } = await supabase
        .schema("inventory")
        .from("usage_items")
        .insert(itemsPayload);
      if (itemErr) throw itemErr;

      // Submit (Potong Stok + Snapshot Stok Awal/Akhir via SQL function baru)
      const { error: rpcErr } = await supabase.rpc("submit_material_usage", {
        p_usage_id: header.id,
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
      });
      if (rpcErr) throw rpcErr;

      toast.success("Laporan berhasil disimpan & stok telah dipotong.");
      navigate("/inventory/usage");
    } catch (err) {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <PackageOpen className="h-8 w-8 text-orange-600" />
            Input Pemakaian
          </h1>
          <p className="text-muted-foreground">
            Catat pengambilan bahan baku untuk operasional.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PANEL KIRI: FORM INPUT */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Gudang / Outlet</Label>
                <select
                  className="w-full p-2 border rounded bg-background disabled:bg-muted focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                  value={selectedWh}
                  onChange={(e) => setSelectedWh(e.target.value)}
                  disabled={
                    authState.role !== "owner" && warehouses.length === 1
                  }
                >
                  <option value="">-- Pilih Lokasi --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal Pemakaian</Label>
                <Input
                  type="date"
                  value={usageDate}
                  onChange={(e) => setUsageDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Diambil Oleh{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nama Staff / Karyawan"
                  value={consumedBy}
                  onChange={(e) => setConsumedBy(e.target.value)}
                  className="bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <Label>Catatan (Opsional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan tambahan..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/40 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                <Plus className="h-4 w-4" /> Tambah Item
              </h3>
              <div className="space-y-2">
                <Label>Pilih Bahan</Label>
                <select
                  className="w-full p-2 border rounded bg-background focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <option value="">-- Cari Produk --</option>
                  {productList.map((item) => (
                    <option key={item.product_id} value={item.product_id}>
                      {item.products.name} (Stok: {item.quantity}{" "}
                      {item.products.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Jumlah Pakai</Label>
                <Input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  min="0.1"
                  step="0.1"
                  placeholder="0"
                />
              </div>
              <Button
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                onClick={handleAddItem}
                disabled={!selectedProduct}
              >
                Masukan ke Daftar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* PANEL KANAN: TABEL CART */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col shadow-md border-slate-200">
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="bg-slate-100/80 p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2 text-slate-700">
                  <Beaker className="h-4 w-4" /> Rincian Penggunaan
                </h3>
                <Badge variant="secondary" className="px-3">
                  {cart.length} Item
                </Badge>
              </div>

              <div className="p-0 overflow-auto flex-1 min-h-[300px]">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 p-8">
                    <PackageOpen className="h-12 w-12 mb-2" />
                    <p>Belum ada item yang dipilih.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                      <tr>
                        <th className="p-4 w-[40%]">Nama Bahan</th>
                        <th className="p-4 text-center">Stok Awal</th>
                        <th className="p-4 text-center">Dipakai</th>
                        <th className="p-4 text-center">Sisa Nanti</th>
                        <th className="p-4 w-[50px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cart.map((item, idx) => {
                        const remaining = item.current_qty - item.use_qty;
                        return (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="p-4 font-medium text-slate-800">
                              {item.name}
                              <div className="text-xs text-muted-foreground uppercase mt-0.5">
                                {item.unit}
                              </div>
                            </td>
                            <td className="p-4 text-center text-slate-500">
                              {item.current_qty}
                            </td>
                            <td className="p-4 text-center">
                              <Badge
                                variant="outline"
                                className="text-red-600 border-red-200 bg-red-50"
                              >
                                - {item.use_qty}
                              </Badge>
                            </td>
                            <td className="p-4 text-center">
                              <span
                                className={`font-bold ${remaining < 5 ? "text-orange-600" : "text-emerald-600"}`}
                              >
                                {remaining}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-red-50 hover:text-red-600 transition-colors"
                                onClick={() =>
                                  setCart(cart.filter((_, i) => i !== idx))
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>

            <div className="p-6 border-t bg-slate-50/30 flex justify-end gap-3">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Batal
              </Button>
              <Button
                onClick={handlePreSubmit}
                disabled={loading || cart.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white min-w-[140px] shadow-sm"
              >
                {loading ? "Menyimpan..." : "Simpan Laporan"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* --- MODERN CONFIRMATION DIALOG --- */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Konfirmasi Pemakaian
            </DialogTitle>
            <DialogDescription className="pt-2">
              Anda akan mencatat pemakaian untuk{" "}
              <strong>{cart.length} item</strong>.
              <br />
              Stok fisik di sistem akan <strong>langsung berkurang</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 p-3 rounded-md text-sm border my-2">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">Lokasi:</span>
              <span className="font-medium text-slate-800">
                {warehouses.find((w) => w.id === selectedWh)?.name}
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">Oleh:</span>
              <span className="font-medium text-slate-800">{consumedBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tanggal:</span>
              <span className="font-medium text-slate-800">{usageDate}</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Periksa Kembali
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Proses Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
