import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  ArrowRight,
  Search,
  FileInput,
  Eye,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import ReceiveTransferModal from "../components/ReceiveTransferModal";

export default function TransferPage() {
  const { authState } = useAuth();
  const navigate = useNavigate();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [receiveModal, setReceiveModal] = useState(null);

  // FETCH DATA
  const fetchList = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);

    // Ambil data transfer beserta info branch dari warehouse
    // Kita butuh branch_id dari source & target untuk filter permission admin cabang
    const { data: trfData, error } = await supabase
      .schema("inventory")
      .from("stock_transfers")
      .select(
        `
          *,
          source:source_warehouse_id(id, name, branch_id),
          target:target_warehouse_id(id, name, branch_id)
        `,
      )
      .eq("business_id", authState.business_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Manual Join Creator
    const userIds = [
      ...new Set(trfData.map((item) => item.created_by).filter(Boolean)),
    ];
    let profilesMap = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      if (users)
        users.forEach((u) => {
          profilesMap[u.id] = u.full_name;
        });
    }

    // MERGE & FILTER PERMISSION (Client Side Security)
    const mergedData = trfData
      .map((item) => ({
        ...item,
        creator: { full_name: profilesMap[item.created_by] || "Unknown" },
      }))
      .filter((item) => {
        // --- LOGIC PERMISSION ---
        // 1. Owner: Boleh lihat semua
        if (authState.role === "owner") return true;

        // 2. Admin/Kasir: Cuma boleh lihat jika gudang Source ATAU Target ada di cabangnya
        const userBranchId = authState.branch_id;
        const isSourceMyBranch = item.source?.branch_id === userBranchId;
        const isTargetMyBranch = item.target?.branch_id === userBranchId;

        return isSourceMyBranch || isTargetMyBranch;
      });

    setList(mergedData);
    setLoading(false);
  }, [authState.business_id, authState.branch_id, authState.role]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // LOGIC FILTERING TABS & SEARCH
  const filteredList = list.filter((item) => {
    const matchSearch =
      item.transfer_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.source?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.target?.name.toLowerCase().includes(searchTerm.toLowerCase());

    let matchStatus = true;
    if (statusFilter === "requested") matchStatus = item.status === "requested";
    if (statusFilter === "in_transit")
      matchStatus = item.status === "in_transit" || item.status === "partial";
    if (statusFilter === "completed")
      matchStatus =
        item.status === "received" ||
        item.status === "received_with_loss" ||
        item.status === "rejected";

    return matchSearch && matchStatus;
  });

  // UI HELPER: Status Badge Cantik
  const getStatusBadge = (status) => {
    const styles = {
      received: {
        bg: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
        label: "Selesai",
      },
      received_with_loss: {
        bg: "bg-yellow-100 text-yellow-700 border-yellow-200",
        icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
        label: "Selesai (Selisih)",
      },
      in_transit: {
        bg: "bg-blue-100 text-blue-700 border-blue-200",
        icon: <Truck className="w-3 h-3 mr-1" />,
        label: "Dalam Perjalanan",
      },
      partial: {
        bg: "bg-purple-100 text-purple-700 border-purple-200",
        icon: <Truck className="w-3 h-3 mr-1" />,
        label: "Terima Sebagian",
      },
      requested: {
        bg: "bg-orange-100 text-orange-700 border-orange-200 animate-pulse",
        icon: <Clock className="w-3 h-3 mr-1" />,
        label: "Menunggu Approval",
      },
      rejected: {
        bg: "bg-red-100 text-red-700 border-red-200",
        icon: <XCircle className="w-3 h-3 mr-1" />,
        label: "Ditolak",
      },
      draft: {
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        icon: null,
        label: "Draft",
      },
    };

    const style = styles[status] || styles.draft;

    return (
      <Badge
        variant="outline"
        className={`font-medium border ${style.bg} flex items-center w-fit`}
      >
        {style.icon}
        {style.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-lg border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mutasi Stok
          </h1>
          <p className="text-slate-500 mt-1">
            {authState.role === "owner"
              ? "Kelola perpindahan stok antar cabang."
              : "Request stok dari pusat atau gudang lain."}
          </p>
        </div>

        {/* CONDITION 1: TOMBOL HANYA MUNCUL KALO BUKAN OWNER */}
        {authState.role !== "owner" && (
          <Button
            onClick={() => navigate("/inventory/transfers/create")}
            className="shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" /> Request Stok Baru
          </Button>
        )}
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
        <Tabs
          defaultValue="all"
          value={statusFilter}
          onValueChange={setStatusFilter}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="all" className="rounded-sm">
              Semua
            </TabsTrigger>
            <TabsTrigger
              value="requested"
              className="rounded-sm text-orange-700"
            >
              Request
            </TabsTrigger>
            <TabsTrigger
              value="in_transit"
              className="rounded-sm text-blue-700"
            >
              Dikirim
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="rounded-sm text-emerald-700"
            >
              Selesai
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari No. Transfer / Gudang..."
            className="pl-9 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* LIST ITEMS */}
      <div className="grid gap-3">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">
            Memuat data transfer...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-xl bg-slate-50/50">
            <p className="text-muted-foreground font-medium">
              Tidak ada data mutasi stok yang ditemukan.
            </p>
            {authState.role !== "owner" && (
              <Button
                variant="link"
                onClick={() => navigate("/inventory/transfers/create")}
                className="mt-2"
              >
                Buat Request Sekarang
              </Button>
            )}
          </div>
        ) : (
          filteredList.map((item) => (
            <Card
              key={item.id}
              className={`group transition-all hover:shadow-md border-l-4 ${
                item.status === "requested"
                  ? "border-l-orange-400 bg-orange-50/30"
                  : item.status === "in_transit"
                    ? "border-l-blue-400"
                    : item.status === "received"
                      ? "border-l-emerald-400"
                      : "border-l-slate-200"
              }`}
            >
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* INFO TRANSFER */}
                <div className="space-y-2 w-full">
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <span className="font-mono font-bold text-lg text-slate-800 tracking-tight">
                      {item.transfer_number}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5 font-medium bg-white px-2 py-1 rounded border shadow-sm">
                      <span className="text-slate-500">Dari:</span>
                      <span className="text-slate-900">
                        {item.source?.name || "Unknown"}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                    <div className="flex items-center gap-1.5 font-medium bg-white px-2 py-1 rounded border shadow-sm">
                      <span className="text-slate-500">Ke:</span>
                      <span className="text-slate-900">
                        {item.target?.name || "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                    <span>
                      {new Date(item.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>•</span>
                    <span>{item.creator?.full_name || "System"}</span>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0">
                  {/* POV OWNER: Butuh tombol Proses yang menonjol kalo status Requested */}
                  {authState.role === "owner" ? (
                    <Button
                      size="sm"
                      className={
                        item.status === "requested"
                          ? "bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto shadow-sm"
                          : "w-full sm:w-auto"
                      }
                      variant={
                        item.status === "requested" ? "default" : "outline"
                      }
                      onClick={() =>
                        navigate(`/inventory/transfers/${item.id}`)
                      }
                    >
                      {item.status === "requested" ? (
                        <>
                          <FileInput className="mr-2 h-4 w-4" /> Review Request
                        </>
                      ) : (
                        <>
                          <Eye className="mr-2 h-4 w-4" /> Lihat Detail
                        </>
                      )}
                    </Button>
                  ) : (
                    // POV CABANG
                    <>
                      {/* Tombol Terima cuma muncul kalo status dikirim & user adalah penerima */}
                      {(item.status === "in_transit" ||
                        item.status === "partial") &&
                      item.target?.branch_id === authState.branch_id ? (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto shadow-sm"
                          onClick={() => setReceiveModal(item)}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Terima
                          Barang
                        </Button>
                      ) : null}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-500 hover:text-slate-900 w-full sm:w-auto border sm:border-0"
                        onClick={() =>
                          navigate(`/inventory/transfers/${item.id}`)
                        }
                      >
                        <ArrowUpRight className="mr-2 h-4 w-4" /> Detail
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* MODAL TERIMA BARANG */}
      <ReceiveTransferModal
        isOpen={!!receiveModal}
        onClose={() => setReceiveModal(null)}
        transferData={receiveModal}
        onSuccess={fetchList}
      />
    </div>
  );
}
