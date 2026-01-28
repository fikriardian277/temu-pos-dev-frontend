import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Save,
  ArrowRightLeft,
  Loader2,
  RefreshCw,
  Box,
  Wallet,
  Receipt,
  Building,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

// Helper untuk label yang lebih cantik (Opsional, biar source_id gak kaku banget)
const LABEL_DICTIONARY = {
  // POS & SALES
  REV_KILOAN: "Pendapatan Laundry Kiloan",
  REV_SATUAN: "Pendapatan Laundry Satuan",
  PAYMENT_CASH: "Pembayaran Tunai (Kas)",
  PAYMENT_BANK: "Pembayaran Transfer (Bank)",
  SALES_AR: "Piutang Usaha (AR)",

  // INVENTORY
  GR_STOCK_IN: "Penerimaan Stok (Persediaan Bertambah)",
  GR_AP_ACCRUAL: "Hutang Pembelian (Accrued AP)",
  USAGE_EXPENSE: "Beban Pemakaian Bahan",
  USAGE_STOCK_OUT: "Pengurangan Stok (Pemakaian)",
  TRANSFER_IN_ASSET: "Terima Transfer (Debit Asset)",
  TRANSFER_OUT_ASSET: "Kirim Transfer (Credit Asset)",

  // FINANCE & HOTEL
  PO_DP_PAID: "Uang Muka Pembelian (DP)",
  PO_PAYMENT_SRC: "Sumber Dana Pembayaran PO",
  REV_HOTEL: "Pendapatan Laundry Hotel (B2B)",
  AR_HOTEL: "Piutang Hotel",

  // EXPENSES
  EXP_Listrik: "Biaya Listrik",
  EXP_Sewa: "Biaya Sewa",
  EXP_Payroll: "Biaya Gaji (Payroll)",
};

// Helper untuk format source_id jika tidak ada di dictionary
const formatLabel = (sourceId) => {
  if (LABEL_DICTIONARY[sourceId]) return LABEL_DICTIONARY[sourceId];
  return sourceId
    .replace(/_/g, " ")
    .replace(/EXP /g, "Biaya ")
    .replace(/ASSET /g, "Aset ");
};

