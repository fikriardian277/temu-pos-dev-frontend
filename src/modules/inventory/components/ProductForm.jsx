import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

export default function ProductForm({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) {
  const { authState } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  // Default Form State
  const defaultForm = {
    name: "",
    sku: "",
    category: "",
    unit: "pcs",
    minimum_stock: 0,
    supplier_id: "",
    price: 0, // Harga jual (opsional)
    purchase_price: 0, // Harga beli (PENTING BUAT ASET)
    purchase_unit: "pcs",
    conversion_rate: 1,
    is_active: true,
  };

  const [formData, setFormData] = useState(defaultForm);

  // 1. Load Data saat Modal Dibuka
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Mode EDIT
        setFormData({
          name: initialData.name || "",
          sku: initialData.sku || "",
          category: initialData.category || "",
          unit: initialData.unit || "pcs",
          minimum_stock: initialData.minimum_stock || 0,
          supplier_id: initialData.supplier_id
            ? String(initialData.supplier_id)
            : "",
          price: initialData.price || 0,
          purchase_price: initialData.purchase_price || 0,
          purchase_unit: initialData.purchase_unit || "pcs",
          conversion_rate: initialData.conversion_rate || 1,
          is_active: initialData.is_active ?? true,
        });
      } else {
        // Mode CREATE
        setFormData(defaultForm);
      }
      fetchSuppliers();
    }
  }, [isOpen, initialData]);

  // Fetch Supplier
  const fetchSuppliers = async () => {
    const { data } = await supabase
      .schema("inventory")
      .from("suppliers")
      .select("id, name")
      .eq("business_id", authState.business_id);
    setSuppliers(data || []);
  };

  // 2. Logic Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        business_id: authState.business_id,
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        unit: formData.unit,
        minimum_stock: parseInt(formData.minimum_stock) || 0,
        supplier_id: formData.supplier_id
          ? parseInt(formData.supplier_id)
          : null,

        // HARGA BELI (PENTING)
        purchase_price: parseFloat(formData.purchase_price) || 0,

        purchase_unit: formData.purchase_unit,
        conversion_rate: parseFloat(formData.conversion_rate) || 1,
        is_active: formData.is_active,
      };

      let error;

      if (initialData?.id) {
        // UPDATE
        const { error: updateError } = await supabase
          .schema("inventory")
          .from("products")
          .update(payload)
          .eq("id", initialData.id);
        error = updateError;
      } else {
        // INSERT
        const { error: insertError } = await supabase
          .schema("inventory")
          .from("products")
          .insert(payload);
        error = insertError;
      }

      if (error) throw error;

      toast.success(
        initialData ? "Produk berhasil diperbarui!" : "Produk berhasil dibuat!"
      );
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Logic Hapus Permanen
  const handleDeletePermanent = async () => {
    if (!confirm("Yakin hapus PERMANEN? Data transaksi terkait akan error."))
      return;

    setLoading(true);
    const { error } = await supabase
      .schema("inventory")
      .from("products")
      .delete()
      .eq("id", initialData.id);

    if (error) {
      toast.error("Gagal hapus: " + error.message);
    } else {
      toast.success("Produk dihapus permanen.");
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Produk" : "Tambah Produk Baru"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Baris 1: Nama & SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Produk *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Contoh: Deterjen Liquid A"
              />
            </div>
            <div className="space-y-2">
              <Label>SKU / Kode Barang</Label>
              <Input
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder="PROD-001"
              />
            </div>
          </div>

          {/* Baris 2: Kategori & Supplier */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={formData.category}
                onValueChange={(val) =>
                  setFormData({ ...formData, category: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Chemical">Chemical / Sabun</SelectItem>
                  <SelectItem value="Packaging">Plastik / Packaging</SelectItem>
                  <SelectItem value="Amenity">
                    Amenity / Perlengkapan
                  </SelectItem>
                  <SelectItem value="Asset">Aset / Mesin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Supplier Default</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(val) =>
                  setFormData({ ...formData, supplier_id: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Baris 3: INFO PENTING (Satuan, Harga, Min Stock) */}
          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded border">
            {/* 1. Satuan */}
            <div className="space-y-2">
              <Label className="text-blue-700 font-semibold">
                Satuan Stok *
              </Label>
              <Input
                required
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                placeholder="pcs, kg, ltr"
              />
              <p className="text-[10px] text-muted-foreground">
                Unit terkecil pemakaian.
              </p>
            </div>

            {/* 2. Harga Beli (INI YANG BARU DITAMBAH) */}
            <div className="space-y-2">
              <Label className="text-green-700 font-bold">
                Harga Modal (@Unit)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-bold text-gray-500">
                  Rp
                </span>
                <Input
                  type="number"
                  className="pl-9 font-mono font-bold border-green-200 focus:border-green-500"
                  value={formData.purchase_price}
                  onChange={(e) =>
                    setFormData({ ...formData, purchase_price: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Wajib isi untuk hitung Aset.
              </p>
            </div>

            {/* 3. Min Stock */}
            <div className="space-y-2">
              <Label>Min. Alert</Label>
              <Input
                type="number"
                value={formData.minimum_stock}
                onChange={(e) =>
                  setFormData({ ...formData, minimum_stock: e.target.value })
                }
              />
              <p className="text-[10px] text-muted-foreground">
                Batas stok menipis.
              </p>
            </div>
          </div>

          {/* Baris 4: Konversi Pembelian (Opsional) */}
          <div className="grid grid-cols-3 gap-4 bg-orange-50 p-3 rounded border border-orange-100">
            <div className="space-y-2">
              <Label className="text-orange-800">Satuan Beli (Grosir)</Label>
              <Input
                value={formData.purchase_unit}
                onChange={(e) =>
                  setFormData({ ...formData, purchase_unit: e.target.value })
                }
                placeholder="Cth: Dus, Jerigen"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="text-orange-800">Rasio Konversi</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-orange-900">
                  1 {formData.purchase_unit || "..."} =
                </span>
                <Input
                  type="number"
                  className="w-24 border-orange-200"
                  value={formData.conversion_rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conversion_rate: e.target.value,
                    })
                  }
                />
                <span className="text-sm font-bold text-blue-800">
                  {formData.unit || "..."}
                </span>
              </div>
              <p className="text-[10px] text-orange-600">
                Contoh: 1 Jerigen = 5 Liter. Maka isi 5.
              </p>
            </div>
          </div>

          {/* Baris 5: Status */}
          <div className="flex items-center justify-between bg-gray-100 p-3 rounded">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Status Produk</span>
              <span className="text-xs text-muted-foreground">
                {formData.is_active
                  ? "Produk Aktif"
                  : "Produk Non-Aktif (Disembunyikan)"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, is_active: !formData.is_active })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.is_active ? "bg-green-600" : "bg-gray-400"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.is_active ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between w-full mt-6">
            {/* TOMBOL KIRI (HAPUS) */}
            <div>
              {initialData && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeletePermanent}
                  className="opacity-90 hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Hapus
                </Button>
              )}
            </div>

            {/* TOMBOL KANAN (BATAL & SIMPAN) */}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {initialData ? "Simpan Perubahan" : "Simpan Produk"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
