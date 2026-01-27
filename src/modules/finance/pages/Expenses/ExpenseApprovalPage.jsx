import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  CheckCircle,
  Eye,
  Loader2,
  Building2,
  Calendar,
  DollarSign,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

// GANTI URL SCRIPT UPLOAD LU DISINI
const GAS_UPLOAD_URL =
  "https://script.google.com/macros/s/AKfycbxj94Vw2eDyejjCj_bScQaMklhTF3MUBl9JCFYA21ggECN6KE7i5cg_p2fyUFrG0AiDkw/exec";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function ExpenseApprovalPage() {
  const { authState } = useAuth();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [selectedExp, setSelectedExp] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBank, setSelectedBank] = useState("");

  // Payment Proof Upload
  const [proofFile, setProofFile] = useState(null);
  const [processLoading, setProcessLoading] = useState(false);

  // --- 1. FETCH DATA DARI VIEW GABUNGAN ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema("finance")
        .from("view_expense_requests") // <--- VIEW BARU
        .select("*")
        .eq("business_id", authState.business_id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setList(data || []);
    } catch (e) {
      toast.error("Gagal load data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    const { data } = await supabase
      .schema("finance")
      .from("accounts")
      .select("id, name, account_number, account_type") // Tambah account_type
      .eq("business_id", authState.business_id)
      .eq("is_active", true);
    setBankAccounts(data || []);
  };

  useEffect(() => {
    if (authState.business_id) {
      fetchData();
      fetchAccounts();
    }
  }, [authState.business_id]);

  // --- ACTIONS ---

  // A. APPROVE (KHUSUS EXPENSE)
  const handleApprove = async () => {
    setProcessLoading(true);
    try {
      const { error } = await supabase.rpc("approve_expense_request", {
        p_expense_id: selectedExp.request_id, // Pake request_id
        p_user_id: authState.user.id,
      });
      if (error) throw error;
      toast.success("Disetujui! Menunggu pembayaran Finance.");
      setSelectedExp(null);
      fetchData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessLoading(false);
    }
  };

  // B. PAY (SMART RPC: BISA REFUND / EXPENSE)
  const handlePay = async () => {
    if (!selectedBank) return toast.error("Pilih sumber dana.");

    let proofUrl = null;
    setProcessLoading(true);

    try {
      // 1. Upload Proof (Optional tapi Recommended)
      if (proofFile) {
        const reader = new FileReader();
        reader.readAsDataURL(proofFile);
        await new Promise((resolve) => {
          reader.onload = async () => {
            const response = await fetch(GAS_UPLOAD_URL, {
              method: "POST",
              body: JSON.stringify({
                filename: `pay_proof_${Date.now()}_${proofFile.name}`,
                mimeType: proofFile.type,
                base64: reader.result,
                folderType: "expense_proof",
              }),
            });
            const resJson = await response.json();
            if (resJson.status === "success") {
              proofUrl = resJson.url;
              resolve();
            }
          };
        });
      }

      // 2. PANGGIL SMART RPC
      const { error } = await supabase.rpc("pay_payable_request", {
        p_request_id: selectedExp.request_id, // ID Transaksi
        p_request_type: selectedExp.request_type, // 'EXPENSE' atau 'REFUND'
        p_account_id: parseInt(selectedBank), // Akun Sumber Dana
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
        p_payment_date: new Date().toISOString().split("T")[0],
        p_proof_url: proofUrl,
      });

      if (error) throw error;

      toast.success("Pembayaran Berhasil & Tercatat!");
      setSelectedExp(null);
      fetchData();
      setProofFile(null);
      setSelectedBank("");
    } catch (e) {
      toast.error("Gagal: " + e.message);
    } finally {
      setProcessLoading(false);
    }
  };

  // --- FILTER LIST ---
  const pendingList = list.filter((i) => i.status === "pending");
  const approvedList = list.filter((i) => i.status === "approved"); // Siap Bayar
  const historyList = list.filter(
    (i) =>
      i.status === "paid" || i.status === "rejected" || i.status === "Refunded"
  );

  const renderCard = (item) => (
    <Card
      key={`${item.request_type}-${item.request_id}`} // Key unik gabungan
      className="mb-3 hover:border-orange-300 transition-all cursor-pointer"
      onClick={() => setSelectedExp(item)}
    >
      <CardContent className="p-4 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            {/* Badge Tipe Request */}
            <Badge
              variant={
                item.request_type === "REFUND" ? "destructive" : "outline"
              }
              className={
                item.request_type === "REFUND"
                  ? ""
                  : "text-orange-600 border-orange-200"
              }
            >
              {item.request_type === "REFUND"
                ? "REFUND CUSTOMER"
                : item.category}
            </Badge>

            <span className="font-bold text-slate-700">{item.branch_name}</span>
          </div>
          <p className="font-bold text-lg mt-1">{item.description}</p>
          <div className="text-sm text-slate-500 flex gap-3 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Jatuh Tempo:{" "}
              {new Date(item.due_date).toLocaleDateString()}
            </span>
            {item.payee && <span>Penerima: {item.payee}</span>}
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Req by: {item.requester_email}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-mono font-bold text-slate-800">
            {formatRupiah(item.amount)}
          </p>
          <p className="text-xs font-bold text-blue-600 mt-1 uppercase">
            {item.status}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-slate-800">
        Pusat Pembayaran (Expenses & Refunds)
      </h1>

      <Tabs defaultValue="approved">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Menunggu Approval ({pendingList.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-blue-700 font-bold">
            Siap Dibayar ({approvedList.length})
          </TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingList.map((i) => renderCard(i))}
          {pendingList.length === 0 && (
            <p className="text-center text-slate-400 py-10">
              Tidak ada pengajuan pending.
            </p>
          )}
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          {approvedList.map((i) => renderCard(i))}
          {approvedList.length === 0 && (
            <p className="text-center text-slate-400 py-10">
              Semua tagihan sudah dibayar.
            </p>
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          {historyList.map((i) => renderCard(i))}
        </TabsContent>
      </Tabs>

      {/* MODAL ACTION */}
      <Dialog open={!!selectedExp} onOpenChange={() => setSelectedExp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Detail{" "}
              {selectedExp?.request_type === "REFUND" ? "Refund" : "Biaya"} #
              {selectedExp?.request_id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-slate-50 p-4 rounded border">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500">Keterangan:</p>
                  <p className="font-bold text-lg">
                    {selectedExp?.description}
                  </p>
                </div>
                <Badge>{selectedExp?.request_type}</Badge>
              </div>

              <div className="flex justify-between mt-2 border-t pt-2">
                <span>Nominal:</span>
                <span className="font-mono font-bold text-xl">
                  {formatRupiah(selectedExp?.amount)}
                </span>
              </div>

              {/* Tampilkan Link Invoice jika ada (Biasanya Expense) */}
              {selectedExp?.document_url && (
                <div className="mt-2 pt-2 border-t text-center">
                  <a
                    href={selectedExp.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline text-sm flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" /> Lihat Invoice / Bukti
                  </a>
                </div>
              )}
              {!selectedExp?.document_url &&
                selectedExp?.request_type === "EXPENSE" && (
                  <p className="text-xs text-center mt-2 italic text-slate-400">
                    Tidak ada lampiran invoice.
                  </p>
                )}
            </div>

            {/* AREA ACTION: OWNER APPROVE (Hanya untuk Expense yang masih Pending) */}
            {/* Refund tidak butuh ini karena sudah diapprove Owner di menu lain */}
            {selectedExp?.status === "pending" &&
              selectedExp?.request_type === "EXPENSE" && (
                <div className="text-center border-t pt-4">
                  <p className="text-sm mb-2 font-semibold">
                    Validasi Pengajuan Biaya
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedExp(null)}
                    >
                      Tutup
                    </Button>
                    <Button
                      className="bg-blue-600"
                      onClick={handleApprove}
                      disabled={processLoading}
                    >
                      {processLoading ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        "Setujui (Approve)"
                      )}
                    </Button>
                  </div>
                </div>
              )}

            {/* AREA ACTION: FINANCE PAY (Muncul kalau status Approved) */}
            {selectedExp?.status === "approved" && (
              <div className="bg-yellow-50 p-4 rounded border border-yellow-200 space-y-3">
                <p className="text-xs font-bold text-yellow-800 uppercase flex items-center gap-2">
                  <DollarSign className="w-3 h-3" /> Proses Pembayaran
                </p>

                <div>
                  <Label>Sumber Dana (Kas/Bank)</Label>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Pilih Akun Sumber Dana" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name} (
                          {b.account_number ||
                            b.account_type?.toUpperCase().replace("_", " ") ||
                            "Tunai"}
                          )
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    *Saldo akun ini akan berkurang & tercatat di jurnal.
                  </p>
                </div>

                <div>
                  <Label>Bukti Transfer / Foto (Opsional)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      onChange={(e) => setProofFile(e.target.files[0])}
                      className="bg-white"
                    />
                  </div>
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handlePay}
                  disabled={processLoading}
                >
                  {processLoading ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Konfirmasi Bayar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
