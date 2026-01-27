import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Save,
  Zap,
  Calendar,
  Building2,
  Loader2,
  FileText,
  History,
  Wallet,
  UploadCloud,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function ExpenseRequestPage() {
  const { authState } = useAuth();

  // State Form
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Logic Invoice
  const [hasInvoice, setHasInvoice] = useState(true);
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);

  // STATE BARU: HISTORY
  const [history, setHistory] = useState([]);

  // 1. Initial Data (Cabang & History)
  useEffect(() => {
    if (authState.business_id) {
      fetchBranches();
      fetchHistory();
    }
  }, [authState.business_id]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from("branches")
      .select("id, name")
      .eq("business_id", authState.business_id);
    setBranches(data || []);
    // Auto select jika user terikat cabang tertentu
    if (authState.user.branch_id) setBranchId(String(authState.user.branch_id));
  };

  // FETCH HISTORY (Hanya punya requester ini)
  const fetchHistory = async () => {
    const { data, error } = await supabase
      .schema("finance")
      .from("view_expense_requests") // Menggunakan VIEW
      .select("*")
      .eq("requester_id", authState.user.id)
      .order("created_at", { ascending: false });

    if (error) console.error("Error history:", error);
    setHistory(data || []);
  };

  // Handle Submit
  const handleSubmit = async () => {
    // Validasi Input Dasar
    if (!branchId || !category || !description || !amount || !dueDate) {
      return toast.error("Mohon lengkapi data wajib (*).");
    }

    // Validasi Invoice
    if (hasInvoice && !file) {
      return toast.error("Wajib upload invoice jika opsi Invoice aktif.");
    }

    const settings = authState.pengaturan || {};
    const GAS_UPLOAD_URL = settings.link_invoice_script;
    const TARGET_FOLDER_ID = settings.expense_drive_folder_id; // <--- AMBIL FOLDER ID

    if (hasInvoice && !GAS_UPLOAD_URL) {
      return toast.error(
        "Link Upload Script belum disetting di menu Pengaturan!",
      );
    }

    setLoading(true);
    try {
      let invoiceUrl = null;

      // Upload Invoice ke Google Apps Script (Jika ada)
      if (hasInvoice && file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise((resolve, reject) => {
          reader.onload = async () => {
            try {
              const response = await fetch(GAS_UPLOAD_URL, {
                method: "POST",
                body: JSON.stringify({
                  filename: `exp_${Date.now()}_${file.name}`,
                  mimeType: file.type,
                  base64: reader.result,
                  folderType: "expense",
                  // 👇 INI KUNCINYA: Kita kirim alamat folder spesifik
                  targetFolderId: TARGET_FOLDER_ID,
                }),
              });
              const result = await response.json();
              if (result.status === "success") {
                invoiceUrl = result.url;
                resolve();
              } else {
                reject("Gagal upload ke Drive.");
              }
            } catch (e) {
              reject(e);
            }
          };
        });
      }

      // Insert DB
      const { error } = await supabase
        .schema("finance")
        .from("expense_requests")
        .insert({
          business_id: authState.business_id,
          branch_id: parseInt(branchId),
          requester_id: authState.user.id,
          category,
          description,
          payee,
          amount: parseFloat(amount),
          due_date: dueDate,
          invoice_url: invoiceUrl,
          status: "pending",
        });

      if (error) throw error;

      toast.success("Pengajuan Biaya Terkirim!");

      // Reset Form
      setDescription("");
      setPayee("");
      setAmount("");
      setFile(null);
      // Jangan reset branchId biar user gak capek milih lagi
      fetchHistory();
    } catch (e) {
      console.error(e);
      toast.error("Gagal: " + (e.message || "Error server"));
    } finally {
      setLoading(false);
    }
  };

  // Helper Warna Status
  const getStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">
            SUDAH DIBAYAR
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">
            DISETUJUI
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
            DITOLAK
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-orange-600 border-orange-300 bg-orange-50"
          >
            MENUNGGU APPROVAL
          </Badge>
        );
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-24 animate-in fade-in">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-100 rounded-lg">
          <Zap className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Biaya Operasional
          </h1>
          <p className="text-slate-500 text-sm">
            Request pembayaran untuk kebutuhan operasional cabang (Non-PO).
          </p>
        </div>
      </div>

      <Tabs defaultValue="form" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="form" className="flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Form Pengajuan Baru
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" /> Riwayat Saya
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FORM INPUT */}
        <TabsContent value="form">
          <Card className="border-t-4 border-t-orange-500 shadow-sm">
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-base font-bold text-slate-800">
                Detail Pengajuan Biaya
              </CardTitle>
              <CardDescription>
                Isi form dengan lengkap. Pastikan invoice terbaca jelas jika
                diupload.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>
                    Beban Cabang <span className="text-red-500">*</span>
                  </Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Cabang" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Kategori Biaya <span className="text-red-500">*</span>
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Listrik">Listrik (PLN)</SelectItem>
                      <SelectItem value="Internet">Internet (Wifi)</SelectItem>
                      <SelectItem value="Sewa">Sewa Tempat</SelectItem>
                      <SelectItem value="Maintenance">
                        Maintenance / Service
                      </SelectItem>
                      <SelectItem value="Software">
                        Langganan Software
                      </SelectItem>
                      <SelectItem value="Pajak">Pajak / Retribusi</SelectItem>
                      <SelectItem value="Gaji">Gaji / Upah Lepas</SelectItem>
                      <SelectItem value="ATK">ATK / Perlengkapan</SelectItem>
                      <SelectItem value="Other">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Vendor / Penerima (Payee)</Label>
                  <Input
                    placeholder="Contoh: Telkom Indonesia / Pak Budi"
                    value={payee}
                    onChange={(e) => setPayee(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Jatuh Tempo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Keterangan Detail <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="Contoh: Pembayaran Wifi Indihome bulan Januari 2026. No Pelanggan: 123456"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none"
                />
              </div>

              {/* Amount Box */}
              <div className="p-5 bg-orange-50/50 rounded-lg border border-orange-100 space-y-2">
                <Label className="text-orange-800 font-bold">
                  Nominal Tagihan (Rp) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  className="text-2xl font-bold font-mono h-12 border-orange-200 focus:border-orange-500 focus:ring-orange-200"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-xs text-orange-600 font-medium text-right">
                  {amount ? formatRupiah(amount) : "Rp 0"}
                </p>
              </div>

              {/* Invoice Upload Logic */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white rounded border">
                      <FileText className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <Label
                        htmlFor="inv-switch"
                        className="cursor-pointer font-bold text-slate-700"
                      >
                        Lampirkan Bukti / Invoice?
                      </Label>
                      <p className="text-xs text-slate-500">
                        Aktifkan jika ada struk, nota, atau invoice fisik.
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="inv-switch"
                    checked={hasInvoice}
                    onCheckedChange={setHasInvoice}
                  />
                </div>

                {hasInvoice ? (
                  <div className="animate-in fade-in slide-in-from-top-2 pt-2 border-t">
                    <Label className="mb-2 block">
                      Upload File (Gambar/PDF)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                        accept="image/*, application/pdf"
                        className="bg-white"
                      />
                    </div>
                    {file && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <UploadCloud className="w-3 h-3" /> File siap:{" "}
                        {file.name}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 bg-yellow-50 p-3 rounded text-yellow-800 text-xs border border-yellow-100">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>
                      Pastikan Anda memilih opsi ini hanya untuk biaya yang
                      memang tidak memiliki bukti fisik (cth: Token Listrik,
                      Parkir liar, Tips).
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <Button
                  className="w-full bg-slate-900 hover:bg-slate-800 h-12 text-base font-bold shadow-lg"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin" /> Memproses...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="w-4 h-4" /> Ajukan Permintaan
                    </span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: RIWAYAT SAYA */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-4 border-b bg-slate-50">
              <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                <History className="w-4 h-4" /> Riwayat Pengajuan Anda
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
                  <History className="w-12 h-12 mb-3 opacity-20" />
                  <p>Belum ada pengajuan biaya yang Anda buat.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {item.branch_name}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800">
                          {item.description}
                        </p>
                        <div className="text-xs text-slate-500 flex gap-3 mt-1">
                          <span>
                            Due:{" "}
                            {new Date(item.due_date).toLocaleDateString(
                              "id-ID",
                            )}
                          </span>
                          {item.payee && <span>To: {item.payee}</span>}
                        </div>

                        {item.invoice_url && (
                          <a
                            href={item.invoice_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                          >
                            <FileText className="w-3 h-3" /> Lihat Bukti
                          </a>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-lg font-mono font-bold text-slate-800">
                          {formatRupiah(item.amount)}
                        </p>
                        <div className="mt-1 flex justify-end">
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Diajukan:{" "}
                          {new Date(item.created_at).toLocaleDateString(
                            "id-ID",
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
