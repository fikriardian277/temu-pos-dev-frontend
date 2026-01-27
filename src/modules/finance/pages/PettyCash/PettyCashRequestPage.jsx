import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Receipt,
  Loader2,
  Wallet,
  ArrowUpCircle,
  Store,
  UploadCloud,
  History,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
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
} from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function PettyCashRequestPage() {
  const { authState } = useAuth();

  // --- LOGIC 1: DETEKSI CABANG ---
  const userBranchId = authState.user?.branch_id || authState.branch_id;
  const isOwner = authState.role === "owner";

  // State Branch
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(
    userBranchId ? String(userBranchId) : "",
  );

  // State Saldo
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // State Input Reimburse
  const [items, setItems] = useState([]); // Keranjang Item
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  // STATE FILE (Raw Files sebelum upload)
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Loading States
  const [submitting, setSubmitting] = useState(false); // Loading Upload & Submit Global

  // State Initial Request (Modal Saldo Awal)
  const [initialModalOpen, setInitialModalOpen] = useState(false);
  const [initialAmount, setInitialAmount] = useState("");

  // History & Detail
  const [history, setHistory] = useState([]);
  const [detailClaim, setDetailClaim] = useState(null);
  const [detailItems, setDetailItems] = useState([]);

  // 1. INIT DATA
  useEffect(() => {
    if (!authState.business_id) return;

    const initData = async () => {
      if (isOwner) {
        const { data } = await supabase
          .from("branches")
          .select("id, name")
          .eq("business_id", authState.business_id);
        setBranches(data || []);
        if (data && data.length > 0 && !selectedBranchId) {
          setSelectedBranchId(String(data[0].id));
        }
      }
    };
    initData();
  }, [authState.business_id, isOwner]);

  // 2. FETCH SALDO & HISTORY
  useEffect(() => {
    if (selectedBranchId) {
      refreshData();
    }
  }, [selectedBranchId]);

  const refreshData = () => {
    fetchBalance();
    fetchHistory();
  };

  const fetchBalance = async () => {
    setLoadingBalance(true);
    const { data } = await supabase
      .schema("finance")
      .from("branch_petty_cash_balances")
      .select("current_balance")
      .eq("branch_id", parseInt(selectedBranchId))
      .single();
    setCurrentBalance(data?.current_balance || 0);
    setLoadingBalance(false);
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .schema("finance")
      .from("petty_cash_claims")
      .select("*")
      .eq("business_id", authState.business_id)
      .eq("branch_id", parseInt(selectedBranchId))
      .order("created_at", { ascending: false });
    setHistory(data || []);
  };

  const openHistoryDetail = async (claim) => {
    setDetailClaim(claim);
    if (claim.type === "reimburse") {
      const { data } = await supabase
        .schema("finance")
        .from("petty_cash_items")
        .select("*")
        .eq("claim_id", claim.id);
      setDetailItems(data || []);
    } else {
      setDetailItems([]);
    }
  };

  // --- LOGIC ADD ITEM (LOCAL ONLY) ---
  // Fungsi ini cuma masukin data ke state 'items', BELUM UPLOAD ke Drive
  const handleAddItem = () => {
    if (!category || !desc || !amount)
      return toast.error("Lengkapi data wajib (Kategori, Ket, Nominal).");
    if (selectedFiles.length === 0)
      return toast.error("Wajib upload minimal 1 foto struk.");

    // Buat Object URL untuk preview lokal (biar user bisa liat gambarnya sebelum diupload)
    const previewUrls = selectedFiles.map((file) => URL.createObjectURL(file));

    const newItem = {
      date,
      category,
      description: desc,
      amount: parseFloat(amount),
      // Simpan File Mentah (Object File) buat diupload nanti pas Submit
      raw_files: selectedFiles,
      // Simpan Preview URL buat ditampilkan di UI Keranjang
      preview_urls: previewUrls,
    };

    setItems([...items, newItem]);

    // Reset Form
    setDesc("");
    setAmount("");
    setSelectedFiles([]);
    toast.success("Item ditambahkan ke daftar (Belum disimpan ke database).");
  };

  // --- LOGIC SUBMIT & UPLOAD MASSAL ---
  const handleSubmitReimburse = async () => {
    if (!selectedBranchId) return toast.error("Cabang belum dipilih.");
    if (items.length === 0) return;

    // Cek Saldo
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
    if (totalAmount > currentBalance)
      return toast.error(
        `Saldo Petty Cash tidak cukup! (Sisa: ${formatRupiah(currentBalance)})`,
      );

    // --- 1. PREPARE SETTINGS ---
    const settings = authState.pengaturan || {};
    const GAS_UPLOAD_URL = settings.link_invoice_script;
    let TARGET_FOLDER_ID = settings.petty_cash_drive_folder_id;

    if (!GAS_UPLOAD_URL)
      return toast.error("Link Script belum disetting di Pengaturan!");
    if (!TARGET_FOLDER_ID)
      return toast.error("ID Folder Petty Cash belum disetting!");

    // Bersihkan ID Folder
    if (TARGET_FOLDER_ID.includes("folders/")) {
      const parts = TARGET_FOLDER_ID.split("folders/");
      if (parts.length > 1) TARGET_FOLDER_ID = parts[1].split("?")[0];
    }

    setSubmitting(true);
    const finalItemsToUpload = [];

    try {
      // --- 2. LOOPING UPLOAD IMAGE (HEAVY LIFTING) ---
      // Kita iterasi setiap Item di keranjang
      for (let i = 0; i < items.length; i++) {
        const currentItem = items[i];
        const uploadedProofUrls = [];

        // Iterasi setiap File dalam Item tersebut
        if (currentItem.raw_files && currentItem.raw_files.length > 0) {
          for (let j = 0; j < currentItem.raw_files.length; j++) {
            const file = currentItem.raw_files[j];

            // Convert to Base64
            const base64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.readAsDataURL(file);
            });

            // Upload ke GAS
            try {
              const response = await fetch(GAS_UPLOAD_URL, {
                method: "POST",
                body: JSON.stringify({
                  filename: `pc_claim_${Date.now()}_${i}_${j}_${file.name}`, // Unique Name
                  mimeType: file.type,
                  base64: base64,
                  folderType: "petty_cash",
                  targetFolderId: TARGET_FOLDER_ID,
                }),
              });
              const result = await response.json();

              if (result.status === "success") {
                uploadedProofUrls.push(result.url);
              } else {
                throw new Error(`Gagal upload file pada item ke-${i + 1}`);
              }
            } catch (uploadErr) {
              console.error(uploadErr);
              throw new Error(`Koneksi upload gagal pada item ke-${i + 1}`);
            }
          }
        }

        // Susun Item Final (Ganti raw_files dengan proof_images URL)
        finalItemsToUpload.push({
          date: currentItem.date,
          category: currentItem.category,
          description: currentItem.description,
          amount: currentItem.amount,
          proof_images: uploadedProofUrls, // <--- URL Drive dari Apps Script
        });
      }

      // --- 3. SAVE TO DATABASE ---
      const { error } = await supabase.rpc("submit_petty_cash_claim", {
        p_business_id: authState.business_id,
        p_branch_id: parseInt(selectedBranchId),
        p_user_id: authState.user.id,
        p_total_amount: totalAmount,
        p_type: "reimburse",
        p_items: finalItemsToUpload, // Data yang dikirim ke DB sudah bersih (URL Only)
      });

      if (error) throw error;

      toast.success("Berhasil! Saldo terpotong & bukti tersimpan.");
      setItems([]); // Kosongkan keranjang
      refreshData();
    } catch (e) {
      console.error(e);
      toast.error("Gagal Proses: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestInitial = async () => {
    if (!selectedBranchId) return toast.error("Cabang belum dipilih.");
    if (!initialAmount || parseFloat(initialAmount) <= 0)
      return toast.error("Nominal tidak valid.");

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("submit_petty_cash_claim", {
        p_business_id: authState.business_id,
        p_branch_id: parseInt(selectedBranchId),
        p_user_id: authState.user.id,
        p_total_amount: parseFloat(initialAmount),
        p_type: "initial",
        p_items: null,
      });
      if (error) throw error;
      toast.success("Pengajuan saldo dikirim ke Finance!");
      setInitialModalOpen(false);
      setInitialAmount("");
      refreshData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-24 animate-in fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Wallet className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Petty Cash (Kas Kecil)
            </h1>
            <p className="text-slate-500 text-sm">
              Kelola pengeluaran kecil harian cabang.
            </p>
          </div>
        </div>

        {/* DROPDOWN CABANG */}
        {isOwner && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
            <Store className="w-4 h-4 text-slate-500 ml-2" />
            <Select
              value={selectedBranchId}
              onValueChange={setSelectedBranchId}
            >
              <SelectTrigger className="w-[200px] h-8 text-xs border-0 shadow-none focus:ring-0">
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
        )}
      </div>

      {/* SALDO CARD */}
      <Card className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xl border-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Wallet className="w-32 h-32" />
        </div>
        <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
          <div>
            <p className="text-purple-100 text-sm font-medium uppercase tracking-wider mb-1 flex items-center gap-2">
              <Store className="w-4 h-4" /> Saldo Cabang
            </p>
            <p className="text-4xl font-bold font-mono tracking-tight">
              {loadingBalance ? (
                <Loader2 className="animate-spin" />
              ) : (
                formatRupiah(currentBalance)
              )}
            </p>
          </div>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setInitialModalOpen(true)}
            className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm shadow-lg"
          >
            <ArrowUpCircle className="mr-2 h-5 w-5" /> Request Tambah Saldo
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="request" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="request" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Input Pengeluaran
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" /> Riwayat Klaim
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: REQUEST REIMBURSE */}
        <TabsContent value="request" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* KOLOM KIRI: FORM INPUT (LOCAL) */}
            <Card className="lg:col-span-1 border-t-4 border-t-blue-500 shadow-sm">
              <CardHeader className="bg-slate-50 border-b pb-3">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase">
                  1. Detail Pengeluaran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <Label>Tanggal</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operational">
                        Operasional (Token, Air, dll)
                      </SelectItem>
                      <SelectItem value="Transport">
                        Transport / Bensin
                      </SelectItem>
                      <SelectItem value="Consumables">
                        Perlengkapan / ATK
                      </SelectItem>
                      <SelectItem value="Meal">Konsumsi / Makan</SelectItem>
                      <SelectItem value="Maintenance">
                        Perbaikan Kecil
                      </SelectItem>
                      <SelectItem value="Other">Lain-lain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Keterangan</Label>
                  <Textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Cth: Beli sabun cuci piring"
                    className="resize-none h-20"
                  />
                </div>
                <div>
                  <Label>Nominal (Rp)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="font-mono font-bold"
                  />
                </div>
                <div>
                  <Label>Foto Struk</Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) =>
                        setSelectedFiles(Array.from(e.target.files))
                      }
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">
                      {selectedFiles.length > 0
                        ? `${selectedFiles.length} file dipilih`
                        : "Klik untuk upload foto struk"}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleAddItem}
                  // Tidak ada loading disini, karena cuma simpan lokal
                  className="w-full bg-slate-800 hover:bg-slate-900"
                >
                  <Plus className="mr-2 h-4 w-4" /> Tambahkan ke Daftar
                </Button>
              </CardContent>
            </Card>

            {/* KOLOM KANAN: KERANJANG ITEM */}
            <Card className="lg:col-span-2 border-t-4 border-t-purple-500 shadow-sm flex flex-col">
              <CardHeader className="bg-slate-50 border-b pb-3 flex flex-row justify-between items-center">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase">
                  2. Daftar Klaim ({items.length} Item)
                </CardTitle>
                <Badge className="bg-purple-100 text-purple-700 text-sm font-mono px-3 py-1">
                  Total: {formatRupiah(items.reduce((a, b) => a + b.amount, 0))}
                </Badge>
              </CardHeader>
              <CardContent className="flex-1 p-0 relative min-h-[300px]">
                <div className="absolute inset-0 overflow-y-auto p-4 space-y-3">
                  {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <Receipt className="w-12 h-12 mb-2 opacity-20" />
                      <p className="text-sm">
                        Belum ada item yang ditambahkan.
                      </p>
                    </div>
                  ) : (
                    items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:border-purple-200 transition-colors"
                      >
                        <div className="p-3 bg-purple-50 rounded-lg h-fit">
                          <Receipt className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-slate-800 text-sm">
                                {item.category}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {item.description}
                              </p>
                            </div>
                            <p className="font-mono font-bold text-slate-800">
                              {formatRupiah(item.amount)}
                            </p>
                          </div>

                          <div className="flex justify-between items-end mt-3">
                            <div className="flex gap-2">
                              {/* TAMPILKAN PREVIEW LOKAL (Blob URL) */}
                              {item.preview_urls?.map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded hover:underline flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" /> Bukti {i + 1}
                                </a>
                              ))}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                              onClick={() => {
                                const n = [...items];
                                n.splice(idx, 1);
                                setItems(n);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              <div className="p-4 border-t bg-slate-50">
                <Button
                  size="lg"
                  className="w-full bg-purple-600 hover:bg-purple-700 shadow-lg text-base font-bold"
                  disabled={items.length === 0 || submitting}
                  onClick={handleSubmitReimburse}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin" /> Sedang Mengupload
                      Bukti & Menyimpan...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Wallet className="w-5 h-5" /> Ajukan Reimburse Sekarang
                    </span>
                  )}
                </Button>
                <p className="text-[10px] text-center text-slate-500 mt-2">
                  * File akan diupload saat tombol ini ditekan. Pastikan koneksi
                  stabil.
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: RIWAYAT */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-base text-slate-700 flex items-center gap-2">
                <History className="w-4 h-4" /> Riwayat Klaim & Pengisian Saldo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  Belum ada riwayat transaksi.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="p-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => openHistoryDetail(h)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${h.type === "initial" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}
                        >
                          {h.type === "initial" ? (
                            <ArrowUpCircle className="w-5 h-5" />
                          ) : (
                            <Receipt className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">
                            {h.type === "initial"
                              ? "Pengajuan Saldo"
                              : "Klaim Reimburse"}
                            <span className="font-normal text-slate-400 ml-2">
                              #{h.id}
                            </span>
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(h.created_at).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-mono font-bold ${h.type === "initial" ? "text-blue-600" : "text-slate-800"}`}
                        >
                          {h.type === "initial" ? "+" : "-"}{" "}
                          {formatRupiah(h.total_amount)}
                        </p>
                        <Badge
                          className={`mt-1 text-[10px] px-2 py-0.5 ${
                            h.status === "approved"
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : h.status === "pending"
                                ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {h.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL & DIALOG LAIN TETAP SAMA */}
      <Dialog open={initialModalOpen} onOpenChange={setInitialModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              Pengajuan Saldo Kas Kecil
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-xs text-blue-600 uppercase font-bold mb-1">
                Saldo Saat Ini
              </p>
              <p className="text-2xl font-mono font-bold text-blue-800">
                {formatRupiah(currentBalance)}
              </p>
            </div>
            <div>
              <Label>Nominal Pengajuan (Rp)</Label>
              <Input
                type="number"
                placeholder="Contoh: 1000000"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                className="text-lg font-bold text-center mt-1 h-12"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button variant="ghost" onClick={() => setInitialModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleRequestInitial}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 px-8"
            >
              {submitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Kirim Pengajuan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailClaim} onOpenChange={() => setDetailClaim(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" /> Detail Transaksi #
              {detailClaim?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-6">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg">
              <div>
                <p className="text-xs text-slate-500 uppercase">
                  Total Nominal
                </p>
                <p className="text-xl font-bold font-mono text-slate-800">
                  {formatRupiah(detailClaim?.total_amount)}
                </p>
              </div>
              <Badge>{detailClaim?.status}</Badge>
            </div>

            {detailClaim?.notes && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-100">
                <strong>Catatan Finance:</strong> {detailClaim.notes}
              </div>
            )}

            {detailItems.length > 0 && (
              <div>
                <p className="font-bold text-xs text-slate-500 uppercase mb-3 border-b pb-1">
                  Rincian Pengeluaran
                </p>
                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
                  {detailItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-start text-sm border-b border-dashed pb-2 last:border-0"
                    >
                      <div>
                        <p className="font-bold text-slate-700">
                          {item.category}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.description}
                        </p>
                        {item.proof_image && item.proof_image.length > 0 && (
                          <div className="flex gap-2 mt-1">
                            {item.proof_image.map((url, k) => (
                              <a
                                key={k}
                                href={url}
                                target="_blank"
                                className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded hover:underline"
                              >
                                Bukti {k + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="font-mono font-medium">
                        {formatRupiah(item.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setDetailClaim(null)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
