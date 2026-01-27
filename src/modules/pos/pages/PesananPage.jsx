// src/pages/PesananPage.jsx (VERSI FINAL & ANTI-BOCOR)

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "sonner";
import { usePageVisibility } from "@/lib/usePageVisibility.js";

// Impor komponen
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
import { Checkbox } from "@/components/ui/Checkbox.jsx";
import { Loader2, ClipboardList, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog.jsx";
import { Label } from "@/components/ui/Label.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";

function PesananPage() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [transaksis, setTransaksis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCSV, setLoadingCSV] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
    process_status: "", // Nama kolom asli
    branch_id: "", // Nama kolom asli
  });
  const [cabangs, setCabangs] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false); // <-- State Modal
  const [bulkUpdateStatus, setBulkUpdateStatus] = useState("Lunas"); // <-- State Status Baru
  const [bulkUpdateMethod, setBulkUpdateMethod] = useState(""); // <-- State Metode Baru
  const [isBulkUpdating, setIsBulkUpdating] = useState(false); // <-- State Loading Update

  // Ambil data cabang (sudah pake Supabase)
  useEffect(() => {
    if (authState.role === "owner" && authState.business_id) {
      const fetchCabangsForOwner = async () => {
        const { data, error } = await supabase
          .from("branches")
          .select("id, name")
          .eq("business_id", authState.business_id);
        if (error) toast.error("Gagal memuat daftar cabang.");
        else setCabangs(data || []);
      };
      fetchCabangsForOwner();
    }
  }, [authState.role, authState.business_id]);

  const handleSelectRow = (checked, orderId) => {
    setSelectedOrders(
      (prevSelected) =>
        checked
          ? [...prevSelected, orderId] // Tambah ID jika dicentang
          : prevSelected.filter((id) => id !== orderId) // Hapus ID jika tidak dicentang
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      // Pilih semua ID dari data transaksi yang tampil
      setSelectedOrders(transaksis.map((tx) => tx.id));
    } else {
      // Kosongkan pilihan
      setSelectedOrders([]);
    }
  };

  const handleOpenBulkUpdateModal = () => {
    setIsBulkUpdateModalOpen(true);
    // Reset pilihan default
    setBulkUpdateStatus("Lunas");
    setBulkUpdateMethod("");
  };

  const handleConfirmBulkUpdate = async () => {
    if (bulkUpdateStatus === "Lunas" && !bulkUpdateMethod) {
      toast.error("Metode pembayaran wajib diisi jika status Lunas.");
      return;
    }

    setIsBulkUpdating(true);
    try {
      const { data: updatedCount, error } = await supabase.rpc(
        "bulk_update_order_payment",
        {
          p_order_ids: selectedOrders,
          p_new_payment_status: bulkUpdateStatus,
          p_new_payment_method: bulkUpdateMethod,
          p_business_id: authState.business_id,
        }
      );

      if (error) throw error;

      toast.success(
        `${updatedCount} pesanan berhasil diupdate status pembayarannya.`
      );
      setIsBulkUpdateModalOpen(false); // Tutup modal
      setSelectedOrders([]); // Kosongkan pilihan
      fetchPesanan(); // Refresh data tabel
    } catch (err) {
      console.error("Gagal bulk update:", err);
      toast.error(err.message || "Gagal mengupdate status pesanan.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // "Mesin" Fetch Data (manggil "Koki" RPC)
  const fetchPesanan = useCallback(async () => {
    if (!authState.business_id) return;

    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.rpc("get_all_orders", {
        p_business_id: authState.business_id,
        p_role: authState.role,
        p_branch_id: authState.branch_id,
        p_search_term: filters.search,
        p_start_date: filters.startDate || "",
        p_end_date: filters.endDate || "",
        p_process_status: filters.process_status,
        p_branch_filter: filters.branch_id ? parseInt(filters.branch_id) : null,
      });

      if (error) throw error;
      setTransaksis(data || []);
    } catch (err) {
      setError("Gagal mengambil data pesanan. " + err.message);
      setTransaksis([]);
    } finally {
      setLoading(false);
    }
  }, [filters, authState.business_id, authState.role, authState.branch_id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPesanan();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchPesanan]);

  const handleDownloadCSV = async () => {
    if (!authState.isReady || !authState.business_id || loadingCSV) return;

    // Ambil tanggal hari ini jika filter kosong (biar nama file tetap ada tanggal)
    const startDate =
      filters.startDate || new Date().toISOString().split("T")[0];
    const endDate = filters.endDate || new Date().toISOString().split("T")[0];

    setLoadingCSV(true);
    try {
      // Tentukan target branch_id (sama persis kayak di fetchPesanan)
      const targetBranchId =
        authState.role !== "owner" && authState.branch_id
          ? authState.branch_id
          : filters.branch_id === "" || filters.branch_id === "all"
          ? null
          : parseInt(filters.branch_id);

      // Panggil RPC get_raw_sales_data_for_csv
      const { data, error } = await supabase.rpc("get_raw_sales_data_for_csv", {
        p_start_date: startDate,
        p_end_date: endDate,
        p_target_branch_id: targetBranchId,
        p_business_id: authState.business_id,
        // Kita tambahin filter tambahan dari state 'filters' kalau perlu
        // TAPI RPC ini belum support search/status, jadi kita filter data mentah saja
      });

      if (error) throw error;

      // Filter tambahan di sisi client (karena RPC belum support semua filter)
      let filteredData = data || [];
      if (filters.search) {
        const searchTermLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(
          (row) =>
            row.invoice_code?.toLowerCase().includes(searchTermLower) ||
            row.nama_pelanggan?.toLowerCase().includes(searchTermLower) ||
            row.nomor_hp_pelanggan?.toLowerCase().includes(searchTermLower)
        );
      }
      if (filters.process_status) {
        filteredData = filteredData.filter(
          (row) => row.status_proses === filters.process_status
        );
      }

      if (!filteredData || filteredData.length === 0) {
        toast.info("Tidak ada data pesanan untuk di-download pada filter ini.");
        return; // Keluar jika data kosong
      }

      // 1. Definisikan Header CSV (sesuai urutan RETURNS TABLE di SQL)
      const headers = [
        "Invoice",
        "Tgl Diterima",
        "Estimasi Selesai",
        "Nama Pelanggan",
        "No HP",
        "Cabang",
        "Paket",
        "Jumlah",
        "Satuan",
        "Harga Satuan",
        "Subtotal Item",
        "Subtotal Order",
        "Biaya Layanan",
        "Diskon Poin",
        "Grand Total",
        "Status Bayar",
        "Metode Bayar",
        "Status Proses",
        "Catatan",
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
      const csvData = filteredData.map((row) => [
        row.invoice_code,
        row.tanggal_diterima,
        row.estimasi_selesai,
        row.nama_pelanggan,
        row.nomor_hp_pelanggan,
        row.nama_cabang,
        row.nama_paket,
        row.jumlah,
        row.satuan,
        row.harga_satuan,
        row.subtotal_item,
        row.subtotal_order,
        row.biaya_layanan,
        row.diskon_poin,
        row.grand_total,
        row.status_pembayaran,
        row.metode_pembayaran,
        row.status_proses,
        row.catatan,
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
      // Nama file: Pesanan_YYYY-MM-DD_sd_YYYY-MM-DD.csv
      const fileName = `Pesanan_${startDate}_sd_${endDate}.csv`;
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Gagal download CSV Pesanan:", error);
      toast.error(error.message || "Gagal mengunduh data pesanan.");
    } finally {
      setLoadingCSV(false);
    }
  };

  // usePageVisibility(fetchPesanan); // Pasang sensor anti-macet

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value === "all" ? "" : value }));
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Manajemen Pesanan</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Pencarian</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Cari Invoice / Nama Pelanggan..."
          />
          <Input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
          />
          <Input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
          />
          <Select
            value={filters.process_status || "all"}
            onValueChange={(value) =>
              handleSelectFilterChange("process_status", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua Status Proses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status Proses</SelectItem>
              <SelectItem value="Diterima">Diterima</SelectItem>
              <SelectItem value="Proses Cuci">Proses Cuci</SelectItem>
              <SelectItem value="Siap Diambil">Siap Diambil</SelectItem>
              <SelectItem value="Proses Pengantaran">
                Proses Pengantaran
              </SelectItem>
              <SelectItem value="Selesai">Selesai</SelectItem>
              <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
          {authState.role === "owner" && (
            <Select
              value={filters.branch_id || "all"}
              onValueChange={(value) =>
                handleSelectFilterChange("branch_id", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Cabang</SelectItem>
                {cabangs?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={handleDownloadCSV} // <-- Fungsi yang akan kita buat
            disabled={loading || loadingCSV || transaksis.length === 0} // <-- Disable saat loading atau data kosong
            size="sm" // Biar gak terlalu besar
          >
            {loadingCSV ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download CSV
          </Button>
        </CardContent>
      </Card>

      <div className="mb-4 flex justify-end">
        <Button
          onClick={handleOpenBulkUpdateModal} // <-- Fungsi yg akan dibuat
          disabled={selectedOrders.length === 0 || loading} // Aktif jika ada yg dipilih & tdk loading
        >
          Update Status Pembayaran ({selectedOrders.length} Terpilih)
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        selectedOrders.length === transaksis.length &&
                        transaksis.length > 0
                      }
                      onCheckedChange={(checked) => handleSelectAll(checked)}
                      aria-label="Pilih semua baris"
                    />
                  </TableHead>
                  <TableHead>Invoice</TableHead>
                  {authState.role === "owner" && <TableHead>Cabang</TableHead>}
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status Bayar</TableHead>
                  <TableHead>Status Proses</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-destructive"
                    >
                      {error}
                    </TableCell>
                  </TableRow>
                ) : transaksis.length > 0 ? (
                  transaksis.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(tx.id)}
                          onCheckedChange={(checked) =>
                            handleSelectRow(checked, tx.id)
                          }
                          aria-label={`Pilih baris ${tx.invoice_code}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {tx.invoice_code}
                      </TableCell>
                      {authState.role === "owner" && (
                        <TableCell>{tx.branches?.name || "N/A"}</TableCell>
                      )}
                      <TableCell className="font-medium text-primary">
                        {tx.customers?.name || "N/A"}
                      </TableCell>
                      <TableCell>
                        {new Date(tx.created_at).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right">
                        Rp {tx.grand_total.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.payment_status === "Lunas"
                              ? "success"
                              : "warning"
                          }
                        >
                          {tx.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{tx.process_status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`/riwayat/${tx.invoice_code}`)
                          }
                        >
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <EmptyState
                        icon={<ClipboardList className="h-16 w-16" />}
                        title="Tidak Ada Pesanan"
                        description="Tidak ada pesanan yang cocok dengan filter pencarian Anda."
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isBulkUpdateModalOpen}
        onOpenChange={setIsBulkUpdateModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Update Status Pembayaran ({selectedOrders.length} Pesanan)
            </DialogTitle>
            <DialogDescription>
              Pilih status pembayaran baru dan metode pembayaran (jika Lunas)
              untuk pesanan yang dipilih.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="bulk-status">Status Pembayaran Baru</Label>
              <Select
                value={bulkUpdateStatus}
                onValueChange={setBulkUpdateStatus}
              >
                <SelectTrigger id="bulk-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lunas">Lunas</SelectItem>
                  <SelectItem value="Belum Lunas">Belum Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {bulkUpdateStatus === "Lunas" && ( // Muncul hanya jika Lunas
              <div>
                <Label htmlFor="bulk-method">Metode Pembayaran</Label>
                <Input
                  id="bulk-method"
                  value={bulkUpdateMethod}
                  onChange={(e) => setBulkUpdateMethod(e.target.value)}
                  placeholder="Contoh: Transfer Bank, Tunai, Invoice #123"
                  required
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkUpdateModalOpen(false)}
              disabled={isBulkUpdating}
            >
              Batal
            </Button>
            <Button onClick={handleConfirmBulkUpdate} disabled={isBulkUpdating}>
              {isBulkUpdating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Konfirmasi Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PesananPage;
