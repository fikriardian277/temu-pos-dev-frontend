import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react";

// UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

// Chart
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// Shared (Pastikan path component ini bener di project lu)
import DateRangeFilter from "../components/DateRangeFilter";
import ExportButton from "../components/ExportButton";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function LaporanCashFlow() {
  const { authState } = useAuth();

  // State
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ summary: {}, timeline: [], details: [] });

  // 1. Fetch Cabang
  useEffect(() => {
    if (authState.business_id) {
      supabase
        .from("branches")
        .select("id, name")
        .eq("business_id", authState.business_id)
        .then(({ data }) => setBranches(data || []));
    }
  }, [authState.business_id]);

  // 2. Fetch Data
  useEffect(() => {
    if (authState.business_id) fetchCashFlow();
  }, [startDate, endDate, selectedBranch, authState.business_id]);

  const fetchCashFlow = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc(
        "get_cashflow_report", // Nembak RPC yang baru kita buat
        {
          p_business_id: authState.business_id,
          p_start_date: startDate,
          p_end_date: endDate,
          p_branch_id:
            selectedBranch === "all" ? null : parseInt(selectedBranch),
        },
      );

      if (error) throw error;

      // Safety check biar gak error kalo null
      setData({
        summary: result?.summary || {
          total_in: 0,
          total_out: 0,
          net_cashflow: 0,
        },
        timeline: result?.timeline || [],
        details: result?.details || [],
      });
    } catch (e) {
      toast.error("Gagal load Cash Flow: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const csvHeaders = [
    { label: "Tanggal", key: "date" },
    { label: "Tipe", key: "type" },
    { label: "Kategori", key: "category" },
    { label: "Deskripsi", key: "description" }, // Nambah Deskripsi di CSV
    { label: "Nominal", key: "amount" },
  ];

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Laporan Arus Kas (Cash Flow)
          </h1>
          <p className="text-slate-500 text-sm">
            Monitoring uang masuk & keluar riil (Non-tunai/Penyusutan tidak
            termasuk).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Cabang cuma buat Owner/Admin */}
          {authState.role !== "" && ( // Asumsi finance cuma liat data global atau diatur RLS
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Cabang</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onDateChange={(type, val) =>
              type === "start" ? setStartDate(val) : setEndDate(val)
            }
          />
          <ExportButton
            data={data.details}
            filename={`Cashflow_${startDate}_to_${endDate}.csv`}
            headers={csvHeaders}
          />
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 uppercase tracking-wider">
                Total Uang Masuk
              </p>
              <h2 className="text-2xl font-bold text-slate-800 mt-1">
                {formatRupiah(data.summary?.total_in)}
              </h2>
            </div>
            <ArrowUpCircle className="w-10 h-10 text-green-600 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700 uppercase tracking-wider">
                Total Uang Keluar
              </p>
              <h2 className="text-2xl font-bold text-slate-800 mt-1">
                {formatRupiah(data.summary?.total_out)}
              </h2>
            </div>
            <ArrowDownCircle className="w-10 h-10 text-red-600 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 uppercase tracking-wider">
                Surplus / Defisit
              </p>
              <h2
                className={`text-2xl font-bold mt-1 ${
                  data.summary?.net_cashflow >= 0
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {formatRupiah(data.summary?.net_cashflow)}
              </h2>
            </div>
            <Wallet className="w-10 h-10 text-blue-600 opacity-50" />
          </CardContent>
        </Card>
      </div>

      {/* CHART */}
      <Card>
        <CardHeader className="pb-0 border-b mb-4">
          <CardTitle className="text-sm font-bold text-slate-700 uppercase">
            Pergerakan Arus Kas Harian
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {data.timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => new Date(val).getDate()} // Cuma nampilin tanggal
                  fontSize={12}
                />
                <YAxis
                  fontSize={12}
                  width={80}
                  tickFormatter={(val) => val / 1000 + "k"}
                />
                <Tooltip
                  formatter={(val) => formatRupiah(val)}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString("id-ID")
                  }
                />
                <Legend />
                <ReferenceLine y={0} stroke="#000" />
                <Bar
                  dataKey="cash_in"
                  name="Masuk"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
                <Bar
                  dataKey="cash_out"
                  name="Keluar"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Wallet className="w-12 h-12 mb-2 opacity-20" />
              <p>Belum ada data transaksi di periode ini.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DETAIL MUTASI */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rincian Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[120px]">Tanggal</TableHead>
                  <TableHead className="w-[100px]">Tipe</TableHead>
                  <TableHead className="w-[150px]">Kategori</TableHead>
                  <TableHead>Keterangan</TableHead> {/* NAMBAH KOLOM INI */}
                  <TableHead className="text-right w-[150px]">
                    Nominal
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <Loader2 className="animate-spin inline mr-2" /> Memuat
                      Data...
                    </TableCell>
                  </TableRow>
                ) : data.details.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-muted-foreground"
                    >
                      Tidak ada transaksi ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.details.map((item, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50">
                      <TableCell className="text-xs font-mono text-slate-600">
                        {new Date(item.date).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            item.type === "Cash In"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }
                        >
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-700">
                        {item.category}
                      </TableCell>

                      {/* TAMPILIN DESKRIPSI (Biar tau ini bayar apa) */}
                      <TableCell
                        className="text-sm text-slate-500 max-w-[300px] truncate"
                        title={item.description}
                      >
                        {item.description}
                      </TableCell>

                      <TableCell
                        className={`text-right font-bold font-mono ${
                          item.type === "Cash In"
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {item.type === "Cash In" ? "+" : "-"}{" "}
                        {formatRupiah(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
