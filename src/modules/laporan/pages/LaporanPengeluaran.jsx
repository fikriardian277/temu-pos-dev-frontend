import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Loader2,
  TrendingDown,
  Search,
  PieChart as IconPie,
  Filter,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

// Charting
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Shared Components
import DateRangeFilter from "../components/DateRangeFilter";
import ExportButton from "../components/ExportButton";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");
const COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export default function LaporanPengeluaran() {
  const { authState } = useAuth();

  // --- STATE FILTER ---
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
  const [searchTerm, setSearchTerm] = useState("");

  // --- STATE DATA ---
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    summary: { total_expense: 0, count_trx: 0 },
    by_category: {},
    transactions: [],
  });

  // 1. Fetch List Cabang (Hanya sekali saat mount)
  useEffect(() => {
    if (authState.business_id) {
      supabase
        .from("branches") // Pastikan nama tabel cabang sesuai (branches/warehouses)
        .select("id, name")
        .eq("business_id", authState.business_id)
        .then(({ data }) => setBranches(data || []));
    }
  }, [authState.business_id]);

  // 2. Fetch Report Data (Setiap filter berubah)
  const fetchExpenseData = useCallback(async () => {
    if (!authState.business_id) return;

    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc(
        "get_expense_report_detail", // Pastikan nama RPC di DB sudah bener
        {
          p_business_id: authState.business_id,
          p_start_date: startDate,
          p_end_date: endDate,
          p_branch_id:
            selectedBranch === "all" ? null : parseInt(selectedBranch),
        },
      );

      if (error) throw error;

      // Fallback data kosong biar gak error map
      setData(
        result || {
          summary: { total_expense: 0, count_trx: 0 },
          by_category: {},
          transactions: [],
        },
      );
    } catch (e) {
      console.error("Error fetching report:", e);
      toast.error("Gagal memuat laporan pengeluaran.");
    } finally {
      setLoading(false);
    }
  }, [authState.business_id, startDate, endDate, selectedBranch]);

  useEffect(() => {
    fetchExpenseData();
  }, [fetchExpenseData]);

  // --- CLIENT SIDE FILTERING (SEARCH) ---
  const filteredTransactions = (data.transactions || []).filter(
    (t) =>
      (t.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.reference_number || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (t.category_detail || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  // --- CHART DATA PREPARATION ---
  const chartData = Object.entries(data.by_category || {}).map(
    ([key, value]) => ({
      name: key,
      value: value,
    }),
  );

  // --- CSV HEADERS ---
  const csvHeaders = [
    { label: "Tanggal", key: "expense_date" },
    { label: "Ref No", key: "reference_number" },
    { label: "Kelompok", key: "category_group" },
    { label: "Kategori", key: "category_detail" },
    { label: "Cabang", key: "branch_name" },
    { label: "Keterangan", key: "description" },
    { label: "Nominal", key: "amount" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER & FILTER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Laporan Pengeluaran
          </h1>
          <p className="text-slate-500 text-sm">
            Monitor biaya operasional, purchasing, dan gaji.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* FILTER CABANG (Owner & Finance) */}
          {["owner", "finance"].includes(authState.role) && (
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
            data={filteredTransactions}
            filename={`Expense_Report_${startDate}_${endDate}.csv`}
            headers={csvHeaders}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI: STATS & CHART */}
        <div className="space-y-6">
          {/* CARD TOTAL */}
          <Card className="bg-red-50 border-red-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" /> Total Pengeluaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">
                {loading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                ) : (
                  formatRupiah(data.summary?.total_expense)
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data.summary?.count_trx || 0} Transaksi periode ini
              </p>
            </CardContent>
          </Card>

          {/* CARD CHART */}
          <Card className="shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                <IconPie className="w-4 h-4" /> Distribusi Biaya
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center text-xs">
              {loading ? (
                <div className="text-center text-slate-400 flex flex-col items-center">
                  <Loader2 className="animate-spin mb-2" /> Menganalisa data...
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => formatRupiah(val)}
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      wrapperStyle={{ paddingTop: "20px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-slate-400 italic">
                  Belum ada data pengeluaran.
                </span>
              )}
            </CardContent>
          </Card>
        </div>

        {/* KOLOM KANAN: TABEL RINCIAN */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg">Rincian Transaksi</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Cari ref, kategori, ket..."
                    className="pl-8 h-9 text-sm bg-slate-50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              <div className="border-t">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[120px]">Tanggal</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead>Cabang</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-20 text-slate-500"
                        >
                          <div className="flex justify-center items-center gap-2">
                            <Loader2 className="animate-spin h-5 w-5" /> Memuat
                            data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-20 text-slate-400"
                        >
                          <div className="flex flex-col items-center">
                            <Filter className="h-10 w-10 mb-2 opacity-20" />
                            Tidak ada transaksi ditemukan.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((trx, idx) => (
                        <TableRow
                          key={idx}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <TableCell className="text-xs font-medium">
                            {new Date(trx.expense_date).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                            <div className="text-[10px] text-slate-400 font-mono mt-1">
                              {trx.reference_number}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`
                                whitespace-nowrap
                                ${
                                  trx.category_group === "Payroll (Gaji)"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : trx.category_group === "Purchasing (Stok)"
                                      ? "bg-orange-50 text-orange-700 border-orange-200"
                                      : "bg-slate-50 text-slate-700 border-slate-200"
                                }
                              `}
                            >
                              {trx.category_group}
                            </Badge>
                            <div className="text-xs text-slate-600 mt-1 font-medium">
                              {trx.category_detail}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div
                              className="text-sm text-slate-700 max-w-[250px] truncate"
                              title={trx.description}
                            >
                              {trx.description || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {trx.branch_name || "Semua"}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-800">
                            {formatRupiah(trx.amount)}
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
      </div>
    </div>
  );
}
