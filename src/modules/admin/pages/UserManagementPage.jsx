import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  MoreHorizontal,
  PlusCircle,
  Loader2,
  Shield,
  User,
  DollarSign,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Label } from "@/components/ui/Label.jsx";
import { Badge } from "@/components/ui/Badge";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/Table.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown-menu.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/Dialog.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/Select.jsx";

function UserManagementPage() {
  const { authState } = useAuth();
  const [users, setUsers] = useState([]);
  const [cabangs, setCabangs] = useState([]);

  // Default role kasir
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "kasir",
    branch_id: "",
  });

  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Ambil data Profiles + Nama Cabang
      let userQuery = supabase.from("profiles").select("*, branches(name)");

      // Filter: Jangan tampilin diri sendiri (Owner)
      if (authState.role === "owner") {
        userQuery = userQuery.not("id", "eq", authState.user.id);
      }

      if (searchTerm) {
        userQuery = userQuery.or(
          `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }

      const userPromise = userQuery.order("created_at", { ascending: false });

      // Ambil data Cabang (Filter by Business ID)
      const cabangPromise = supabase
        .from("branches")
        .select("*")
        .eq("business_id", authState.business_id) // <--- FIX: Filter Cabang
        .order("name");

      const [userResponse, cabangResponse] = await Promise.all([
        userPromise,
        cabangPromise,
      ]);

      if (userResponse.error) throw userResponse.error;
      if (cabangResponse.error) throw cabangResponse.error;

      setUsers(userResponse.data);
      setCabangs(cabangResponse.data);
    } catch (err) {
      toast.error("Gagal mengambil data: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [authState.role, authState.user?.id, authState.business_id, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (authState.role) fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [authState.role, fetchData]);

  // --- SUBMIT CREATE STAFF ---
  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    if (!authState.business_id) {
      return toast.error("Error: ID Bisnis tidak ditemukan.");
    }

    // Validasi: Role Cabang wajib pilih cabang
    // UPDATE: Hanya Finance yang boleh tanpa cabang (Pusat)
    // Admin Branch & Kasir WAJIB pilih cabang.
    const branchRoles = ["kasir", "admin_branch"];
    if (branchRoles.includes(formData.role) && !formData.branch_id) {
      return toast.error(
        `Role ${formData.role.replace("_", " ")} wajib ditempatkan di Cabang.`
      );
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-staff", {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          branch_id: formData.branch_id ? parseInt(formData.branch_id) : null,
          business_id: authState.business_id,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(data.message || `Staff ${formData.role} berhasil dibuat!`);
      fetchData();
      setIsCreateModalOpen(false);
      // Reset Form
      setFormData({
        full_name: "",
        email: "",
        password: "",
        role: "kasir",
        branch_id: "",
      });
    } catch (err) {
      toast.error("Gagal membuat staff: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- DELETE STAFF ---
  const handleDelete = async (userId) => {
    if (!confirm("Yakin hapus user ini selamanya?")) return;

    try {
      const { error } = await supabase.rpc("delete_staff_user", {
        user_id_to_delete: userId,
      });
      if (error) throw error;
      toast.success("Staff berhasil dihapus.");
      fetchData();
    } catch (err) {
      toast.error("Gagal menghapus staff: " + err.message);
    }
  };

  // Helper: Warna Badge Role (UPDATED)
  const getRoleBadge = (role) => {
    switch (role) {
      case "owner":
        return <Badge className="bg-black">Admin Pusat (Owner)</Badge>;
      case "admin_branch":
        return (
          <Badge className="bg-blue-600">
            <Store className="w-3 h-3 mr-1" /> Admin Branch
          </Badge>
        );
      case "finance":
        return (
          <Badge className="bg-emerald-600">
            <DollarSign className="w-3 h-3 mr-1" /> Finance
          </Badge>
        );
      case "kasir":
        return (
          <Badge variant="secondary">
            <User className="w-3 h-3 mr-1" /> Kasir
          </Badge>
        );
      default:
        // Fallback untuk role lama yg mungkin masih ada di DB
        return (
          <Badge variant="outline" className="text-muted-foreground">
            {role}
          </Badge>
        );
    }
  };

  if (authState.role !== "owner") {
    return (
      <div className="text-center p-10">
        <Shield className="mx-auto h-10 w-10 text-red-500 mb-2" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p>Hanya Admin Pusat (Owner) yang dapat mengatur Staff.</p>
      </div>
    );
  }

  return (
    <div className="p-6 pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8 text-slate-700" /> Manajemen Staff
          </h1>
          <p className="text-slate-500">
            Kelola akses karyawan (Kasir, Admin Branch, Finance).
          </p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() =>
                setFormData({
                  full_name: "",
                  email: "",
                  password: "",
                  role: "kasir",
                  branch_id: "",
                })
              }
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Staff Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Tambah Staff / User Baru</DialogTitle>
              <DialogDescription>
                Pilih Role yang sesuai dengan tugas karyawan.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="grid gap-4 py-4">
              {/* NAMA */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Nama Lengkap</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className="col-span-3"
                  required
                />
              </div>

              {/* EMAIL */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Email Login</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="col-span-3"
                  required
                />
              </div>

              {/* PASSWORD */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="col-span-3"
                  required
                />
              </div>

              {/* ROLE SELECTOR (CLEAN & UPDATE) */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Role / Jabatan</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                  defaultValue={formData.role}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Operasional Cabang</SelectLabel>
                      <SelectItem value="kasir">
                        Kasir (Front Office)
                      </SelectItem>
                      <SelectItem value="admin_branch">
                        Admin Branch (Kepala Toko)
                      </SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Kantor Pusat</SelectLabel>
                      <SelectItem value="finance">
                        Finance (Keuangan & HR)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* CABANG (Wajib untuk Kasir & Admin Branch) */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Penempatan</Label>
                <div className="col-span-3 space-y-2">
                  <Select
                    onValueChange={(value) =>
                      setFormData({ ...formData, branch_id: value })
                    }
                    value={formData.branch_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Cabang (Opsional utk Finance)" />
                    </SelectTrigger>
                    <SelectContent>
                      {cabangs?.map((cabang) => (
                        <SelectItem key={cabang.id} value={String(cabang.id)}>
                          {cabang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.role === "finance" && (
                    <p className="text-xs text-slate-500">
                      *Role Finance biasanya di Pusat (Tidak wajib pilih
                      cabang).
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Simpan User"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Cari staff berdasarkan nama atau email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-bold">{user.full_name}</TableCell>
                  <TableCell className="text-slate-500">{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {user.branches?.name ? (
                      <span className="flex items-center gap-1 text-slate-700">
                        <Store className="w-3 h-3" /> {user.branches.name}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">
                        Pusat / All
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(user.id)}
                        >
                          Hapus User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Belum ada staff.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default UserManagementPage;
