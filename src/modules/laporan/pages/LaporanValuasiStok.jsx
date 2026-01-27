import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Loader2,
  Package,
  Coins,
  Search,
  PieChart as IconPie,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

// Charting
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Shared
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

export default function LaporanValuasiStok() {
  const { authState } = useAuth();

  // State
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [branches, setBranches] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    summary: {
      total_valuation: 0,
      total_items_qty: 0,
      total_products_count: 0,
    },
    by_category: [],
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

  // 2. Fetch Valuation Data
  const fetchValuation = useCallback(async () => {
    if (!authState.business_id) return;

    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc(
        "get_inventory_valuation",
        {
          p_business_id: authState.business_id,
          p_branch_id:
            selectedBranch === "all" ? null : parseInt(selectedBranch),
        },
      );

      if (error) throw error;

      // Safety Check || {}
      setData(
        result || {
          summary: { total_valuation: 0, total_items_qty: 0 },
          by_category: [],
          details: [],
        },
      );
    } catch (e) {
      console.error("Error Valuation:", e);
      toast.error("Gagal memuat valuasi stok.");
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, authState.business_id]);

  useEffect(() => {
    fetchValuation();
  }, [fetchValuation]);

  // Client Filter
  const safeDetails = data?.details || [];
  const filteredData = safeDetails.filter(
    (item) =>
      (item.product_name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (item.sku || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // CSV Headers
  const csvHeaders = [
    { label: "SKU", key: "sku" },
    { label: "Nama Produk", key: "product_name" },
    { label: "Kategori", key: "category" },
    { label: "Gudang/Cabang", key: "warehouse_name" },
    { label: "Qty", key: "quantity" },
    { label: "HPP/Unit", key: "cost_per_unit" },
    { label: "Total Aset", key: "total_asset_value" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Valuasi Stok</h1>
          <p className="text-slate-500 text-sm">
            Nilai total aset persediaan berdasarkan HPP Rata-rata.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Dropdown */}
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
            filename={`Inventory_Valuation_${new Date().toISOString().split("T")[0]}.csv`}
            headers={csvHeaders}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KIRI: SUMMARY & CHART */}
        <div className="space-y-6">
          {/* CARD TOTAL ASSET */}
          <Card className="bg-emerald-50 border-emerald-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                <Coins className="w-4 h-4" /> Total Nilai Aset (Stok)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">
                {loading ? (
                  <Loader2 className="animate-spin h-8 w-8 text-emerald-500" />
                ) : (
                  formatRupiah(data.summary?.total_valuation)
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Dari {data.summary?.total_products_count || 0} jenis item
                berbeda
              </p>
            </CardContent>
          </Card>

          {/* CARD TOTAL QTY */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
                <Package className="w-4 h-4" /> Total Fisik Barang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-700">
                {loading
                  ? "-"
                  : Number(
                      data.summary?.total_items_qty || 0,
                    ).toLocaleString()}{" "}
                <span className="text-sm font-normal text-slate-400">Unit</span>
              </div>
            </CardContent>
          </Card>

          {/* CHART PIE CATEGORY */}
          <Card className="shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <IconPie className="w-4 h-4" /> Komposisi Aset per Kategori
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] flex items-center justify-center text-xs">
              {loading ? (
                <div className="flex flex-col items-center text-slate-400">
                  <Loader2 className="animate-spin mb-2" /> Menghitung...
                </div>
              ) : (data.by_category || []).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.by_category}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="total"
                      nameKey="category"
                    >
                      {(data.by_category || []).map((entry, index) => (
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
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-slate-400">Belum ada stok.</span>
              )}
            </CardContent>
          </Card>
        </div>

        {/* KANAN: TABEL DETAIL */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg">Rincian Stok & Nilai</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Cari SKU / Produk..."
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
                      <TableHead>Produk</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead className="text-center">Stok</TableHead>
                      <TableHead className="text-right">HPP / Unit</TableHead>
                      <TableHead className="text-right">Total Aset</TableHead>
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
                            <Loader2 className="animate-spin h-5 w-5" />{" "}
                            Menghitung aset...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-20 text-slate-400"
                        >
                          <div className="flex flex-col items-center">
                            <Package className="h-10 w-10 mb-2 opacity-20" />
                            Tidak ada data stok.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item, idx) => (
                        <TableRow
                          key={idx}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <TableCell>
                            <div className="font-bold text-slate-700 text-sm">
                              {item.product_name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-5 px-1 font-mono text-slate-500"
                              >
                                {item.sku || "NO-SKU"}
                              </Badge>
                              <span className="text-[10px] text-slate-400">
                                {item.category}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-slate-600 font-medium">
                              {item.warehouse_name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {item.branch_name || "Pusat"}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {item.quantity}{" "}
                            <span className="text-[10px] text-slate-400">
                              {item.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs text-slate-500">
                            {formatRupiah(item.cost_per_unit)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-600 text-sm">
                            {formatRupiah(item.total_asset_value)}
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
