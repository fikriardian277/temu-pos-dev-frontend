import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  ShoppingCart,
  Loader2,
  Trash2,
  Package,
  FileInput,
  Truck,
  Lock, // Tambah icon Lock buat nandain field paten
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";

export default function CreateTransferPage() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Mode Deteksi: Apakah ini Request (Admin) atau Direct Transfer (Owner)?
  const isRequestMode = authState.role !== "owner";

  // Data Master
  const [warehouses, setWarehouses] = useState([]);
  const [productList, setProductList] = useState([]);

  // Form Header
  const [sourceWh, setSourceWh] = useState("");
  const [targetWh, setTargetWh] = useState("");
  const [notes, setNotes] = useState("");

  // --- STATE ONGKIR ---
  const [shippingCost, setShippingCost] = useState(0);

  // Form Item
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState(1);

  // Cart
  const [cart, setCart] = useState([]);

  // 1. Fetch Gudang & Setup Awal
  useEffect(() => {
    const initPage = async () => {
      if (!authState.business_id) return;

      const { data: whData } = await supabase
        .schema("inventory")
        .from("warehouses")
        .select("*")
        .eq("business_id", authState.business_id)
        .eq("is_active", true);

      setWarehouses(whData || []);

      if (isRequestMode && whData) {
        const myWh = whData.find((w) => w.branch_id === authState.branch_id);
        if (myWh) {
          setTargetWh(myWh.id);
        } else {
          toast.error("Akun Anda tidak terhubung dengan gudang manapun.");
        }
        setSourceWh("");
      }
    };
    initPage();
  }, [authState.business_id, authState.branch_id, isRequestMode]);

  // 2. Fetch Produk
  useEffect(() => {
    const fetchProducts = async () => {
      if (!authState.business_id) return;

      if (isRequestMode) {
        // MODE REQUEST: Ambil Master Produk
        const { data } = await supabase
          .schema("inventory")
          .from("products")
          .select("id, name, unit, sku")
          .eq("business_id", authState.business_id)
          .eq("is_active", true);

        const formatted =
          data?.map((p) => ({
            product_id: p.id,
            quantity: 999999,
            products: p,
          })) || [];
        setProductList(formatted);
      } else {
        // MODE OWNER: Ambil Stok Fisik
        if (!sourceWh) {
          setProductList([]);
          return;
        }

        const { data } = await supabase
          .schema("inventory")
          .from("inventory_items")
          .select("product_id, quantity, products(name, unit, sku)")
          .eq("warehouse_id", sourceWh)
          .gt("quantity", 0);

        setProductList(data || []);
        setCart([]);
      }
    };
    fetchProducts();
  }, [sourceWh, isRequestMode, authState.business_id]);

  // 3. Tambah ke Cart
  const handleAddItem = () => {
    // [UPDATE BAHASA] Lebih formal
    if (!selectedProduct || qty <= 0)
      return toast.error("Mohon pilih produk dan masukkan jumlah yang valid.");

    const itemData = productList.find((i) => i.product_id == selectedProduct);
    if (!itemData) return;

    if (!isRequestMode && qty > itemData.quantity) {
      // [UPDATE BAHASA]
      return toast.error(
        `Stok tidak mencukupi. Tersedia: ${itemData.quantity} ${itemData.products.unit}`,
      );
    }

    if (cart.find((i) => i.product_id === itemData.product_id)) {
      // [UPDATE BAHASA]
      return toast.error("Produk ini sudah ada dalam daftar permintaan.");
    }

    setCart([
      ...cart,
      {
        product_id: itemData.product_id,
        product_name: itemData.products.name,
        unit: itemData.products.unit,
        quantity: parseFloat(qty),
      },
    ]);

    setSelectedProduct("");
    setQty(1);
  };

  // 4. Submit
  const handleSubmit = async () => {
    if (isRequestMode) {
      if (!targetWh) return toast.error("Gudang tujuan tidak valid.");
    } else {
      if (!sourceWh || !targetWh)
        return toast.error("Harap pilih Gudang Asal & Gudang Tujuan.");
    }
    if (cart.length === 0)
      return toast.error("Daftar permintaan masih kosong.");

    setLoading(true);
    try {
      const { data: trfNumber } = await supabase.rpc(
        "generate_transfer_number",
        { p_business_id: authState.business_id },
      );

      // Insert Header
      const { data: header, error: headErr } = await supabase
        .schema("inventory")
        .from("stock_transfers")
        .insert({
          business_id: authState.business_id,
          transfer_number: trfNumber,
          source_warehouse_id: sourceWh || null,
          target_warehouse_id: targetWh,
          status: isRequestMode ? "requested" : "draft",
          notes: notes,
          shipping_cost: isRequestMode ? 0 : parseFloat(shippingCost) || 0,
          created_by: authState.user.id,
        })
        .select()
        .single();

      if (headErr) throw headErr;

      // Insert Items
      const itemsPayload = cart.map((i) => ({
        business_id: authState.business_id,
        transfer_id: header.id,
        product_id: i.product_id,
        quantity: i.quantity,
      }));

      const { error: itemErr } = await supabase
        .schema("inventory")
        .from("transfer_items")
        .insert(itemsPayload);
      if (itemErr) throw itemErr;

      toast.success(
        isRequestMode
          ? "Permintaan stok berhasil dikirim!"
          : "Draft transfer berhasil dibuat!",
      );
      navigate("/inventory/transfers");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRequestMode ? "Form Permintaan Stok" : "Buat Mutasi Stok"}
          </h1>
          <p className="text-muted-foreground">
            {isRequestMode
              ? "Buat pengajuan stok baru ke gudang pusat."
              : "Pindahkan barang antar gudang secara manual."}
          </p>
        </div>
      </div>

      {/* --- BANNER BIRU YANG GAK PERLU UDAH DIHAPUS --- */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORM KIRI */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              {/* INPUT SOURCE (Hidden for Admin/RequestMode) */}
              {!isRequestMode && (
                <div className="space-y-2">
                  <Label>Dari Gudang (Sumber)</Label>
                  <select
                    className="w-full p-2 border rounded bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    value={sourceWh}
                    onChange={(e) => setSourceWh(e.target.value)}
                  >
                    <option value="">-- Pilih Gudang Asal --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* INPUT TARGET */}
              <div className="space-y-2">
                <Label>Ke Gudang (Tujuan)</Label>
                {/* [UPDATE UX] 
                   Jika Request Mode: Tampilkan INPUT ReadOnly biar kelihatan "Paten/Lock".
                   Jika Owner Mode: Tampilkan Select Dropdown.
                */}
                {isRequestMode ? (
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      readOnly
                      value={
                        warehouses.find((w) => w.id === targetWh)?.name ||
                        "Memuat Gudang..."
                      }
                      className="pl-9 bg-muted text-muted-foreground font-medium cursor-not-allowed border-dashed"
                    />
                  </div>
                ) : (
                  <select
                    className="w-full p-2 border rounded bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    value={targetWh}
                    onChange={(e) => setTargetWh(e.target.value)}
                  >
                    <option value="">-- Pilih Gudang Tujuan --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* INPUT ONGKIR (HANYA MUNCUL JIKA OWNER) */}
              {!isRequestMode && (
                <div className="space-y-2 pt-4 border-t mt-4">
                  <Label className="flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Biaya Ongkir (Estimasi)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">
                      Rp
                    </span>
                    <Input
                      type="number"
                      className="pl-9"
                      placeholder="0"
                      value={shippingCost}
                      onChange={(e) => setShippingCost(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Biaya ini akan dicatat sebagai beban pengiriman.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Catatan / Keterangan</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Kebutuhan mendesak untuk event weekend..."
                  className="resize-none"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold flex gap-2 text-primary">
                <Package className="h-4 w-4" /> Input Barang
              </h3>
              <div className="space-y-2">
                <Label>Pilih Produk</Label>
                <select
                  className="w-full p-2 border rounded bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <option value="">-- Cari Produk --</option>
                  {productList.map((item) => (
                    <option key={item.product_id} value={item.product_id}>
                      {item.products.name}
                      {!isRequestMode && ` (Sisa: ${item.quantity})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>
                  Jumlah {isRequestMode ? "Permintaan" : "Transfer"}
                </Label>
                <Input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  min="1"
                  placeholder="Masukkan jumlah..."
                />
              </div>
              <Button
                className="w-full font-medium"
                onClick={handleAddItem}
                disabled={!selectedProduct}
              >
                Tambahkan ke Daftar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* LIST KANAN */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col shadow-sm">
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="bg-muted/30 p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold flex gap-2 items-center">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />{" "}
                  Rincian Barang
                </h3>
                <span className="text-xs font-medium bg-secondary px-2 py-1 rounded-full text-secondary-foreground">
                  {cart.length} Item
                </span>
              </div>

              {/* TABLE AREA */}
              <div className="p-0 overflow-auto flex-1 min-h-[300px]">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center opacity-70">
                    <Package className="h-12 w-12 mb-3 text-slate-300" />
                    <p>Belum ada barang yang dipilih.</p>
                    <p className="text-sm">
                      Silakan pilih produk di panel kiri.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                      <tr>
                        <th className="p-4 w-1/2">Nama Produk</th>
                        <th className="p-4 text-center">Satuan</th>
                        <th className="p-4 text-center">Jumlah</th>
                        <th className="p-4 w-[50px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cart.map((item, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="p-4 font-medium text-slate-800">
                            {item.product_name}
                          </td>
                          <td className="p-4 text-center text-slate-500">
                            {item.unit}
                          </td>
                          <td className="p-4 text-center font-bold text-slate-900 bg-slate-50/50">
                            {item.quantity}
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
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>

            <div className="p-6 border-t bg-slate-50/50 flex justify-end gap-3 rounded-b-lg">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Batalkan
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || cart.length === 0}
                className="min-w-[150px]"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isRequestMode ? "Kirim Permintaan" : "Proses Transfer"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
