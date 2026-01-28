import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";

export default function AccountForm({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) {
  const { authState } = useAuth();
  const businessId = authState.user?.business_id || 2;

  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    type: "bank",
    branch_id: "",
    initial_balance: 0,
    is_active: true,
  });

  // Fetch Branches untuk Dropdown
  useEffect(() => {
    const getBranches = async () => {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .eq("business_id", businessId);
      setBranches(data || []);
    };
    if (isOpen) getBranches();
  }, [isOpen, businessId]);

  // Load Initial Data (Edit Mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        number: initialData.account_number || "",
        type: initialData.account_type,
        branch_id: initialData.branch_id ? String(initialData.branch_id) : "",
        initial_balance: 0, // Saldo awal tidak bisa diedit via form ini
        is_active: initialData.is_active,
      });
    } else {
      // Reset Form (Add Mode)
      setFormData({
        name: "",
        number: "",
        type: "bank",
        branch_id: "",
        initial_balance: 0,
        is_active: true,
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (initialData) {
        // --- MODE EDIT ---
        const { error } = await supabase.rpc("update_finance_account", {
          p_account_id: initialData.id,
          p_name: formData.name,
          p_type: formData.type,
          p_number: formData.number,
          p_branch_id: formData.branch_id ? parseInt(formData.branch_id) : null,
          p_is_active: formData.is_active,
        });
        if (error) throw error;
        toast.success("Akun berhasil diperbarui!");
      } else {
        // --- MODE TAMBAH BARU (THE HOLY TRINITY) ---
        const { data, error } = await supabase.rpc("create_finance_account", {
          p_business_id: businessId,
          p_user_id: authState.user.id,
          p_branch_id: formData.branch_id ? parseInt(formData.branch_id) : null,
          p_name: formData.name,
          p_type: formData.type,
          p_number: formData.number,
          p_initial_balance: parseFloat(formData.initial_balance) || 0,
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.message);

        toast.success("Akun baru berhasil dibuat & terintegrasi!");
      }

      onSuccess(); // Refresh parent table
      onClose(); // Tutup modal
    } catch (err) {
      console.error(err);
      toast.error("Gagal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Akun" : "Tambah Akun Baru"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama Akun */}
          <div className="space-y-1">
            <Label>Nama Akun / Bank</Label>
            <Input
              required
              placeholder="Contoh: BCA Operasional, Kasir Depan"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Tipe Akun */}
            <div className="space-y-1">
              <Label>Tipe</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Tunai / Kas</SelectItem>
                  <SelectItem value="e-wallet">E-Wallet / QRIS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* No Rekening */}
            <div className="space-y-1">
              <Label>No. Rekening (Opsional)</Label>
              <Input
                placeholder="123xxxxx"
                value={formData.number}
                onChange={(e) =>
                  setFormData({ ...formData, number: e.target.value })
                }
              />
            </div>
          </div>

          {/* Cabang */}
          <div className="space-y-1">
            <Label>Milik Cabang</Label>
            <Select
              value={formData.branch_id}
              onValueChange={(val) =>
                setFormData({ ...formData, branch_id: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Cabang (Opsional)" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-gray-500">
              Kosongkan jika ini akun Pusat.
            </p>
          </div>

          {/* Saldo Awal (Hanya saat create) */}
          {!initialData && (
            <div className="space-y-1 bg-blue-50 p-3 rounded-lg border border-blue-100">
              <Label className="text-blue-800">
                Saldo Awal (Opening Balance)
              </Label>
              <Input
                type="number"
                placeholder="0"
                className="bg-white"
                value={formData.initial_balance}
                onChange={(e) =>
                  setFormData({ ...formData, initial_balance: e.target.value })
                }
              />
              <p className="text-[10px] text-blue-600">
                Sistem akan otomatis membuat Jurnal Saldo Awal.
              </p>
            </div>
          )}

          {/* Status Aktif (Hanya saat edit) */}
          {initialData && (
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Status Akun Aktif
              </Label>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
