import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, Search, ArrowUpRight, Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

// KITA PAKE MODAL SAKTI INI BUAT SEMUA TRANSAKSI
import SupplierPaymentModal from "@/modules/finance/features/SupplierPaymentModal";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function SupplierPayablePage() {
  const { authState } = useAuth();

  const [activeTab, setActiveTab] = useState("ap");
  const [payables, setPayables] = useState([]);
  const [dpRequests, setDpRequests] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("unpaid_partial");
  const [searchQuery, setSearchQuery] = useState("");

  // MODAL STATE (Cukup satu set state buat handle dua jenis pembayaran)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // Bisa Payable atau PO
  const [paymentMode, setPaymentMode] = useState("ap"); // 'ap' atau 'dp'

  // 1. FETCH DATA
  const fetchData = async () => {
    if (!authState.business_id) return;
    setLoading(true);
    try {
      const { data: supData } = await supabase
        .schema("inventory")
        .from("suppliers")
        .select("id, name")
        .eq("business_id", authState.business_id);
      setSuppliers(supData || []);

      if (activeTab === "ap") {
        let query = supabase
          .schema("finance")
          .from("view_supplier_payables")
          .select("*")
          .eq("business_id", authState.business_id)
          .order("due_date", { ascending: true });

        if (filterStatus === "unpaid_partial")
          query = query.in("status", ["unpaid", "partial"]);
        else if (filterStatus !== "all")
          query = query.eq("status", filterStatus);
        if (filterSupplier !== "all")
          query = query.eq("supplier_id", filterSupplier);

        const { data, error } = await query;
        if (error) throw error;

        // Fix mapping structure & null safety
        const mappedData = (data || []).map((item) => ({
          ...item,
          suppliers: { name: item.supplier_name || "Unknown" },
          purchase_orders: { purchase_number: item.purchase_number || "-" },
        }));
        setPayables(mappedData);
      } else {
        // TAB DP: Ambil PO yang Request DP dan Belum Lunas DP
        let query = supabase
          .schema("inventory")
          .from("purchase_orders")
          .select(`*, suppliers(name)`)
          .eq("business_id", authState.business_id)
          .eq("dp_status", "requested") // Hanya yang minta DP
          .neq("status", "draft")
          .order("created_at", { ascending: false });

        if (filterSupplier !== "all")
          query = query.eq("supplier_id", filterSupplier);

        const { data, error } = await query;
        if (error) throw error;
        setDpRequests(data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authState.business_id, activeTab, filterSupplier, filterStatus]);

  // HANDLER BUKA MODAL
  const openPaymentModal = (item, mode) => {
    setSelectedItem(item);
    setPaymentMode(mode); // 'ap' atau 'dp'
    setPaymentModalOpen(true);
  };

  // Helper Badge
  const getStatusBadge = (status, dueDate) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== "paid";
    if (status === "paid") return <Badge className="bg-green-600">LUNAS</Badge>;
    if (isOverdue)
      return (
        <Badge variant="destructive" className="animate-pulse">
          OVERDUE
        </Badge>
      );
    if (status === "partial")
      return <Badge className="bg-orange-100 text-orange-700">CICILAN</Badge>;
    return <Badge variant="outline">BELUM LUNAS</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Pembayaran Supplier
          </h1>
          <p className="text-muted-foreground">
            Kelola Hutang Dagang (AP) dan Uang Muka (DP).
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2 mb-4">
          <TabsTrigger value="ap">Tagihan Masuk (AP)</TabsTrigger>
          <TabsTrigger value="dp">Request DP PO</TabsTrigger>
        </TabsList>

        <Card className="mb-6">
          <CardContent className="p-4 flex flex-wrap gap-4 items-end">
            <div className="w-full sm:w-[250px]">
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                Supplier
              </label>
              <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Supplier</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeTab === "ap" && (
              <div className="w-full sm:w-[200px]">
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  Status Tagihan
                </label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid_partial">Belum Lunas</SelectItem>
                    <SelectItem value="paid">History Lunas</SelectItem>
                    <SelectItem value="all">Semua</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                Cari
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="No PO / Ref..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- TAB 1: AP (TAGIHAN) --- */}
        <TabsContent value="ap">
          <Card className="border-t-4 border-t-blue-600">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold">
                    <tr>
                      <th className="p-4">Supplier</th>
                      <th className="p-4">Referensi</th>
                      <th className="p-4">Jatuh Tempo</th>
                      <th className="p-4 text-right">Total Tagihan</th>
                      <th className="p-4 text-right">Sisa Hutang</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center">
                          <Loader2 className="animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : payables.length === 0 ? (
                      <tr>
                        <td
                          colSpan="7"
                          className="p-8 text-center text-muted-foreground"
                        >
                          Tidak ada tagihan.
                        </td>
                      </tr>
                    ) : (
                      payables
                        .filter((p) => {
                          const poNum =
                            p.purchase_orders?.purchase_number || "";
                          const supName = p.suppliers?.name || "";
                          const search = searchQuery.toLowerCase();
                          return (
                            poNum.toLowerCase().includes(search) ||
                            supName.toLowerCase().includes(search)
                          );
                        })
                        .map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-4 font-bold">
                              {item.suppliers?.name}
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">
                                {item.purchase_orders?.purchase_number}
                              </Badge>
                            </td>
                            <td className="p-4">
                              {new Date(item.due_date).toLocaleDateString(
                                "id-ID",
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {formatRupiah(item.total_amount)}
                            </td>
                            <td className="p-4 text-right font-bold text-red-600">
                              {formatRupiah(item.remaining_amount)}
                            </td>
                            <td className="p-4 text-center">
                              {getStatusBadge(item.status, item.due_date)}
                            </td>
                            <td className="p-4 text-center">
                              {item.status !== "paid" && (
                                <Button
                                  size="sm"
                                  className="bg-blue-600 h-8"
                                  onClick={() => openPaymentModal(item, "ap")}
                                >
                                  <ArrowUpRight className="h-3 w-3 mr-1" />{" "}
                                  Bayar
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 2: REQUEST DP --- */}
        <TabsContent value="dp">
          <Card className="border-t-4 border-t-orange-500">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-orange-50 text-orange-800 uppercase text-xs font-bold">
                    <tr>
                      <th className="p-4">Supplier</th>
                      <th className="p-4">No PO</th>
                      <th className="p-4 text-right">Total PO</th>
                      <th className="p-4 text-right">DP Diminta</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center">
                          <Loader2 className="animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : dpRequests.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="p-8 text-center text-muted-foreground"
                        >
                          Tidak ada request DP aktif.
                        </td>
                      </tr>
                    ) : (
                      dpRequests
                        .filter((p) =>
                          p.purchase_number
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()),
                        )
                        .map((po) => (
                          <tr key={po.id} className="hover:bg-orange-50/50">
                            <td className="p-4 font-bold">
                              {po.suppliers?.name}
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">
                                {po.purchase_number}
                              </Badge>
                            </td>
                            <td className="p-4 text-right text-slate-500">
                              {formatRupiah(po.total_amount)}
                            </td>
                            <td className="p-4 text-right font-bold text-orange-600 text-lg">
                              {formatRupiah(po.dp_amount)}
                            </td>
                            <td className="p-4 text-center">
                              <Button
                                size="sm"
                                className="bg-orange-600 hover:bg-orange-700"
                                onClick={() => openPaymentModal(po, "dp")}
                              >
                                <Wallet className="h-3 w-3 mr-1" /> Bayar DP
                              </Button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL PEMBAYARAN UNIVERSAL (AP & DP) */}
      {selectedItem && (
        <SupplierPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          // LOGIC OPER DATA KE MODAL
          // Kalau mode AP -> kirim payableData
          // Kalau mode DP -> kirim poData
          payableData={paymentMode === "ap" ? selectedItem : null}
          poData={paymentMode === "dp" ? selectedItem : null}
          authState={authState}
          onSuccess={() => fetchData()}
        />
      )}
    </div>
  );
}
