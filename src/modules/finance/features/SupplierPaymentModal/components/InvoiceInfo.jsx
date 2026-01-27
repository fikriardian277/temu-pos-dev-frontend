import React from "react";
import { Badge } from "@/components/ui/Badge";
import { FileText, Calendar, Wallet } from "lucide-react";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function InvoiceInfo({ payable, poData }) {
  const data = poData || payable;
  const isAdvance = !!poData; // Cek mode

  if (!data) return null;

  return (
    <div
      className={`p-4 rounded-lg border mb-4 ${
        isAdvance
          ? "bg-purple-50 border-purple-200"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <p
            className={`text-xs font-bold uppercase ${
              isAdvance ? "text-purple-600" : "text-slate-500"
            }`}
          >
            {isAdvance ? "Pembayaran Uang Muka (DP)" : "Pelunasan Tagihan"}
          </p>
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {isAdvance
              ? data.purchase_number
              : data.purchase_orders?.purchase_number || "No Ref"}
          </h3>
          <p className="text-sm text-slate-600">
            {isAdvance ? data.suppliers?.name : data.suppliers?.name}
          </p>
        </div>

        {isAdvance ? (
          <div className="text-right">
            <p className="text-xs text-purple-600 font-bold">Total Nilai PO</p>
            <p className="text-lg font-bold text-purple-800">
              {formatRupiah(data.total_amount)}
            </p>
          </div>
        ) : (
          <div className="text-right">
            <p className="text-xs text-slate-500">Jatuh Tempo</p>
            <div className="flex items-center gap-1 justify-end text-sm font-medium text-red-600">
              <Calendar className="w-3 h-3" />{" "}
              {new Date(data.due_date).toLocaleDateString("id-ID")}
            </div>
          </div>
        )}
      </div>

      {!isAdvance && (
        <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between items-center">
          <span className="text-sm text-slate-600">Sisa Hutang:</span>
          <span className="text-lg font-bold text-slate-900">
            {formatRupiah(data.remaining_amount)}
          </span>
        </div>
      )}

      {isAdvance && data.dp_amount_paid > 0 && (
        <div className="border-t border-purple-200 pt-2 mt-2 flex justify-between items-center text-purple-700">
          <span className="text-sm flex items-center gap-2">
            <Wallet className="w-3 h-3" /> Sudah DP:
          </span>
          <span className="font-bold">{formatRupiah(data.dp_amount_paid)}</span>
        </div>
      )}
    </div>
  );
}
