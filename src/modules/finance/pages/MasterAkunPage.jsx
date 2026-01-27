import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import {
  Wallet,
  Plus,
  Landmark,
  CreditCard,
  Edit,
  BarChart3,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

// UI COMPONENTS
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// CUSTOM COMPONENTS
// Pastikan path ini sesuai dengan lokasi file AccountForm.jsx kamu
import AccountForm from "@/modules/finance/components/AccountForm";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function MasterAkunPage() {
  const { authState } = useAuth();
  const businessId = authState.user?.business_id || 2;

  // State Data Rekening Fisik
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // State Modal Form (Tambah/Edit)
  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  // State Tab
  const [activeTab, setActiveTab] = useState("physical");

  // --- LOGIC FETCH REKENING FISIK ---
  const fetchAccounts = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    try {
      // 1. Ambil Data dari VIEW (View sudah menghitung saldo dari jurnal)
      const { data: accData, error } = await supabase
        .schema("finance")
        .from("view_account_balances")
        .select("*")
        .eq("business_id", businessId)
        .order("branch_id", { ascending: true });

      if (error) throw error;

      // 2. Fetch Branch Names (Buat label cabang)
      const { data: branches } = await supabase
        .from("branches")
        .select("id, name")
        .eq("business_id", businessId);

      const merged =
        accData?.map((a) => ({
          ...a,
          branch_name: a.branch_id
            ? branches?.find((b) => b.id === a.branch_id)?.name ||
              "Unknown Branch"
            : "Kantor Pusat (HQ)",
        })) || [];

      setAccounts(merged);
    } catch (err) {
      console.error("Error fetching accounts:", err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // --- HANDLERS ---
  const handleAdd = () => {
    setEditData(null); // Reset data untuk mode tambah
    setIsOpen(true); // Buka modal
  };

  const handleEdit = (item) => {
    setEditData(item); // Isi data untuk mode edit
    setIsOpen(true); // Buka modal
  };

  const getIcon = (type) => {
    if (type === "bank") return <Landmark className="h-6 w-6 text-blue-600" />;
    if (type === "e-wallet")
      return <CreditCard className="h-6 w-6 text-purple-600" />;
    return <Wallet className="h-6 w-6 text-green-600" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20 bg-gray-50 min-h-screen">
      {/* HEADER UTAMA & TOMBOL AKSI */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Treasury & Banking
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitor saldo real-time berdasarkan Jurnal Akuntansi.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAccounts}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          {/* Tombol Tambah Akun (Hanya di Tab Fisik & Role Finance/Owner) */}
          {activeTab === "physical" &&
            (authState.role === "finance" || authState.role === "owner") && (
              <Button
                onClick={handleAdd}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" /> Tambah Akun
              </Button>
            )}
        </div>
      </div>

      {/* TABS CONTROLLER */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[500px] grid-cols-2 mb-6 bg-white border">
          <TabsTrigger value="physical" className="flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Rekening Fisik
          </TabsTrigger>
          <TabsTrigger value="virtual" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Saldo Virtual (Equity)
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: REKENING FISIK ================= */}
        <TabsContent value="physical" className="space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3 text-sm text-blue-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>
              Saldo yang tampil di sini adalah hasil kalkulasi otomatis dari
              seluruh <strong>Jurnal (Posted)</strong>. Jika saldo tidak sesuai,
              silakan cek <strong>General Ledger</strong> atau pastikan akun
              sudah di-mapping di menu <em>Accounting &gt; Mapping</em>.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              [1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
              ))
            ) : accounts.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-muted-foreground bg-white rounded-xl border border-dashed border-gray-300">
                <Wallet className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>Belum ada akun terdaftar.</p>
              </div>
            ) : (
              accounts.map((acc) => (
                <Card
                  key={acc.id}
                  className="hover:shadow-lg transition-all border-slate-200 bg-white group"
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-full group-hover:scale-110 transition-transform">
                          {getIcon(acc.account_type)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-800 line-clamp-1">
                            {acc.name}
                          </h3>
                          <p className="text-xs text-muted-foreground font-mono">
                            {acc.account_number || "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Tombol Edit */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-300 hover:text-blue-600"
                        onClick={() => handleEdit(acc)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Mapping Info */}
                    <div className="mt-4 mb-2">
                      {acc.coa_code ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-gray-400 font-mono border-gray-200"
                        >
                          Link: {acc.coa_code} - {acc.coa_name}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Belum di-Mapping (Saldo 0)
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Saldo Real-time
                      </p>
                      <p
                        className={`text-2xl font-bold font-mono mt-1 ${
                          acc.real_balance < 0
                            ? "text-red-600"
                            : "text-slate-900"
                        }`}
                      >
                        {formatRupiah(acc.real_balance)}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {acc.branch_id ? "📍" : "🏢"} {acc.branch_name}
                      </div>
                      <div
                        className={`px-2 py-1 rounded font-medium ${
                          acc.is_active
                            ? "text-green-600 bg-green-50"
                            : "text-gray-500 bg-gray-100"
                        }`}
                      >
                        {acc.is_active ? "Aktif" : "Nonaktif"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ================= TAB 2: SALDO VIRTUAL ================= */}
        <TabsContent value="virtual">
          <div className="p-10 text-center text-gray-400 border border-dashed rounded-xl">
            Komponen Saldo Virtual (Equity) akan dimuat di sini.
          </div>
        </TabsContent>
      </Tabs>

      {/* --- INTEGRASI FORM ACCOUNT (SUDAH AKTIF) --- */}
      <AccountForm
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={fetchAccounts} // Refresh list setelah simpan
        initialData={editData}
      />
    </div>
  );
}
