import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Loader2, Tag, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/Select"; // <-- Update import Select
import { Switch } from "@/components/ui/Switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

export default function PromoSettingsTab() {
  const { authState } = useAuth();
  const [promos, setPromos] = useState([]);
  const [serviceOptions, setServiceOptions] = useState([]); // Data buat dropdown
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    discount_type: "percent",
    discount_value: "",
    target_package_id: "all", // Bisa 'all', atau ID_PAKET
    is_active: true,
  });

  useEffect(() => {
    if (authState.business_id) {
      fetchData();
    }
  }, [authState.business_id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Promo yang sudah ada
      const { data: promoData, error: promoError } = await supabase
        .from("promo_programs")
        .select(`*, packages(name, services(name))`) // Join ke packages -> services
        .eq("business_id", authState.business_id)
        .order("created_at", { ascending: false });

      if (promoError) throw promoError;
      setPromos(promoData || []);

      // 2. Fetch Opsi Target (HIRARKI LENGKAP: Kategori -> Layanan -> Paket)
      // Kita ambil dari 'categories' biar urutannya rapi kayak di menu Layanan
      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select(
          `
                    name, 
                    services (
                        id, 
                        name, 
                        packages (id, name, price, unit)
                    )
                `
        )
        .eq("business_id", authState.business_id)
        .order("urutan", { ascending: true });

      if (catError) throw catError;
      setServiceOptions(catData || []);
    } catch (e) {
      toast.error("Gagal load data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        business_id: authState.business_id,
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        // Kalau 'all', target_package_id jadi NULL (artinya Global Promo)
        // Kalau angka, berarti target paket tertentu
        target_package_id:
          formData.target_package_id === "all"
            ? null
            : parseInt(formData.target_package_id),
        is_active: formData.is_active,
      };

      let error;
      if (editingId) {
        const { error: editError } = await supabase
          .from("promo_programs")
          .update(payload)
          .eq("id", editingId);
        error = editError;
      } else {
        const { error: addError } = await supabase
          .from("promo_programs")
          .insert(payload);
        error = addError;
      }

      if (error) throw error;
      toast.success(editingId ? "Promo diperbarui!" : "Promo berhasil dibuat!");
      setIsModalOpen(false);
      setEditingId(null);
      resetForm();
      fetchData();
    } catch (e) {
      toast.error("Gagal simpan: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin hapus promo ini?")) return;
    const { error } = await supabase
      .from("promo_programs")
      .delete()
      .eq("id", id);
    if (error) toast.error("Gagal hapus.");
    else {
      toast.success("Dihapus.");
      fetchData();
    }
  };

  const handleEdit = (promo) => {
    setEditingId(promo.id);
    setFormData({
      name: promo.name,
      start_date: promo.start_date,
      end_date: promo.end_date,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      target_package_id: promo.target_package_id
        ? String(promo.target_package_id)
        : "all",
      is_active: promo.is_active,
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    // Default tanggal hari ini
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      name: "",
      start_date: today,
      end_date: today,
      discount_type: "percent",
      discount_value: "",
      target_package_id: "all",
      is_active: true,
    });
    setEditingId(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Program Promo & Diskon Otomatis</CardTitle>
          <CardDescription>
            Atur diskon periode (Misal: Promo 17 Agustus).
          </CardDescription>
        </div>
        <Dialog
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Buat Promo Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Promo" : "Buat Promo Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 py-4">
              <div>
                <Label>Nama Promo</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Contoh: Promo Akhir Tahun"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mulai Tanggal</Label>
                  <Input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Sampai Tanggal</Label>
                  <Input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipe Diskon</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(v) =>
                      setFormData({ ...formData, discount_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Persen (%)</SelectItem>
                      <SelectItem value="nominal">Nominal (Rp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nilai Diskon</Label>
                  <Input
                    type="number"
                    required
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_value: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* --- UPDATE BAGIAN DROPDOWN INI --- */}
              <div>
                <Label>Target Paket / Layanan</Label>
                <Select
                  value={formData.target_package_id}
                  onValueChange={(v) =>
                    setFormData({ ...formData, target_package_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Target Diskon" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem
                      value="all"
                      className="font-bold text-blue-600 bg-blue-50"
                    >
                      🎉 Semua Layanan (Total Belanja)
                    </SelectItem>

                    {/* LOOPING KATEGORI */}
                    {serviceOptions.map((kategori) => (
                      <SelectGroup key={kategori.name}>
                        <SelectLabel className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50 py-1 mt-1">
                          Kategori: {kategori.name}
                        </SelectLabel>

                        {/* LOOPING LAYANAN & PAKET */}
                        {kategori.services?.map((svc) =>
                          svc.packages?.map((pkg) => (
                            <SelectItem key={pkg.id} value={String(pkg.id)}>
                              <span className="font-medium text-slate-700">
                                {svc.name}
                              </span>
                              <span className="mx-2 text-slate-300">/</span>
                              {pkg.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  *Pilih "Semua Layanan" jika ingin diskon memotong Grand Total
                  transaksi.
                  <br />
                  *Pilih Paket spesifik jika diskon hanya berlaku untuk item
                  tersebut.
                </p>
              </div>
              {/* --- SELESAI UPDATE --- */}

              <div className="flex items-center space-x-2 border p-3 rounded-md">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, is_active: c })
                  }
                />
                <div className="flex flex-col">
                  <Label>Status Aktif</Label>
                  <span className="text-[10px] text-muted-foreground">
                    Promo hanya jalan jika aktif & sesuai tanggal.
                  </span>
                </div>
              </div>
              <Button type="submit" className="w-full">
                Simpan Promo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Promo</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Diskon</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : promos.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  Belum ada promo.
                </TableCell>
              </TableRow>
            ) : (
              promos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-bold">{p.name}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{" "}
                        {new Date(p.start_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <span className="text-slate-400">s/d</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{" "}
                        {new Date(p.end_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="border-green-300 bg-green-50 text-green-700"
                    >
                      {p.discount_type === "percent"
                        ? `${p.discount_value}%`
                        : `Rp ${Number(p.discount_value).toLocaleString(
                            "id-ID"
                          )}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.target_package_id ? (
                      <div className="flex flex-col">
                        <span className="text-slate-500 text-[10px]">
                          {p.packages?.services?.name}
                        </span>
                        <span className="font-medium">{p.packages?.name}</span>
                      </div>
                    ) : (
                      <Badge>Total Belanja (All)</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        p.is_active
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "bg-slate-300 text-slate-500 hover:bg-slate-300"
                      }
                    >
                      {p.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(p)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-red-600"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
