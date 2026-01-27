import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Ban,
  History,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea"; // Pastikan import ini ada

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function CancellationApprovalPage() {
  const { authState } = useAuth();

  const [activeTab, setActiveTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- MODAL STATES ---
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Modal Approve VOID
  const [voidModalOpen, setVoidModalOpen] = useState(false);

  // 2. Modal Approve REFUND
  const [refundModalOpen, setRefundModalOpen] = useState(false);

  // 3. Modal REJECT
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // FETCH DATA
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Data Order
      let query = supabase
        .from("orders")
        .select(`*, branches(name), customers(name)`)
        .eq("business_id", authState.business_id)
        .order("cancellation_requested_at", { ascending: false });

      if (activeTab === "pending") {
        query = query.eq("cancellation_status", "requested");
        const { data, error } = await query;
        if (error) throw error;
        setRequests(data || []);
      } else {
        query = query.in("cancellation_status", ["approved", "rejected"]);
        const { data, error } = await query.limit(50);
        if (error) throw error;
        setHistoryLogs(data || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [authState.business_id, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- ACTIONS HANDLERS ---

  // A. VOID
  const openVoidModal = (order) => {
    setSelectedOrder(order);
    setVoidModalOpen(true);
  };

  const handleApproveVoid = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc("approve_void_request", {
        p_order_id: selectedOrder.id,
        p_user_id: authState.user.id,
      });
      if (error) throw error;
      toast.success("Void Disetujui!");
      setVoidModalOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // B. REFUND
  const openRefundModal = (order) => {
    setSelectedOrder(order);

    setRefundModalOpen(true);
  };

  const handleApproveRefund = async () => {
    // HAPUS VALIDASI AKUN
    // if (!sourceAccount) return toast.error("Pilih sumber dana!");

    setIsProcessing(true);
    try {
      // Panggil RPC Approval (Tanpa parameter akun)
      const { error } = await supabase.rpc("approve_refund_request", {
        p_order_id: selectedOrder.id,
        p_user_id: authState.user.id,
      });

      if (error) throw error;
      toast.success("Refund Disetujui! Menunggu pembayaran oleh Finance.");
      setRefundModalOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // C. REJECT
  const openRejectModal = (order) => {
    setSelectedOrder(order);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return toast.error("Wajib isi alasan penolakan!");
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc("reject_cancellation_request", {
        p_order_id: selectedOrder.id,
        p_user_id: authState.user.id,
        p_reason: rejectReason, // Kirim alasan ke DB
      });
      if (error) throw error;
      toast.success("Permintaan Ditolak.");
      setRejectModalOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status, type) => {
    if (status === "approved")
      return (
        <Badge className="bg-green-600">
          DISETUJUI ({type?.toUpperCase()})
        </Badge>
      );
    if (status === "rejected")
      return <Badge variant="destructive">DITOLAK</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Pusat Persetujuan
          </h1>
          <p className="text-muted-foreground">
            Kelola pembatalan transaksi (Void/Refund).
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />{" "}
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Permintaan Baru ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="history">Riwayat Persetujuan</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50">
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <p className="text-muted-foreground">
                Tidak ada permintaan menunggu.
              </p>
            </div>
          ) : (
            requests.map((item) => (
              <Card
                key={item.id}
                className="border-l-4 border-l-yellow-400 shadow-sm"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono">
                          {item.invoice_code}
                        </Badge>
                        <Badge
                          className={
                            item.cancellation_type === "void"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }
                        >
                          REQ {item.cancellation_type?.toUpperCase()}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">
                        {formatRupiah(item.grand_total)}
                      </CardTitle>
                      <CardDescription>
                        {item.branches?.name} •{" "}
                        {item.customers?.name || "Guest"}
                      </CardDescription>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />{" "}
                        {new Date(
                          item.cancellation_requested_at
                        ).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 mb-4 text-sm">
                    <span className="font-bold text-slate-500 uppercase text-xs">
                      Alasan Kasir:
                    </span>
                    <p className="italic">"{item.cancellation_reason}"</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => openRejectModal(item)}
                    >
                      Tolak
                    </Button>
                    {item.cancellation_type === "void" ? (
                      <Button
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => openVoidModal(item)}
                      >
                        Setujui VOID
                      </Button>
                    ) : (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => openRefundModal(item)}
                      >
                        Proses REFUND
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {/* Tabel History sama seperti sebelumnya, tambahkan kolom alasan penolakan jika perlu */}
          <div className="border rounded-md bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left">Tgl Proses</th>
                  <th className="p-3 text-left">Invoice</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Catatan</th>
                  <th className="p-3 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {historyLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 text-muted-foreground">
                      {log.cancellation_approved_at
                        ? new Date(log.cancellation_approved_at).toLocaleString(
                            "id-ID"
                          )
                        : "-"}
                    </td>
                    <td className="p-3 font-mono">{log.invoice_code}</td>
                    <td className="p-3">
                      {getStatusBadge(
                        log.cancellation_status,
                        log.cancellation_type
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {log.cancellation_status === "rejected" ? (
                        <span className="text-red-600 font-bold">
                          Ditolak: {log.cancellation_rejection_reason}
                        </span>
                      ) : (
                        log.cancellation_reason
                      )}
                    </td>
                    <td className="p-3 text-right font-bold">
                      {formatRupiah(log.grand_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: KONFIRMASI VOID */}
      <Dialog open={voidModalOpen} onOpenChange={setVoidModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Konfirmasi VOID</DialogTitle>
            <DialogDescription>
              Anda akan menyetujui pembatalan transaksi{" "}
              <b>{selectedOrder?.invoice_code}</b>. <br />
              Omzet hari transaksi tersebut akan <b>dikurangi</b>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleApproveVoid}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              Ya, Setujui Void
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: KONFIRMASI REFUND */}
      <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Persetujuan Refund</DialogTitle>
            <DialogDescription>
              Anda akan menyetujui pengembalian dana{" "}
              <b>{formatRupiah(selectedOrder?.grand_total)}</b>.
              <br />
              Proses pembayaran akan diteruskan ke tim Finance.
            </DialogDescription>
          </DialogHeader>

          {/* HAPUS BAGIAN SELECT ACCOUNT DISINI */}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleApproveRefund}
              disabled={isProcessing}
              className="bg-blue-600"
            >
              Setujui Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: TOLAK REQUEST (INPUT ALASAN) */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Tolak Permintaan
            </DialogTitle>
            <DialogDescription>
              Berikan alasan kenapa permintaan ini ditolak agar kasir tahu.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>
              Alasan Penolakan <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Salah pilih tipe, harusnya Refund bukan Void..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleReject}
              disabled={isProcessing}
              variant="destructive"
            >
              Kirim Penolakan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
