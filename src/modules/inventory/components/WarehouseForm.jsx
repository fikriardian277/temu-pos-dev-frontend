import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Checkbox } from "@/components/ui/Checkbox";

export default function WarehouseForm({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) {
  const { authState } = useAuth();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]); // State buat nampung daftar cabang

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    is_main_warehouse: false,
    is_active: true,
    branch_id: "", // Tambah field ini
  });

  // 1. Fetch Data Cabang & Inisialisasi Form
  useEffect(() => {
    if (!isOpen) return;

    // A. Ambil daftar cabang dari schema public
    const fetchBranches = async () => {
      if (!authState.business_id) return;
      const { data } = await supabase
        .from("branches") // Schema public
        .select("id, name")
        .eq("business_id", authState.business_id);
      setBranches(data || []);
    };
    fetchBranches();

    // B. Isi Form (Mode Edit vs Tambah)
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        address: initialData.address || "",
        is_main_warehouse: initialData.is_main_warehouse || false,
        is_active: initialData.is_active ?? true,
        branch_id: initialData.branch_id || "", // Load link cabang yg sudah ada
      });
    } else {
      setFormData({
        name: "",
        address: "",
        is_main_warehouse: false,
        is_active: true,
        branch_id: "",
      });
    }
  }, [isOpen, initialData, authState.business_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        address: formData.address,
        is_main_warehouse: formData.is_main_warehouse,
        is_active: formData.is_active,
        branch_id: formData.branch_id || null, // Kirim ID Cabang atau NULL
      };

      if (initialData) {
        // UPDATE
        const { error } = await supabase
          .schema("inventory")
          .from("warehouses")
          .update({ ...payload, updated_at: new Date() })
          .eq("id", initialData.id)
          .eq("business_id", authState.business_id);
        if (error) throw error;
        toast.success("Gudang diperbarui!");
      } else {
        // INSERT
        const { error } = await supabase
          .schema("inventory")
          .from("warehouses")
          .insert({ business_id: authState.business_id, ...payload });
        if (error) throw error;
        toast.success("Gudang ditambahkan!");
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Gagal simpan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Data Gudang" : "Tambah Gudang Baru"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              Nama Gudang <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          {/* Dropdown Link Cabang */}
          <div className="grid gap-2">
            <Label htmlFor="branch_id">Terhubung ke Cabang (Outlet)?</Label>
            <select
              id="branch_id"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.branch_id}
              onChange={(e) =>
                setFormData({ ...formData, branch_id: e.target.value })
              }
            >
              <option value="">
                -- Tidak Terhubung (Gudang Pusat/Terpisah) --
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              Pilih cabang jika gudang ini menempel dengan toko fisik.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Alamat</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center space-x-2 border p-2 rounded">
              <Checkbox
                id="is_main"
                checked={formData.is_main_warehouse}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_main_warehouse: checked })
                }
              />
              <Label htmlFor="is_main" className="cursor-pointer">
                Set sebagai Gudang Utama?
              </Label>
            </div>
            {initialData && (
              <div className="flex items-center space-x-2 border p-2 rounded bg-muted/20">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Status Aktif
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
