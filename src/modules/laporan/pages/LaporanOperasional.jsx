import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, ShieldAlert, Users, Activity } from "lucide-react";

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

// Charting
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Shared Components
import DateRangeFilter from "../components/DateRangeFilter";
import ExportButton from "../components/ExportButton";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function LaporanOperasional() {
  const { authState } = useAuth();

  // --- STATE ---
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
  const [data, setData] = useState({
    summary: { total_orders: 0, cancel_rate: 0, avg_order_value: 0 },
    employees: [],
    anomalies: [],
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

  // 2. Fetch Data
  const fetchOpsData = useCallback(async () => {
    if (!authState.business_id) return;

    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc(
        "get_operational_report",
        {
          p_business_id: authState.business_id,
          p_start_date: startDate,
          p_end_date: endDate,
          p_branch_id:
            selectedBranch === "all" ? null : parseInt(selectedBranch),
        },
      );

      if (error) throw error;

      // Safety Check
      setData(
        result || {
          summary: { total_orders: 0, cancel_rate: 0, avg_order_value: 0 },
          employees: [],
          anomalies: [],
        },
      );
    } catch (e) {
      console.error("Error Ops Report:", e);
      toast.error("Gagal memuat laporan operasional.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedBranch, authState.business_id]);

  useEffect(() => {
    fetchOpsData();
  }, [fetchOpsData]);

  // --- CSV HEADER ---
  const csvHeaders = [
    { label: "Tanggal", key: "date" },
    { label: "Invoice", key: "invoice" },
    { label: "Kasir", key: "cashier" },
    { label: "Jenis", key: "type" },
    { label: "Alasan", key: "reason" },
    { label: "Nilai", key: "amount" },
  ];

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* HEADER & FILTER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Laporan Operasional & Audit
          </h1>
          <p className="text-slate-500 text-sm">
            Monitoring kinerja karyawan & deteksi kecurangan (Void/Cancel).
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

          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onDateChange={(type, val) =>
              type === "start" ? setStartDate(val) : setEndDate(val)
            }
          />

          <ExportButton
            data={data.anomalies || []} // Safety Check
            filename={`Audit_Log_${startDate}.csv`}
            headers={csvHeaders}
          />
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Total Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {loading ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : (
                data.summary?.total_orders || 0
              )}{" "}
              Order
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">
              Rata-rata Transaksi (AOV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? "-" : formatRupiah(data.summary?.avg_order_value)}
            </div>
          </CardContent>
        </Card>

        <Card
          className={`${
            (data.summary?.cancel_rate || 0) > 5
              ? "bg-red-50 border-red-200"
              : "bg-green-50 border-green-200"
          } shadow-sm`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-700">
              Rasio Pembatalan (Cancel Rate)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${(data.summary?.cancel_rate || 0) > 5 ? "text-red-700" : "text-green-700"}`}
            >
              {loading ? "-" : `${data.summary?.cancel_rate}%`}
            </div>
            <p className="text-xs text-slate-500 mt-1">Target aman: &lt; 5%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KIRI: TOP EMPLOYEE */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-slate-500" /> Top Cashier
              (Performance)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                <Loader2 className="animate-spin mr-2" /> Memuat data...
              </div>
            ) : (data.employees || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.employees}
                  layout="vertical"
                  margin={{ left: 10, right: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 11, fontWeight: "bold", fill: "#475569" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{ borderRadius: "8px" }}
                  />
                  <Bar
                    dataKey="total_trx"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                    name="Total Transaksi"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Users className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Belum ada data kinerja karyawan.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KANAN: AUDIT LOG (ANOMALI) */}
        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-red-700">
                <ShieldAlert className="w-4 h-4" /> Audit Trail (Anomali)
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Transaksi Batal / Void / Mencurigakan
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t h-[300px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[120px]">Info</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Alasan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10">
                        <Loader2 className="animate-spin inline mr-2 h-4 w-4" />{" "}
                        Cek data...
                      </TableCell>
                    </TableRow>
                  ) : (data.anomalies || []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-20 text-slate-500 text-sm"
                      >
                        <div className="flex flex-col items-center">
                          <ShieldAlert className="h-8 w-8 mb-2 text-green-500 opacity-20" />
                          Aman! Tidak ada transaksi mencurigakan.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.anomalies.map((item, idx) => (
                      <TableRow
                        key={idx}
                        className="hover:bg-red-50 transition-colors"
                      >
                        <TableCell>
                          <div className="font-mono text-xs font-bold text-slate-700">
                            {item.invoice}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(item.date).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <Badge
                            variant="outline"
                            className="mt-1 text-[10px] h-5 px-1.5 border-red-200 text-red-700 bg-red-50 uppercase"
                          >
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-medium">
                          {item.cashier}
                        </TableCell>
                        <TableCell
                          className="text-xs text-slate-500 italic max-w-[150px] truncate"
                          title={item.reason}
                        >
                          "{item.reason}"
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
  );
}
