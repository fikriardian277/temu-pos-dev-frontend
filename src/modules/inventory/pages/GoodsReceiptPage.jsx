import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  PackageCheck,
  Search,
  MapPin,
  Calendar,
  CheckCircle,
  Building,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
// Import Modal Penerimaan Barang
import ReceiveGoodsModal from "../components/ReceiveGoodsModal";

export default function GoodsReceiptPage() {
  const { authState } = useAuth();

  // Data State
  const [poList, setPoList] = useState([]);
  const [branches, setBranches] = useState([]); // Buat filter Owner
  const [loading, setLoading] = useState(true);

  // Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");

  // Modal State
  const [selectedPo, setSelectedPo] = useState(null);

  // 1. FETCH DATA CABANG (Khusus Owner buat Filter)
  useEffect(() => {
    const fetchBranches = async () => {
      if (authState.role === "owner" && authState.business_id) {
        const { data } = await supabase
          .schema("public")
          .from("branches")
          .select("id, name")
          .eq("business_id", authState.business_id);
        setBranches(data || []);
      }
    };
    fetchBranches();
  }, [authState.role, authState.business_id]);

  // 2. FETCH PO MASUK (CORE LOGIC)
  const fetchIncomingPO = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);

    try {
      // --- LOGIC SECURITY (ANTI BOCOR) ---
      let targetWarehouseIds = null;

      // Jika BUKAN Owner, cari gudang milik cabang user ini
      if (authState.role !== "owner") {
        if (authState.branch_id) {
          const { data: wh } = await supabase
            .schema("inventory")
            .from("warehouses")
            .select("id")
            .eq("branch_id", authState.branch_id); // Filter by Branch User

          if (wh && wh.length > 0) {
            targetWarehouseIds = wh.map((w) => w.id);
          } else {
            // Punya cabang tapi gak punya gudang -> Kosong
            setPoList([]);
            setLoading(false);
            return;
          }
        } else {
          // User aneh tanpa branch -> Kosong
          setPoList([]);
          setLoading(false);
          return;
        }
      }

      // --- BUILD QUERY ---
      let query = supabase
        .schema("inventory")
        .from("purchase_orders")
        .select(
          `
          *, 
          suppliers (name), 
          warehouses (id, name, branch_id) 
        `,
        ) // Fetch branch_id dari warehouse buat filter owner nanti
        .eq("business_id", authState.business_id)
        // Hanya tampilkan yang sudah ISSUED (resmi) atau PARTIAL (belum lunas terima)
        .in("status", ["issued", "partial"])
        .order("delivery_date", { ascending: true });

      // --- TERAPKAN FILTER GUDANG (JIKA CABANG) ---
      if (targetWarehouseIds) {
        query = query.in("target_warehouse_id", targetWarehouseIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPoList(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat data PO Masuk.");
    } finally {
      setLoading(false);
    }
  }, [authState.business_id, authState.role, authState.branch_id]);

  useEffect(() => {
    fetchIncomingPO();
  }, [fetchIncomingPO]);

  // 3. FILTER LOGIC (FRONTEND)
  const filteredList = poList.filter((po) => {
    // A. Filter Search
    const matchSearch =
      po.purchase_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase());

    // B. Filter Cabang (Khusus Owner)
    let matchBranch = true;
    if (authState.role === "owner" && selectedBranchFilter !== "all") {
      // Cek apakah warehouse tujuan PO ini milik cabang yang dipilih
      matchBranch = po.warehouses?.branch_id === selectedBranchFilter;
    }

    return matchSearch && matchBranch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-900">
            <PackageCheck className="h-8 w-8 text-blue-600" />
            Penerimaan Barang (GR)
          </h1>
          <p className="text-slate-500 mt-1">
            Konfirmasi kedatangan barang dari Supplier.
          </p>
        </div>
      </div>

      {/* TOOLBAR (SEARCH & FILTER) */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* SEARCH */}
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari No PO / Supplier..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* FILTER CABANG (OWNER ONLY) */}
          {authState.role === "owner" && (
            <div className="relative w-full sm:w-[200px]">
              <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <select
                className="h-10 w-full rounded-md border border-input bg-white pl-9 pr-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
              >
                <option value="all">Semua Cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* STATS KECIL (Opsional) */}
        <div className="text-sm text-muted-foreground hidden md:block">
          Menampilkan {filteredList.length} PO Masuk
        </div>
      </div>

      {/* LIST PO */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">
            Memuat data PO masuk...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-xl bg-slate-50/50">
            <PackageCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              Tidak ada barang yang perlu diterima saat ini.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Pastikan PO sudah di-Approve oleh Finance (Status: ISSUED).
            </p>
          </div>
        ) : (
          filteredList.map((po) => (
            <Card
              key={po.id}
              className="hover:border-blue-400 transition-all cursor-default border-l-4 border-l-blue-500 shadow-sm"
            >
              <CardContent className="p-5 flex flex-col md:flex-row justify-between gap-6 items-center">
                {/* INFO UTAMA */}
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      variant="outline"
                      className="font-mono text-base px-3 py-1 text-blue-700 border-blue-200 bg-blue-50"
                    >
                      {po.purchase_number}
                    </Badge>
                    {po.status === "partial" && (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200">
                        PARTIAL RECEIVED
                      </Badge>
                    )}
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Est. Kirim:{" "}
                      {po.delivery_date
                        ? new Date(po.delivery_date).toLocaleDateString("id-ID")
                        : "-"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-slate-800">
                      {po.suppliers?.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        Tujuan:{" "}
                        <span className="font-medium text-slate-700">
                          {po.warehouses?.name}
                        </span>
                      </span>
                    </div>
                  </div>

                  {po.notes && (
                    <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-700 border border-yellow-100 inline-block max-w-md">
                      Note: "{po.notes}"
                    </div>
                  )}
                </div>

                {/* TOMBOL AKSI */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                  <Button
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 shadow-md w-full md:w-auto"
                    onClick={() => setSelectedPo(po)}
                  >
                    <CheckCircle className="mr-2 h-5 w-5" /> Terima Barang
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* MODAL RECEIVE (REUSE COMPONENT) */}
      <ReceiveGoodsModal
        isOpen={!!selectedPo}
        onClose={() => setSelectedPo(null)}
        poData={selectedPo}
        onSuccess={() => {
          setSelectedPo(null);
          fetchIncomingPO(); // Refresh list setelah terima
          toast.success("Barang berhasil diterima!");
        }}
      />
    </div>
  );
}
