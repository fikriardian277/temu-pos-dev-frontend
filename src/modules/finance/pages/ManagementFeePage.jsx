import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Loader2,
  Calculator,
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
} from "lucide-react";

// Components UI (Sesuaikan path import lu)
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function ManagementFeePage() {
  const { authState } = useAuth();

  // State Filter
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // State Data
  const [previewData, setPreviewData] = useState([]);
  const [isPosted, setIsPosted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // 1. FETCH DATA PREVIEW & STATUS
  const fetchData = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);

    try {
      // A. Cek Status: Apakah bulan ini sudah diposting?
      const { data: statusData, error: statusError } = await supabase.rpc(
        "check_fee_status",
        {
          p_month: parseInt(selectedMonth),
          p_year: parseInt(selectedYear),
          p_business_id: authState.business_id,
        }
      );
      if (statusError) throw statusError;
      setIsPosted(statusData);

      // B. Ambil Preview Angka (Simulasi)
      const { data: previewRes, error: previewError } = await supabase.rpc(
        "get_management_fee_preview",
        {
          p_month: parseInt(selectedMonth),
          p_year: parseInt(selectedYear),
          p_business_id: authState.business_id,
        }
      );
      if (previewError) throw previewError;
      setPreviewData(previewRes || []);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data fee.");
    } finally {
      setLoading(false);
    }
  }, [authState.business_id, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. EKSEKUSI POSTING JURNAL
  const handleGenerateFee = async () => {
    if (
      !confirm(
        `Yakin ingin memposting Management Fee untuk periode ${selectedMonth}/${selectedYear}? \n\nSaldo Virtual cabang akan terpotong & HO akan bertambah.`
      )
    ) {
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.rpc("generate_monthly_management_fee", {
        p_month: parseInt(selectedMonth),
        p_year: parseInt(selectedYear),
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
      });

      if (error) throw error;

      toast.success("SUKSES! Jurnal Fee berhasil diposting.");
      fetchData(); // Refresh status jadi 'Posted'
    } catch (err) {
      toast.error("Gagal posting: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Helper: Hitung Total
  const totalOmzet = previewData.reduce(
    (acc, curr) => acc + Number(curr.total_sales),
    0
  );
  const totalFee = previewData.reduce(
    (acc, curr) => acc + Number(curr.calculated_fee),
    0
  );

  // List Bulan
  const months = [
    { v: 1, l: "Januari" },
    { v: 2, l: "Februari" },
    { v: 3, l: "Maret" },
    { v: 4, l: "April" },
    { v: 5, l: "Mei" },
    { v: 6, l: "Juni" },
    { v: 7, l: "Juli" },
    { v: 8, l: "Agustus" },
    { v: 9, l: "September" },
    { v: 10, l: "Oktober" },
    { v: 11, l: "November" },
    { v: 12, l: "Desember" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-8 w-8 text-blue-600" /> Management Fee
          </h1>
          <p className="text-muted-foreground">
            Hitung dan tagih bagi hasil (Royalti/Fee) antar cabang.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 bg-white p-2 rounded border shadow-sm">
          <Calendar className="h-4 w-4 text-gray-500" />
          <Select
            value={String(selectedMonth)}
            onValueChange={(v) => setSelectedMonth(Number(v))}
          >
            <SelectTrigger className="w-[120px] border-0 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.v} value={String(m.v)}>
                  {m.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-gray-300">|</span>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-[80px] border-0 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-blue-600 mb-1">
              Total Omzet Group
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {formatRupiah(totalOmzet)}
            </div>
            <p className="text-xs text-blue-400 mt-2">
              Dasar perhitungan fee (Percentage)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-emerald-600 mb-1">
              Estimasi Pendapatan HO
            </div>
            <div className="text-2xl font-bold text-emerald-900">
              {formatRupiah(totalFee)}
            </div>
            <p className="text-xs text-emerald-400 mt-2">
              Total fee yang akan diterima
            </p>
          </CardContent>
        </Card>

        <Card
          className={`${
            isPosted
              ? "bg-green-100 border-green-300"
              : "bg-orange-50 border-orange-200"
          }`}
        >
          <CardContent className="p-6 flex flex-col justify-center h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold uppercase text-gray-600">
                Status Periode Ini
              </span>
              {isPosted ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-orange-500" />
              )}
            </div>
            <div
              className={`text-xl font-bold ${
                isPosted ? "text-green-700" : "text-orange-700"
              }`}
            >
              {isPosted ? "SUDAH DIPOSTING" : "BELUM DIPOSTING"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLE PREVIEW */}
      <Card>
        <CardHeader>
          <CardTitle>Rincian Perhitungan Fee</CardTitle>
          <CardDescription>
            Simulasi perhitungan berdasarkan Omzet Cabang bulan ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center text-muted-foreground">
              <Loader2 className="animate-spin mr-2" /> Menghitung Omzet...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nama Cabang</TableHead>
                  <TableHead>Skema Fee</TableHead>
                  <TableHead className="text-right">Omzet (Sales)</TableHead>
                  <TableHead className="text-right">Nilai Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center h-24 text-muted-foreground"
                    >
                      Tidak ada cabang yang dikenakan fee.
                    </TableCell>
                  </TableRow>
                ) : (
                  previewData.map((item) => (
                    <TableRow key={item.branch_id}>
                      <TableCell className="font-medium">
                        {item.branch_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-white">
                          {item.fee_type === "fixed"
                            ? "Fix Rate"
                            : `Percentage (${item.fee_rate}%)`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-slate-500">
                        {item.fee_type === "fixed"
                          ? "-"
                          : formatRupiah(item.total_sales)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        {formatRupiah(item.calculated_fee)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ACTION BUTTON */}
      <div className="flex justify-end pt-4">
        {isPosted ? (
          <Alert className="bg-green-50 border-green-200 max-w-md">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">
              Transaksi Selesai
            </AlertTitle>
            <AlertDescription className="text-green-700">
              Fee untuk periode ini sudah dicatat di pembukuan. Tidak perlu
              tindakan lebih lanjut.
            </AlertDescription>
          </Alert>
        ) : (
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto"
            onClick={handleGenerateFee}
            disabled={processing || previewData.length === 0 || loading}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" /> Posting Jurnal Fee
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
