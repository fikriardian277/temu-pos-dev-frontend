import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

// Charts
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Shared
import DateRangeFilter from "../components/DateRangeFilter";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function LaporanLabaRugi() {
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
  const [data, setData] = useState({ summary: {}, trend: [] });

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

  // 2. Fetch PnL
  useEffect(() => {
    if (authState.business_id) fetchPnL();
  }, [startDate, endDate, selectedBranch, authState.business_id]);

  const fetchPnL = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc("get_pnl_report", {
        p_business_id: authState.business_id,
        p_start_date: startDate,
        p_end_date: endDate,
        p_branch_id: selectedBranch === "all" ? null : parseInt(selectedBranch),
      });

      if (error) throw error;
      setData(result || { summary: {}, trend: [] });
    } catch (e) {
      toast.error("Gagal load P&L: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Kalkulasi
  // Kalkulasi Summary
  const s = data.summary || {};

  // 1. Total Revenue (POS + Lainnya)
  // Pastikan variabel 'total_revenue_other' sesuai dengan JSON dari backend
  const revenuePos = Number(s.revenue_pos || 0);
  const revenueOther = Number(s.total_revenue_other || 0);
  const totalRevenue = revenuePos + revenueOther;

  // 2. COGS
  const totalCOGS = Number(s.cogs || 0);

  // 3. FIX LABA KOTOR (GROSS PROFIT) 🔧
  // Rumus Benar: Total Revenue - COGS
  const grossProfit = totalRevenue - totalCOGS;

  // 4. OPEX & NET PROFIT
  const totalOpex = Number(s.opex || 0) + Number(s.payroll || 0);
  const netProfit = grossProfit - totalOpex;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 print:p-0 print:max-w-none">
      {/* HEADER (Hide on Print) */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Laporan Laba Rugi
          </h1>
          <p className="text-slate-500 text-sm">
            Profit & Loss Statement (Income Statement)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Kondisi: Jika role adalah Owner ATAU Finance, maka munculkan dropdown */}
          {(authState.role === "owner" || authState.role === "finance") && (
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
          <Button variant="outline" onClick={handlePrint}>
            Cetak PDF
          </Button>
        </div>
      </div>

      {/* CHART TREND */}
      <Card className="print:hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">Trend Profit (Omzet) Harian</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] pt-4">
          {data.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(val) => new Date(val).getDate()}
                />
                <YAxis hide />
                <Tooltip formatter={(val) => formatRupiah(val)} />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-slate-400 text-sm py-10">
              Belum ada data trend.
            </p>
          )}
        </CardContent>
      </Card>

      {/* FINANCIAL STATEMENT PAPER */}
      <Card className="border shadow-lg print:shadow-none print:border-none">
        <CardContent className="p-8 print:p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin w-8 h-8 text-slate-400" />
            </div>
          ) : (
            <div className="space-y-6 font-mono text-sm md:text-base">
              {/* Header Kertas */}
              <div className="text-center border-b pb-4 mb-6">
                <h2 className="text-xl font-bold uppercase tracking-widest text-slate-900">
                  Laporan Laba Rugi
                </h2>
                <p className="text-slate-500 mt-1">
                  Periode: {new Date(startDate).toLocaleDateString()} s/d{" "}
                  {new Date(endDate).toLocaleDateString()}
                </p>
                {selectedBranch !== "all" && (
                  <p className="text-slate-900 font-bold mt-1">
                    Cabang:{" "}
                    {
                      branches.find((b) => String(b.id) === selectedBranch)
                        ?.name
                    }
                  </p>
                )}
              </div>

              {/* 1. PENDAPATAN */}
              <div>
                <h3 className="font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1">
                  1. PENDAPATAN (REVENUE)
                </h3>

                {/* POS Sales Selalu Muncul Paling Atas */}
                <div className="flex justify-between py-1">
                  <span>Penjualan POS (Cash/QRIS)</span>
                  <span>{formatRupiah(s.revenue_pos)}</span>
                </div>

                {/* Looping Revenue Lainnya (Dinamis) */}
                {s.revenue_breakdown && s.revenue_breakdown.length > 0 ? (
                  s.revenue_breakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between py-1 pl-4 text-slate-600 border-l-2 border-slate-100"
                    >
                      <span>{item.category}</span>
                      <span>{formatRupiah(item.amount)}</span>
                    </div>
                  ))
                ) : (
                  /* Kalau kosong, opsional mau nampilin 0 atau hide */
                  <div className="flex justify-between py-1 pl-4 text-slate-400 italic">
                    <span>Pendapatan Lainnya</span>
                    <span>Rp 0</span>
                  </div>
                )}

                <div className="flex justify-between py-2 font-bold bg-blue-50 px-2 rounded mt-1 text-blue-900">
                  <span>TOTAL PENDAPATAN</span>
                  <span>
                    {formatRupiah(
                      (s.revenue_pos || 0) + (s.total_revenue_other || 0),
                    )}
                  </span>
                </div>
              </div>

              {/* 2. HPP (COGS) */}
              <div>
                <h3 className="font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1">
                  2. HARGA POKOK PENJUALAN (COGS)
                </h3>
                <div className="flex justify-between py-1">
                  {/* UPDATE TEXT: Bukan Pembelian, tapi Pemakaian */}
                  <span>Pemakaian Bahan Baku (Usage)</span>
                  <span className="text-red-600">({formatRupiah(s.cogs)})</span>
                </div>
                <div className="flex justify-between py-2 font-bold bg-slate-100 px-2 rounded mt-1 border-t border-slate-300">
                  <span>LABA KOTOR (GROSS PROFIT)</span>
                  <span>{formatRupiah(grossProfit)}</span>
                </div>
              </div>

              {/* 3. BIAYA OPERASIONAL (OPEX) */}
              <div>
                <h3 className="font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1">
                  3. BIAYA OPERASIONAL
                </h3>

                {/* LOOPING DETAIL EXPENSE */}
                {s.opex_breakdown && s.opex_breakdown.length > 0 ? (
                  s.opex_breakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between py-1 pl-4 text-slate-600 border-l-2 border-slate-100 hover:bg-slate-50"
                    >
                      <span>{item.category}</span>
                      <span className="text-red-600">
                        ({formatRupiah(item.amount)})
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between py-1 pl-4 text-slate-400 italic">
                    <span>Belum ada pengeluaran operasional</span>
                    <span>(Rp 0)</span>
                  </div>
                )}

                {/* PAYROLL TETAP DIPISAH (BIAR RAPI) */}
                <div className="flex justify-between py-1 pl-4 text-slate-600 border-l-2 border-slate-100 mt-2">
                  <span className="font-medium text-slate-800">
                    Gaji Karyawan (Payroll)
                  </span>
                  <span className="text-red-600 font-medium">
                    ({formatRupiah(s.payroll)})
                  </span>
                </div>

                <div className="flex justify-between py-2 font-bold bg-slate-50 px-2 rounded mt-1 text-red-700">
                  <span>TOTAL BIAYA OPS</span>
                  <span>({formatRupiah(totalOpex)})</span>
                </div>
              </div>

              {/* 4. LABA BERSIH */}
              <div className="pt-4 border-t-2 border-slate-800 mt-6">
                <div className="flex justify-between items-center py-4 px-4 bg-slate-900 text-white rounded shadow-md print:bg-white print:text-black print:border print:border-black">
                  <span className="text-lg font-bold uppercase tracking-widest">
                    Laba Bersih (Net Profit)
                  </span>
                  <span className="text-2xl font-bold">
                    {formatRupiah(netProfit)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
