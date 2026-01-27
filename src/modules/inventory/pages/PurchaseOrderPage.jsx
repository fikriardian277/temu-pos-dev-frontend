import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  Calendar,
  Building2,
  Warehouse,
  Search,
  CheckCircle,
  XCircle,
  Send,
  Clock,
  FileText,
  Trash2,
  Banknote,
  AlertTriangle, // Icon buat modal konfirmasi
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Textarea";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function PurchaseOrderPage() {
  const { authState } = useAuth();
  const navigate = useNavigate();

  // AMBIL NAMA USER
  const currentUserIdentifier =
    authState.user?.user_metadata?.full_name ||
    authState.user?.email ||
    "Unknown User";

  const [poList, setPoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // STATE MODAL REJECT
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // STATE MODAL KONFIRMASI (Pengganti Alert Jadul)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState({ type: "", po: null }); // type: 'submit' | 'approve' | 'finalize'

  const [processLoading, setProcessLoading] = useState(false);

  const fetchPO = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);

    try {
      let branchWarehouseIds = null;
      const isPowerUser =
        authState.role === "owner" || authState.role === "finance";

      if (!isPowerUser) {
        if (authState.branch_id) {
          const { data: wh, error: whError } = await supabase
            .schema("inventory")
            .from("warehouses")
            .select("id")
            .eq("branch_id", authState.branch_id);

          if (whError) throw whError;
          if (wh && wh.length > 0) {
            branchWarehouseIds = wh.map((w) => w.id);
          } else {
            setPoList([]);
            setLoading(false);
            return;
          }
        } else {
          setPoList([]);
          setLoading(false);
          return;
        }
      }

      let query = supabase
        .schema("inventory")
        .from("purchase_orders")
        .select(`*, suppliers (name), warehouses (name)`)
        .eq("business_id", authState.business_id);

      if (statusFilter !== "all") {
        if (statusFilter === "draft") {
          query = query.in("status", ["draft", "pending_approval", "verified"]);
        } else if (statusFilter === "active") {
          query = query.in("status", ["issued", "partial"]);
        } else if (statusFilter === "completed") {
          query = query.in("status", ["received", "rejected"]);
        } else {
          query = query.eq("status", statusFilter);
        }
      }

      if (branchWarehouseIds) {
        query = query.in("target_warehouse_id", branchWarehouseIds);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setPoList(data || []);
    } catch (error) {
      console.error("Error fetching PO:", error);
      toast.error(`Gagal memuat data PO: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [
    authState.business_id,
    authState.role,
    authState.branch_id,
    statusFilter,
  ]);

  useEffect(() => {
    fetchPO();
  }, [fetchPO]);

  // --- HANDLER PEMBUKA MODAL KONFIRMASI ---
  const triggerConfirm = (type, po) => {
    setConfirmAction({ type, po });
    setConfirmModalOpen(true);
  };

  // --- EKSEKUTOR API (Dipanggil saat klik YA di Modal) ---
  const executeAction = async () => {
    const { type, po } = confirmAction;
    if (!po) return;

    setProcessLoading(true);
    try {
      if (type === "submit") {
        const { error } = await supabase.rpc("submit_purchase_order", {
          p_po_id: po.id,
          p_user_id: authState.user.id,
          p_user_role: authState.role,
        });
        if (error) throw error;
        toast.success("PO berhasil disubmit!");
      } else if (type === "approve") {
        const { error } = await supabase.rpc("approve_purchase_order", {
          p_po_id: po.id,
          p_user_id: authState.user.id,
          p_user_name: currentUserIdentifier,
        });
        if (error) throw error;
        toast.success("PO Disetujui!");
      } else if (type === "finalize") {
        const { error } = await supabase.rpc("finalize_purchase_order", {
          p_po_id: po.id,
          p_user_id: authState.user.id,
          p_user_name: currentUserIdentifier,
        });
        if (error) throw error;
        toast.success("PO Resmi Di-Issue!");
      }

      setConfirmModalOpen(false); // Tutup modal
      fetchPO(); // Refresh data
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessLoading(false);
    }
  };

  // --- REJECT HANDLER ---
  const openRejectModal = (id) => {
    setSelectedPoId(id);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectReason) return toast.error("Alasan wajib diisi.");
    setProcessLoading(true);
    try {
      const { error } = await supabase.rpc("reject_purchase_order", {
        p_po_id: selectedPoId,
        p_reason: rejectReason,
        p_user_id: authState.user.id,
        p_user_name: currentUserIdentifier,
      });
      if (error) throw error;
      toast.success("PO Ditolak.");
      setRejectModalOpen(false);
      fetchPO();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessLoading(false);
    }
  };

  const filteredList = poList.filter((item) => {
    return (
      item.purchase_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusBadge = (status) => {
    const styles = {
      received: "bg-green-100 text-green-700 border-green-200",
      issued: "bg-blue-100 text-blue-700 border-blue-200",
      partial: "bg-purple-100 text-purple-700 border-purple-200",
      pending_approval:
        "bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse",
      verified: "bg-cyan-100 text-cyan-700 border-cyan-200",
      draft: "bg-slate-100 text-slate-700 border-slate-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
    };
    const labels = {
      received: "SELESAI (RECEIVED)",
      issued: "ISSUED (ON PROCESS)",
      partial: "PARTIAL",
      pending_approval: "WAITING OWNER",
      verified: "WAITING FINANCE",
      draft: "DRAFT",
      rejected: "DITOLAK",
    };
    return (
      <Badge
        variant="outline"
        className={`font-bold border px-2 py-0.5 ${styles[status] || styles.draft}`}
      >
        {labels[status] || status.toUpperCase()}
      </Badge>
    );
  };

  // Helper Text Modal Konfirmasi
  const getConfirmContent = () => {
    const { type, po } = confirmAction;
    if (!po) return { title: "", desc: "", btnColor: "" };

    if (type === "submit") {
      const isOwner = authState.role === "owner";
      return {
        title: "Submit Purchase Order",
        desc: isOwner
          ? `Kirim PO ${po.purchase_number} ke Finance untuk verifikasi pembayaran?`
          : `Submit PO ${po.purchase_number} untuk approval Owner?`,
        btnColor: "bg-blue-600 hover:bg-blue-700",
        btnText: "Ya, Submit",
        icon: <Send className="w-5 h-5 text-blue-600" />,
      };
    }
    if (type === "approve") {
      return {
        title: "Approve Purchase Order",
        desc: `Setujui PO ${po.purchase_number} dan teruskan ke Finance?`,
        btnColor: "bg-green-600 hover:bg-green-700",
        btnText: "Ya, Approve",
        icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      };
    }
    if (type === "finalize") {
      return {
        title: "Finalize & Issue PO",
        desc: `Proses Final PO ${po.purchase_number}? Status akan berubah menjadi ISSUED dan siap dikirim ke Supplier.`,
        btnColor: "bg-cyan-600 hover:bg-cyan-700 text-white",
        btnText: "Ya, Finalize",
        icon: <Banknote className="w-5 h-5 text-cyan-600" />,
      };
    }
    return { title: "", desc: "", btnColor: "" };
  };

  const confirmContent = getConfirmContent();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-lg border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Purchase Orders
          </h1>
          <p className="text-slate-500 mt-1">
            Kelola pembelian barang ke supplier.
          </p>
        </div>
        {authState.role !== "finance" && (
          <Button
            onClick={() => navigate("/inventory/purchase-orders/create")}
            className="bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" /> Buat PO Baru
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
        <Tabs
          defaultValue="all"
          value={statusFilter}
          onValueChange={setStatusFilter}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger
              value="draft"
              className="data-[state=active]:text-orange-700"
            >
              Draft & Process
            </TabsTrigger>
            <TabsTrigger
              value="active"
              className="data-[state=active]:text-blue-700"
            >
              Aktif
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="data-[state=active]:text-green-700"
            >
              Selesai
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari No. PO / Supplier..."
            className="pl-9 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">
            Memuat data...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-xl bg-slate-50/50">
            <p className="text-muted-foreground font-medium">
              Tidak ada data Purchase Order.
            </p>
          </div>
        ) : (
          filteredList.map((po) => (
            <Card
              key={po.id}
              className={`group transition-all hover:shadow-md border-l-4 ${
                po.status === "pending_approval"
                  ? "border-l-yellow-400 bg-yellow-50/30"
                  : po.status === "verified"
                    ? "border-l-cyan-400 bg-cyan-50/30"
                    : po.status === "issued"
                      ? "border-l-blue-500"
                      : "border-l-slate-200"
              }`}
            >
              <CardContent className="p-0">
                <div className="flex justify-between items-start p-5 border-b bg-slate-50/30">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg text-slate-900 font-mono tracking-tight">
                        {po.purchase_number}
                      </h3>
                      {getStatusBadge(po.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(po.created_at).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500 mb-1">Total Nilai</p>
                    <p className="text-xl font-bold text-slate-900 tracking-tight">
                      {formatRupiah(po.total_amount)}
                    </p>
                  </div>
                </div>

                <div className="p-5 flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="space-y-3 w-full sm:w-auto">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded text-blue-600">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase">
                          Supplier
                        </p>
                        <p className="font-semibold text-slate-800">
                          {po.suppliers?.name || "Unknown"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded text-slate-600">
                        <Warehouse className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase">
                          Dikirim Ke
                        </p>
                        <p className="font-medium text-slate-700">
                          {po.warehouses?.name || "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-dashed">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigate(`/inventory/purchase-orders/${po.id}`)
                      }
                      className="w-full sm:w-auto"
                    >
                      <FileText className="mr-2 h-4 w-4" /> Detail
                    </Button>

                    {/* ZONE OWNER */}
                    {authState.role === "owner" && (
                      <>
                        {(po.status === "draft" ||
                          po.status === "pending_approval") && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectModal(po.id)}
                            disabled={processLoading}
                          >
                            {po.status === "draft" ? (
                              <Trash2 className="mr-2 h-4 w-4" />
                            ) : (
                              <XCircle className="mr-2 h-4 w-4" />
                            )}
                            {po.status === "draft" ? "Hapus" : "Tolak"}
                          </Button>
                        )}
                        {po.status === "draft" && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => triggerConfirm("submit", po)}
                            disabled={processLoading}
                          >
                            <Send className="mr-2 h-4 w-4" /> Submit
                          </Button>
                        )}
                        {po.status === "pending_approval" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => triggerConfirm("approve", po)}
                            disabled={processLoading}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" /> Approve
                          </Button>
                        )}
                      </>
                    )}

                    {/* ZONE FINANCE */}
                    {authState.role === "finance" && (
                      <>
                        {(po.status === "verified" ||
                          po.status === "pending_approval") && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectModal(po.id)}
                            disabled={processLoading}
                          >
                            <XCircle className="mr-2 h-4 w-4" /> Reject
                          </Button>
                        )}
                        {po.status === "verified" && (
                          <Button
                            size="sm"
                            className="bg-cyan-600 hover:bg-cyan-700 text-white"
                            onClick={() => triggerConfirm("finalize", po)}
                            disabled={processLoading}
                          >
                            <Banknote className="mr-2 h-4 w-4" /> Finalize PO
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* --- MODAL KONFIRMASI (NEW) --- */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-slate-100 rounded-full">
                {confirmContent.icon || (
                  <AlertTriangle className="w-5 h-5 text-slate-600" />
                )}
              </div>
              <DialogTitle>{confirmContent.title}</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600">
              {confirmContent.desc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              className={confirmContent.btnColor}
              onClick={executeAction}
              disabled={processLoading}
            >
              {processLoading ? "Memproses..." : confirmContent.btnText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL REJECT */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Tolak / Batalkan PO
            </DialogTitle>
            <DialogDescription>
              Status akan menjadi REJECTED. Stok yang dipesan tidak akan masuk.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Alasan penolakan / pembatalan..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processLoading}
            >
              Ya, Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
