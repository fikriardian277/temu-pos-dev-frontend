import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Layers,
  DollarSign,
  Calculator,
  MinusCircle,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";

export default function SalaryComponentsPage() {
  const { authState } = useAuth();

  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    type: "fixed", // fixed, variable, deduction
    excel_column_name: "", // Mapping ke Header Excel
    is_taxable: false,
  });

  // 1. Fetch Data
  useEffect(() => {
    if (authState.business_id) fetchComponents();
  }, [authState.business_id]);

  const fetchComponents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .schema("hr")
      .from("salary_components")
      .select("*")
      .eq("business_id", authState.business_id)
      .order("type", { ascending: false }); // Biar urut: Variable -> Fixed -> Deduction

    if (error) toast.error("Gagal load komponen.");
    setComponents(data || []);
    setLoading(false);
  };

  // 2. Submit Logic
  const handleSubmit = async () => {
    if (!formData.name) return toast.error("Nama komponen wajib diisi.");

    try {
      const payload = {
        business_id: authState.business_id,
        name: formData.name,
        type: formData.type,
        excel_column_name:
          formData.type === "variable" ? formData.excel_column_name : null,
        is_taxable: formData.is_taxable,
      };

      let error;
      if (isEditing) {
        const { error: err } = await supabase
          .schema("hr")
          .from("salary_components")
          .update(payload)
          .eq("id", formData.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .schema("hr")
          .from("salary_components")
          .insert(payload);
        error = err;
      }

      if (error) throw error;
      toast.success(isEditing ? "Komponen diupdate!" : "Komponen ditambahkan!");
      setIsModalOpen(false);
      fetchComponents();
    } catch (e) {
      toast.error("Error: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Hapus komponen ini? Setting gaji karyawan yg pake komponen ini akan hilang."
      )
    )
      return;
    const { error } = await supabase
      .schema("hr")
      .from("salary_components")
      .delete()
      .eq("id", id);
    if (error) toast.error("Gagal hapus.");
    else {
      toast.success("Dihapus.");
      fetchComponents();
    }
  };

  // Helper UI
  const openAdd = () => {
    setIsEditing(false);
    setFormData({
      id: null,
      name: "",
      type: "fixed",
      excel_column_name: "",
      is_taxable: false,
    });
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setIsEditing(true);
    setFormData({
      id: item.id,
      name: item.name,
      type: item.type,
      excel_column_name: item.excel_column_name || "",
      is_taxable: item.is_taxable,
    });
    setIsModalOpen(true);
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "fixed":
        return (
          <Badge className="bg-blue-600">
            <DollarSign className="w-3 h-3 mr-1" /> TETAP (Fixed)
          </Badge>
        );
      case "variable":
        return (
          <Badge className="bg-purple-600">
            <Calculator className="w-3 h-3 mr-1" /> VARIABLE (Hitungan)
          </Badge>
        );
      case "deduction":
        return (
          <Badge className="bg-red-600">
            <MinusCircle className="w-3 h-3 mr-1" /> POTONGAN
          </Badge>
        );
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <div className="p-4 w-full space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          <Layers className="text-purple-600" /> Komponen Gaji (LEGO)
        </h1>
        <Button onClick={openAdd} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" /> Tambah Komponen
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* CARD SUMMARY */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Daftar Komponen Gaji</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b">
                  <tr>
                    <th className="p-4">Nama Komponen</th>
                    <th className="p-4">Tipe & Sifat</th>
                    <th className="p-4">Mapping Excel</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {components.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="p-8 text-center text-slate-400"
                      >
                        Belum ada komponen gaji.
                      </td>
                    </tr>
                  ) : (
                    components.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-800">
                          {c.name}
                        </td>
                        <td className="p-4">{getTypeBadge(c.type)}</td>
                        <td className="p-4">
                          {c.type === "variable" ? (
                            <div className="flex items-center gap-2 text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200 w-fit">
                              <FileSpreadsheet className="w-3 h-3" />
                              Kolom: <b>{c.excel_column_name || "-"}</b>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(c)}
                          >
                            <Edit className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(c.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* SIDEBAR INFO */}
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
            <p className="font-bold mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Apa itu Fixed?
            </p>
            <p className="opacity-80">
              Gaji tetap yang diterima bulanan tanpa hitungan jam. Contoh:{" "}
              <b>Gaji Pokok, Tunjangan Jabatan</b>.
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-sm text-purple-800">
            <p className="font-bold mb-2 flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Apa itu Variable?
            </p>
            <p className="opacity-80">
              Dihitung berdasarkan jumlah (Qty) dari file Excel. Contoh:{" "}
              <b>Lembur</b> (Jam x Rate), <b>Uang Makan</b> (Hari x Rate).
            </p>
          </div>
        </div>
      </div>

      {/* MODAL FORM */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Komponen" : "Tambah Komponen Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nama Komponen</Label>
              <Input
                placeholder="Contoh: Gaji Pokok / Lembur"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Tipe Komponen</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed (Gaji Tetap)</SelectItem>
                  <SelectItem value="variable">
                    Variable (Dikali Qty Excel)
                  </SelectItem>
                  <SelectItem value="deduction">
                    Deduction (Potongan)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* KHUSUS VARIABLE: Minta Nama Kolom Excel */}
            {formData.type === "variable" && (
              <div className="p-3 bg-green-50 rounded border border-green-200 animate-in fade-in slide-in-from-top-2">
                <Label className="text-green-800 flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="w-4 h-4" /> Nama Header Kolom di
                  Excel
                </Label>
                <Input
                  placeholder="Contoh: Overtime Hours"
                  value={formData.excel_column_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      excel_column_name: e.target.value,
                    })
                  }
                  className="bg-white"
                />
                <p className="text-xs text-green-700 mt-1">
                  Sistem akan mencari kolom ini di file Excel Absensi nanti.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between border p-3 rounded bg-slate-50">
              <Label>Kena Pajak PPh 21?</Label>
              <Switch
                checked={formData.is_taxable}
                onCheckedChange={(val) =>
                  setFormData({ ...formData, is_taxable: val })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} className="bg-slate-900">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
