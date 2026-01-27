import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Building2,
  CreditCard,
  Briefcase, // Icon baru buat jabatan
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
} from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";

export default function EmployeesPage() {
  const { authState } = useAuth();

  // Data State
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter State
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // TAMBAHAN: state 'position' di sini
  const [formData, setFormData] = useState({
    id: null,
    nik: "",
    name: "",
    position: "", // <--- NEW
    phone: "",
    email: "",
    branch_id: "",
    bank_name: "",
    account_number: "",
    status: "active",
  });

  // 1. Fetch Data Initial
  useEffect(() => {
    if (authState.business_id) {
      fetchBranches();
      fetchEmployees();
    }
  }, [authState.business_id]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from("branches")
      .select("id, name")
      .eq("business_id", authState.business_id);
    setBranches(data || []);
  };

  const fetchEmployees = async () => {
    setLoading(true);

    // KEMBALI KE CODINGAN ASLI LU (Tembak View)
    // Supaya gak error "Relationship not found"
    let query = supabase
      .schema("hr")
      .from("view_employees")
      .select("*")
      .eq("business_id", authState.business_id)
      .order("name", { ascending: true });

    const { data, error } = await query;
    if (error) toast.error("Gagal load karyawan: " + error.message);
    setEmployees(data || []);
    setLoading(false);
  };

  // 2. Handle Submit (Add/Edit)
  const handleSubmit = async () => {
    if (!formData.nik || !formData.name || !formData.branch_id) {
      return toast.error("NIK, Nama, dan Cabang wajib diisi.");
    }

    try {
      const payload = {
        business_id: authState.business_id,
        nik: formData.nik,
        name: formData.name,
        position: formData.position, // <--- UPDATE: Masukkan Jabatan ke Payload
        phone: formData.phone,
        email: formData.email,
        branch_id: parseInt(formData.branch_id),
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        status: formData.status,
      };

      let error;
      if (isEditing) {
        const { error: err } = await supabase
          .schema("hr")
          .from("employees") // Update tetap ke tabel asli (bukan view) jadi aman
          .update(payload)
          .eq("id", formData.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .schema("hr")
          .from("employees")
          .insert(payload);
        error = err;
      }

      if (error) throw error;

      toast.success(isEditing ? "Data diperbarui!" : "Karyawan ditambahkan!");
      setIsModalOpen(false);
      fetchEmployees();
    } catch (e) {
      console.error(e);
      toast.error("Gagal simpan: " + e.message);
    }
  };

  // 3. Helper Functions
  const openAddModal = () => {
    setIsEditing(false);
    setFormData({
      id: null,
      nik: "",
      name: "",
      position: "", // Reset
      phone: "",
      email: "",
      branch_id: "",
      bank_name: "",
      account_number: "",
      status: "active",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (emp) => {
    setIsEditing(true);
    setFormData({
      id: emp.id,
      nik: emp.nik,
      name: emp.name,
      position: emp.position || "", // Load existing position (kalo view udah update)
      phone: emp.phone || "",
      email: emp.email || "",
      branch_id: String(emp.branch_id),
      bank_name: emp.bank_name || "",
      account_number: emp.account_number || "",
      status: emp.status,
    });
    setIsModalOpen(true);
  };

  // Filter Logic
  const filteredEmployees = employees.filter((emp) => {
    const matchBranch =
      selectedBranch === "all" || String(emp.branch_id) === selectedBranch;
    const matchSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.nik.includes(searchTerm);
    return matchBranch && matchSearch;
  });

  return (
    <div className="p-4 w-full space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          <Users className="text-blue-600" /> Data Karyawan
        </h1>
        <Button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" /> Tambah Karyawan
        </Button>
      </div>

      {/* FILTER BAR */}
      <div className="flex gap-4 items-center bg-white p-3 rounded border">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari Nama / NIK..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Semua Cabang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Cabang</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TABLE DATA */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b">
                <tr>
                  <th className="p-4">NIK & Nama</th>
                  {/* UPDATE UI HEADER */}
                  <th className="p-4">Jabatan & Cabang</th>
                  <th className="p-4">Kontak</th>
                  <th className="p-4">Info Bank</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      Tidak ada data karyawan.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          {emp.nik}
                        </p>
                      </td>
                      {/* UPDATE UI ROW: TAMPILKAN JABATAN */}
                      <td className="p-4">
                        <div className="space-y-1">
                          {/* Kalau kolom position di view belum ada, dia cuma nampilin strip */}
                          <div className="flex items-center gap-2 font-bold text-slate-700">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            <span>{emp.position || "-"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Building2 className="w-3 h-3" />
                            <span>{emp.branch_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">
                        <p>{emp.phone || "-"}</p>
                        <p className="text-xs text-blue-500">{emp.email}</p>
                      </td>
                      <td className="p-4">
                        {emp.bank_name ? (
                          <div className="flex items-center gap-2 text-slate-700">
                            <CreditCard className="w-3 h-3" />
                            <span>
                              {emp.bank_name} - {emp.account_number}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">
                            Belum set
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          variant={
                            emp.status === "active" ? "default" : "secondary"
                          }
                          className={
                            emp.status === "active" ? "bg-green-600" : ""
                          }
                        >
                          {emp.status === "active" ? "Aktif" : "Resign"}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(emp)}
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
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

      {/* MODAL ADD / EDIT */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Karyawan" : "Tambah Karyawan Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>NIK (Nomor Induk) *</Label>
                <Input
                  value={formData.nik}
                  onChange={(e) =>
                    setFormData({ ...formData, nik: e.target.value })
                  }
                  placeholder="Contoh: 2501001"
                  disabled={isEditing}
                />
              </div>
              <div>
                <Label>Nama Lengkap *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nama Karyawan"
                />
              </div>
            </div>

            {/* --- UPDATE: BARIS INPUT JABATAN --- */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jabatan / Posisi</Label>
                <Input
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                  placeholder="Cth: Staff Produksi"
                />
              </div>
              <div>
                <Label>Cabang Penempatan *</Label>
                <Select
                  value={formData.branch_id}
                  onValueChange={(val) =>
                    setFormData({ ...formData, branch_id: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Cabang" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>No HP</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="08xxx"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded border border-slate-200">
              <p className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1 uppercase">
                <CreditCard className="w-3 h-3" /> Info Rekening Gaji
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama Bank</Label>
                  <Input
                    value={formData.bank_name}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_name: e.target.value })
                    }
                    placeholder="BCA/Mandiri"
                  />
                </div>
                <div>
                  <Label>No Rekening</Label>
                  <Input
                    value={formData.account_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        account_number: e.target.value,
                      })
                    }
                    placeholder="123xxx"
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div>
                <Label>Status Karyawan</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData({ ...formData, status: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="resigned">Resign / Non-Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Simpan Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
