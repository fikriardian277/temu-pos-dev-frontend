import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  CheckCircle,
  Eye,
  Loader2,
  Building2,
  XCircle,
  History,
  FileText,
  AlertTriangle,
  Banknote,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function PettyCashApprovalPage() {
  const { authState } = useAuth();

  const [claims, setClaims] = useState([]); // Pending List
  const [historyClaims, setHistoryClaims] = useState([]); // Approved/Rejected List
  const [branchBalances, setBranchBalances] = useState([]);
  const [loading, setLoading] = useState(false);

  // Detail Modal
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [claimItems, setClaimItems] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [processLoading, setProcessLoading] = useState(false);

  // Reject State
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const initData = async () => {
    setLoading(true);

    // 1. Fetch Pending
    const { data: cData } = await supabase
      .schema("finance")
      .from("view_petty_cash_claims")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setClaims(cData || []);

    // 2. Fetch History
    const { data: hData } = await supabase
      .schema("finance")
      .from("view_petty_cash_claims")
      .select("*")
      .neq("status", "pending")
      .order("updated_at", { ascending: false })
      .limit(20);
    setHistoryClaims(hData || []);

    // 3. Saldo Cabang
    const { data: bData } = await supabase
      .schema("finance")
      .from("view_branch_balances")
      .select("*")
      .order("branch_id");
    setBranchBalances(bData || []);

    // 4. Akun Bank (Sumber Dana)
    const { data: accData } = await supabase
      .schema("finance")
      .from("accounts")
      .select("id, name")
      .eq("business_id", authState.business_id)
      .eq("account_type", "bank");
    setBankAccounts(accData || []);

    setLoading(false);
  };

  useEffect(() => {
    if (authState.business_id) initData();
  }, [authState.business_id]);

  const openDetail = async (claim) => {
    setSelectedClaim(claim);
    setRejectMode(false);
    setRejectReason("");
    // Reset bank selection jika bukan initial request (opsional)
    // setSelectedBank("");

    if (claim.type === "reimburse") {
      const { data } = await supabase
        .schema("finance")
        .from("petty_cash_items")
        .select("*")
        .eq("claim_id", claim.id);
      setClaimItems(data || []);
    } else {
      setClaimItems([]);
    }
  };

  const handleApprove = async () => {
    if (!selectedBank)
      return toast.error("Pilih bank sumber dana untuk transfer saldo.");

    setProcessLoading(true);
    try {
      const { error } = await supabase.rpc("approve_petty_cash_claim", {
        p_claim_id: selectedClaim.id,
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
        p_account_id: parseInt(selectedBank),
        p_payment_proof: "manual_transfer", // Bisa diupdate jadi upload bukti TF
      });
      if (error) throw error;

      toast.success("Disetujui! Saldo cabang telah ditambahkan.");
      setSelectedClaim(null);
      initData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) return toast.error("Isi alasan penolakan.");

    setProcessLoading(true);
    try {
      const { error } = await supabase.rpc("reject_petty_cash_claim", {
        p_claim_id: selectedClaim.id,
        p_user_id: authState.user.id,
        p_reason: rejectReason,
      });
      if (error) throw error;

      toast.success("Pengajuan berhasil ditolak.");
      setSelectedClaim(null);
      initData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessLoading(false);
    }
  };

  const renderClaimList = (list) => {
    if (list.length === 0)
      return (
        <div className="text-center p-12 bg-white rounded-lg border border-dashed border-slate-200">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500">Tidak ada data pengajuan.</p>
        </div>
      );

    return (
      <div className="space-y-3">
        {list.map((claim) => (
          <Card
            key={claim.id}
            className="hover:shadow-md transition-all cursor-pointer group"
            onClick={() => openDetail(claim)}
          >
            <CardContent className="p-5 flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    className={`text-[10px] px-2 py-0.5 ${
                      claim.type === "initial"
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                    }`}
                  >
                    {claim.type === "initial"
                      ? "REQ SALDO AWAL"
                      : "KLAIM REIMBURSE"}
                  </Badge>
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />{" "}
                    {claim.branch_name}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Oleh: {claim.requester_email?.split("@")[0]}</span>
                  <span>•</span>
                  <span>
                    {new Date(claim.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {claim.status === "rejected" && (
                  <div className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 w-fit px-2 py-0.5 rounded mt-1">
                    <AlertTriangle className="w-3 h-3" /> {claim.notes}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-lg font-mono font-bold text-slate-800">
                    {formatRupiah(claim.total_amount)}
                  </p>
                  <div className="flex justify-end mt-1">
                    <Badge
                      variant={
                        claim.status === "pending"
                          ? "outline"
                          : claim.status === "approved"
                            ? "default"
                            : "destructive"
                      }
                      className={
                        claim.status === "pending"
                          ? "text-orange-600 border-orange-300 bg-orange-50"
                          : ""
                      }
                    >
                      {claim.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="p-2 bg-slate-100 rounded-full group-hover:bg-slate-200 transition-colors">
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 pb-24 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Banknote className="w-6 h-6 text-green-600" /> Approval Petty Cash
          </h1>
          <p className="text-slate-500 text-sm">
            Validasi pengajuan saldo dan reimburse cabang.
          </p>
        </div>
      </div>

      {/* MONITORING SALDO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {branchBalances.map((b, i) => (
          <Card key={i} className="border-l-4 border-l-blue-500 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                <Building2 className="w-3 h-3" /> {b.branch_name}
              </p>
              <p className="text-xl font-bold text-slate-800 font-mono">
                {formatRupiah(b.current_balance)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="pending">Menunggu ({claims.length})</TabsTrigger>
          <TabsTrigger value="history">Riwayat Proses</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin mx-auto w-8 h-8 text-slate-400" />
            </div>
          ) : (
            renderClaimList(claims)
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin mx-auto w-8 h-8 text-slate-400" />
            </div>
          ) : (
            renderClaimList(historyClaims)
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL DETAIL */}
      <Dialog
        open={!!selectedClaim}
        onOpenChange={() => setSelectedClaim(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedClaim?.type === "initial" ? (
                <ArrowRight className="w-5 h-5 text-blue-600" />
              ) : (
                <FileText className="w-5 h-5 text-purple-600" />
              )}
              Detail Pengajuan #{selectedClaim?.id}
            </DialogTitle>
            <DialogDescription>
              Diajukan oleh {selectedClaim?.requester_email} pada{" "}
              {new Date(selectedClaim?.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {/* ISI DETAIL */}
          <div className="space-y-6 py-2">
            {selectedClaim?.type === "initial" ? (
              <div className="p-6 bg-blue-50 text-blue-900 rounded-lg border border-blue-100 text-center">
                <p className="text-sm font-medium uppercase tracking-wider mb-2">
                  Request Saldo Awal
                </p>
                <p className="text-4xl font-bold font-mono text-blue-700">
                  {formatRupiah(selectedClaim?.total_amount)}
                </p>
                <p className="text-xs mt-2 text-blue-600">
                  * Dana akan ditransfer ke saldo Petty Cash Cabang{" "}
                  {selectedClaim?.branch_name}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <span className="font-bold text-purple-900">
                    Total Reimburse
                  </span>
                  <span className="text-2xl font-bold font-mono text-purple-700">
                    {formatRupiah(selectedClaim?.total_amount)}
                  </span>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700 border-b">
                      <tr>
                        <th className="p-3 text-left">Kategori & Ket</th>
                        <th className="p-3 text-right">Nominal</th>
                        <th className="p-3 text-center">Bukti</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {claimItems.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3">
                            <p className="font-bold text-slate-800">
                              {item.category}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.description}
                            </p>
                          </td>
                          <td className="p-3 text-right font-mono font-medium">
                            {formatRupiah(item.amount)}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex flex-wrap gap-2 justify-center">
                              {item.proof_image &&
                                item.proof_image.map((url, k) => (
                                  <a
                                    key={k}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:bg-slate-50 text-blue-600"
                                  >
                                    <FileText className="w-3 h-3" /> Foto{" "}
                                    {k + 1}
                                  </a>
                                ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ACTION AREA - HANYA MUNCUL KALAU STATUS PENDING */}
            {selectedClaim?.status === "pending" && (
              <div className="pt-6 border-t space-y-4">
                {!rejectMode ? (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 space-y-3">
                    <div className="flex items-center gap-2 text-yellow-800 font-bold text-sm">
                      <Building2 className="w-4 h-4" /> KONFIRMASI SUMBER DANA
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">
                        Pilih Rekening Bank (Asal Transfer)
                      </Label>
                      <Select
                        value={selectedBank}
                        onValueChange={setSelectedBank}
                      >
                        <SelectTrigger className="bg-white border-yellow-300 focus:ring-yellow-400">
                          <SelectValue placeholder="Pilih Bank..." />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-yellow-700 mt-1">
                        * Saldo Bank akan berkurang & Saldo Petty Cash Cabang
                        bertambah.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <Label className="text-red-700 font-bold flex items-center gap-2">
                      <XCircle className="w-4 h-4" /> Alasan Penolakan
                    </Label>
                    <Input
                      className="bg-white border-red-300 focus:ring-red-400"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Contoh: Bukti buram, nominal tidak sesuai..."
                      autoFocus
                    />
                  </div>
                )}

                <div className="flex justify-between gap-3 pt-2">
                  {/* TOMBOL KIRI (REJECT FLOW) */}
                  {rejectMode ? (
                    <Button
                      variant="ghost"
                      onClick={() => setRejectMode(false)}
                    >
                      Batal
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setRejectMode(true)}
                    >
                      Tolak Pengajuan
                    </Button>
                  )}

                  {/* TOMBOL KANAN (ACTION) */}
                  {rejectMode ? (
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={processLoading}
                    >
                      {processLoading ? (
                        <Loader2 className="animate-spin mr-2 w-4 h-4" />
                      ) : (
                        <XCircle className="mr-2 w-4 h-4" />
                      )}
                      Konfirmasi Tolak
                    </Button>
                  ) : (
                    <Button
                      className="bg-green-600 hover:bg-green-700 px-6"
                      onClick={handleApprove}
                      disabled={processLoading}
                    >
                      {processLoading ? (
                        <Loader2 className="animate-spin mr-2 w-4 h-4" />
                      ) : (
                        <CheckCircle className="mr-2 w-4 h-4" />
                      )}
                      Setujui & Transfer
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER TUTUP (HANYA MUNCUL KALO BUKAN PENDING) */}
          {selectedClaim?.status !== "pending" && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedClaim(null)}
                className="w-full"
              >
                Tutup
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