export default function AccountMappingPage() {
  const { authState } = useAuth();
  const businessId = authState.user?.business_id || 2;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State Data
  const [coaList, setCoaList] = useState([]);
  const [mappingRows, setMappingRows] = useState([]); // Langsung simpan rows dari DB

  useEffect(() => {
    if (businessId) fetchData();
  }, [businessId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Ambil Data COA (Accounting Schema)
      const { data: coaData } = await supabase
        .schema("accounting")
        .from("coa")
        .select("id, code, name, type")
        .eq("business_id", businessId)
        .order("code");

      setCoaList(coaData || []);

      // 2. Ambil Mapping Rows (Existing Data)
      const { data: mapData, error } = await supabase
        .schema("accounting")
        .from("account_mappings")
        .select("*")
        .eq("business_id", businessId)
        .order("id"); // Biar urutannya konsisten

      if (error) throw error;
      setMappingRows(mapData || []);
    } catch (e) {
      console.error(e);
      toast.error("Gagal load data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler saat user ganti dropdown
  const handleAccountChange = (rowId, newAccountId) => {
    setMappingRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, account_id: parseInt(newAccountId) } : row,
      ),
    );
  };

  // Handler Simpan Perubahan
  const handleSave = async () => {
    setSaving(true);
    try {
      // Siapkan payload untuk upsert
      // Kita kirim semua row atau yang berubah saja. Supabase upsert aman.
      const payload = mappingRows.map((row) => ({
        id: row.id,
        business_id: row.business_id,
        module: row.module,
        source_id: row.source_id,
        account_id: row.account_id,
        type: row.type,
      }));

      const { error } = await supabase
        .schema("accounting")
        .from("account_mappings")
        .upsert(payload);

      if (error) throw error;
      toast.success("Konfigurasi mapping berhasil disimpan!");
      fetchData(); // Refresh untuk memastikan data sinkron
    } catch (e) {
      console.error(e);
      toast.error("Gagal simpan: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Helper Filter Rows by Module
  const getRowsByModule = (modulesArray) => {
    return mappingRows.filter((row) => modulesArray.includes(row.module));
  };

  // Komponen Baris Mapping
  const MappingItem = ({ row }) => {
    // Filter COA suggestion biar relevan (Opsional: Type Debit/Credit)
    // Tapi karena mappingnya kompleks, kita tampilkan semua COA saja biar fleksibel
    return (
      <div className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-slate-50 transition-colors">
        <div className="flex flex-col">
          <span className="font-medium text-sm text-slate-800">
            {formatLabel(row.source_id)}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            ID: {row.source_id} • Type:{" "}
            <span className="uppercase text-blue-500">{row.type}</span>
          </span>
        </div>
        <div className="w-[320px]">
          <Select
            value={row.account_id ? String(row.account_id) : ""}
            onValueChange={(val) => handleAccountChange(row.id, val)}
          >
            <SelectTrigger
              className={`h-9 ${
                row.account_id
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-500"
              }`}
            >
              <SelectValue placeholder="Pilih Akun COA..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {coaList.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  <div className="flex items-center">
                    <span
                      className={`font-mono font-bold mr-2 text-xs px-1 rounded ${
                        c.type === "asset"
                          ? "bg-blue-100 text-blue-700"
                          : c.type === "expense"
                            ? "bg-orange-100 text-orange-700"
                            : c.type === "revenue"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {c.code}
                    </span>
                    <span className="truncate max-w-[220px] text-xs sm:text-sm">
                      {c.name}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 pb-20 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <ArrowRightLeft className="text-blue-600" /> Account Mapping
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Konfigurasi akun GL untuk setiap transaksi sistem (Fixed Mapping).
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={fetchData}
            variant="outline"
            disabled={loading}
            className="border-gray-300"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {saving ? (
              <Loader2 className="animate-spin mr-2 w-4 h-4" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Simpan Perubahan
          </Button>
        </div>
      </div>

      {/* TABS UTAMA */}
      <Tabs defaultValue="pos" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white border border-gray-200 p-1 rounded-xl h-auto shadow-sm">
          <TabsTrigger
            value="pos"
            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 py-2 flex gap-2"
          >
            <Receipt size={16} /> POS & Sales
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 py-2 flex gap-2"
          >
            <Box size={16} /> Inventory
          </TabsTrigger>
          <TabsTrigger
            value="expense"
            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 py-2 flex gap-2"
          >
            <Zap size={16} /> Biaya
          </TabsTrigger>
          <TabsTrigger
            value="asset"
            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 py-2 flex gap-2"
          >
            <Building size={16} /> Asset & Depr.
          </TabsTrigger>
          <TabsTrigger
            value="finance"
            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 py-2 flex gap-2"
          >
            <Wallet size={16} /> Finance & Lainnya
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 space-y-4">
          {/* TAB 1: POS & SALES (Termasuk Hotel/B2B) */}
          <TabsContent value="pos">
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-0">
                {getRowsByModule(["pos", "hotel"]).map((row) => (
                  <MappingItem key={row.id} row={row} />
                ))}
                {getRowsByModule(["pos", "hotel"]).length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    Loading data...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: INVENTORY */}
          <TabsContent value="inventory">
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-0">
                {getRowsByModule(["inventory"]).map((row) => (
                  <MappingItem key={row.id} row={row} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: EXPENSE & PETTY CASH */}
          <TabsContent value="expense">
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-0">
                <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 uppercase">
                  Operational Expenses
                </div>
                {getRowsByModule(["expense"]).map((row) => (
                  <MappingItem key={row.id} row={row} />
                ))}

                <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 uppercase mt-2">
                  Petty Cash Categories
                </div>
                {getRowsByModule(["petty_cash"]).map((row) => (
                  <MappingItem key={row.id} row={row} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: ASSET & DEPRECIATION */}
          <TabsContent value="asset">
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-0">
                <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 uppercase">
                  Fixed Assets
                </div>
                {getRowsByModule(["asset"]).map((row) => (
                  <MappingItem key={row.id} row={row} />
                ))}

                <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 uppercase mt-2">
                  Depreciation
                </div>
                {getRowsByModule(["depreciation"]).map((row) => (
                  <MappingItem key={row.id} row={row} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: FINANCE & RECON */}
          <TabsContent value="finance">
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-0">
                <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 uppercase">
                  General Finance
                </div>
                {getRowsByModule(["finance"]).map((row) => (
                  <MappingItem key={row.id} row={row} />
                ))}

                <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 uppercase mt-2">
                  Reconciliation & Adjustments
                </div>
                {getRowsByModule(["recon"]).map((row) => (
                  <MappingItem key={row.id} row={row} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
