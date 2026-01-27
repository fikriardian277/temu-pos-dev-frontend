import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FileText, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/supabaseClient";
import { toast } from "sonner";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function BankColumn({
  mutations,
  selectedId,
  onSelect,
  businessId,
  userId,
  onUploadSuccess,
}) {
  // LOGIC IMPORT ASLI (BCA/MANDIRI)
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = null;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 5)
          return toast.error("File tidak valid atau kosong.");

        const mutationsToInsert = [];
        let processedCount = 0;

        for (let i = 0; i < rows.length; i++) {
          const rowArray = rows[i];
          if (!rowArray || rowArray.length === 0) continue;

          // Parsing Logic BCA/Mandiri (Sama persis kayak kode lama lu)
          const rawLine = rowArray[0];
          if (typeof rawLine !== "string") continue;

          // Cek pola tanggal
          if (
            !/^\d{2}\/\d{2}\/\d{4}/.test(rawLine) &&
            !/^\d{2}\/\d{2}/.test(rawLine)
          )
            continue;

          // Split kolom CSV manual
          const columns = rawLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (!columns || columns.length < 4) continue;

          // Tanggal
          const rawDate = columns[0].replace(/,/g, "").trim();
          const dateParts = rawDate.split("/");
          let isoDate = "";
          if (dateParts.length === 3)
            isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // DD/MM/YYYY
          else if (dateParts.length === 2) {
            const year = new Date().getFullYear();
            isoDate = `${year}-${dateParts[1]}-${dateParts[0]}`;
          }

          // Deskripsi
          const description = columns[1].replace(/^"|"$/g, "").trim();

          // Nominal & Tipe (CR/DB)
          let rawAmount = columns[3].replace(/^"|"$/g, "").trim();

          // Filter hanya Credit (Uang Masuk)
          if (!rawAmount.includes("CR") && !rawAmount.includes("DB")) {
            if (columns[4] && columns[4].includes("CR")) rawAmount = columns[4];
          }

          if (rawAmount.includes("DB")) continue; // Skip Debit

          const amount = parseFloat(
            rawAmount.replace("CR", "").replace(/,/g, "").trim()
          );

          if (amount > 0) {
            mutationsToInsert.push({
              business_id: businessId,
              transaction_date: isoDate,
              description: description,
              amount: amount,
              type: "CR",
              status: "unmatched",
              imported_by: userId,
            });
            processedCount++;
          }
        }

        if (processedCount === 0)
          return toast.warning("Tidak ditemukan mutasi masuk (CR).");

        // INSERT KE DATABASE
        const { error } = await supabase
          .schema("finance")
          .from("bank_mutations")
          .upsert(mutationsToInsert, {
            onConflict:
              "business_id, transaction_date, description, amount, type",
            ignoreDuplicates: true,
          });

        if (error) throw error;

        toast.success(`${processedCount} mutasi berhasil diimpor.`);

        // REFRESH DATA PARENT
        if (onUploadSuccess) onUploadSuccess();
      } catch (err) {
        console.error(err);
        toast.error("Gagal proses file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Card className="border-l-4 border-l-blue-500 h-[650px] flex flex-col shadow-md">
      <CardHeader className="bg-slate-50 pb-3 border-b py-3 flex flex-row justify-between items-center">
        <CardTitle className="text-blue-700 flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" /> Mutasi Bank (CR)
        </CardTitle>
        <div className="relative">
          <Input
            type="file"
            accept=".csv, .xlsx, .xls"
            className="hidden"
            id="bank-upload"
            onChange={handleFileUpload}
          />
          <label htmlFor="bank-upload">
            <div className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded flex items-center gap-2 transition-colors shadow-sm">
              <Upload className="h-3 w-3" /> Import
            </div>
          </label>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto bg-slate-100/50">
        <div className="divide-y divide-slate-200">
          {mutations.map((m) => (
            <div
              key={m.id}
              onClick={() => onSelect(m)}
              className={`p-3 cursor-pointer transition-all hover:bg-blue-50 bg-white ${
                selectedId === m.id
                  ? "ring-2 ring-inset ring-blue-500 bg-blue-50"
                  : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-600">
                  {new Date(m.transaction_date).toLocaleDateString("id-ID")}
                </span>
                <span className="font-bold text-blue-700">
                  {formatRupiah(m.amount)}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                {m.description}
              </p>
            </div>
          ))}
          {mutations.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              Tidak ada mutasi unmatched.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
