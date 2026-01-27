import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function LaporanNeraca() {
  const { authState } = useAuth();

  // State
  // Neraca itu "As of Date", jadi cuma butuh End Date
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

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

  // 2. Fetch Data
  useEffect(() => {
    if (authState.business_id) fetchBalanceSheet();
  }, [endDate, selectedBranch, authState.business_id]);

  const fetchBalanceSheet = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc("get_balance_sheet", {
        p_business_id: authState.business_id,
        p_end_date: endDate,
        p_branch_id: selectedBranch === "all" ? null : parseInt(selectedBranch),
      });

      if (error) throw error;
      setData(result);
    } catch (e) {
      toast.error("Gagal load Neraca: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const Section = ({
    title,
    items,
    total,
    totalLabel,
    color = "bg-slate-50",
  }) => (
    <div className="mb-6">
      <h3 className="font-bold text-slate-700 border-b pb-2 mb-3 uppercase text-sm tracking-wider">
        {title}
      </h3>
      <div className="space-y-2 text-sm">
        {items && items.length > 0 ? (
          items.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between hover:bg-slate-50 p-1 rounded"
            >
              <span className="text-slate-600">{item.name}</span>
              <span className="font-medium">{formatRupiah(item.amount)}</span>
            </div>
          ))
        ) : (
          <p className="text-slate-400 italic text-xs">Tidak ada data</p>
        )}
      </div>
      <div
        className={`flex justify-between mt-4 pt-2 border-t-2 border-slate-200 font-bold ${color} p-2 rounded`}
      >
        <span>{totalLabel}</span>
        <span>{formatRupiah(total)}</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-20 print:p-0 print:max-w-none">
      {/* HEADER CONTROLS (Hide on Print) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Neraca Keuangan</h1>
          <p className="text-slate-500 text-sm">
            Balance Sheet (Statement of Financial Position)
          </p>
        </div>

        <div className="flex gap-2 items-center">
          {/* Filter Branch */}
          {(authState.role === "owner" || authState.role === "finance") && (
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

          {/* Date Picker (Single Date) */}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border p-2 rounded-md text-sm bg-white"
          />

          <Button variant="outline" size="icon" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PAPER */}
      <Card className="shadow-lg border print:shadow-none print:border-none min-h-[800px]">
        <CardContent className="p-8 print:p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-slate-400 w-10 h-10" />
            </div>
          ) : data ? (
            <div>
              {/* Report Header */}
              <div className="text-center mb-8 border-b pb-4">
                <h2 className="text-xl font-bold uppercase tracking-widest text-slate-900">
                  NERACA (BALANCE SHEET)
                </h2>
                <p className="text-slate-500 mt-1 text-sm">
                  Per Tanggal:{" "}
                  {new Date(endDate).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* GRID LAYOUT: Left (Assets) - Right (Liabilities + Equity) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 font-mono text-sm">
                {/* LEFT COLUMN: ASSETS */}
                <div>
                  <Section
                    title="ASET LANCAR (Current Assets)"
                    items={[
                      ...(data.assets.cash_bank || []),
                      ...(data.assets.inventory || []),
                      ...(data.assets.receivable || []),
                    ]}
                    total={0} // Kita hide total per section biar simpel, langsung total aset bawah
                    totalLabel=""
                    color="bg-transparent"
                  />

                  {/* Kita custom dikit buat Fixed Asset biar rapi */}
                  <div className="mb-6">
                    <h3 className="font-bold text-slate-700 border-b pb-2 mb-3 uppercase text-sm tracking-wider">
                      ASET TETAP (Fixed Assets)
                    </h3>
                    <div className="space-y-2 text-sm">
                      {data.assets.fixed_asset.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between hover:bg-slate-50 p-1 rounded"
                        >
                          <span className="text-slate-600">{item.name}</span>
                          <span
                            className={
                              item.amount < 0 ? "text-red-500" : "font-medium"
                            }
                          >
                            {formatRupiah(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* GRAND TOTAL ASSETS */}
                  <div className="mt-10 p-4 bg-slate-900 text-white flex justify-between rounded items-center shadow-md print:bg-white print:text-black print:border-t-2 print:border-black">
                    <span className="font-bold text-lg uppercase">
                      TOTAL ASET
                    </span>
                    <span className="font-bold text-xl">
                      {formatRupiah(data.assets.total)}
                    </span>
                  </div>
                </div>

                {/* RIGHT COLUMN: LIABILITIES & EQUITY */}
                <div className="flex flex-col justify-between">
                  <div>
                    {/* LIABILITIES */}
                    <Section
                      title="KEWAJIBAN (Liabilities)"
                      items={data.liabilities.details}
                      total={data.liabilities.total}
                      totalLabel="Total Kewajiban"
                      color="bg-red-50 text-red-700"
                    />

                    {/* EQUITY */}
                    <Section
                      title="MODAL (Equity)"
                      items={data.equity.details}
                      total={data.equity.total}
                      totalLabel="Total Modal"
                      color="bg-blue-50 text-blue-700"
                    />
                  </div>

                  {/* GRAND TOTAL PASIVA */}
                  <div className="mt-10 p-4 bg-slate-900 text-white flex justify-between rounded items-center shadow-md print:bg-white print:text-black print:border-t-2 print:border-black">
                    <span className="font-bold text-lg uppercase">
                      TOTAL KEWAJIBAN & MODAL
                    </span>
                    <span className="font-bold text-xl">
                      {formatRupiah(data.liabilities.total + data.equity.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* BALANCE CHECK INDICATOR (Hidden on Print) */}
              <div className="mt-8 text-center print:hidden">
                {data.assets.total -
                  (data.liabilities.total + data.equity.total) ===
                0 ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✅ Balance (Selisih Rp 0)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                    ❌ NOT BALANCE (Selisih{" "}
                    {formatRupiah(
                      data.assets.total -
                        (data.liabilities.total + data.equity.total),
                    )}
                    )
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
