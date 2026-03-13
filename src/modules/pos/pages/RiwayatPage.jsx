import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Search,
  Eye,
  Calendar,
  User,
  FileText,
  Loader2,
  ArrowRight,
} from "lucide-react";

const formatRupiah = (value) => Number(value ?? 0).toLocaleString("id-ID");

export default function RiwayatPage() {
  const { authState } = useAuth();
  const navigate = useNavigate();

  const [transaksiList, setTransaksiList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 20; // Ambil 20 data per load

  // FETCH DATA LIST
  // FETCH DATA LIST
  const fetchTransaksi = useCallback(async () => {
    setLoading(true);
    try {
      // 👇 KITA TEMBAK LANGSUNG KE TABEL VIEW YANG BARU DIBIKIN 👇
      let query = supabase
        .from("vw_orders_history")
        .select("*")
        .eq("business_id", authState.business_id)
        .order("created_at", { ascending: false })
        .range((page - 1) * LIMIT, page * LIMIT - 1);

      // Filter Cabang (Kecuali Owner)
      if (authState.role !== "owner") {
        query = query.eq("branch_id", authState.branch_id);
      }

      // Filter Pencarian (Invoice atau Nama Customer)
      if (searchTerm) {
        // 👇 SEKARANG PAKE .or() LANGSUNG JALAN MULUS TANPA ERROR! 👇
        // Pakai tanda kutip ganda ("%") biar aman kalau kasir ngetik pake spasi
        query = query.or(
          `invoice_code.ilike."%${searchTerm}%",customer_name.ilike."%${searchTerm}%"`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      setTransaksiList(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Gagal memuat riwayat transaksi.");
    } finally {
      setLoading(false);
    }
  }, [
    authState.business_id,
    authState.branch_id,
    authState.role,
    page,
    searchTerm,
  ]);

  useEffect(() => {
    // Debounce search dikit biar gak spam request
    const timeoutId = setTimeout(() => {
      fetchTransaksi();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [fetchTransaksi]);

  // NAVIGASI KE DETAIL (INI KUNCINYA)
  const handleViewDetail = (invoiceCode) => {
    // Langsung lempar ke halaman detail yang udah canggih tadi
    navigate(`/riwayat/${invoiceCode}`);
  };

  return (
    <div className="space-y-6 p-4 pb-20 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Riwayat Transaksi
          </h1>
          <p className="text-muted-foreground">
            Daftar semua transaksi yang tercatat.
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari No. Invoice atau Nama..."
            className="pl-9 bg-white"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1); // <-- Tambahin ini biar otomatis balik ke hal 1
            }}
          />
        </div>
      </div>

      {/* LIST CARD (RESPONSIVE TABLE) */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 rounded-tl-md">Waktu</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center rounded-tr-md">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                      <p className="text-xs text-muted-foreground mt-2">
                        Memuat data...
                      </p>
                    </td>
                  </tr>
                ) : transaksiList.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="p-8 text-center text-muted-foreground"
                    >
                      Tidak ada transaksi ditemukan.
                    </td>
                  </tr>
                ) : (
                  transaksiList.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* WAKTU */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">
                            {new Date(item.created_at).toLocaleDateString(
                              "id-ID",
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleTimeString(
                              "id-ID",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        </div>
                      </td>

                      {/* INVOICE */}
                      <td className="px-4 py-3 font-mono text-blue-600 font-semibold">
                        {item.invoice_code}
                      </td>

                      {/* PELANGGAN */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>{item.customer_name || "Guest"}</span>
                        </div>
                        {authState.role === "owner" && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {item.branch_name}
                          </div>
                        )}
                      </td>

                      {/* TOTAL */}
                      <td className="px-4 py-3 text-right font-bold text-slate-700">
                        Rp {formatRupiah(item.grand_total)}
                      </td>

                      {/* STATUS (Menggabungkan Payment & Cancellation) */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {item.cancellation_status === "approved" ||
                          item.payment_status === "Void" ? (
                            <Badge
                              variant="destructive"
                              className="text-[10px] px-2"
                            >
                              VOID/REFUND
                            </Badge>
                          ) : item.cancellation_status === "requested" ? (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px]">
                              REQ BATAL
                            </Badge>
                          ) : (
                            <Badge
                              variant={
                                item.payment_status === "Lunas"
                                  ? "success"
                                  : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {item.payment_status}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* AKSI */}
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => handleViewDetail(item.invoice_code)}
                        >
                          Detail <ArrowRight className="ml-1 h-3 w-3" />
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

      {/* PAGINATION SIMPLE */}
      <div className="flex justify-center gap-2 mt-4">
        <Button
          variant="outline"
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          disabled={transaksiList.length < LIMIT || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Selanjutnya
        </Button>
      </div>
    </div>
  );
}
