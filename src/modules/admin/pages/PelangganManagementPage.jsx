// src/pages/PelangganManagementPage.jsx (VERSI ANTI-BOCOR & LENGKAP)

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePageVisibility } from "@/lib/usePageVisibility.js";
import { useNavigate } from "react-router-dom";

// ... (semua import komponen UI kamu tidak berubah)
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select.jsx";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/Table.jsx";
import { Badge } from "@/components/ui/Badge.jsx";
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
  Users2,
  PlusCircle,
  Loader2,
  Download,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState.jsx";

// PERUBAHAN #1: Gunakan nama kolom asli di blueprint
const formSchema = z.object({
  name: z.string().min(3, { message: "Nama minimal 3 karakter." }),
  phone_number: z
    .string()
    .regex(/^[0-9]+$/, { message: "Nomor HP hanya boleh berisi angka." })
    .min(10, { message: "Nomor HP minimal 10 digit." }),
  address: z.string().optional(),
  branch_id: z.string().optional(),
  tipe_pelanggan: z.enum(["reguler", "hotel"]).optional(),
  default_service_id: z.string().optional(),
  id_identitas_bisnis: z.string().optional(),
  // 👇 TAMBAHAN BARU
  customer_code: z
    .string()
    .max(5, { message: "Kode maksimal 5 karakter." })
    .optional(),
});

