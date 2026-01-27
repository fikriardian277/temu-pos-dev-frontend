import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Loader2,
  TrendingDown,
  Search,
  Filter,
  CheckCircle,
} from "lucide-react";

// UI Components
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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

// Charting
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Shared Components
import ExportButton from "../components/ExportButton";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function LaporanHutang() {
  const { authState } = useAuth();

  // --- STATE ---
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [branches, setBranches] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    summary: { total_outstanding: 0, total_bills: 0 },
    aging: [],
    details: [],
  });

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

  // 2. Fetch Data AP
  const fetchAP = useCallback(async () => {
    if (!authState.business_id) return;

    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc("get_ap_report", {
        p_business_id: authState.business_id,
        p_branch_id: selectedBranch === "all" ? null : parseInt(selectedBranch),
      });

      if (error) throw error;

      // Safety Check
      setData(
        result || {
          summary: { total_outstanding: 0, total_bills: 0 },
          aging: [],
          details: [],
        },
      );
    } catch (e) {
      console.error("Error AP report:", e);
      toast.error("Gagal memuat data hutang.");
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, authState.business_id]);

  useEffect(() => {
    fetchAP();
  }, [fetchAP]);

  // --- CLIENT SIDE FILTER ---
  const safeDetails = data?.details || [];
  const filteredData = safeDetails.filter(
    (item) =>
      (item.vendor_name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (item.bill_number || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // --- CSV CONFIG ---
  const csvHeaders = [
    { label: "No Tagihan", key: "bill_number" },
    { label: "Tanggal", key: "bill_date" },
    { label: "Supplier", key: "vendor_name" },
    { label: "Cabang", key: "branch_name" },
    { label: "Umur (Hari)", key: "age_days" },
    { label: "Kategori", key: "age_category" },
    { label: "Sisa Hutang", key: "outstanding_balance" },
  ];

  // --- COLOR LOGIC (Merah = Hutang Lama/Bahaya) ---
  const getBarColor = (category) => {
    if (category.includes("> 60")) return "#ef4444"; // Merah
    if (category.includes("31 - 60")) return "#f59e0b"; // Kuning
    return "#3b82f6"; // Biru
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* HEADER & FILTER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Laporan Hutang (AP)
          </h1>
          <p className="text-slate-500 text-sm">
            Monitoring kewajiban pembayaran ke Supplier.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Cabang (Owner & Finance) */}
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

          <ExportButton
            data={filteredData}
            filename={`AP_Report_${new Date().toISOString().split("T")[0]}.csv`}
            headers={csvHeaders}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI: STATS & CHART */}
        <div className="space-y-6">
          {/* CARD TOTAL */}
          <Card className="bg-red-50 border-red-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" /> Total Hutang Usaha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">
                {loading ? (
                  <Loader2 className="animate-spin h-8 w-8 text-red-400" />
                ) : (
                  formatRupiah(data.summary?.total_outstanding)
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                {data.summary?.total_bills || 0} Tagihan belum lunas
              </p>
            </CardContent>
          </Card>

          {/* CARD CHART AGING */}
          <Card className="shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm">Analisa Umur Hutang</CardTitle>
              {/* [FIX] Ganti > jadi &gt; atau {">"} */}
              <CardDescription className="text-xs text-slate-500">
                Prioritaskan pembayaran hutang yang sudah lama (&gt; 30 hari).
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] pt-4">
              {loading ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  <Loader2 className="animate-spin mr-2" /> Menganalisa data...
                </div>
              ) : (data.aging || []).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.aging}
                    layout="vertical"
                    margin={{ left: 10, right: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="category"
                      type="category"
                      width={80}
                      tick={{
                        fontSize: 11,
                        fontWeight: "bold",
                        fill: "#64748b",
                      }}
                    />
                    <Tooltip
                      formatter={(val) => formatRupiah(val)}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={24}>
                      {data.aging.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getBarColor(entry.category)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <CheckCircle className="w-8 h-8 mb-2 text-green-500 opacity-50" />
                  <p className="text-sm">Tidak ada hutang. Aman!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* KOLOM KANAN: TABEL DETAIL */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg">
                  Daftar Tagihan Belum Lunas
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Cari Supplier / No Tagihan..."
                    className="pl-8 bg-slate-50"
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
                      <TableHead>No Tagihan (Bill)</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-center">Umur</TableHead>
                      <TableHead className="text-right">Sisa Hutang</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-20 text-slate-500"
                        >
                          <div className="flex justify-center items-center gap-2">
                            <Loader2 className="animate-spin h-5 w-5" /> Memuat
                            data hutang...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-20 text-slate-400"
                        >
                          <div className="flex flex-col items-center">
                            <CheckCircle className="h-10 w-10 mb-2 text-green-500 opacity-20" />
                            Tidak ada tagihan tertunggak.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((trx, idx) => (
                        <TableRow
                          key={idx}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <TableCell>
                            <div className="font-mono font-bold text-slate-700 text-sm">
                              {trx.bill_number}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {new Date(trx.bill_date).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm text-slate-800">
                              {trx.vendor_name || "Supplier Umum"}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                              <span className="w-2 h-2 rounded-full bg-slate-300"></span>{" "}
                              {trx.branch_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`
                                whitespace-nowrap
                                ${
                                  trx.age_days > 60
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : trx.age_days > 30
                                      ? "bg-orange-50 text-orange-700 border-orange-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                }
                              `}
                            >
                              {trx.age_days} Hari
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-800 text-sm">
                            {formatRupiah(trx.outstanding_balance)}
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
