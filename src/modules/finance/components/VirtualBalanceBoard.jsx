import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Loader2, ArrowRightLeft, Building2 } from "lucide-react";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function VirtualBalanceBoard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch dari View SQL yang baru kita buat
      const { data: res, error } = await supabase
        .schema("finance")
        .from("view_branch_virtual_balances")
        .select("*");

      if (error) console.error(error);
      setData(res || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );

  return (
    <Card className="shadow-none border-0">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
          <Building2 className="h-5 w-5" />
          Posisi Keuangan Antar-Cabang (Intercompany)
        </CardTitle>
        <p className="text-sm text-slate-500">
          Laporan ini menunjukkan hak milik uang (Equity) setiap cabang
          berdasarkan arus kas dan mutasi barang.
        </p>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold">
              <tr>
                <th className="p-4">Cabang / Entitas</th>
                <th className="p-4 text-right text-emerald-700">
                  Real Cash (Bank)
                </th>
                <th className="p-4 text-right text-orange-700">
                  Mutasi Barang
                </th>
                <th className="p-4 text-right font-extrabold text-blue-800 bg-blue-50/50">
                  Saldo Virtual
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {data.map((row) => (
                <tr
                  key={row.branch_id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="p-4 font-medium text-slate-800">
                    {row.branch_name}
                  </td>

                  {/* Kolom 1: Uang Real */}
                  <td className="p-4 text-right">
                    <div className="font-mono font-semibold">
                      {formatRupiah(row.real_cash_balance)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      In:{" "}
                      <span className="text-emerald-600">
                        {formatRupiah(row.cash_in)}
                      </span>{" "}
                      <br />
                      Out:{" "}
                      <span className="text-red-500">
                        {formatRupiah(row.cash_out)}
                      </span>
                    </div>
                  </td>

                  {/* Kolom 2: Mutasi Barang (Internal Debt) */}
                  <td className="p-4 text-right">
                    <div
                      className={`font-mono font-semibold ${
                        row.internal_goods_debt < 0
                          ? "text-red-500"
                          : "text-emerald-600"
                      }`}
                    >
                      {formatRupiah(row.internal_goods_debt)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Kirim: {formatRupiah(row.goods_sent)} <br />
                      Terima: {formatRupiah(row.goods_received)}
                    </div>
                  </td>

                  {/* Kolom 3: Saldo Akhir (Equity) */}
                  <td className="p-4 text-right bg-blue-50/30">
                    <div className="font-bold font-mono text-lg text-blue-700">
                      {formatRupiah(row.virtual_equity)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
