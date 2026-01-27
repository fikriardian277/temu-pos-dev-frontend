import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  ArrowRight,
  CheckCircle,
  Loader2,
  XCircle,
  UploadCloud,
  FileText,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function CashSubmissionPage() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create State
  const [createModal, setCreateModal] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [posData, setPosData] = useState({ cash: 0, qris: 0, transfer: 0 });
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");

  // Upload State
  const [file, setFile] = useState(null);
  const [creating, setCreating] = useState(false);

  // Action State (Reject Only)
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // FETCH LIST
  const fetchList = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);
    try {
      let query = supabase
        .schema("finance")
        .from("cash_submissions")
        .select("*")
        .eq("business_id", authState.business_id)
        .order("submission_date", { ascending: false });

      if (authState.role === "admin_branch" && authState.branch_id) {
        query = query.eq("branch_id", authState.branch_id);
      }

      const { data: subs, error } = await query;
      if (error) throw error;

      if (subs && subs.length > 0) {
        const branchIds = [
          ...new Set(subs.map((s) => s.branch_id).filter(Boolean)),
        ];
        const userIds = [
          ...new Set(subs.map((s) => s.verified_by).filter(Boolean)),
        ];

        let branchMap = {},
          userMap = {};

        if (branchIds.length > 0) {
          const { data: b } = await supabase
            .from("branches")
            .select("id, name")
            .in("id", branchIds);
          b?.forEach((x) => (branchMap[x.id] = x.name));
        }
        if (userIds.length > 0) {
          const { data: u } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);
          u?.forEach((x) => (userMap[x.id] = x.full_name));
        }

        const merged = subs.map((s) => ({
          ...s,
          branch_name: branchMap[s.branch_id] || "Unknown Branch",
          verifier_name: userMap[s.verified_by] || "System",
        }));
        setList(merged);
      } else {
        setList([]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [authState.business_id, authState.branch_id, authState.role]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // POS DATA (CREATE)
  useEffect(() => {
    if (createModal && authState.branch_id) {
      const fetchPos = async () => {
        const { data, error } = await supabase.rpc("get_daily_sales_summary", {
          p_branch_id: authState.branch_id,
          p_date: date,
        });
        if (data && !error) {
          setPosData({
            cash: data.system_cash,
            qris: data.system_qris,
            transfer: data.system_transfer,
          });
          setActualCash(data.system_cash); // Default isi sesuai sistem
        }
      };
      fetchPos();
    }
  }, [createModal, date, authState.branch_id]);

  // ACTION: CREATE & UPLOAD
  const handleCreate = async () => {
    if (!authState.branch_id)
      return toast.error("Akun Anda tidak terhubung cabang.");
    if (!file) return toast.error("Wajib upload bukti setor bank.");

    // --- INTEGRASI SETTINGS ---
    const settings = authState.pengaturan || {};
    const GAS_UPLOAD_URL = settings.link_invoice_script;
    // Gunakan folder cash deposit, kalau kosong fallback ke expense folder
    let TARGET_FOLDER_ID =
      settings.cash_deposit_drive_folder_id || settings.expense_drive_folder_id;

    if (!GAS_UPLOAD_URL)
      return toast.error("Link Script belum disetting di Pengaturan!");
    if (!TARGET_FOLDER_ID)
      return toast.error("ID Folder belum disetting di Pengaturan!");

    // Bersihkan ID Folder
    if (TARGET_FOLDER_ID.includes("folders/")) {
      const parts = TARGET_FOLDER_ID.split("folders/");
      if (parts.length > 1) TARGET_FOLDER_ID = parts[1].split("?")[0];
    }

    setCreating(true);
    try {
      let proofUrl = null;

      // 1. Upload File
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const response = await fetch(GAS_UPLOAD_URL, {
              method: "POST",
              body: JSON.stringify({
                filename: `deposit_${authState.branch_id}_${date}_${file.name}`,
                mimeType: file.type,
                base64: reader.result,
                folderType: "cash_deposit",
                targetFolderId: TARGET_FOLDER_ID,
              }),
            });
            const result = await response.json();
            if (result.status === "success") {
              proofUrl = result.url;
              resolve();
            } else {
              reject("Gagal upload bukti: " + result.message);
            }
          } catch (err) {
            reject(err);
          }
        };
      });

      // 2. Insert DB
      const { error } = await supabase
        .schema("finance")
        .from("cash_submissions")
        .insert({
          business_id: authState.business_id,
          branch_id: authState.branch_id,
          submission_date: date,
          system_cash: posData.cash,
          system_qris: posData.qris,
          system_transfer: posData.transfer,
          actual_cash: parseFloat(actualCash) || 0,
          notes: notes,
          proof_cash_deposit: proofUrl, // Simpan URL Drive
          created_by: authState.user.id,
        });

      if (error) throw error;

      toast.success("Laporan terkirim! Silakan cek di menu Rekonsiliasi.");
      setCreateModal(false);
      setFile(null); // Reset file
      fetchList();
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Gagal membuat laporan.");
    } finally {
      setCreating(false);
    }
  };

  // ACTION: REJECT
  const confirmReject = async () => {
    if (!rejectReason.trim())
      return toast.error("Alasan penolakan wajib diisi.");
    setProcessing(true);
    try {
      const { error } = await supabase
        .schema("finance")
        .from("cash_submissions")
        .update({
          status: "rejected",
          notes: (rejectModal.notes || "") + ` [DITOLAK: ${rejectReason}]`,
          updated_at: new Date(),
        })
        .eq("id", rejectModal.id);
      if (error) throw error;
      toast.success("Laporan ditolak.");
      setRejectModal(null);
      fetchList();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-6 pb-24 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Banknote className="w-6 h-6 text-green-600" /> Setoran Kasir
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Laporan setoran tunai harian dari cabang ke rekening pusat.
          </p>
        </div>

        {authState.role === "admin_branch" && (
          <Button
            onClick={() => setCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 shadow-lg"
          >
            <Plus className="mr-2 h-4 w-4" /> Buat Laporan Setoran
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-10">
            <Loader2 className="animate-spin mx-auto text-slate-400" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
            <Banknote className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Belum ada data setoran.</p>
          </div>
        ) : (
          list.map((item) => (
            <Card
              key={item.id}
              className={`transition-all hover:shadow-md ${
                item.status === "pending"
                  ? "border-l-4 border-l-orange-400 bg-orange-50/10"
                  : item.status === "approved"
                    ? "border-l-4 border-l-green-500"
                    : "border-l-4 border-l-red-500"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {new Date(item.submission_date).toLocaleDateString(
                          "id-ID",
                          { day: "numeric", month: "long", year: "numeric" },
                        )}
                      </Badge>
                      <span className="font-bold text-lg text-slate-700">
                        {item.branch_name}
                      </span>
                      <Badge
                        className={`${
                          item.status === "approved"
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : item.status === "rejected"
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-500 text-xs uppercase font-bold block mb-1">
                          System Cash
                        </span>
                        <span className="font-mono font-medium">
                          {formatRupiah(item.system_cash)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs uppercase font-bold block mb-1">
                          Fisik (Setor)
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {formatRupiah(item.actual_cash)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs uppercase font-bold block mb-1">
                          Selisih
                        </span>
                        <span
                          className={`font-mono font-bold ${item.discrepancy < 0 ? "text-red-600" : "text-green-600"}`}
                        >
                          {formatRupiah(item.discrepancy)}
                        </span>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-500 italic bg-white p-2 rounded border border-slate-100 inline-block">
                        Catatan: "{item.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end justify-between gap-4 min-w-[200px]">
                    <div className="flex flex-col items-end">
                      {item.proof_cash_deposit && (
                        <a
                          href={item.proof_cash_deposit}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3 h-3" /> Lihat Bukti Setor
                        </a>
                      )}
                      {(item.status === "approved" ||
                        item.status === "verified") && (
                        <span className="text-[10px] text-green-600 mt-2 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Verifikasi oleh{" "}
                          {item.verifier_name}
                        </span>
                      )}
                    </div>

                    {/* ACTION BUTTONS */}
                    {item.status === "pending" &&
                      (authState.role === "finance" ||
                        authState.role === "owner") && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 flex-1 sm:flex-none"
                            onClick={() => {
                              setRejectReason("");
                              setRejectModal(item);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Tolak
                          </Button>

                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                            onClick={() =>
                              navigate(
                                "/finance/transfer-reconciliation?mode=deposit",
                              )
                            }
                          >
                            <ArrowRight className="mr-1 h-4 w-4" /> Match di
                            Bank
                          </Button>
                        </div>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* MODAL 1: CREATE */}
      <Dialog open={createModal} onOpenChange={setCreateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-green-600" /> Lapor Setoran
              Harian
            </DialogTitle>
            <DialogDescription>
              Input jumlah uang tunai yang disetor ke bank.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* ROW 1: TANGGAL & SYSTEM DATA */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Penjualan</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <Label className="text-[10px] text-slate-500 uppercase font-bold">
                  Total Cash System
                </Label>
                <div className="font-mono font-bold text-xl text-slate-800">
                  {formatRupiah(posData.cash)}
                </div>
              </div>
            </div>

            {/* ROW 2: INPUT ACTUAL */}
            <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 space-y-3">
              <div>
                <Label className="text-blue-800 font-bold">
                  Jumlah Disetor (Actual Cash)
                </Label>
                <Input
                  type="number"
                  className="text-2xl font-bold h-12 border-blue-200 focus:ring-blue-200 mt-1"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Selisih (Varian):</span>
                <span
                  className={`font-mono font-bold ${actualCash - posData.cash < 0 ? "text-red-500" : "text-green-600"}`}
                >
                  {formatRupiah(actualCash - posData.cash)}
                </span>
              </div>
            </div>

            {/* ROW 3: BUKTI & CATATAN */}
            <div className="grid gap-4">
              <div>
                <Label>Foto Bukti Setor Bank</Label>
                <div className="mt-1 flex items-center justify-center w-full">
                  <label
                    htmlFor="dropzone-file"
                    className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />
                      <p className="text-xs text-slate-500">
                        <span className="font-semibold">Klik untuk upload</span>{" "}
                        foto struk
                      </p>
                    </div>
                    <input
                      id="dropzone-file"
                      type="file"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files[0])}
                      accept="image/*"
                    />
                  </label>
                </div>
                {file && (
                  <p className="text-xs text-green-600 mt-1 text-center font-medium">
                    File dipilih: {file.name}
                  </p>
                )}
              </div>
              <div>
                <Label>Catatan (Opsional)</Label>
                <Textarea
                  placeholder="Keterangan selisih atau info transfer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none h-20"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModal(false)}>
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              {creating ? "Mengupload..." : "Kirim Laporan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: REJECT */}
      <Dialog open={!!rejectModal} onOpenChange={() => setRejectModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Tolak Laporan Setoran
            </DialogTitle>
            <DialogDescription>
              Admin cabang akan diminta untuk merevisi data/bukti setoran ini.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Alasan Penolakan</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Bukti buram, nominal tidak sesuai mutasi bank..."
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectModal(null)}>
              Batal
            </Button>
            <Button
              onClick={confirmReject}
              disabled={processing}
              variant="destructive"
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Konfirmasi Tolak"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