function PelangganManagementPage() {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [pelanggans, setPelanggans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCSV, setLoadingCSV] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cabangs, setCabangs] = useState([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPelanggan, setEditingPelanggan] = useState(null);
  const [hotelServices, setHotelServices] = useState([]);
  const [businessIdentities, setBusinessIdentities] = useState([]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", phone_number: "", address: "", branch_id: "" },
  });

  useEffect(() => {
    const fetchHotelServices = async () => {
      if (
        (authState.role === "owner" || authState.role === "admin") &&
        authState.business_id
      ) {
        try {
          // Cari ID kategori "Hotel & Villa"
          const { data: categoryData, error: categoryError } = await supabase
            .from("categories")
            .select("id")
            .eq("business_id", authState.business_id)
            .eq("name", "Hotel & Villa") // Pastikan nama kategori benar
            .maybeSingle();

          if (categoryError) throw categoryError;

          if (categoryData) {
            // Ambil layanan di bawah kategori itu
            const { data: servicesData, error: servicesError } = await supabase
              .from("services")
              .select("id, name")
              .eq("business_id", authState.business_id)
              .eq("category_id", categoryData.id)
              .order("name", { ascending: true });

            if (servicesError) throw servicesError;
            setHotelServices(servicesData || []);
          } else {
            setHotelServices([]); // Kosongkan jika kategori tdk ada
          }
        } catch (error) {
          console.error("Gagal fetch layanan hotel:", error);
          toast.error("Gagal memuat daftar layanan hotel.");
        }
      }
    };
    if (authState.isReady) {
      // Panggil setelah auth siap
      fetchHotelServices();
    }
  }, [authState.isReady, authState.role, authState.business_id]);

  useEffect(() => {
    const fetchBusinessIdentities = async () => {
      // Hanya Owner/Admin yang perlu fetch ini untuk form
      if (
        (authState.role === "owner" || authState.role === "admin") &&
        authState.business_id
      ) {
        try {
          const { data, error } = await supabase
            .from("identitas_bisnis")
            .select("id, nama_identitas") // Ambil ID dan nama internal
            .eq("business_id", authState.business_id)
            .order("nama_identitas", { ascending: true });

          if (error) throw error;
          setBusinessIdentities(data || []);
        } catch (error) {
          console.error("Gagal fetch identitas bisnis:", error);
          // Tidak perlu toast error di sini, fieldnya opsional/kondisional
        }
      }
    };
    if (authState.isReady) {
      fetchBusinessIdentities();
    }
  }, [authState.isReady, authState.role, authState.business_id]);

  const fetchPelanggans = useCallback(async () => {
    if (!authState.business_id) return;
    try {
      setLoading(true);

      let query = supabase.from("customers").select("*, branches(name)");

      // PERUBAHAN #2: Filter berdasarkan business_id & branch_id
      query = query.eq("business_id", authState.business_id);
      query = query.eq("status", "aktif");
      if (authState.role !== "owner") {
        query = query.eq("branch_id", authState.branch_id);
      }

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });
      if (error) throw error;

      // PERUBAHAN #3: Hapus "penerjemah", gunakan data apa adanya
      setPelanggans(data);
    } catch (err) {
      toast.error("Gagal mengambil data pelanggan.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, authState.business_id, authState.role, authState.branch_id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPelanggans();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchPelanggans]);

  // PERUBAHAN #4: Fetch cabang menggunakan supabase
  useEffect(() => {
    if (authState.role === "owner" && authState.business_id) {
      const fetchCabangsForOwner = async () => {
        const { data } = await supabase
          .from("branches")
          .select("*")
          .eq("business_id", authState.business_id);
        setCabangs(data || []);
      };
      fetchCabangsForOwner();
    }
  }, [authState.role, authState.business_id]);

  // usePageVisibility(fetchPelanggans);

  const handleDownloadCSV = async () => {
    if (!authState.isReady || !authState.business_id || loadingCSV) return;

    setLoadingCSV(true);
    try {
      // Tentukan target branch_id (owner = null, lainnya = branch ID mereka)
      const targetBranchId =
        authState.role === "owner" ? null : authState.branch_id;

      // Panggil RPC baru
      const { data, error } = await supabase.rpc("get_customers_for_csv", {
        p_search_term: searchTerm, // Gunakan searchTerm dari state
        p_branch_id: targetBranchId,
        p_business_id: authState.business_id,
      });

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info(
          "Tidak ada data pelanggan untuk di-download pada filter ini."
        );
        return;
      }

      // 1. Definisikan Header CSV (sesuai urutan RETURNS TABLE di SQL)
      const headers = [
        "Nama Pelanggan",
        "Nomor HP",
        "Alamat",
        "Status Member",
        "Poin",
        "Cabang Terdaftar",
        "Tanggal Daftar",
      ];

      // 2. Escape function (sama seperti sebelumnya)
      const escapeCsvValue = (value) => {
        if (value === null || typeof value === "undefined") return "";
        const stringValue = String(value);
        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      // 3. Ubah Array of Objects jadi Array of Arrays
      const csvData = data.map((row) => [
        row.nama_pelanggan,
        row.nomor_hp,
        row.alamat,
        row.status_member ? "Ya" : "Tidak", // Ubah boolean jadi teks
        row.poin,
        row.nama_cabang,
        row.tanggal_daftar,
      ]);

      // 4. Gabungkan Header dan Data jadi string CSV (dengan BOM dan sep=,)
      const headerString = headers.map(escapeCsvValue).join(",");
      const dataString = csvData
        .map((row) => row.map(escapeCsvValue).join(","))
        .join("\n");
      const csvContent =
        "\ufeff" + "sep=,\n" + headerString + "\n" + dataString;

      // 5. Buat Blob dan Link Download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      // Nama file: Pelanggan_YYYY-MM-DD.csv
      const today = new Date().toISOString().split("T")[0];
      const fileName = `Pelanggan_${today}.csv`;
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Gagal download CSV Pelanggan:", error);
      toast.error(error.message || "Gagal mengunduh data pelanggan.");
    } finally {
      setLoadingCSV(false);
    }
  };

  async function onSubmit(data) {
    try {
      if (authState.role === "owner" && !data.branch_id) {
        toast.error("Owner wajib memilih cabang.");
        form.setError("branch_id", { message: "Cabang wajib diisi." });
        return;
      }

      // VVV INI DIA LOGIKA BARUNYA VVV
      const targetBranchId = data.branch_id
        ? parseInt(data.branch_id)
        : authState.branch_id;

      // 1. Cek dulu nomor HP ini udah ada apa belum
      const { data: existingCustomer, error: checkError } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", authState.business_id)
        .eq("phone_number", data.phone_number)
        .maybeSingle(); // maybeSingle() gak error kalo datanya null

      if (checkError) throw checkError;

      if (existingCustomer) {
        // --- DATA DITEMUKAN ---
        if (existingCustomer.status === "aktif") {
          // Kalo aktif, ya error
          toast.error(
            "Nomor HP ini sudah terdaftar atas nama: " + existingCustomer.name
          );
          form.setError("phone_number", {
            message: "Nomor HP sudah terdaftar.",
          });
          return;
        } else {
          // Kalo 'nonaktif', kita tanya!
          if (
            window.confirm(
              `Nomor HP ini sudah ada (status: Nonaktif) atas nama: ${existingCustomer.name}.\n\nAktifkan & update datanya?`
            )
          ) {
            // Kalo user klik "OK", kita UPDATE
            const { error: updateError } = await supabase
              .from("customers")
              .update({
                status: "aktif",
                name: data.name,
                address: data.address,
                branch_id: targetBranchId,
                // VVV TAMBAH LOGIKA TIPE PELANGGAN VVV
                tipe_pelanggan:
                  authState.role === "owner" || authState.role === "admin"
                    ? data.tipe_pelanggan || "reguler" // Ambil dari form jika owner/admin
                    : "reguler", // Default 'reguler' jika kasir (meski case ini jarang)
                // ^^^ SELESAI ^^^
                default_service_id:
                  data.tipe_pelanggan === "hotel" && data.default_service_id
                    ? parseInt(data.default_service_id) // Ambil dari form jika hotel
                    : null,
                id_identitas_bisnis:
                  data.tipe_pelanggan === "hotel" && data.id_identitas_bisnis
                    ? parseInt(data.id_identitas_bisnis) // Ambil dari form jika dipilih
                    : null,
              })
              .eq("id", existingCustomer.id);

            if (updateError) throw updateError;
            toast.success(
              `Pelanggan "${data.name}" berhasil diaktifkan kembali!`
            );
          } else {
            // Kalo user klik "Cancel", gajadi ngapa-ngapain
            return;
          }
        }
      } else {
        // --- DATA GAK DITEMUKAN (NOMOR HP BARU) ---
        // 2. Kalo aman, baru INSERT
        const { error: insertError } = await supabase.from("customers").insert({
          name: data.name,
          phone_number: data.phone_number,
          address: data.address,
          branch_id: targetBranchId,
          business_id: authState.business_id,
          status: "aktif",
          tipe_pelanggan:
            authState.role === "owner" || authState.role === "admin"
              ? data.tipe_pelanggan || "reguler"
              : "reguler",
          default_service_id:
            data.tipe_pelanggan === "hotel" && data.default_service_id
              ? parseInt(data.default_service_id)
              : null,
          id_identitas_bisnis:
            data.tipe_pelanggan === "hotel" && data.id_identitas_bisnis
              ? parseInt(data.id_identitas_bisnis)
              : null,
          // 👇 TAMBAHAN
          customer_code:
            data.tipe_pelanggan === "hotel" ? data.customer_code : null,
        });
        if (insertError) throw insertError;
        toast.success(`Pelanggan "${data.name}" berhasil dibuat!`);
      }

      // Kalo lolos (insert atau update), tutup modal & refresh
      setIsNewModalOpen(false);
      fetchPelanggans();
      form.reset();
    } catch (err) {
      toast.error(err.message || "Gagal memproses pelanggan.");
    }
  }

  // ... (Logika form Edit & Delete diperkuat)
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingPelanggan) return;
    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name: editingPelanggan.name,
          phone_number: editingPelanggan.phone_number,
          address: editingPelanggan.address,
          id_identitas_bisnis: editingPelanggan.id_identitas_bisnis,
          default_service_id: editingPelanggan.default_service_id,
          // 👇 TAMBAHAN UPDATE
          customer_code:
            editingPelanggan.tipe_pelanggan === "hotel"
              ? editingPelanggan.customer_code
              : null,
        })
        .eq("id", editingPelanggan.id)
        .eq("business_id", authState.business_id);

      if (error) throw error;
      toast.success("Data pelanggan berhasil diupdate!");
      setIsEditModalOpen(false);
      fetchPelanggans();
    } catch (err) {
      toast.error(err.message || "Gagal mengupdate pelanggan.");
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditingPelanggan((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditIdentitasChange = (value) => {
    setEditingPelanggan((prev) => ({
      ...prev,
      // Simpan sebagai number (atau null jika string kosong)
      id_identitas_bisnis: value ? parseInt(value) : null,
    }));
  };

  const handleEditServiceChange = (value) => {
    setEditingPelanggan((prev) => ({
      ...prev,
      // Simpan sebagai number (atau null jika string kosong, tapi ini required jadi harusnya selalu ada)
      default_service_id: value ? parseInt(value) : null,
    }));
  };

  const handleDelete = async (id) => {
    try {
      // VVV INI DIA PERUBAHANNYA VVV
      // Bukan .delete(), tapi .update()
      const { error } = await supabase
        .from("customers")
        .update({ status: "nonaktif" }) // <-- Ganti statusnya
        .eq("id", id)
        .eq("business_id", authState.business_id);
      // ^^^ SELESAI PERUBAHANNYA ^^^

      if (error) throw error;

      toast.success("Pelanggan berhasil di-nonaktifkan."); // <-- Ganti pesannya
      fetchPelanggans(); // Refresh data
    } catch (err) {
      // Kita udah gak perlu cek error 409 (23503) lagi
      toast.error(err.message || "Gagal me-nonaktifkan pelanggan.");
      console.error("Error Nonaktif Pelanggan:", err);
    }
  };

  const handleSelectCustomer = (customer) => {
    console.log("MENGIRIM CUSTOMER:", customer);
    // Kirim 'customer' utuh lewat 'state'
    navigate("/kasir", { state: { selectedCustomer: customer } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        {" "}
        {/* Tambah gap-4 */}
        <h1 className="text-3xl font-bold">Manajemen Pelanggan</h1>
        <Button
          onClick={() => {
            form.reset();
            setIsNewModalOpen(true);
          }}
          className="w-full md:w-auto" // <-- Buat tombol full-width di HP
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Pelanggan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Daftar Pelanggan</CardTitle>

            {/* VVV TAMBAH KONDISI DI SINI VVV */}
            {/* Tampilkan tombol HANYA jika role BUKAN kasir */}
            {(authState.role === "owner" || authState.role === "admin") && (
              <Button
                onClick={handleDownloadCSV}
                disabled={loading || loadingCSV || pelanggans.length === 0}
                size="sm"
              >
                {loadingCSV ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download CSV
              </Button>
            )}
            {/* ^^^ SELESAI KONDISI ^^^ */}
          </div>

          <CardDescription>
            Cari dan kelola semua pelanggan terdaftar di bisnismu.
          </CardDescription>
          <Input
            type="text"
            placeholder="Cari nama atau nomor HP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-4"
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-10">Memuat data...</p>
          ) : pelanggans.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Nomor HP</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Status</TableHead>
                    {authState.role === "owner" && (
                      <TableHead>Cabang</TableHead>
                    )}
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pelanggans?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell
                        className="font-medium text-primary cursor-pointer hover:underline"
                        onClick={() => handleSelectCustomer(p)}
                      >
                        {p.name}
                      </TableCell>
                      <TableCell>{p.phone_number}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {p.address || "-"}
                      </TableCell>
                      <TableCell>
                        {p.tipe_pelanggan === "hotel" ? (
                          // --- Display for Hotel Clients ---
                          <Badge variant="outline">Hotel/Villa</Badge> // Or any text/style you prefer
                        ) : (
                          // --- Display for Regular Clients ---
                          <Badge
                            variant={p.is_member ? "default" : "secondary"}
                          >
                            {p.is_member ? "Member" : "Reguler"}{" "}
                            {/* Changed "Biasa" to "Reguler" */}
                          </Badge>
                        )}
                      </TableCell>
                      {authState.role === "owner" && (
                        <TableCell>{p.branches?.name || "N/A"}</TableCell>
                      )}
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
                                setEditingPelanggan(p);
                                setIsEditModalOpen(true);
                              }}
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
                                    Aksi ini akan menghapus pelanggan '{p.name}'
                                    secara permanen.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(p.id)}
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
              icon={<Users2 className="h-16 w-16" />}
              title="Pelanggan Tidak Ditemukan"
              description="Tidak ada pelanggan yang cocok dengan pencarian Anda, atau Anda belum mendaftarkan pelanggan sama sekali."
            />
          )}
        </CardContent>
      </Card>

      {/* MODAL TAMBAH BARU */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
            <DialogDescription>
              Masukkan detail pelanggan baru. Klik simpan jika sudah selesai.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nama Pelanggan"
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
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor HP</FormLabel>
                    <FormControl>
                      <Input placeholder="08123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Alamat untuk antar-jemput..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {(authState.role === "owner" || authState.role === "admin") && (
                <FormField
                  control={form.control}
                  name="tipe_pelanggan" // Nama field baru
                  defaultValue="reguler" // Defaultnya reguler
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipe Pelanggan</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Tipe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="reguler">Reguler</SelectItem>
                          <SelectItem value="hotel">Hotel/Villa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("tipe_pelanggan") === "hotel" && (
                <FormField
                  control={form.control}
                  name="customer_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kode Unik Hotel (Singkatan SJ)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Contoh: SKW (untuk Sukawana)"
                          {...field}
                          className="uppercase" // Biar user ngeh ini kode
                          maxLength={5}
                          onChange={(e) => {
                            // Paksa uppercase
                            field.onChange(e.target.value.toUpperCase());
                          }}
                        />
                      </FormControl>
                      <p className="text-[10px] text-muted-foreground">
                        Digunakan untuk nomor surat jalan: SJ-[KODE]-001
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("tipe_pelanggan") === "hotel" && (
                <FormField
                  control={form.control}
                  name="default_service_id" // Nama field baru
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Layanan Default (Menu Harga)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        required // Wajib diisi kalau tipe hotel
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Layanan Menu untuk Klien ini" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {hotelServices.length > 0 ? (
                            hotelServices.map((service) => (
                              <SelectItem
                                key={service.id}
                                value={String(service.id)}
                              >
                                {service.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="disabled" disabled>
                              Tidak ada layanan hotel ditemukan
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("tipe_pelanggan") === "hotel" && (
                <FormField
                  control={form.control}
                  name="id_identitas_bisnis" // Nama kolom di tabel customers
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Identitas Struk (Opsional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        // Tidak required, bisa pilih default nanti
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Gunakan Identitas Default Usaha" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Opsi dari state */}
                          {businessIdentities.length > 0 ? (
                            businessIdentities.map((identity) => (
                              <SelectItem
                                key={identity.id}
                                value={String(identity.id)}
                              >
                                {identity.nama_identitas}{" "}
                                {/* Tampilkan nama internal */}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="disabled" disabled>
                              Tidak ada identitas bisnis lain
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {authState.role === "owner" && (
                <FormField
                  control={form.control}
                  name="branch_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cabang</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="-- Pilih Cabang --" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cabangs?.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

      {/* MODAL EDIT */}
      {editingPelanggan && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Data Pelanggan</DialogTitle>
              <DialogDescription>
                Perbarui detail untuk {editingPelanggan?.name}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateSubmit} className="py-4 space-y-4">
              <div>
                <Label htmlFor="edit-name">Nama</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={editingPelanggan?.name || ""}
                  onChange={handleEditFormChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-phone_number">Nomor HP</Label>
                <Input
                  id="edit-phone_number"
                  name="phone_number"
                  value={editingPelanggan?.phone_number || ""}
                  onChange={handleEditFormChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-address">Alamat</Label>
                <Textarea
                  id="edit-address"
                  name="address"
                  value={editingPelanggan?.address || ""}
                  onChange={handleEditFormChange}
                  placeholder="Alamat lengkap..."
                />
              </div>

              {editingPelanggan?.tipe_pelanggan === "hotel" && ( // Muncul hanya jika tipe=hotel
                <div>
                  <Label htmlFor="edit-service">
                    Layanan Default (Menu Harga)
                  </Label>
                  <Select
                    // Ambil dari state, convert ke string, default string kosong
                    value={String(editingPelanggan?.default_service_id || "")}
                    onValueChange={(value) => handleEditServiceChange(value)} // Fungsi baru
                    required // Layanan default wajib diisi untuk hotel
                  >
                    <SelectTrigger id="edit-service">
                      <SelectValue placeholder="Pilih Layanan Menu untuk Klien ini" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Jangan ada opsi "-- Pilih --" karena wajib */}
                      {hotelServices.length > 0 ? (
                        hotelServices.map((service) => (
                          <SelectItem
                            key={service.id}
                            value={String(service.id)}
                          >
                            {service.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="disabled" disabled>
                          Tidak ada layanan hotel ditemukan
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {editingPelanggan?.tipe_pelanggan === "hotel" && (
                <div>
                  <Label htmlFor="edit-code">Kode Unik Hotel (SJ)</Label>
                  <Input
                    id="edit-code"
                    name="customer_code"
                    value={editingPelanggan?.customer_code || ""}
                    onChange={(e) => {
                      // Manual handle change buat uppercase
                      setEditingPelanggan((prev) => ({
                        ...prev,
                        customer_code: e.target.value.toUpperCase(),
                      }));
                    }}
                    placeholder="Contoh: SKW"
                    maxLength={5}
                    className="uppercase"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    SJ-{editingPelanggan?.customer_code || "..."}-001
                  </p>
                </div>
              )}

              {editingPelanggan?.tipe_pelanggan === "hotel" && (
                <div>
                  <Label htmlFor="edit-identitas">
                    Identitas Struk (Opsional)
                  </Label>
                  <Select
                    value={String(editingPelanggan?.id_identitas_bisnis || "")} // Ambil dari state, convert ke string
                    onValueChange={(value) => handleEditIdentitasChange(value)} // Fungsi baru
                  >
                    <SelectTrigger id="edit-identitas">
                      <SelectValue placeholder="Gunakan Identitas Default Usaha" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessIdentities.length > 0 ? (
                        businessIdentities.map((identity) => (
                          <SelectItem
                            key={identity.id}
                            value={String(identity.id)}
                          >
                            {identity.nama_identitas}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="disabled" disabled>
                          Tidak ada identitas lain
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
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

export default PelangganManagementPage;
