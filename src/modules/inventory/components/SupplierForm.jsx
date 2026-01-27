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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"; // Kalau belum ada Select shadcn, pake HTML select biasa di bawah
import { Checkbox } from "@/components/ui/Checkbox";

export default function SupplierForm({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) {
  const { authState } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    category: "",
    term_of_payment: "COD",
    is_active: true,
  });

  // Efek: Mode Edit vs Tambah
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        name: initialData.name || "",
        contact_person: initialData.contact_person || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        address: initialData.address || "",
        category: initialData.category || "",
        term_of_payment: initialData.term_of_payment || "COD",
        is_active: initialData.is_active ?? true,
      });
    } else if (isOpen) {
      // Reset
      setFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        category: "",
        term_of_payment: "COD",
        is_active: true,
      });
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData) {
        // --- UPDATE ---
        const { error } = await supabase
          .schema("inventory")
          .from("suppliers")
          .update({
            name: formData.name,
            contact_person: formData.contact_person,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            category: formData.category,
            term_of_payment: formData.term_of_payment,
            is_active: formData.is_active,
            updated_at: new Date(),
          })
          .eq("id", initialData.id)
          .eq("business_id", authState.business_id);

        if (error) throw error;
        toast.success("Supplier berhasil diperbarui!");
      } else {
        // --- INSERT ---
        const { error } = await supabase
          .schema("inventory")
          .from("suppliers")
          .insert({
            business_id: authState.business_id,
            ...formData,
          });

        if (error) throw error;
        toast.success("Supplier berhasil ditambahkan!");
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Supplier" : "Tambah Supplier Baru"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Baris 1: Nama & Kategori */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Nama Supplier <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="PT. Maju Mundur"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Kategori Supply</Label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="">-- Pilih --</option>
                <option value="Chemical">Chemical (Sabun/Parfum)</option>
                <option value="Packing">Plastik & Packing</option>
                <option value="Mesin">Sparepart & Mesin</option>
                <option value="ATK">ATK / Umum</option>
              </select>
            </div>
          </div>

          {/* Baris 2: CP & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
                placeholder="Pak Budi"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">No. Telepon / WA</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0812..."
              />
            </div>
          </div>

          {/* Baris 3: TOP & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="term_of_payment">Term of Payment (TOP)</Label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                name="term_of_payment"
                value={formData.term_of_payment}
                onChange={handleChange}
              >
                <option value="COD">COD (Bayar Tunai)</option>
                <option value="Tempo 7 Hari">Tempo 7 Hari</option>
                <option value="Tempo 14 Hari">Tempo 14 Hari</option>
                <option value="Tempo 30 Hari">Tempo 30 Hari</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@contoh.com"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Alamat Lengkap</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          {/* Status Aktif */}
          <div className="flex items-center space-x-2 border p-2 rounded bg-muted/20">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Supplier Aktif / Masih Kerjasama
            </Label>
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
