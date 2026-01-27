// src/components/documents/DeliveryNoteTemplate.jsx
import React from "react";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function DeliveryNoteTemplate({ data, items, settings }) {
  if (!data) return null;

  const isRequest = data.status === "requested";
  const docTitle = isRequest ? "MATERIAL REQUEST" : "DELIVERY NOTE";
  const company = settings || {};

  // Handle Source & Target
  // Kalau isRequest (Minta Barang), Source = "Pending Assignment (HO)" atau Gudang Pusat
  const sourceName = data.source?.name || "Gudang Pusat (HO)";
  const sourceAddress = data.source?.address || "-";

  const targetName = data.target?.name || "Unknown";
  const targetAddress = data.target?.address || "-";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          
          /* Royal Blue Theme (Sama kayak PO) */
          .bg-brand { background-color: #1e40af !important; -webkit-print-color-adjust: exact; }
          .bg-brand-light { background-color: #eff6ff !important; -webkit-print-color-adjust: exact; }
          .text-brand { color: #1e40af !important; -webkit-print-color-adjust: exact; }
          .border-brand { border-color: #1e40af !important; -webkit-print-color-adjust: exact; }
          .text-white-print { color: white !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div
        id="print-area"
        className="hidden print:block font-sans text-xs text-slate-700 leading-relaxed"
      >
        {/* --- 1. HEADER (Modern Split) --- */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-brand pb-6">
          <div className="w-1/2">
            <h1 className="text-2xl font-extrabold uppercase text-brand tracking-tight">
              {company.business_name || "NAMA PERUSAHAAN"}
            </h1>
            <div className="mt-2 text-slate-500 text-[11px] space-y-1">
              <p className="max-w-[300px]">{company.business_address}</p>
              <p>
                <span className="font-semibold">P:</span>{" "}
                {company.business_phone || "-"} &nbsp;|&nbsp;
                <span className="font-semibold">E:</span>{" "}
                {company.business_email || "-"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block bg-brand text-white-print px-4 py-2 font-bold text-xl uppercase tracking-widest mb-2 rounded-sm">
              {docTitle}
            </div>
            <div className="grid grid-cols-[auto_auto] gap-x-3 text-[11px] justify-end">
              <span className="font-bold text-slate-500">Ref No:</span>
              <span className="font-bold text-slate-900">
                #{data.transfer_number}
              </span>

              <span className="font-bold text-slate-500">Date:</span>
              <span className="font-bold text-slate-900">
                {formatDate(data.sent_at || data.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* --- 2. INFO CARDS (FROM & TO) --- */}
        <div className="flex gap-6 mb-8">
          {/* BOX 1: FROM (SOURCE) */}
          <div className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-sm">
            <h3 className="text-brand font-bold uppercase text-[10px] tracking-wider mb-2 border-b border-slate-300 pb-1">
              {isRequest ? "Requested From (Source)" : "Shipped From (Origin)"}
            </h3>
            <p className="font-bold text-sm text-slate-900">{sourceName}</p>
            <p className="whitespace-pre-line mb-2">{sourceAddress}</p>
          </div>

          {/* BOX 2: TO (DESTINATION) */}
          <div className="flex-1 bg-brand-light border border-blue-100 p-4 rounded-sm">
            <h3 className="text-brand font-bold uppercase text-[10px] tracking-wider mb-2 border-b border-blue-200 pb-1">
              {isRequest ? "Request By (Branch)" : "Ship To (Destination)"}
            </h3>
            <p className="font-bold text-sm text-slate-900">{targetName}</p>
            <p className="whitespace-pre-line mb-2">{targetAddress}</p>
          </div>
        </div>

        {/* --- 3. TABEL ITEM (Blue Header) --- */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-brand text-white-print">
                <th className="py-2 px-3 text-left w-10 border border-brand">
                  No
                </th>
                <th className="py-2 px-3 text-left border border-brand">
                  Item Name
                </th>
                <th className="py-2 px-3 text-left border border-brand">
                  SKU Code
                </th>
                <th className="py-2 px-3 text-center w-24 border border-brand">
                  Quantity
                </th>
                <th className="py-2 px-3 text-center w-20 border border-brand">
                  Unit
                </th>
                <th className="py-2 px-3 text-center w-24 border border-brand">
                  Check
                </th>
              </tr>
            </thead>
            <tbody>
              {items && items.length > 0 ? (
                items.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className="border-b border-slate-200"
                  >
                    <td className="py-2 px-3 text-center border-x border-slate-200">
                      {index + 1}
                    </td>
                    <td className="py-2 px-3 border-x border-slate-200 font-bold text-slate-800">
                      {item.products?.name}
                    </td>
                    <td className="py-2 px-3 border-x border-slate-200 font-mono text-[10px]">
                      {item.products?.sku || "-"}
                    </td>
                    <td className="py-2 px-3 text-center border-x border-slate-200 font-bold text-sm">
                      {item.quantity}
                    </td>
                    <td className="py-2 px-3 text-center border-x border-slate-200 text-[10px] lowercase">
                      {item.products?.unit}
                    </td>
                    <td className="py-2 px-3 border-x border-slate-200">
                      {/* Kotak Checklist Kosong buat pengecekan fisik */}
                      <div className="w-4 h-4 border border-slate-400 mx-auto rounded-sm"></div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-slate-400 italic border border-slate-200"
                  >
                    No items listed.
                  </td>
                </tr>
              )}
              {/* Garis Penutup */}
              <tr className="border-t border-slate-300">
                <td colSpan={6}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* --- 4. NOTES & SIGNATURE --- */}
        <div className="mt-auto break-inside-avoid">
          {/* Note Box */}
          <div className="mb-8">
            <h4 className="font-bold text-brand uppercase text-[10px] mb-1">
              Notes / Instructions:
            </h4>
            <div className="bg-slate-50 p-3 rounded border border-slate-200 italic text-slate-600 min-h-[40px]">
              {data.notes || "Handle with care. Check items upon receipt."}
            </div>
          </div>

          {/* Tanda Tangan 3 Kolom */}
          <div className="grid grid-cols-3 gap-8 text-center text-[10px] pt-4">
            <div>
              <p className="mb-12 font-bold text-slate-700 uppercase tracking-wide">
                {isRequest ? "Requested By" : "Authorized By"}
              </p>
              <div className="border-t border-slate-400 w-3/4 mx-auto"></div>
              <p className="text-slate-500 mt-1 italic">
                {isRequest ? "Branch Manager" : "Warehouse Manager"}
              </p>
            </div>
            <div>
              <p className="mb-12 font-bold text-slate-700 uppercase tracking-wide">
                Delivery / Logistics
              </p>
              <div className="border-t border-slate-400 w-3/4 mx-auto"></div>
              <p className="text-slate-500 mt-1 italic">Driver / Carrier</p>
            </div>
            <div>
              <p className="mb-12 font-bold text-slate-700 uppercase tracking-wide">
                Received By
              </p>
              <div className="border-t border-slate-400 w-3/4 mx-auto"></div>
              <p className="text-slate-500 mt-1 italic">Receiver Name & Sign</p>
            </div>
          </div>

          {/* Footer Computer Generated */}
          <div className="text-center text-[9px] text-slate-400 mt-8 border-t border-slate-100 pt-2 italic">
            <p>
              This document is computer generated and valid without signature.
            </p>
            <p>Printed on: {new Date().toLocaleString("id-ID")}</p>
          </div>
        </div>
      </div>
    </>
  );
}
