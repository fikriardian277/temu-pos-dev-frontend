import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  User,
  Search,
  XCircle,
  Loader2,
  Eye, // Icon buat lihat detail
  PackageOpen,
  ArrowRight, // Icon panah buat flow stok
  Calendar,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";

export default function UsageHistoryPage() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState(false);

  // State Modal Void
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [selectedUsageId, setSelectedUsageId] = useState(null);
  const [voidReason, setVoidReason] = useState("");

  // State Modal Detail (Baru)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedUsage, setSelectedUsage] = useState(null);

  const fetchList = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);

    try {
      let query = supabase
        .schema("inventory")
        .from("usage_records")
        .select(
          `
                *, 
                warehouses!inner(id, name, branch_id), 
                usage_items (
                    quantity, 
                    stock_before, 
                    stock_after, 
                    products (name, unit, sku)
                )
            `,
        )
        .eq("business_id", authState.business_id)
        .order("usage_date", { ascending: false });

      // --- SECURITY: ADMIN CUMA BISA LIAT CABANG SENDIRI ---
      if (authState.role !== "owner") {
        if (authState.branch_id) {
          const { data: wh } = await supabase
            .schema("inventory")
            .from("warehouses")
            .select("id")
            .eq("branch_id", authState.branch_id);

          if (wh && wh.length > 0) {
            const myWhIds = wh.map((w) => w.id);
            query = query.in("warehouse_id", myWhIds);
          } else {
            setList([]);
            setLoading(false);
            return;
          }
        } else {
          setList([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setList(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [authState.business_id, authState.role, authState.branch_id]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Handler Buka Modal Void
  const openVoidModal = (id) => {
    setSelectedUsageId(id);
    setVoidReason("");
    setVoidModalOpen(true);
  };

  // Handler Buka Modal Detail
  const openDetailModal = (item) => {
    setSelectedUsage(item);
    setDetailModalOpen(true);
  };

  // Handler Submit Void
  const confirmVoid = async () => {
    if (!voidReason.trim()) return toast.error("Alasan wajib diisi.");
    setProcessing(true);
    try {
      const { error } = await supabase.rpc("void_material_usage", {
        p_usage_id: selectedUsageId,
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
        p_reason: voidReason,
      });
      if (error) throw error;
      toast.success("Pemakaian dibatalkan. Stok dikembalikan.");
      setVoidModalOpen(false);
      fetchList();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const filteredList = list.filter(
    (item) =>
      item.usage_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.consumed_by?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Riwayat Pemakaian
          </h1>
          <p className="text-muted-foreground">
            Audit stok keluar untuk operasional harian.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-[250px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari Dokumen..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => navigate("/inventory/usage/create")}>
            <Plus className="mr-2 h-4 w-4" /> Input Baru
          </Button>
        </div>
      </div>

      {/* TABLE LIST */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium uppercase">
                <tr>
                  <th className="p-4 w-[180px]">Tanggal / Ref</th>
                  <th className="p-4">Lokasi & Pemakai</th>
                  <th className="p-4 text-center">Total Item</th>
                  <th className="p-4 text-right w-[150px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="p-8 text-center text-muted-foreground"
                    >
                      Tidak ada data riwayat pemakaian.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/5 transition-colors ${
                        item.status === "void" ? "opacity-60 bg-red-50/20" : ""
                      }`}
                    >
                      <td className="p-4 align-top">
                        <div className="font-bold text-slate-800">
                          {new Date(item.usage_date).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </div>
                        <div className="text-xs font-mono text-slate-500 mt-1">
                          {item.usage_number}
                        </div>
                        <Badge
                          className={`mt-2 ${
                            item.status === "void"
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex items-center gap-2 font-medium text-slate-800">
                          <Warehouse className="h-3 w-3 text-slate-400" />
                          {item.warehouses?.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <User className="h-3 w-3" />
                          Dipakai oleh:{" "}
                          <span className="font-semibold">
                            {item.consumed_by || "-"}
                          </span>
                        </div>
                        {item.notes && (
                          <div className="text-xs italic text-slate-400 mt-2 bg-slate-50 p-1 rounded inline-block">
                            "{item.notes}"
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-top text-center">
                        <Badge variant="outline" className="px-3 py-1">
                          {item.usage_items?.length || 0} Jenis Barang
                        </Badge>
                      </td>
                      <td className="p-4 align-top text-right space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => openDetailModal(item)}
                        >
                          <Eye className="h-3 w-3 mr-2" /> Rincian
                        </Button>

                        {item.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openVoidModal(item.id)}
                          >
                            <XCircle className="h-3 w-3 mr-2" /> Batalkan
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* --- MODAL 1: DETAIL RINCIAN (NEW) --- */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2">
              <PackageOpen className="h-5 w-5 text-primary" />
              Rincian Audit Stok
            </DialogTitle>
            <DialogDescription>
              Detail perubahan stok pada dokumen{" "}
              <strong>{selectedUsage?.usage_number}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-3 text-left">Nama Barang</th>
                    <th className="px-4 py-3 text-center w-24">Stok Awal</th>
                    <th className="px-4 py-3 text-center w-24">Pemakaian</th>
                    <th className="px-4 py-3 text-center w-24">Stok Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedUsage?.usage_items?.map((detail, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {detail.products?.name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {detail.products?.sku || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-500">
                        {detail.stock_before !== null
                          ? Number(detail.stock_before).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant="destructive"
                          className="font-bold bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                        >
                          -{Number(detail.quantity).toLocaleString()}{" "}
                          {detail.products?.unit}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-blue-700 bg-blue-50/30">
                        {detail.stock_after !== null
                          ? Number(detail.stock_after).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setDetailModalOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL 2: VOID CONFIRMATION (OLD LOGIC KEPT) --- */}
      <Dialog open={voidModalOpen} onOpenChange={setVoidModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" /> Batalkan Pemakaian?
            </DialogTitle>
            <DialogDescription>
              Tindakan ini akan mengembalikan stok barang ke gudang dan menandai
              laporan sebagai VOID.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Alasan Pembatalan</Label>
            <Textarea
              placeholder="Contoh: Salah input jumlah..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidModalOpen(false)}>
              Kembali
            </Button>
            <Button
              variant="destructive"
              onClick={confirmVoid}
              disabled={processing}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
              Konfirmasi Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
