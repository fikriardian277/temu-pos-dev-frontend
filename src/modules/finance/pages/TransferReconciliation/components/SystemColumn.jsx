import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient"; // Import Supabase buat fetch cabang
import { useAuth } from "@/context/AuthContext"; // Import Auth buat business_id
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Sparkles,
  Building2,
  Hotel,
  Save,
  Ban,
  AlertCircle,
} from "lucide-react";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function SystemColumn({
  mode,
  setMode,
  posData,
  depositData,
  invoiceData,
  selectedId,
  onSelect,
  mutationMatch,
  onManualAction,
}) {
  const { authState } = useAuth();
  const [mainTab, setMainTab] = useState("matching");

  // State Form Recording
  const [recordCategory, setRecordCategory] = useState("");
  const [recordDesc, setRecordDesc] = useState("");

  // STATE BARU: CABANG
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Daftar Cabang (Sekali aja pas load)
  useEffect(() => {
    const fetchBranches = async () => {
      if (!authState.business_id) return;
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .eq("business_id", authState.business_id);
      setBranches(data || []);
    };
    fetchBranches();
  }, [authState.business_id]);

  // Reset form pas ganti mutasi
  useEffect(() => {
    if (mutationMatch) {
      setRecordDesc(mutationMatch.description || "");
      // Default ke Pusat atau kosong
      setSelectedBranch("");
    }
  }, [mutationMatch]);

  // Helper Score Badge
  const getMatchBadge = (itemAmount, itemDate) => {
    if (!mutationMatch) return null;
    let score = 0;
    if (Number(mutationMatch.amount) === Number(itemAmount)) score += 50;
    const diffDays = Math.abs(
      (new Date(mutationMatch.transaction_date) - new Date(itemDate)) /
        (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 1) score += 50;
    else if (diffDays <= 3) score += 30;

    if (score >= 100)
      return (
        <Badge className="bg-green-600 animate-pulse">
          <Sparkles className="h-3 w-3 mr-1" /> PERFECT
        </Badge>
      );
    if (score >= 80) return <Badge className="bg-blue-500">POSSIBLE</Badge>;
    return null;
  };

  // Handler Submit Recording / Ignore
  const handleManualSubmit = (actionType) => {
    if (!onManualAction) return;

    // VALIDASI CABANG (Khusus Recording)
    if (actionType === "record" && !selectedBranch) {
      alert("Harap pilih Cabang Pemilik Dana (Equity)!");
      return;
    }

    setIsSubmitting(true);

    onManualAction({
      action: actionType,
      category: recordCategory,
      description: recordDesc,
      mutation: mutationMatch,
      branch_id: selectedBranch, // KIRIM ID CABANG KE PARENT
    }).finally(() => setIsSubmitting(false));
  };

  const borderColor =
    mainTab === "matching"
      ? "border-l-blue-500"
      : mainTab === "recording"
      ? "border-l-green-500"
      : "border-l-red-500";

  return (
    <Card
      className={`border-l-4 h-[650px] flex flex-col shadow-md ${borderColor}`}
    >
      <CardHeader className="bg-slate-50 pb-0 pt-2 border-b px-2">
        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-2">
            <TabsTrigger value="matching">Cari Jodoh</TabsTrigger>
            <TabsTrigger value="recording">Catat Baru</TabsTrigger>
            <TabsTrigger value="control">Abaikan</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-y-auto bg-slate-100/50 relative">
        {/* === TAB 1: MATCHING === */}
        {mainTab === "matching" && (
          <div className="flex flex-col h-full">
            {/* ... (BAGIAN INI TETAP SAMA SEPERTI KODE LAMA) ... */}
            <div className="bg-white p-2 border-b shadow-sm sticky top-0 z-10">
              <div className="flex bg-slate-100 p-1 rounded-lg justify-between gap-1">
                <button
                  onClick={() => {
                    setMode("sales");
                    onSelect(null);
                  }}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    mode === "sales"
                      ? "bg-white text-purple-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  POS
                </button>
                <button
                  onClick={() => {
                    setMode("deposit");
                    onSelect(null);
                  }}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    mode === "deposit"
                      ? "bg-white text-orange-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Setoran
                </button>
                <button
                  onClick={() => {
                    setMode("invoice");
                    onSelect(null);
                  }}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    mode === "invoice"
                      ? "bg-white text-pink-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Invoice
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-200 flex-1 overflow-y-auto">
              {mode === "sales" &&
                posData.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => onSelect(o)}
                    className={`p-3 cursor-pointer transition-all hover:bg-purple-50 bg-white ${
                      selectedId === o.id
                        ? "ring-2 ring-inset ring-purple-500 bg-purple-50"
                        : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-600">
                        {new Date(o.created_at).toLocaleDateString("id-ID")}
                      </span>
                      <span className="font-bold text-purple-700">
                        {formatRupiah(o.grand_total)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 px-1"
                        >
                          {o.invoice_code}
                        </Badge>
                        <span className="text-xs truncate max-w-[120px] text-slate-600">
                          {o.customers?.name}
                        </span>
                      </div>
                      {getMatchBadge(o.grand_total, o.created_at)}
                    </div>
                  </div>
                ))}
              {mode === "deposit" &&
                depositData.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => onSelect(s)}
                    className={`p-3 cursor-pointer transition-all hover:bg-orange-50 bg-white ${
                      selectedId === s.id
                        ? "ring-2 ring-inset ring-orange-500 bg-orange-50"
                        : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-600">
                        {new Date(s.submission_date).toLocaleDateString(
                          "id-ID"
                        )}
                      </span>
                      <span className="font-bold text-orange-700">
                        {formatRupiah(s.actual_cash)}
                      </span>
                    </div>
                    <div className="flex flex-col mt-1 gap-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Building2 className="w-3 h-3 text-slate-400" /> Cabang
                      </div>
                      <div className="flex justify-end">
                        {getMatchBadge(s.actual_cash, s.submission_date)}
                      </div>
                    </div>
                  </div>
                ))}
              {mode === "invoice" &&
                invoiceData.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => onSelect(inv)}
                    className={`p-3 cursor-pointer transition-all hover:bg-pink-50 bg-white ${
                      selectedId === inv.id
                        ? "ring-2 ring-inset ring-pink-500 bg-pink-50"
                        : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-600">
                        {new Date(inv.created_at).toLocaleDateString("id-ID")}
                      </span>
                      <span className="font-bold text-pink-700">
                        {formatRupiah(inv.grand_total)}
                      </span>
                    </div>
                    <div className="flex flex-col mt-1 gap-1">
                      <div className="flex items-center gap-2">
                        <Hotel className="w-3 h-3 text-slate-400" />
                        <span className="text-xs font-bold text-slate-700">
                          {inv.customers?.name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>{inv.invoice_number}</span>
                        {getMatchBadge(inv.grand_total, inv.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              {((mode === "sales" && posData.length === 0) ||
                (mode === "deposit" && depositData.length === 0) ||
                (mode === "invoice" && invoiceData.length === 0)) && (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Tidak ada data pending.
                </div>
              )}
            </div>
          </div>
        )}

        {/* === TAB 2: RECORDING (Catat Baru) === */}
        {mainTab === "recording" && (
          <div className="p-6 space-y-6 bg-white h-full">
            {!mutationMatch ? (
              <div className="text-center text-slate-400 mt-10 flex flex-col items-center">
                <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
                <p>Pilih mutasi bank di sebelah kiri dulu.</p>
              </div>
            ) : (
              <>
                <div className="bg-green-50 p-4 rounded border border-green-200">
                  <p className="text-xs font-bold text-green-800 uppercase mb-1">
                    DANA MASUK (BANK)
                  </p>
                  <p className="text-2xl font-mono font-bold text-green-700">
                    {formatRupiah(mutationMatch.amount)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {mutationMatch.description}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* --- INPUT CABANG (WAJIB BUAT SALDO VIRTUAL) --- */}
                  <div>
                    <Label className="text-blue-700">
                      Milik Cabang (Equity)*
                    </Label>
                    <Select
                      value={selectedBranch}
                      onValueChange={setSelectedBranch}
                    >
                      <SelectTrigger className="border-blue-200 bg-blue-50/30">
                        <SelectValue placeholder="Pilih Pemilik Dana..." />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Pilih <b>Head Quarter</b> untuk modal umum, atau Cabang
                      spesifik untuk Investor.
                    </p>
                  </div>

                  <div>
                    <Label>Kategori Pemasukan</Label>
                    <Select
                      value={recordCategory}
                      onValueChange={setRecordCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kategori..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Owner Capital">
                          Modal Disetor (Owner)
                        </SelectItem>
                        <SelectItem value="Loan">Pinjaman (Hutang)</SelectItem>
                        <SelectItem value="Other Income">
                          Pendapatan Lain-lain (Bunga/Bonus)
                        </SelectItem>
                        <SelectItem value="Supplier Refund">
                          Retur Supplier
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Keterangan</Label>
                    <Textarea
                      value={recordDesc}
                      onChange={(e) => setRecordDesc(e.target.value)}
                      placeholder="Catatan tambahan..."
                      rows={3}
                    />
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 h-12"
                    disabled={!recordCategory || isSubmitting}
                    onClick={() => handleManualSubmit("record")}
                  >
                    {isSubmitting ? (
                      "Menyimpan..."
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> SIMPAN PENCATATAN
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* === TAB 3: CONTROL (Abaikan) === */}
        {mainTab === "control" && (
          <div className="p-6 space-y-6 bg-white h-full flex flex-col items-center justify-center text-center">
            {!mutationMatch ? (
              <div className="text-slate-400 flex flex-col items-center">
                <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
                <p>Pilih mutasi bank di sebelah kiri dulu.</p>
              </div>
            ) : (
              <div className="w-full max-w-xs space-y-6">
                <div className="bg-red-50 p-4 rounded border border-red-200">
                  <p className="text-xs font-bold text-red-800 uppercase mb-1">
                    DATA AKAN DIABAIKAN
                  </p>
                  <p className="font-bold text-red-900">
                    {formatRupiah(mutationMatch.amount)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {mutationMatch.description}
                  </p>
                </div>
                <p className="text-sm text-slate-600">
                  Data ini akan ditandai sebagai <b>IGNORED</b> dan tidak akan
                  dihitung dalam saldo pembukuan.
                </p>
                <Button
                  variant="destructive"
                  className="w-full h-12"
                  disabled={isSubmitting}
                  onClick={() => handleManualSubmit("ignore")}
                >
                  {isSubmitting ? (
                    "Memproses..."
                  ) : (
                    <>
                      <Ban className="mr-2 h-4 w-4" /> ABAIKAN DATA INI
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
