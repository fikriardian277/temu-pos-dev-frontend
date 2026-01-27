// src/pages/CabangManagementPage.jsx (VERSI UPDATE FEE MANAGEMENT)

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  MoreHorizontal,
  PlusCircle,
  Loader2,
  DollarSign,
  Percent,
} from "lucide-react";

// Impor komponen-komponen UI
import { Button } from "@/components/ui/Button.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Label } from "@/components/ui/Label.jsx";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/Alert-dialog.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/Dialog.jsx";
// TAMBAHAN IMPORT SELECT
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select.jsx";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

function CabangManagementPage() {
  const { authState } = useAuth();
  const [cabangs, setCabangs] = useState([]);

  // STATE FORM UPDATED
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone_number: "",
    type: "outlet", // <--- TAMBAH INI (Default Outlet)
    management_fee_type: "percentage",
    management_fee_rate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCabang, setEditingCabang] = useState(null);

  const fetchCabangs = useCallback(async () => {
    if (!authState.business_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("business_id", authState.business_id)
        .order("created_at");

      if (error) throw error;
      setCabangs(data);
    } catch (err) {
      toast.error("Gagal mengambil data cabang: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [authState.business_id]);

  useEffect(() => {
    fetchCabangs();
  }, [fetchCabangs]);

  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handle Select Change Manual karena ShadCN Select beda eventnya
  const handleSelectChange = (value, field) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleEditInputChange = (e) =>
    setEditingCabang({ ...editingCabang, [e.target.name]: e.target.value });

  const handleEditSelectChange = (value, field) => {
    setEditingCabang({ ...editingCabang, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("branches").insert({
        name: formData.name,
        address: formData.address,
        phone_number: formData.phone_number,
        business_id: authState.business_id,
        type: formData.type, // <--- TAMBAH INI BIAR KESIMPAN
        management_fee_type: formData.management_fee_type,
        management_fee_rate: parseFloat(formData.management_fee_rate) || 0,
      });
      if (error) throw error;

      toast.success(`Cabang "${formData.name}" berhasil dibuat!`);
      setFormData({
        name: "",
        address: "",
        phone_number: "",
        management_fee_type: "percentage",
        management_fee_rate: 0,
      });
      setIsCreateModalOpen(false);
      fetchCabangs();
    } catch (err) {
      toast.error(err.message || "Gagal membuat cabang.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("branches")
        .update({
          name: editingCabang.name,
          address: editingCabang.address,
          phone_number: editingCabang.phone_number,
          type: editingCabang.type,
          management_fee_type: editingCabang.management_fee_type,
          management_fee_rate:
            parseFloat(editingCabang.management_fee_rate) || 0,
        })
        .eq("id", editingCabang.id)
        .eq("business_id", authState.business_id);

      if (error) throw error;

      toast.success("Cabang berhasil diupdate!");
      setIsEditModalOpen(false);
      setEditingCabang(null);
      fetchCabangs();
    } catch (err) {
      toast.error(err.message || "Gagal mengupdate cabang.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cabangId) => {
    try {
      const { error } = await supabase
        .from("branches")
        .delete()
        .eq("id", cabangId)
        .eq("business_id", authState.business_id);

      if (error) throw error;

      toast.success("Cabang berhasil dihapus.");
      fetchCabangs();
    } catch (err) {
      toast.error(err.message || "Gagal menghapus cabang.");
    }
  };

  if (authState.role !== "owner") {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p>Hanya Owner yang dapat mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manajemen Cabang</h1>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setFormData({
                  name: "",
                  address: "",
                  phone_number: "",
                  type: "outlet",
                  management_fee_type: "percentage",
                  management_fee_rate: 0,
                });
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Cabang
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Tambah Cabang Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Tipe Entitas</Label>
                <div className="col-span-3">
                  <Select
                    value={formData.type}
                    onValueChange={(val) => handleSelectChange(val, "type")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outlet">
                        Outlet Laundry (Cabang)
                      </SelectItem>
                      <SelectItem value="warehouse">
                        Gudang Utama (Warehouse)
                      </SelectItem>
                      <SelectItem value="ho">
                        Head Office (Kantor Pusat)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Nama & Alamat (Existing) */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nama Cabang
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Alamat
                </Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone_number" className="text-right">
                  Telepon
                </Label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>

              {/* --- BAGIAN BARU: MANAGEMENT FEE --- */}
              {formData.type === "outlet" && (
                <div className="border-t pt-4 mt-2">
                  <Label className="mb-2 block font-semibold text-blue-700">
                    Setting Management Fee
                  </Label>
                  <div className="grid grid-cols-4 items-center gap-4 mb-3">
                    <Label className="text-right">Tipe Fee</Label>
                    <div className="col-span-3">
                      <Select
                        value={formData.management_fee_type}
                        onValueChange={(val) =>
                          handleSelectChange(val, "management_fee_type")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Tipe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">
                            Persentase (%) dari Omzet
                          </SelectItem>
                          <SelectItem value="fixed">
                            Nominal Tetap (Fix)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Nilai Fee</Label>
                    <div className="col-span-3 relative">
                      <Input
                        type="number"
                        name="management_fee_rate"
                        value={formData.management_fee_rate}
                        onChange={handleInputChange}
                        className="pl-8" // Padding kiri buat icon
                        placeholder="0"
                      />
                      <div className="absolute left-2.5 top-2.5 text-muted-foreground">
                        {formData.management_fee_type === "percentage" ? (
                          <Percent className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-bold">Rp</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* ----------------------------------- */}

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Cabang"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Daftar Cabang</CardTitle>
          <CardDescription>
            Semua cabang yang terdaftar di usaha Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Cabang</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Telepon</TableHead>

                    <TableHead>Management Fee</TableHead>
                    <TableHead>Tipe</TableHead>

                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        Memuat data cabang...
                      </TableCell>
                    </TableRow>
                  ) : (
                    cabangs?.map((cabang) => (
                      <TableRow key={cabang.id}>
                        <TableCell className="font-medium">
                          {cabang.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cabang.address}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cabang.phone_number}
                        </TableCell>

                        {/* TAMPILAN FEE */}
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              cabang.management_fee_rate > 0
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {cabang.management_fee_type === "fixed"
                              ? formatRupiah(cabang.management_fee_rate)
                              : `${cabang.management_fee_rate}%`}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                              cabang.type === "ho"
                                ? "bg-purple-100 text-purple-700"
                                : cabang.type === "warehouse"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {cabang.type}
                          </span>
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
                                onClick={() => {
                                  setEditingCabang(cabang);
                                  setIsEditModalOpen(true);
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    Hapus
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Anda Yakin?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Aksi ini akan menghapus cabang '
                                      {cabang.name}'. Aksi ini tidak dapat
                                      dibatalkan.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(cabang.id)}
                                    >
                                      Ya, Hapus
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      {editingCabang && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Cabang: {editingCabang.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Nama Cabang
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={editingCabang.name || ""}
                  onChange={handleEditInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-address" className="text-right">
                  Alamat
                </Label>
                <Input
                  id="edit-address"
                  name="address"
                  value={editingCabang.address || ""}
                  onChange={handleEditInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone_number" className="text-right">
                  Telepon
                </Label>
                <Input
                  id="edit-phone_number"
                  name="phone_number"
                  value={editingCabang.phone_number || ""}
                  onChange={handleEditInputChange}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Tipe Entitas</Label>
                <div className="col-span-3">
                  <Select
                    // PERHATIKAN: Pake editingCabang, bukan formData
                    value={editingCabang?.type || "outlet"}
                    onValueChange={(val) => handleEditSelectChange(val, "type")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outlet">Outlet Laundry</SelectItem>
                      <SelectItem value="warehouse">Gudang Utama</SelectItem>
                      <SelectItem value="ho">Head Office</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* --- EDIT BAGIAN FEE --- */}
              <div className="border-t pt-4 mt-2">
                <Label className="mb-2 block font-semibold text-blue-700">
                  Setting Management Fee
                </Label>
                <div className="grid grid-cols-4 items-center gap-4 mb-3">
                  <Label className="text-right">Tipe Fee</Label>
                  <div className="col-span-3">
                    <Select
                      value={editingCabang.management_fee_type || "percentage"}
                      onValueChange={(val) =>
                        handleEditSelectChange(val, "management_fee_type")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Tipe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          Persentase (%) dari Omzet
                        </SelectItem>
                        <SelectItem value="fixed">
                          Nominal Tetap (Fix)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Nilai Fee</Label>
                  <div className="col-span-3 relative">
                    <Input
                      type="number"
                      name="management_fee_rate"
                      value={editingCabang.management_fee_rate || 0}
                      onChange={handleEditInputChange}
                      className="pl-8"
                      placeholder="0"
                    />
                    <div className="absolute left-2.5 top-2.5 text-muted-foreground">
                      {editingCabang.management_fee_type === "fixed" ? (
                        <span className="text-xs font-bold">Rp</span>
                      ) : (
                        <Percent className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* ----------------------- */}

              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default CabangManagementPage;
