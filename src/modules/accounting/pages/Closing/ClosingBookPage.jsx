import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  LockKeyhole,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Label } from "@/components/ui/label";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function ClosingBookPage() {
  const { authState } = useAuth();
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(""); // ID Periode
  const [checklist, setChecklist] = useState(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [loadingProcess, setLoadingProcess] = useState(false);

  // 1. Fetch Daftar Periode (Hanya yang OPEN)
  const fetchPeriods = useCallback(async () => {
    if (!authState.business_id) return;

    const { data, error } = await supabase
      .schema("accounting") // <--- TAMBAHIN INI BRE!
      .from("periods")
      .select("*")
      .eq("business_id", authState.business_id)
      .eq("status", "open")
      .order("end_date", { ascending: true });

    if (!error) setPeriods(data || []);
    else console.error("Error fetching periods:", error); // Debugging
  }, [authState.business_id]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  // 2. Fetch Checklist saat Periode Dipilih
  useEffect(() => {
    if (!selectedPeriod) {
      setChecklist(null);
      return;
    }

    const runCheck = async () => {
      setLoadingCheck(true);
      try {
        const { data, error } = await supabase.rpc("get_closing_checklist", {
          p_period_id: Number(selectedPeriod),
          p_business_id: authState.business_id,
        });
        if (error) throw error;
        setChecklist(data);
      } catch (e) {
        toast.error("Gagal memuat checklist.");
      } finally {
        setLoadingCheck(false);
      }
    };

    runCheck();
  }, [selectedPeriod, authState.business_id]);

  // 3. Eksekusi Tutup Buku
  const handleClosing = async () => {
    if (
      !window.confirm(
        "Yakin ingin menutup buku periode ini? Aksi ini akan mengunci jurnal.",
      )
    )
      return;

    setLoadingProcess(true);
    try {
      const { data, error } = await supabase.rpc("close_period", {
        p_period_id: Number(selectedPeriod),
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
      });

      if (error) throw error;

      toast.success(
        `Berhasil! Laba/Rugi Bersih: ${formatRupiah(data.net_income)}`,
      );
      setSelectedPeriod("");
      setChecklist(null);
      fetchPeriods(); // Refresh list period
    } catch (e) {
      console.error(e);
      toast.error("Gagal tutup buku: " + e.message);
    } finally {
      setLoadingProcess(false);
    }
  };

  // Helper UI Badge
  const StatusBadge = ({ isGood, label }) => (
    <div
      className={`flex items-center gap-2 p-3 rounded border ${isGood ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}
    >
      {isGood ? (
        <CheckCircle2 className="w-5 h-5" />
      ) : (
        <XCircle className="w-5 h-5" />
      )}
      <span className="font-medium text-sm">{label}</span>
    </div>
  );

  const canProceed =
    checklist &&
    checklist.draft_count === 0 &&
    checklist.unbalanced_count === 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-in fade-in">
      <div className="text-center space-y-2 mb-8">
        <div className="bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-xl">
          <LockKeyhole className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">
          Period End Closing
        </h1>
        <p className="text-slate-500">
          Finalisasi Laporan Keuangan & Alokasi Laba Ditahan.
        </p>
      </div>

      <Card className="border-slate-200 shadow-md">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle>1. Pilih Periode Akuntansi</CardTitle>
          <CardDescription>
            Hanya periode dengan status 'OPEN' yang bisa diproses.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label>Periode Bulan</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="h-12 text-lg">
                <SelectValue placeholder="-- Pilih Periode --" />
              </SelectTrigger>
              <SelectContent>
                {periods.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Tidak ada periode Open
                  </SelectItem>
                ) : (
                  periods.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name} (
                      {new Date(p.start_date).toLocaleDateString("id-ID")} -{" "}
                      {new Date(p.end_date).toLocaleDateString("id-ID")})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedPeriod && (
        <div className="space-y-6">
          {loadingCheck ? (
            <div className="text-center py-10">
              <Loader2 className="animate-spin mx-auto" /> Memeriksa kelayakan
              data...
            </div>
          ) : checklist ? (
            <>
              {/* SECTION CHECKLIST */}
              <Card>
                <CardHeader>
                  <CardTitle>2. Validasi Pra-Closing</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <StatusBadge
                    isGood={checklist.draft_count === 0}
                    label={
                      checklist.draft_count === 0
                        ? "Semua Jurnal Posted"
                        : `${checklist.draft_count} Jurnal Masih Draft`
                    }
                  />
                  <StatusBadge
                    isGood={checklist.unbalanced_count === 0}
                    label={
                      checklist.unbalanced_count === 0
                        ? "Jurnal Balance"
                        : `${checklist.unbalanced_count} Jurnal Tidak Balance`
                    }
                  />
                </CardContent>
              </Card>

              {/* SECTION PREVIEW */}
              <Card className="bg-slate-900 text-white border-none">
                <CardHeader>
                  <CardTitle className="text-slate-200">
                    3. Estimasi Hasil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm text-slate-400">
                    <span>Total Pendapatan</span>
                    <span className="text-green-400 font-mono">
                      {formatRupiah(checklist.total_revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-400">
                    <span>Total Beban</span>
                    <span className="text-red-400 font-mono">
                      ({formatRupiah(checklist.total_expense)})
                    </span>
                  </div>
                  <div className="border-t border-slate-700 pt-4 flex justify-between items-center text-xl font-bold">
                    <span>Estimasi Laba Bersih</span>
                    <span
                      className={
                        checklist.net_income >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {formatRupiah(checklist.net_income)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* ACTION BUTTON */}
              <Button
                size="lg"
                className={`w-full h-14 text-lg shadow-lg ${canProceed ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed text-slate-500"}`}
                onClick={handleClosing}
                disabled={!canProceed || loadingProcess}
              >
                {loadingProcess ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <LockKeyhole className="mr-2" />
                )}
                {canProceed
                  ? "Jalankan Tutup Buku & Kunci Periode"
                  : "Perbaiki Data Sebelum Melanjutkan"}
              </Button>

              {!canProceed && (
                <div className="bg-red-50 text-red-600 p-4 rounded text-center text-sm font-medium">
                  <AlertTriangle className="inline w-4 h-4 mr-1" />
                  Harap posting semua draft atau hapus jurnal yang tidak
                  balance.
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
