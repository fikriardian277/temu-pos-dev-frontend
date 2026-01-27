import React from "react";

// Helper Format Tanggal
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Helper Format Rupiah
const formatCurrency = (val) => {
  return "Rp " + Number(val || 0).toLocaleString("id-ID");
};

export default function PurchaseOrderTemplate({ data, items, settings }) {
  if (!data) return null;

  const supplier = data.suppliers || data.supplier || {};
  const warehouse = data.warehouses || data.warehouse || {};
  const company = settings || {};

  // --- LOGIC FIX HARGA (Biar gak 0) ---
  const getPrice = (item) => {
    // Cek purchase_price, kalau gak ada cek cost_price (database lu kayaknya cost_price)
    return item.purchase_price || item.cost_price || 0;
  };

  const getTotal = (item) => {
    // Cek total_price, kalau gak ada cek subtotal, kalau gak ada hitung manual
    if (item.total_price) return item.total_price;
    if (item.subtotal) return item.subtotal;
    return getPrice(item) * item.quantity;
  };

  // Hitung Ulang Grand Total
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + getTotal(item), 0);
  };

  const subTotal = calculateTotal();
  const grandTotal = data.total_amount || subTotal;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          
          /* Color Palette - Royal Blue Theme */
          .bg-brand { background-color: #1e40af !important; -webkit-print-color-adjust: exact; } /* Blue 800 */
          .bg-brand-light { background-color: #eff6ff !important; -webkit-print-color-adjust: exact; } /* Blue 50 */
          .text-brand { color: #1e40af !important; -webkit-print-color-adjust: exact; }
          .border-brand { border-color: #1e40af !important; -webkit-print-color-adjust: exact; }
          .text-white-print { color: white !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div
        id="print-area"
        className="hidden print:block font-sans text-xs text-slate-700 leading-relaxed"
      >
        {/* --- 1. MODERN HEADER --- */}
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
              Purchase Order
            </div>
            <div className="grid grid-cols-[auto_auto] gap-x-3 text-[11px] justify-end">
              <span className="font-bold text-slate-500">PO Number:</span>
              <span className="font-bold text-slate-900">
                {data.purchase_number}
              </span>

              <span className="font-bold text-slate-500">Date:</span>
              <span className="font-bold text-slate-900">
                {formatDate(data.created_at)}
              </span>

              {data.expected_date && (
                <>
                  <span className="font-bold text-slate-500">Delivery:</span>
                  <span className="font-bold text-slate-900">
                    {formatDate(data.expected_date)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* --- 2. INFORMATION CARDS --- */}
        <div className="flex gap-6 mb-8">
          {/* VENDOR */}
          <div className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-sm">
            <h3 className="text-brand font-bold uppercase text-[10px] tracking-wider mb-2 border-b border-slate-300 pb-1">
              Vendor / Supplier
            </h3>
            <p className="font-bold text-sm text-slate-900">{supplier.name}</p>
            <p className="whitespace-pre-line mb-2">{supplier.address}</p>
            <div className="text-[10px] text-slate-500">
              <p>PIC: {supplier.contact_person || "-"}</p>
              <p>Phone: {supplier.phone || "-"}</p>
            </div>
          </div>

          {/* SHIP TO */}
          <div className="flex-1 bg-brand-light border border-blue-100 p-4 rounded-sm">
            <h3 className="text-brand font-bold uppercase text-[10px] tracking-wider mb-2 border-b border-blue-200 pb-1">
              Ship To (Delivery)
            </h3>
            <p className="font-bold text-sm text-slate-900">{warehouse.name}</p>
            <p className="whitespace-pre-line mb-2">{warehouse.address}</p>
            <div className="text-[10px] text-slate-500">
              <p>Phone: {warehouse.phone || "-"}</p>
            </div>
          </div>
        </div>

        {/* --- 3. TABEL ITEM --- */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-brand text-white-print">
                <th className="py-2 px-3 text-left w-10 border border-brand">
                  No
                </th>
                <th className="py-2 px-3 text-left border border-brand">
                  Description / SKU
                </th>
                <th className="py-2 px-3 text-center w-20 border border-brand">
                  Qty
                </th>
                <th className="py-2 px-3 text-right w-32 border border-brand">
                  Unit Price
                </th>
                <th className="py-2 px-3 text-right w-32 border border-brand">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="py-2 px-3 text-center border-x border-slate-200">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 border-x border-slate-200">
                    <p className="font-bold text-slate-800">
                      {item.products?.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {item.products?.sku || "-"}
                    </p>
                  </td>
                  <td className="py-2 px-3 text-center border-x border-slate-200">
                    <span className="font-semibold">{item.quantity}</span>
                    <span className="text-[10px] ml-1 text-slate-500">
                      {item.products?.purchase_unit || item.products?.unit}
                    </span>
                  </td>

                  {/* FIX: Pakai fungsi getPrice & getTotal */}
                  <td className="py-2 px-3 text-right border-x border-slate-200">
                    {formatCurrency(getPrice(item))}
                  </td>
                  <td className="py-2 px-3 text-right font-medium border-x border-slate-200">
                    {formatCurrency(getTotal(item))}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-slate-300">
                <td colSpan={5}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* --- 4. FOOTER & TOTALS --- */}
        <div className="flex gap-8 items-start">
          <div className="flex-1">
            <div className="mb-4">
              <h4 className="font-bold text-brand uppercase text-[10px] mb-1">
                Notes / Instructions:
              </h4>
              <div className="bg-slate-50 p-3 rounded border border-slate-200 italic text-slate-600 min-h-[60px]">
                {data.notes || "No specific instructions provided."}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 space-y-1">
              <p>
                Terms of Payment:{" "}
                <span className="font-bold text-slate-800">
                  {supplier.term_of_payment || "Cash"}
                </span>
              </p>
              <p>
                Currency:{" "}
                <span className="font-bold text-slate-800">IDR (Rupiah)</span>
              </p>
            </div>
          </div>

          <div className="w-1/3">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium">{formatCurrency(subTotal)}</span>
            </div>
            {data.discount_amount > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200 text-red-600">
                <span>Discount</span>
                <span>- {formatCurrency(data.discount_amount)}</span>
              </div>
            )}
            {/* Grand Total */}
            <div className="flex justify-between py-2 mt-2 bg-brand text-white-print px-3 rounded-sm items-center">
              <span className="font-bold uppercase text-[11px]">
                Grand Total
              </span>
              <span className="font-extrabold text-sm">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* --- 5. FOOTER DISCLAIMER --- */}
        <div className="fixed bottom-0 left-0 w-full px-8 pb-6 print:block hidden">
          <div className="border-t-2 border-slate-200 pt-3 flex justify-between items-end">
            <div className="text-[9px] text-slate-400 italic">
              <p>
                This document is computer generated and valid without signature.
              </p>
              <p>
                {company.business_name} - {company.business_phone}
              </p>
            </div>
            <div className="text-[9px] text-slate-400">Page 1 of 1</div>
          </div>
        </div>
      </div>
    </>
  );
}
