import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, TrendingUp, Search, Filter } from "lucide-react";

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

// Shared Components
import DateRangeFilter from "../components/DateRangeFilter";
import ExportButton from "../components/ExportButton";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function LaporanPenjualan() {
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
    summary: { total_gross: 0, total_discount: 0, total_net: 0, total_trx: 0 },
    transactions: [],
  });

  // 1. Fetch Cabang (Mount)
  useEffect(() => {
    if (authState.business_id) {
      supabase
        .from("branches")
        .select("id, name")
        .eq("business_id", authState.business_id)
        .then(({ data }) => setBranches(data || []));
    }
  }, [authState.business_id]);

  // 2. Fetch Data Laporan (Filter Change)
  const fetchSalesData = useCallback(async () => {
    if (!authState.business_id) return;

    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc(
        "get_sales_report_detail",
        {
          p_business_id: authState.business_id,
          p_start_date: startDate,
          p_end_date: endDate,
          p_branch_id:
            selectedBranch === "all" ? null : parseInt(selectedBranch),
        },
      );

      if (error) throw error;

      setData(
        result || {
          summary: {
            total_gross: 0,
            total_discount: 0,
            total_net: 0,
            total_trx: 0,
          },
          transactions: [],
        },
      );
    } catch (e) {
      console.error("Error sales report:", e);
      toast.error("Gagal memuat laporan penjualan.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedBranch, authState.business_id]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  // --- CLIENT SIDE FILTER ---
  const filteredTransactions = (data.transactions || []).filter(
    (t) =>
      (t.invoice_number || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // --- CSV CONFIG ---
  const csvHeaders = [
    { label: "Tanggal", key: "entry_date" },
    { label: "No Invoice", key: "invoice_number" },
    { label: "Sumber", key: "source_label" },
    { label: "Keterangan", key: "description" },
    { label: "Cabang", key: "branch_name" },
    { label: "Gross", key: "gross_amount" },
    { label: "Diskon/Retur", key: "discount_amount" },
    { label: "Net Sales", key: "net_amount" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER & FILTER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Laporan Penjualan
          </h1>
          <p className="text-slate-500 text-sm">
            Analisa Omzet dari POS & Invoice Hotel (Basis Akuntansi).
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
            data={filteredTransactions}
            filename={`Sales_Report_${startDate}_${endDate}.csv`}
            headers={csvHeaders}
          />
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total NET (Omzet Bersih) */}
        <Card className="bg-blue-50 border-blue-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Total Omzet (Net)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {loading ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : (
                formatRupiah(data.summary?.total_net)
              )}
            </div>
            <p className="text-xs text-blue-600 mt-1 font-medium">
              Pendapatan Bersih setelah diskon
            </p>
          </CardContent>
        </Card>

        {/* Gross Sales */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Gross Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">
              {loading ? "-" : formatRupiah(data.summary?.total_gross)}
            </div>
          </CardContent>
        </Card>

        {/* Diskon/Retur */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Diskon / Retur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {loading ? "-" : formatRupiah(data.summary?.total_discount)}
            </div>
          </CardContent>
        </Card>

        {/* Total TRX */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">
              {loading ? "-" : data.summary?.total_trx || 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">Invoice/Nota terbit</p>
          </CardContent>
        </Card>
      </div>

      {/* TABEL DETAIL */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Rincian Transaksi</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari Invoice / Keterangan..."
                className="pl-8 bg-slate-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[120px]">Tanggal</TableHead>
                  <TableHead>No Invoice</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Sumber</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right text-red-500">
                    Diskon
                  </TableHead>
                  <TableHead className="text-right font-bold">
                    Net Sales
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-20 text-slate-500"
                    >
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="animate-spin h-5 w-5" /> Memuat data
                        penjualan...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-20 text-slate-400"
                    >
                      <div className="flex flex-col items-center">
                        <Filter className="h-10 w-10 mb-2 opacity-20" />
                        Tidak ada data penjualan periode ini.
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
                        {new Date(trx.entry_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {trx.invoice_number}
                      </TableCell>
                      <TableCell
                        className="text-xs text-slate-600 max-w-[200px] truncate"
                        title={trx.description}
                      >
                        {trx.description}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            trx.source_module === "hotel_invoice"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }
                        >
                          {trx.source_label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {trx.branch_name}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-500">
                        {formatRupiah(trx.gross_amount)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-red-500">
                        {trx.discount_amount > 0
                          ? `(${formatRupiah(trx.discount_amount)})`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800">
                        {formatRupiah(trx.net_amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-3 text-xs text-slate-400 text-right border-t">
            Menampilkan {filteredTransactions.length} transaksi
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
