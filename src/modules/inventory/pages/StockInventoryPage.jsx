import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import {
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

export default function StockInventoryPage() {
  const { authState } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const fetchData = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);
    try {
      // --- DEBUG LOG (Cek di Inspect Element -> Console buat mastiin) ---
      console.log("Debug Auth:", {
        role: authState.role,
        branch: authState.branch_id,
        business: authState.business_id,
      });

      // 1. Fetch Warehouses
      // FIX: Tambahkan .schema("inventory")
      let whQuery = supabase
        .schema("inventory") // <--- INI YANG KETINGGALAN TADI
        .from("warehouses")
        .select("id, name, is_main_warehouse, branch_id")
        .eq("business_id", authState.business_id)
        .eq("is_active", true)
        .order("is_main_warehouse", { ascending: false });

      // Logic Security: KECUALI 'owner', semua role wajib difilter by branch_id
      if (authState.role !== "owner") {
        if (authState.branch_id) {
          whQuery = whQuery.eq("branch_id", authState.branch_id);
        } else {
          console.warn("User bukan owner tapi tidak punya branch_id!");
          setWarehouses([]);
          setStocks([]);
          setLoading(false);
          return;
        }
      }

      const { data: whData, error: whError } = await whQuery;
      if (whError) throw whError;

      console.log("Data Gudang Ditemukan:", whData); // Cek apakah array kosong atau ada isinya
      setWarehouses(whData || []);

      if (whData?.length > 0) {
        if (activeTab === "all") setActiveTab(whData[0].id.toString());

        // 2. Fetch Stocks
        const allowedWhIds = whData.map((w) => w.id);

        // FIX: Tambahkan .schema("inventory") disini juga
        const { data: stockData, error: stockError } = await supabase
          .schema("inventory") // <--- INI JUGA
          .from("inventory_items")
          .select(
            `
              id, quantity, updated_at, warehouse_id,
              products!inner (name, sku, unit, category, minimum_stock)
            `,
          )
          .eq("business_id", authState.business_id)
          .in("warehouse_id", allowedWhIds)
          .order("quantity", { ascending: true });

        if (stockError) throw stockError;
        setStocks(stockData || []);
      } else {
        setStocks([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [authState.business_id, authState.role, authState.branch_id, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter Data Display
  const getFilteredStocks = (warehouseId) => {
    return stocks.filter((item) => {
      const matchesSearch =
        item.products.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.products.sku &&
          item.products.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesWh = item.warehouse_id.toString() === warehouseId.toString();
      return matchesSearch && matchesWh;
    });
  };

  // --- [COMPONENT: STOCK TABLE] ---
  // Kita pisah jadi komponen kecil biar bisa dipake di mode Tab maupun Single View
  const StockTable = ({ items, warehouseName }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-muted-foreground" />
            <span>Stok di {warehouseName}</span>
          </div>
          <Badge variant="outline" className="text-sm font-normal">
            Total Item: {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Produk</th>
                <th className="px-6 py-4 text-center">Kategori</th>
                <th className="px-6 py-4 text-center">Sisa Stok</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-muted-foreground"
                  >
                    Tidak ada barang sesuai pencarian di gudang ini.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isLow = item.quantity <= item.products.minimum_stock;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">
                          {item.products.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {item.products.sku || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge
                          variant="secondary"
                          className="font-normal bg-slate-100 text-slate-600 hover:bg-slate-200"
                        >
                          {item.products.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`text-lg font-bold ${
                            isLow ? "text-red-600" : "text-slate-700"
                          }`}
                        >
                          {Number(item.quantity).toLocaleString("id-ID")}
                        </span>
                        <span className="ml-1 text-xs text-muted-foreground uppercase">
                          {item.products.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isLow ? (
                          <Badge
                            variant="destructive"
                            className="gap-1 pl-1 pr-2"
                          >
                            <AlertTriangle className="h-3 w-3" /> Menipis
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-green-700 border-green-200 bg-green-50 gap-1 pl-1 pr-2"
                          >
                            <CheckCircle className="h-3 w-3" /> Aman
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground text-xs font-mono">
                        {new Date(item.updated_at).toLocaleDateString("id-ID")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-lg border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Laporan Stok Opname
          </h1>
          <p className="text-slate-500 mt-1">
            {authState.role === "owner"
              ? "Pantau ketersediaan stok di seluruh gudang & cabang."
              : `Posisi stok saat ini di cabang: ${warehouses[0]?.name || "Loading..."}`}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari nama barang atau SKU..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* CONTENT SECTION */}
      {loading && warehouses.length === 0 ? (
        <div className="text-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
          <p className="text-muted-foreground">Memuat data inventori...</p>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg bg-slate-50">
          <Warehouse className="h-10 w-10 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">
            Akses Gudang Kosong
          </h3>
          <p className="text-slate-500">
            Anda tidak memiliki akses ke gudang manapun atau data belum
            tersedia.
          </p>
        </div>
      ) : (
        <>
          {/* --- [FIX UX] LOGIC TAMPILAN --- */}
          {/* JIKA GUDANG > 1 (OWNER): TAMPILKAN TABS */}
          {warehouses.length > 1 ? (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="flex flex-wrap h-auto justify-start gap-2 bg-transparent p-0 mb-6">
                {warehouses.map((wh) => (
                  <TabsTrigger
                    key={wh.id}
                    value={wh.id.toString()}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-white px-4 py-2 rounded-full shadow-sm transition-all"
                  >
                    {wh.name} {wh.is_main_warehouse && "(Pusat)"}
                  </TabsTrigger>
                ))}
              </TabsList>

              {warehouses.map((wh) => (
                <TabsContent
                  key={wh.id}
                  value={wh.id.toString()}
                  className="mt-0"
                >
                  <StockTable
                    items={getFilteredStocks(wh.id)}
                    warehouseName={wh.name}
                  />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            /* JIKA GUDANG == 1 (ADMIN/KASIR): TAMPILKAN LANGSUNG (SINGLE VIEW) */
            /* Tidak perlu Tabs navigation yang membingungkan */
            <div className="mt-4">
              <StockTable
                items={getFilteredStocks(warehouses[0].id)}
                warehouseName={warehouses[0].name}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
