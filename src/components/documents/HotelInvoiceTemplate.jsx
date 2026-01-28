import React from "react";
import { Building2, Calendar, CreditCard } from "lucide-react";

// Helper Format Tanggal
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (e) {
    return dateStr;
  }
};

// Helper Format Rupiah
const formatCurrency = (val) => {
  return "Rp " + Number(val || 0).toLocaleString("id-ID");
};

export default function HotelInvoiceTemplate({
  invoiceData,
  settings,
  branchInfo,
  generatedBy,
  containerId,
  className,
}) {
  if (!invoiceData) return null;

  const {
    invoice_number,
    created_at,
    due_date,
    period_start,
    period_end,
    grand_total,
    customers,
    hotel_delivery_notes,
  } = invoiceData;

  const company = settings || {};
  const branch = branchInfo || {};

  // --- PERUBAHAN DI SINI ---
  // Kita prioritasin 'company' dulu baru fallback ke text default.
  // 'branch' kita hapus dari logika header biar gak nyampur.
  const headerInfo = {
    // 1. NAMA: Ambil dari PUSAT (Table Businesses)
    name: company.business_name || branch.name || "LAUNDRY NAME",

    // 2. ALAMAT & KONTAK: Ambil dari CABANG (Table Branches)
    // Fallback: Kalau cabang kosong (null), baru ambil dari pusat
    address: branch.address || company.business_address || "Address not set",
    phone: branch.phone_number || company.business_phone || "-",
    email: branch.email || company.email || "-",
    website: branch.website || company.website || "-",
  };

  // LOGIC PEMBAYARAN
  // (Biasanya pembayaran juga ke Rekening Pusat, jadi gw set ke company juga prioritasnya)
  // Kalau lu mau pembayaran tetep ikut cabang, balikin aja urutannya.
  const paymentInfo = {
    bankName: company.bank_name || branch.bank_name || "NOT SET",
    accountNumber:
      company.bank_account_number || branch.bank_account_number || "-",
    accountHolder:
      company.bank_account_holder || branch.bank_account_holder || "-",
  };

  // LOGIC AGGREGASI
  const aggregatedItems = {};
  if (hotel_delivery_notes && Array.isArray(hotel_delivery_notes)) {
    hotel_delivery_notes.forEach((note) => {
      if (
        note.hotel_delivery_items &&
        Array.isArray(note.hotel_delivery_items)
      ) {
        note.hotel_delivery_items.forEach((item) => {
          const pkgName = item.packages?.name || "Unknown Item";
          const pkgUnit = item.packages?.unit || "Pcs";

          // --- UPDATE LOGIC HARGA ---
          let pkgPrice = item.packages?.price || 0;
          if (pkgPrice === 0 && item.qty > 0) {
            pkgPrice = item.total_price / item.qty;
          }

          if (!aggregatedItems[pkgName]) {
            aggregatedItems[pkgName] = {
              name: pkgName,
              unit: pkgUnit,
              price: pkgPrice,
              totalQty: 0,
              totalAmount: 0,
            };
          }
          aggregatedItems[pkgName].totalQty += item.qty || 0;
          aggregatedItems[pkgName].totalAmount += item.total_price || 0;
        });
      }
    });
  }
  const summaryList = Object.values(aggregatedItems);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          #${containerId || "print-area"}, #${containerId || "print-area"} * { visibility: visible; }
          #${containerId || "print-area"} { 
            position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0;
            background-color: white;
          }
          .bg-brand { background-color: #1e40af !important; -webkit-print-color-adjust: exact; }
          .bg-brand-light { background-color: #eff6ff !important; -webkit-print-color-adjust: exact; }
          .text-brand { color: #1e40af !important; -webkit-print-color-adjust: exact; }
          .border-brand { border-color: #1e40af !important; -webkit-print-color-adjust: exact; }
          .text-white-print { color: white !important; -webkit-print-color-adjust: exact; }
          .bg-gray-print { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      <div
        id={containerId || "print-area"}
        className={`hidden print:block font-sans text-xs text-slate-700 leading-relaxed bg-white relative ${className || ""}`}
      >
        {/* ======================= */}
        {/* PAGE 1: INVOICE SUMMARY */}
        {/* ======================= */}
        {/* UPDATE PADDING: px-20 (kiri kanan lega) py-20  (atas bawah lega) */}
        <div className="min-h-[297mm] relative flex flex-col px-20 py-20">
          {/* HEADER */}
          <div className="flex justify-between items-start mb-10 border-b-2 border-brand pb-6">
            <div className="w-1/2">
              {/* 1. NAMA COMPANY: Turunin dari 3xl ke 2xl biar gak overpower */}
              <h1 className="text-2xl font-extrabold uppercase text-brand tracking-tight leading-tight">
                {headerInfo.name}
              </h1>

              {/* --- BAGIAN DETAIL (ALAMAT & KONTAK) --- */}
              {/* Naikkan base size jadi text-xs (12px) biar lebih kebaca & imbang */}
              <div className="mt-4 text-slate-600 text-xs font-medium">
                {/* 1. ALAMAT */}
                {/* max-w dibesarin dikit biar gak terlalu cepat turun baris */}
                <p className="max-w-[340px] leading-relaxed mb-4 text-slate-500">
                  {headerInfo.address}
                </p>

                {/* 2. KONTAK (Grid Layout biar label & titik dua lurus rapi) */}
                <div className="flex flex-col gap-2">
                  {/* PHONE */}
                  <div className="flex items-center">
                    <span className="w-16 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Phone
                    </span>
                    <span className="mr-2 text-slate-400">:</span>
                    <span className="font-mono text-slate-700 font-semibold tracking-wide">
                      {headerInfo.phone}
                    </span>
                  </div>

                  {/* EMAIL */}
                  <div className="flex items-center">
                    <span className="w-16 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Email
                    </span>
                    <span className="mr-2 text-slate-400">:</span>
                    <span className="text-slate-700">{headerInfo.email}</span>
                  </div>

                  {/* WEBSITE */}
                  {headerInfo.website !== "-" && (
                    <div className="flex items-center">
                      <span className="w-16 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        Web
                      </span>
                      <span className="mr-2 text-slate-400">:</span>
                      <span className="text-brand underline decoration-brand/30 underline-offset-2">
                        {headerInfo.website}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block bg-brand text-white-print px-8 py-2 font-bold text-xl uppercase tracking-widest mb-3 rounded-sm shadow-sm">
                INVOICE
              </div>
            </div>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 flex flex-col">
            {/* INFO METADATA */}
            <div className="flex justify-between items-start mb-8 border-b border-slate-200 pb-6">
              <div className="w-1/2 pr-4">
                <h3 className="text-brand font-bold text-[10px] uppercase tracking-wider mb-3">
                  BILL TO
                </h3>
                <div className="text-slate-800">
                  <p className="text-lg font-bold flex items-center gap-2 mb-1">
                    {customers?.name || "Guest"}
                  </p>
                  <p className="text-slate-600 max-w-[280px] leading-relaxed">
                    {customers?.address || "-"}
                  </p>
                </div>
              </div>

              <div className="w-[45%]">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">
                      Invoice No
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {invoice_number}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">
                      Date
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatDate(created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">
                      Due Date
                    </span>
                    <span className="font-bold text-red-600 text-sm">
                      {formatDate(due_date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PERIODE LAYANAN */}
            <div className="bg-brand-light border border-blue-100 rounded-sm p-3 mb-6 flex items-center justify-between text-blue-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Calendar className="w-4 h-4 text-brand" />{" "}
                <span>Billing Period</span>
              </div>
              <div className="font-mono font-medium">
                {formatDate(period_start)}{" "}
                <span className="mx-2 text-blue-300">to</span>{" "}
                {formatDate(period_end)}
              </div>
            </div>

            {/* TABEL REKAP */}
            <div className="mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-brand text-slate-800">
                    <th className="py-3 px-2 text-left w-10 font-bold uppercase text-[10px]">
                      No
                    </th>
                    <th className="py-3 px-2 text-left font-bold uppercase text-[10px]">
                      Service / Description
                    </th>
                    <th className="py-3 px-2 text-center w-24 font-bold uppercase text-[10px]">
                      Qty
                    </th>
                    <th className="py-3 px-2 text-right w-32 font-bold uppercase text-[10px]">
                      Unit Price
                    </th>
                    <th className="py-3 px-2 text-right w-32 font-bold uppercase text-[10px]">
                      Amount (IDR)
                    </th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {summaryList.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-3 px-2 text-center">{idx + 1}</td>
                      <td className="py-3 px-2 font-bold text-slate-800">
                        {item.name}
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-slate-900">
                        {item.totalQty.toLocaleString("id-ID")}{" "}
                        <span className="text-[9px] text-slate-400 font-sans font-normal">
                          {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.totalAmount)}
                      </td>
                    </tr>
                  ))}

                  {/* GRAND TOTAL */}
                  <tr className="bg-brand-light border-t-2 border-brand">
                    <td colSpan={3}></td>
                    <td className="py-4 px-2 text-right font-bold text-brand text-sm uppercase align-middle">
                      GRAND TOTAL
                    </td>
                    <td className="py-4 px-2 text-right font-bold text-2xl text-brand font-mono whitespace-nowrap align-middle">
                      {formatCurrency(grand_total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FOOTER - STICKY BOTTOM */}
            <div className="mt-auto pt-8">
              <div className="flex justify-between items-end gap-16">
                {/* BANK INFO */}
                <div className="w-[55%] bg-gray-print p-5 rounded border border-slate-200">
                  <div className="flex items-center gap-2 mb-3 text-brand font-bold uppercase text-[11px]">
                    <CreditCard className="w-4 h-4" /> Payment Details
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank Name</span>
                      <span className="font-bold text-slate-900">
                        {paymentInfo.bankName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account No.</span>
                      <span className="font-mono font-bold text-slate-900 text-sm tracking-wide">
                        {paymentInfo.accountNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account Name</span>
                      <span className="font-medium text-slate-900 uppercase">
                        {paymentInfo.accountHolder}
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 pt-3 border-t border-slate-300 text-[9px] italic text-slate-500">
                    * Please include Invoice No. in transfer reference.
                  </p>
                </div>

                {/* SIGNATURE */}
                <div className="w-[45%] flex flex-col items-end pb-2">
                  <div className="w-48 text-center">
                    <p className="text-xs font-bold text-slate-900 uppercase mb-2 px-1">
                      {generatedBy || "Admin"}
                    </p>
                    <div className="border-b-2 border-slate-800 w-full mb-2"></div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">
                      Admin & Finance
                    </p>
                  </div>
                </div>
              </div>

              {/* DISCLAIMER */}
              <div className="mt-10 pt-4 border-t border-slate-200 text-center">
                <p className="text-[9px] text-slate-400">
                  This document is generated automatically. Details are
                  available in the attachment.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ======================= */}
        {/* PAGE 2: ATTACHMENT      */}
        {/* ======================= */}
        <div className="page-break px-16 py-16 min-h-[297mm]">
          <div className="flex justify-between items-end border-b-2 border-brand pb-4 mb-8">
            <div>
              <h2 className="text-xl font-bold text-brand uppercase">
                Attachment Details
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Delivery Note Breakdown
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold">Ref Invoice: {invoice_number}</p>
              <p className="text-slate-500">Page 2</p>
            </div>
          </div>

          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-300">
                <th className="py-2 px-2 text-center w-10 border-r border-slate-200">
                  No
                </th>
                <th className="py-2 px-2 text-left w-24 border-r border-slate-200">
                  Date
                </th>
                <th className="py-2 px-2 text-left w-32 border-r border-slate-200">
                  Delivery Note No.
                </th>
                <th className="py-2 px-2 text-left">Items Detail</th>
                <th className="py-2 px-2 text-right w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hotel_delivery_notes?.map((note, idx) => {
                const itemSummary = note.hotel_delivery_items
                  ?.map((i) => `${i.qty}x ${i.packages?.name}`)
                  .join(", ");

                const noteTotal = note.hotel_delivery_items?.reduce(
                  (sum, i) => sum + i.total_price,
                  0,
                );

                return (
                  <tr key={note.id || idx} className="hover:bg-slate-50">
                    <td className="py-2 px-2 text-center border-r border-slate-100 text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2 font-medium text-slate-700 border-r border-slate-100">
                      {new Date(note.pickup_date).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>
                    <td className="py-2 px-2 font-mono text-slate-600 border-r border-slate-100">
                      {note.invoice_code || `SJ-${note.id}`}
                    </td>
                    <td className="py-2 px-2 text-slate-600">{itemSummary}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-slate-800">
                      {formatCurrency(noteTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
