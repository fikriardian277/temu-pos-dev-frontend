import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTransferReconciliation } from "./useTransferReconciliation";
import BankColumn from "./components/BankColumn";
import SystemColumn from "./components/SystemColumn";
import MatchAction from "./components/MatchAction"; // Pastikan file ini ada
import { toast } from "sonner";
import { supabase } from "@/supabaseClient";
import {
  RefreshCw,
  History,
  CheckCircle,
  Trash2,
  Lock,
  AlertTriangle,
  Loader2,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function TransferReconciliationPage() {
  const { authState } = useAuth();
  // Ambil semua state & data dari Hook
  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedBranch,
    setSelectedBranch,
    activeTab,
    setActiveTab,
    reconMode,
    setReconMode,
    branches,
    accounts,
    selectedBankAccount,
    setSelectedBankAccount,
    bankMutations,
    posOrders,
    cashSubmissions,
    hotelInvoices,
    historyMatches,
    loading,
    selectedMutation,
    setSelectedMutation,
    selectedItem,
    setSelectedItem,
    fetchData,
  } = useTransferReconciliation(authState);

  // State Lokal untuk Modals
  const [confirmMatchModal, setConfirmMatchModal] = useState(false);
  const [confirmApproveId, setConfirmApproveId] = useState(null);
  const [confirmUnmatchId, setConfirmUnmatchId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // =========================================
  // 1. EXECUTE MATCH (JODOHKAN)
  // =========================================
  const initiateMatch = () => {
    if (!selectedMutation || !selectedItem) return;
    let targetAmount = 0;

    // Tentukan target nominal berdasarkan mode
    if (reconMode === "sales") targetAmount = selectedItem.grand_total;
    else if (reconMode === "deposit") targetAmount = selectedItem.actual_cash;
    else targetAmount = selectedItem.grand_total; // Invoice

    // Cek selisih nominal
    if (Number(selectedMutation.amount) !== Number(targetAmount)) {
      setConfirmMatchModal(true);
    } else {
      executeMatch();
    }
  };

  const executeMatch = async () => {
    setConfirmMatchModal(false);
    setIsProcessing(true);
    try {
      let rpcName = "",
        payload = {};

      // Pilih RPC berdasarkan mode
      if (reconMode === "sales") {
        rpcName = "match_transfer_transaction";
        payload = {
          p_mutation_id: selectedMutation.id,
          p_order_id: selectedItem.id,
          p_user_id: authState.user.id,
          p_business_id: authState.business_id,
        };
      } else if (reconMode === "deposit") {
        rpcName = "match_submission_transaction";
        payload = {
          p_mutation_id: selectedMutation.id,
          p_submission_id: selectedItem.id,
          p_user_id: authState.user.id,
          p_business_id: authState.business_id,
        };
      } else if (reconMode === "invoice") {
        rpcName = "match_hotel_invoice_transaction";
        payload = {
          p_mutation_id: selectedMutation.id,
          p_invoice_id: selectedItem.id,
          p_user_id: authState.user.id,
        };
      }

      const { error } = await supabase.rpc(rpcName, payload);
      if (error) throw error;

      toast.success("BERHASIL MATCH!");
      fetchData(); // Refresh list
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================
  // 2. EXECUTE UNMATCH (BATALKAN)
  // =========================================
  const initiateUnmatch = (matchId) => setConfirmUnmatchId(matchId);

  const executeUnmatch = async () => {
    if (!confirmUnmatchId) return;
    setIsProcessing(true);
    try {
      // Kita butuh tau ini unmatch tipe apa.
      // SEMENTARA: Kita asumsikan RPC unmatch_transfer_transaction handle umum atau buat logic detection.
      // TAPI biar aman, kita pakai RPC unmatch standar dulu.
      // *Note: Jika logic unmatch invoice & deposit beda, idealnya di view_match_history ada kolom 'type'

      // Asumsi RPC ini handle logic reset bank_mutations (umum)
      const { error } = await supabase.rpc("unmatch_transfer_transaction", {
        p_match_id: confirmUnmatchId,
      });

      // JIKA ERROR (Misal karena logic beda buat invoice), lu perlu bikin RPC khusus unmatch invoice
      // Tapi untuk struktur sekarang, kita coba pakai yg umum dulu.

      if (error) throw error;
      toast.success("Match dibatalkan.");
      setConfirmUnmatchId(null);
      fetchData();
    } catch (e) {
      toast.error("Gagal batal: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================
  // 3. EXECUTE APPROVE (SALDO MASUK)
  // =========================================
  const initiateApprove = (matchId) => {
    if (!selectedBankAccount)
      return toast.error("Pilih Bank Target dulu di atas!");
    setConfirmApproveId(matchId);
  };

  const executeApprove = async () => {
    if (!confirmApproveId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc("approve_transfer_match", {
        p_match_id: confirmApproveId,
        p_account_id: selectedBankAccount,
        p_user_id: authState.user.id,
      });
      if (error) throw error;
      toast.success("Saldo Masuk!");
      setConfirmApproveId(null);
      fetchData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================
  // 4. MANUAL ACTION (RECORD / IGNORE)
  // =========================================
  const handleManualAction = async ({
    action,
    category,
    description,
    mutation,
    branch_id, // <--- 1. TERIMA DATA DARI ANAK (SystemColumn)
  }) => {
    if (!selectedBankAccount)
      return toast.error("Pilih Akun Bank Target di bagian atas dulu!");
    if (!mutation) return toast.error("Pilih data mutasi dulu!");

    try {
      // 2. Tentukan Branch ID (Prioritas: Pilihan User > Login > Default 1)
      const targetBranchId = branch_id
        ? parseInt(branch_id)
        : authState.branch_id || 1;

      const { error } = await supabase.rpc("process_manual_reconciliation", {
        p_mutation_id: mutation.id,
        p_action_type: action,
        p_category: category || "",
        p_description: description || "",
        p_account_id: selectedBankAccount,
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
        p_branch_id: targetBranchId, // <--- 3. KIRIM KE DATABASE
      });

      if (error) throw error;

      toast.success(
        action === "record"
          ? "Transaksi berhasil dicatat!"
          : "Data berhasil diabaikan."
      );
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Gagal memproses: " + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      {/* HEADER & FILTER */}
      <div className="flex flex-col xl:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Rekonsiliasi Transfer
          </h1>
          <p className="text-muted-foreground">Matchmaker Mutasi Bank.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded border shadow-sm">
          {/* Bank Target Selection (Penting buat Approval) */}
          <div className="flex items-center gap-2 border-r pr-2 mr-2">
            <span className="text-xs font-bold text-blue-700">TARGET:</span>
            <Select
              value={selectedBankAccount}
              onValueChange={setSelectedBankAccount}
            >
              <SelectTrigger className="w-[160px] h-8 bg-blue-50 border-blue-200">
                <SelectValue placeholder="Pilih Rekening..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>
                    {a.name} ({a.account_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Filter Tanggal & Cabang */}
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[140px] h-8 border-none">
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Cabang</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id.toString()}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="h-4 w-px bg-slate-200 mx-1"></div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="outline-none text-sm w-32"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="outline-none text-sm w-32"
          />
          <Button size="sm" variant="ghost" onClick={fetchData}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="pending">Matchmaker</TabsTrigger>
          <TabsTrigger value="history">Approval & Riwayat</TabsTrigger>
        </TabsList>

        {/* TAB 1: MATCHMAKER (KIRI KANAN) */}
        <TabsContent value="pending" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
            <BankColumn
              mutations={bankMutations}
              selectedId={selectedMutation?.id}
              onSelect={setSelectedMutation}
              businessId={authState.business_id}
              userId={authState.user.id}
              onUploadSuccess={fetchData}
            />

            {/* KOMPONEN TENGAH: TOMBOL MATCH */}
            <MatchAction
              selectedMutation={selectedMutation}
              selectedItem={selectedItem}
              onMatch={initiateMatch}
              isProcessing={isProcessing}
            />

            <SystemColumn
              mode={reconMode}
              setMode={setReconMode}
              posData={posOrders}
              depositData={cashSubmissions}
              invoiceData={hotelInvoices}
              selectedId={selectedItem?.id}
              onSelect={setSelectedItem}
              mutationMatch={selectedMutation}
              onManualAction={handleManualAction}
            />
          </div>
        </TabsContent>

        {/* TAB 2: HISTORY & APPROVAL (LOGIC DIKEMBALIKAN DISINI) */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" /> Approval & Riwayat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                      <th className="p-3">Waktu Match</th>
                      <th className="p-3">Info Match</th>
                      <th className="p-3 text-right">Nominal</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {historyMatches.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="p-8 text-center text-muted-foreground"
                        >
                          Belum ada riwayat.
                        </td>
                      </tr>
                    ) : (
                      historyMatches.map((h) => (
                        <tr key={h.match_id} className="hover:bg-slate-50">
                          <td className="p-3 text-xs text-muted-foreground">
                            {new Date(h.matched_at).toLocaleDateString("id-ID")}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-xs">
                              {h.invoice_code || "SETORAN / INVOICE"}
                            </div>
                            <div className="text-xs text-slate-500 italic truncate max-w-[200px]">
                              {h.bank_desc}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {formatRupiah(h.order_amount)}
                          </td>
                          <td className="p-3 text-center">
                            {h.status === "approved" ? (
                              <Badge className="bg-green-600">
                                <Lock className="w-3 h-3 mr-1" /> APPROVED
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-yellow-600 border-yellow-300"
                              >
                                DRAFT
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {h.status !== "approved" && (
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 h-8"
                                  onClick={() => initiateUnmatch(h.match_id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" /> Batal
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-green-600 h-8 hover:bg-green-700"
                                  onClick={() => initiateApprove(h.match_id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />{" "}
                                  Approve
                                </Button>
                              </div>
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
        </TabsContent>
      </Tabs>

      {/* MODAL 1: CONFIRM MATCH */}
      <Dialog open={confirmMatchModal} onOpenChange={setConfirmMatchModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-orange-600 flex items-center gap-2">
              <AlertTriangle /> Nominal Berbeda!
            </DialogTitle>
            <DialogDescription>Yakin ingin menjodohkan?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmMatchModal(false)}
            >
              Batal
            </Button>
            <Button
              onClick={executeMatch}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Tetap Jodohkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: CONFIRM APPROVE */}
      <Dialog
        open={!!confirmApproveId}
        onOpenChange={() => setConfirmApproveId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-700">
              Approve Transaksi?
            </DialogTitle>
            <DialogDescription>
              Saldo akan resmi dicatat masuk ke akun bank yang dipilih.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 bg-slate-50 rounded p-4 border text-sm">
            <p className="font-bold text-slate-600">Bank Target:</p>
            <p className="text-lg">
              {accounts.find((a) => a.id.toString() === selectedBankAccount)
                ?.name || "⚠️ Belum pilih bank"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmApproveId(null)}>
              Batal
            </Button>
            <Button
              onClick={executeApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              Ya, Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: CONFIRM UNMATCH */}
      <Dialog
        open={!!confirmUnmatchId}
        onOpenChange={() => setConfirmUnmatchId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Batalkan Match?</DialogTitle>
            <DialogDescription>Status kembali ke Pending.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUnmatchId(null)}>
              Kembali
            </Button>
            <Button
              onClick={executeUnmatch}
              variant="destructive"
              disabled={isProcessing}
            >
              Ya, Batalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
