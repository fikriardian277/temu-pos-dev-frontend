import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Search, Filter, History, Warehouse } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

export default function StockMovementPage() {
  const { authState } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]); // List Gudang untuk filter owner

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [whFilter, setWhFilter] = useState("all"); // Filter Gudang

  const fetchLogs = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);

    try {
      let query = supabase
        .schema("inventory")
        .from("stock_movements")
        .select(`*, products (name, sku, unit), warehouses (name)`)
        .eq("business_id", authState.business_id)
        .order("created_at", { ascending: false })
        .limit(100);

      // LOGIC SECURITY & DATA GUDANG
      if (authState.role !== "owner") {
        // Admin: Filter otomatis di backend query (via RLS atau manual filter ID)
        // Disini kita asumsi admin cuma punya 1 akses cabang, jadi gak perlu dropdown filter
        if (authState.branch_id) {
          const { data: wh } = await supabase
            .schema("inventory")
            .from("warehouses")
            .select("id")
            .eq("branch_id", authState.branch_id);
          if (wh && wh.length > 0)
            query = query.in(
              "warehouse_id",
              wh.map((w) => w.id)
            );
        }
      } else {
        // OWNER: Fetch semua gudang buat ngisi dropdown filter
        const { data: whList } = await supabase
          .schema("inventory")
          .from("warehouses")
          .select("id, name")
          .eq("business_id", authState.business_id)
          .eq("is_active", true);
        setWarehouses(whList || []);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Manual Join Creator
      const userIds = [
        ...new Set(data?.map((i) => i.created_by).filter(Boolean)),
      ];
      let userMap = {};
      if (userIds.length > 0) {
        const { data: u } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        if (u) u.forEach((x) => (userMap[x.id] = x.full_name));
      }

      const merged =
        data?.map((i) => ({
          ...i,
          creator_name: userMap[i.created_by] || "System",
        })) || [];

      setLogs(merged);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authState.business_id, authState.role, authState.branch_id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filter Logic Client Side
  const filteredLogs = logs.filter((i) => {
    const matchSearch =
      i.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.document_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchType = true;
    if (typeFilter !== "all") matchType = i.movement_type === typeFilter;

    // Filter Gudang (Khusus Owner)
    let matchWh = true;
    if (whFilter !== "all") matchWh = i.warehouse_id.toString() === whFilter;

    return matchSearch && matchType && matchWh;
  });

  const getTypeBadge = (type) => {
    switch (type) {
      case "purchase":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Beli (PO)
          </Badge>
        );
      case "usage":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Pakai
          </Badge>
        );
      case "void":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            Void
          </Badge>
        );
      case "transfer_in":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Trf Masuk
          </Badge>
        );
      case "transfer_out":
        return (
          <Badge className="bg-blue-50 text-blue-600 border-blue-200">
            Trf Keluar
          </Badge>
        );
      case "adjustment":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
            Adjust
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Riwayat Pergerakan
          </h1>
          <p className="text-muted-foreground">
            Audit trail semua keluar masuk barang.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* FILTER GUDANG (Hanya Owner) */}
          {authState.role === "owner" && (
            <Select value={whFilter} onValueChange={setWhFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semua Gudang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Gudang</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id.toString()}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* FILTER TYPE */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="purchase">Pembelian</SelectItem>
              <SelectItem value="usage">Pemakaian</SelectItem>
              <SelectItem value="transfer_in">Transfer Masuk</SelectItem>
              <SelectItem value="transfer_out">Transfer Keluar</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>

          {/* SEARCH */}
          <div className="relative w-full sm:w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari barang..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium uppercase">
                <tr>
                  <th className="p-4">Waktu</th>
                  <th className="p-4">Barang & Gudang</th>
                  <th className="p-4 text-center">Tipe</th>
                  <th className="p-4 text-center">Stok Awal</th>
                  <th className="p-4 text-center">Perubahan</th>
                  <th className="p-4 text-center">Stok Akhir</th>
                  <th className="p-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center">
                      Memuat...
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const stokAwal =
                      Number(log.balance_after) - Number(log.quantity_change);
                    return (
                      <tr key={log.id} className="hover:bg-muted/5">
                        <td className="p-4 whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString("id-ID")}{" "}
                          <br />
                          {new Date(log.created_at).toLocaleTimeString(
                            "id-ID",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-medium">
                            {log.products?.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.warehouses?.name}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {getTypeBadge(log.movement_type)}
                        </td>
                        <td className="p-4 text-center font-mono text-slate-500">
                          {stokAwal.toLocaleString("id-ID")}
                        </td>
                        <td
                          className={`p-4 text-center font-bold ${
                            log.quantity_change > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {log.quantity_change > 0 ? "+" : ""}
                          {Number(log.quantity_change).toLocaleString(
                            "id-ID"
                          )}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">
                            {log.products?.unit}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-semibold text-slate-800 bg-slate-50">
                          {Number(log.balance_after).toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 max-w-[200px]">
                          <div className="truncate text-xs font-medium">
                            {log.document_id}
                          </div>
                          <div
                            className="text-xs text-muted-foreground truncate"
                            title={log.notes}
                          >
                            {log.notes}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            Oleh: {log.creator_name}
                          </div>
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
    </div>
  );
}
