// src/pages/IdentitasBisnisPage.jsx

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePageVisibility } from "@/lib/usePageVisibility.js";

// Import komponen UI (Sesuaikan jika perlu)
import { Button } from "@/components/ui/Button.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card.jsx";
import { Input } from "@/components/ui/Input.jsx";
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
  DialogDescription,
} from "@/components/ui/Dialog.jsx";
import { Label } from "@/components/ui/Label.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form.jsx";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  PlusCircle,
  Loader2,
  Building2,
} from "lucide-react"; // Ganti ikon jika mau
import EmptyState from "@/components/ui/EmptyState.jsx";

// Skema Validasi Form (Zod)
const formSchema = z.object({
  nama_identitas: z
    .string()
    .min(3, { message: "Nama internal minimal 3 karakter." }),
  nama_tampil_struk: z
    .string()
    .min(3, { message: "Nama struk minimal 3 karakter." }),
  alamat_struk: z.string().optional(),
  telepon_struk: z.string().optional(),
  logo_url_struk: z
    .string()
    .url({ message: "URL logo tidak valid." })
    .optional()
    .or(z.literal("")), // Opsional URL
  footer_struk: z.string().optional(),
});

function IdentitasBisnisPage() {
  const { authState } = useAuth();
  const [identitasList, setIdentitasList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdentitas, setEditingIdentitas] = useState(null); // Null = Tambah, Object = Edit

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_identitas: "",
      nama_tampil_struk: "",
      alamat_struk: "",
      telepon_struk: "",
      logo_url_struk: "",
      footer_struk: "",
    },
  });

  // --- Fetch Data ---
  const fetchIdentitas = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("identitas_bisnis")
        .select("*")
        .eq("business_id", authState.business_id) // Filter sesuai RLS
        .order("nama_identitas", { ascending: true });

      if (error) throw error;
      setIdentitasList(data || []);
      console.log("fetchIdentitas selesai, data baru:", data);
    } catch (err) {
      toast.error("Gagal mengambil data identitas bisnis.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authState.business_id]);

  useEffect(() => {
    fetchIdentitas();
  }, [fetchIdentitas]);

  //   usePageVisibility(fetchIdentitas);

  // --- Modal & Form Handling ---
  const handleOpenModal = (identitas = null) => {
    setEditingIdentitas(identitas); // Set data yg diedit (null jika tambah)
    form.reset(identitas);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingIdentitas(null);
    form.reset();
  };

  // --- Create / Update ---
  async function onSubmit(data) {
    try {
      let error;
      // Kita tetep minta data balikan biar lebih pasti (meski gak dipake buat update manual)
      let savedData = null;
      const dataToSubmit = {
        ...data,
        business_id: authState.business_id,
      };

      if (editingIdentitas) {
        // --- Proses Update (Minta data balikan) ---
        const { data: updatedData, error: updateError } = await supabase
          .from("identitas_bisnis")
          .update(dataToSubmit)
          .eq("id", editingIdentitas.id)
          .eq("business_id", authState.business_id)
          .select() // <-- Tetap minta balikan
          .single();
        error = updateError;
        savedData = updatedData;
      } else {
        // --- Proses Insert (Minta data balikan) ---
        const { data: insertedData, error: insertError } = await supabase
          .from("identitas_bisnis")
          .insert(dataToSubmit)
          .select() // <-- Tetap minta balikan
          .single();
        error = insertError;
        savedData = insertedData;
      }

      if (error) throw error; // Kalau error, lempar sebelum lanjut

      // --- Logika Setelah Sukses ---
      toast.success(
        `Identitas bisnis berhasil ${editingIdentitas ? "diupdate" : "dibuat"}!`
      );

      // 1. Panggil fetchIdentitas DULU (await biar ditunggu selesai)
      await fetchIdentitas();

      // 2. BARU tutup modal
      handleCloseModal();
    } catch (err) {
      toast.error(
        err.message ||
          `Gagal ${editingIdentitas ? "mengupdate" : "membuat"} identitas.`
      );
    }
    // 'finally' isSubmitting udah diurus react-hook-form
  }

  // --- Delete ---
  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from("identitas_bisnis")
        .delete()
        .eq("id", id)
        .eq("business_id", authState.business_id); // Keamanan!

      if (error) throw error;
      toast.success("Identitas bisnis berhasil dihapus.");
      fetchIdentitas(); // Refresh data
    } catch (err) {
      // Cek apakah error karena masih dipakai di tabel customers
      if (
        err.code === "23503" &&
        err.message.includes("customers_id_identitas_bisnis_fkey")
      ) {
        toast.error(
          "Gagal hapus: Identitas ini masih digunakan oleh pelanggan hotel/villa."
        );
      } else {
        toast.error(err.message || "Gagal menghapus identitas.");
      }
      console.error("Error Hapus Identitas:", err);
    }
  };

  // --- Render UI ---
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manajemen Identitas Bisnis</h1>
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Identitas
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Identitas</CardTitle>
          <CardDescription>
            Kelola profil identitas (nama, alamat, dll) yang akan tampil di
            struk klien tertentu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : identitasList.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Internal</TableHead>
                    <TableHead>Nama Tampil di Struk</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {identitasList?.map((identitas) => (
                    <TableRow key={identitas.id}>
                      <TableCell className="font-medium">
                        {identitas.nama_identitas}
                      </TableCell>
                      <TableCell className="text-primary">
                        {identitas.nama_tampil_struk}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {identitas.alamat_struk || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {identitas.telepon_struk || "-"}
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
                              onClick={() => handleOpenModal(identitas)}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Anda Yakin?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Aksi ini akan menghapus identitas '
                                    {identitas.nama_identitas}' secara permanen.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(identitas.id)}
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
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={<Building2 className="h-16 w-16" />} // Ganti ikon
              title="Belum Ada Identitas Bisnis"
              description="Tambahkan identitas bisnis (misal: nama toko, alamat) yang bisa digunakan untuk struk klien khusus."
            />
          )}
        </CardContent>
      </Card>

      {/* --- MODAL TAMBAH/EDIT --- */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingIdentitas ? "Edit" : "Tambah"} Identitas Bisnis
            </DialogTitle>
            <DialogDescription>
              Masukkan detail identitas yang akan digunakan pada struk.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4"
            >
              <FormField
                control={form.control}
                name="nama_identitas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Internal</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Misal: Superclean Utama"
                        {...field}
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nama_tampil_struk"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Tampil di Struk</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Misal: Superclean Laundry Express"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="alamat_struk"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat Struk (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Alamat lengkap..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telepon_struk"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telepon Struk (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="0812..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Tambahkan field Logo URL & Footer jika perlu */}
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IdentitasBisnisPage;
