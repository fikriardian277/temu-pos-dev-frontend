import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  Eye,
  Warehouse,
  FileText,
  Link as LinkIcon,
  CheckSquare,
  AlertTriangle,
  XCircle,
  Image, // Icon gambar
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";

export default function AdjustmentPage() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("draft");

  // State Modal Detail
  const [selectedAdj, setSelectedAdj] = useState(null);
  const [adjItems, setAdjItems] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // State Modal Actions
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // 1. Fetch List (UPDATED WITH BRANCH SECURITY)
  const fetchList = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);

    // A. Query Dasar
    let query = supabase
      .schema("inventory")
      .from("adjustments")
      .select(`*, warehouses(name)`)
      .eq("business_id", authState.business_id)
      .order("created_at", { ascending: false });

    // B. Filter Tab Status
    if (filter !== "all") query = query.eq("status", filter);

    // C. --- SECURITY FILTER: ISOLASI CABANG ---
    if (authState.role !== "owner") {
      if (authState.branch_id) {
        // Cari ID Gudang milik cabang user ini
        const { data: wh } = await supabase
          .schema("inventory")
          .from("warehouses")
          .select("id")
          .eq("branch_id", authState.branch_id);

        if (wh && wh.length > 0) {
          const myWhIds = wh.map((w) => w.id);
          // Filter Adjustment hanya dari gudang cabang tersebut
          query = query.in("warehouse_id", myWhIds);
        } else {
          // Punya cabang tapi gak punya gudang -> List Kosong
          setList([]);
          setLoading(false);
          return;
        }
      } else {
        // Admin tanpa cabang -> List Kosong
        setList([]);
        setLoading(false);
        return;
      }
    }

    // Eksekusi Query
    const { data, error } = await query;
    if (error) {
      console.error(error);
      toast.error("Gagal memuat data adjustment.");
      setLoading(false);
      return;
    }

    // D. Manual Fetch User Names (Creator)
    const userIds = [
      ...new Set(data?.map((i) => i.created_by).filter(Boolean)),
    ];
    let userMap = {};

    if (userIds.length > 0) {
      const { data: u } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      if (u) u.forEach((x) => (userMap[x.id] = x.full_name));
    }

    const merged =
      data?.map((i) => ({
        ...i,
        creator_name: userMap[i.created_by] || "Unknown",
      })) || [];

    setList(merged);
    setLoading(false);
  }, [authState.business_id, authState.role, authState.branch_id, filter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // 2. Fetch Detail Items
  const openDetail = async (adj) => {
    setSelectedAdj(adj);
    setLoadingDetail(true);
    const { data } = await supabase
      .schema("inventory")
      .from("adjustment_items")
      .select("*, products(name, unit, sku)")
      .eq("adjustment_id", adj.id);
    setAdjItems(data || []);
    setLoadingDetail(false);
  };

  // 3. Logic Approval
  const initiateApprove = () => setApproveDialog(true);

  const executeApprove = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase.rpc("approve_stock_adjustment", {
        p_adj_id: selectedAdj.id,
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
      });
      if (error) throw error;

      toast.success("Adjustment Approved! Stok diperbarui.");
      setApproveDialog(false);
      setSelectedAdj(null);
      fetchList();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // 4. Logic Reject
  const initiateReject = () => {
    setRejectReason(""); // Reset alasan
    setRejectDialog(true);
  };

  const executeReject = async () => {
    if (!rejectReason.trim())
      return toast.error("Alasan penolakan wajib diisi.");
    setProcessing(true);
    try {
      const { error } = await supabase
        .schema("inventory")
        .from("adjustments")
        .update({
          status: "rejected",
          notes: (selectedAdj.notes || "") + ` [REJECTED: ${rejectReason}]`,
          updated_at: new Date(),
        })
        .eq("id", selectedAdj.id)
        .eq("business_id", authState.business_id);

      if (error) throw error;

      toast.success("Permintaan Adjustment Ditolak.");
      setRejectDialog(false);
      setSelectedAdj(null);
      fetchList();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- HELPER PARSE BUKTI ---
  const renderProofLinks = (jsonString) => {
    try {
      if (!jsonString) return null;

      // Cek apakah formatnya JSON array string
      let urls = [];
      if (jsonString.startsWith("[")) {
        urls = JSON.parse(jsonString);
      } else {
        // Fallback buat data lama (single url string)
        urls = [jsonString];
      }

      if (!Array.isArray(urls) || urls.length === 0) return null;

      return (
        <div className="mt-2 space-y-1">
          <p className="text-xs font-semibold text-slate-500 mb-1">
            Lampiran Bukti:
          </p>
          <div className="flex flex-wrap gap-2">
            {urls.map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 bg-white border px-2 py-1 rounded text-xs text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Image className="h-3 w-3" />
                Bukti {idx + 1}
              </a>
            ))}
          </div>
        </div>
      );
    } catch (e) {
      return <span className="text-xs text-red-400">Error load bukti</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Daftar Adjustment
          </h1>
          <p className="text-muted-foreground">
            Approval koreksi stok dan opname.
          </p>
        </div>
        <Button onClick={() => navigate("/inventory/adjustments/create")}>
          <Plus className="mr-2 h-4 w-4" /> Buat Koreksi Baru
        </Button>
      </div>

      <Tabs
        defaultValue="draft"
        value={filter}
        onValueChange={setFilter}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="draft" className="text-orange-600">
            Perlu Review (Draft)
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-green-600">
            Disetujui
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-red-600">
            Ditolak
          </TabsTrigger>
          <TabsTrigger value="all">Semua</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 mt-4">
        {loading ? (
          <div className="text-center py-10">Memuat...</div>
        ) : list.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
            Tidak ada data.
          </div>
        ) : (
          list.map((item) => (
            <Card
              key={item.id}
              className={
                item.status === "draft"
                  ? "border-orange-200 bg-orange-50/30"
                  : ""
              }
            >
              <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg font-mono">
                      {item.adjustment_number}
                    </h3>
                    <Badge
                      className={
                        item.status === "approved"
                          ? "bg-green-600"
                          : item.status === "rejected"
                            ? "bg-red-600"
                            : "bg-orange-500"
                      }
                    >
                      {item.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4" /> {item.warehouses?.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Alasan:{" "}
                      {item.reason_category}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Dibuat:{" "}
                    {new Date(item.created_at).toLocaleDateString("id-ID")} oleh{" "}
                    {item.creator_name}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDetail(item)}
                >
                  <Eye className="mr-2 h-4 w-4" /> Lihat Detail
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* MODAL 1: DETAIL ADJUSTMENT */}
      <Dialog open={!!selectedAdj} onOpenChange={() => setSelectedAdj(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Detail Koreksi Stok</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedAdj?.adjustment_number} • {selectedAdj?.reason_category}
            </p>
          </DialogHeader>

          <div className="text-sm bg-muted/50 p-4 rounded space-y-2 border">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Lokasi Gudang</p>
                <p className="font-medium">{selectedAdj?.warehouses?.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Dibuat Oleh</p>
                <p className="font-medium">{selectedAdj?.creator_name}</p>
              </div>
            </div>

            <div className="border-t pt-2 mt-2">
              <p className="text-xs text-slate-500">Catatan Staff:</p>
              <p className="italic text-slate-700">
                {selectedAdj?.notes || "-"}
              </p>
            </div>

            {/* --- AREA BUKTI FOTO (UPDATED) --- */}
            {renderProofLinks(selectedAdj?.proof_link)}
          </div>

          <div className="border rounded max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 font-medium">
                <tr>
                  <th className="p-3 text-left">Produk</th>
                  <th className="p-3 text-center">Koreksi</th>
                  <th className="p-3 text-left">Ket Item</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingDetail ? (
                  <tr>
                    <td
                      colSpan="3"
                      className="p-4 text-center text-muted-foreground"
                    >
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                      Memuat item...
                    </td>
                  </tr>
                ) : (
                  adjItems.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="font-medium">{i.products?.name}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {i.products?.sku}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={`font-bold ${
                            i.qty_diff < 0
                              ? "text-red-600 border-red-200 bg-red-50"
                              : "text-green-600 border-green-200 bg-green-50"
                          }`}
                        >
                          {i.qty_diff > 0 ? "+" : ""}
                          {i.qty_diff} {i.products?.unit}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-500 italic">
                        {i.notes || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAdj(null)}>
              Tutup
            </Button>

            {/* BUTTONS: HANYA OWNER & STATUS DRAFT */}
            {selectedAdj?.status === "draft" && authState.role === "owner" && (
              <>
                <Button
                  variant="destructive"
                  onClick={initiateReject}
                  disabled={processing}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Tolak
                </Button>
                <Button
                  onClick={initiateApprove}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={processing}
                >
                  <CheckSquare className="mr-2 h-4 w-4" /> Setujui
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: KONFIRMASI APPROVE */}
      <Dialog open={approveDialog} onOpenChange={setApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" /> Konfirmasi
              Approval
            </DialogTitle>
            <DialogDescription>
              Anda yakin ingin menyetujui koreksi stok ini?
              <br /> Stok fisik di gudang akan langsung berubah sesuai nilai
              adjustment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={executeApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Ya, Eksekusi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: KONFIRMASI REJECT */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Tolak Permintaan Koreksi
            </DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan agar staff dapat memperbaikinya.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Alasan Penolakan</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Bukti foto buram, hitungan salah..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={executeReject}
              disabled={processing}
              variant="destructive"
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Tolak Adjustment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
