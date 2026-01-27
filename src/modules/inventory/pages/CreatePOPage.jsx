import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  ShoppingCart,
  Loader2,
  Truck,
  Receipt,
  Wallet, // Icon DP
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function CreatePOPage() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Data Master
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Form Header
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [isWarehouseLocked, setIsWarehouseLocked] = useState(false); // <--- NEW: Buat ngunci dropdown
  const [notes, setNotes] = useState("");

  // Form Item
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState(1);
  const [costPrice, setCostPrice] = useState(0);

  // Cart & Keuangan
  const [cart, setCart] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  // -- STATES KEUANGAN --
  const [discount, setDiscount] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [dpAmount, setDpAmount] = useState(0);

  // 1. FETCH MASTER DATA (WITH SECURITY FILTER)
  useEffect(() => {
    const fetchData = async () => {
      if (!authState.business_id) return;
      try {
        // A. QUERY GUDANG (Custom Logic)
        let warehouseQuery = supabase
          .schema("inventory")
          .from("warehouses")
          .select("*")
          .eq("business_id", authState.business_id);

        // LOGIC 1: Kalau bukan Owner/Finance, Filter by Branch
        const isPowerUser =
          authState.role === "owner" || authState.role === "finance";
        if (!isPowerUser && authState.branch_id) {
          warehouseQuery = warehouseQuery.eq("branch_id", authState.branch_id);
          setIsWarehouseLocked(true); // Kunci dropdown nanti
        }

        // B. Query Lainnya (Standard)
        const supplierQuery = supabase
          .schema("inventory")
          .from("suppliers")
          .select("*")
          .eq("business_id", authState.business_id);

        const productQuery = supabase
          .schema("inventory")
          .from("products")
          .select("*")
          .eq("business_id", authState.business_id);

        // C. Eksekusi Parallel
        const [supRes, warRes, prodRes] = await Promise.all([
          supplierQuery,
          warehouseQuery,
          productQuery,
        ]);

        if (supRes.error) throw supRes.error;
        if (warRes.error) throw warRes.error;
        if (prodRes.error) throw prodRes.error;

        setSuppliers(supRes.data);
        setWarehouses(warRes.data);
        setProducts(prodRes.data);

        // LOGIC 1B: Auto Select Warehouse
        if (warRes.data.length === 1) {
          // Kalau cuma dapet 1 gudang (kasus admin cabang), langsung pilih
          setSelectedWarehouse(warRes.data[0].id);
        } else {
          // Kalau banyak (Owner), cari main warehouse
          const mainWh = warRes.data.find((w) => w.is_main_warehouse);
          if (mainWh) setSelectedWarehouse(mainWh.id);
        }
      } catch (err) {
        console.error("Gagal load master data:", err);
        toast.error("Gagal memuat data master.");
      }
    };
    fetchData();
  }, [authState.business_id, authState.branch_id, authState.role]);

  // 2. LOGIC ITEM SELECTION
  useEffect(() => {
    if (selectedProduct) {
      const product = products.find(
        (p) => String(p.id) === String(selectedProduct),
      );
      if (product) {
        const rate = parseFloat(product.conversion_rate) || 1;
        const basePrice = parseFloat(product.purchase_price) || 0;
        setCostPrice(basePrice * rate);
      }
    } else {
      setCostPrice(0);
    }
  }, [selectedProduct, products]);

  const handleAddItem = () => {
    if (!selectedProduct || qty <= 0 || costPrice <= 0) {
      return toast.error("Pilih produk, jumlah valid, dan harga beli.");
    }
    const exists = cart.find((item) => item.product_id === selectedProduct);
    if (exists)
      return toast.error(
        "Produk ini sudah ada di list. Hapus dulu kalau mau ubah.",
      );

    const productDetail = products.find((p) => p.id == selectedProduct);
    const conversionRate = parseFloat(productDetail.conversion_rate) || 1;

    const newItem = {
      product_id: productDetail.id,
      product_name: productDetail.name,
      unit: productDetail.unit,
      purchase_unit: productDetail.purchase_unit || productDetail.unit,
      conversion_rate: conversionRate,
      quantity: parseFloat(qty),
      cost_price: parseFloat(costPrice),
      subtotal: parseFloat(qty) * parseFloat(costPrice),
    };
    setCart([...cart, newItem]);
    setSelectedProduct("");
    setQty(1);
    setCostPrice(0);
  };

  const handleRemoveItem = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // 3. KALKULASI TOTAL
  const itemsSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const grandTotal =
    itemsSubtotal +
    (parseFloat(shippingCost) || 0) +
    (parseFloat(taxAmount) || 0) -
    (parseFloat(discount) || 0);

  // 4. SUBMIT PO (FIXED LOGIC DP)
  const handleSubmitPO = async () => {
    if (!selectedSupplier || !selectedWarehouse || cart.length === 0) {
      return toast.error(
        "Lengkapi data Supplier, Gudang, dan minimal 1 Barang.",
      );
    }

    if (parseFloat(dpAmount) > grandTotal) {
      return toast.error(
        "Nilai DP tidak boleh lebih besar dari Total Tagihan!",
      );
    }

    setLoading(true);
    try {
      // A. Generate PO Number
      const { data: poNumber, error: numError } = await supabase.rpc(
        "generate_po_number",
        { p_business_id: authState.business_id },
      );
      if (numError) throw numError;

      // B. Insert Header
      // FIX LOGIC 2: DP Amount masuk sini, tapi status masih 'draft'
      const { data: poHeader, error: headerError } = await supabase
        .schema("inventory")
        .from("purchase_orders")
        .insert({
          business_id: authState.business_id,
          purchase_number: poNumber,
          supplier_id: selectedSupplier,
          target_warehouse_id: selectedWarehouse,
          status: "draft",

          total_amount: grandTotal,
          discount_amount: parseFloat(discount) || 0,
          shipping_cost: parseFloat(shippingCost) || 0,
          tax_amount: parseFloat(taxAmount) || 0,

          // --- DP LOGIC UPDATE ---
          dp_amount: parseFloat(dpAmount) || 0,
          dp_status: parseFloat(dpAmount) > 0 ? "draft" : null, // Status 'draft' biar gak bocor ke payable
          // -----------------------

          delivery_date: deliveryDate || null,
          due_date: dueDate || null,
          notes: notes,
          ordered_at: new Date(),
        })
        .select()
        .single();

      if (headerError) throw headerError;

      // C. Insert Items
      const itemsToInsert = cart.map((item) => ({
        business_id: authState.business_id,
        po_id: poHeader.id,
        product_id: item.product_id,
        quantity: item.quantity,
        cost_price: item.cost_price,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .schema("inventory")
        .from("purchase_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // D. REQUEST DP (RPC) -> DIHAPUS !!!
      // Kita hapus logic ini biar DP gak langsung aktif 'requested'.
      // Nanti Finance yang akan trigger ini pas Finalize PO.

      toast.success(`PO ${poNumber} Berhasil Dibuat (Draft)!`);
      navigate("/inventory/purchase-orders");
    } catch (err) {
      console.error("Gagal simpan PO:", err);
      toast.error("Gagal menyimpan PO: " + err.message);
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
            Buat Purchase Order
          </h1>
          <p className="text-muted-foreground">
            Formulir pemesanan barang ke supplier.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI: Form Input */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Pilih Supplier</Label>
                <select
                  className="w-full p-2 border rounded-md bg-background"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                >
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Gudang Tujuan</Label>
                <select
                  className={`w-full p-2 border rounded-md bg-background ${isWarehouseLocked ? "opacity-70 cursor-not-allowed bg-slate-100" : ""}`}
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  disabled={isWarehouseLocked} // <-- Kunci jika Branch
                >
                  <option value="">-- Pilih Gudang --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tgl Kirim (Est)</Label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jatuh Tempo</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Catatan PO</Label>
                <Textarea
                  placeholder="Contoh: Kirim secepatnya..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" /> Tambah Barang
              </h3>
              <div className="space-y-2">
                <Label>Produk</Label>
                <select
                  className="w-full p-2 border rounded-md bg-background"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <option value="">-- Pilih Produk --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jumlah</Label>
                  <Input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Harga Beli Satuan</Label>
                  <Input
                    type="number"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleAddItem}>
                Masuk Keranjang
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* KOLOM KANAN: Tabel & Total */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="h-full flex flex-col">
            <CardContent className="p-0 flex-1">
              <div className="bg-muted/50 p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" /> Daftar Belanja
                </h3>
                <span className="text-sm text-muted-foreground">
                  {cart.length} Item
                </span>
              </div>
              <div className="p-0 overflow-auto max-h-[400px]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground sticky top-0">
                    <tr>
                      <th className="p-4">Produk</th>
                      <th className="p-4 text-center">Qty</th>
                      <th className="p-4 text-right">Harga</th>
                      <th className="p-4 text-right">Subtotal</th>
                      <th className="p-4 w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cart.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-4 font-medium">
                          {item.product_name}
                          <span className="ml-1 text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded">
                            {item.purchase_unit}
                          </span>
                        </td>
                        <td className="p-4 text-center">{item.quantity}</td>
                        <td className="p-4 text-right">
                          {formatRupiah(item.cost_price)}
                        </td>
                        <td className="p-4 text-right font-semibold">
                          {formatRupiah(item.subtotal)}
                        </td>
                        <td className="p-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>

            <div className="p-6 border-t bg-muted/10 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal Barang</span>
                <span className="font-medium">
                  {formatRupiah(itemsSubtotal)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Truck className="h-3 w-3" /> Ongkir
                  </Label>
                  <Input
                    type="number"
                    className="h-8 text-right"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Receipt className="h-3 w-3" /> Pajak
                  </Label>
                  <Input
                    type="number"
                    className="h-8 text-right"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Diskon
                  </Label>
                  <Input
                    type="number"
                    className="h-8 text-right text-red-500"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
                {/* INPUT DP BARU */}
                <div className="space-y-1">
                  <Label className="text-xs text-orange-600 font-bold flex items-center gap-1">
                    <Wallet className="h-3 w-3" /> Request DP (Uang Muka)
                  </Label>
                  <Input
                    type="number"
                    className="h-8 text-right border-orange-300 bg-orange-50 font-bold text-orange-700"
                    value={dpAmount}
                    onChange={(e) => setDpAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-bold">Total Tagihan</span>
                <span className="text-2xl font-bold text-primary">
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  Batal
                </Button>
                <Button
                  size="lg"
                  onClick={handleSubmitPO}
                  disabled={loading || cart.length === 0}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" /> Simpan PO
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
