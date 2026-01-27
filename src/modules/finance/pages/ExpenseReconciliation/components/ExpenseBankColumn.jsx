import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ArrowRightLeft, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/supabaseClient";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function ExpenseBankColumn({
  mutations,
  selectedId,
  onSelect,
  businessId,
  userId,
  onUploadSuccess,
  defaultBranchId, // Ini ID Cabang otomatis dari Bank yang dipilih
}) {
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

          // 1. Validasi Baris String
          const rawLine = rowArray[0];
          if (typeof rawLine !== "string") continue;

          // 2. Cek Format Tanggal (Simple Check)
          if (
            !/^\d{2}\/\d{2}\/\d{4}/.test(rawLine) &&
            !/^\d{2}\/\d{2}/.test(rawLine)
          )
            continue;

          // 3. Split Kolom (Regex CSV)
          const columns = rawLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (!columns || columns.length < 4) continue;

          // 4. Parsing Tanggal
          const rawDate = columns[0].replace(/,/g, "").trim();
          const dateParts = rawDate.split("/");
          let isoDate = "";
          if (dateParts.length === 3)
            isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
          else if (dateParts.length === 2) {
            const year = new Date().getFullYear();
            isoDate = `${year}-${dateParts[1]}-${dateParts[0]}`;
          }

          // 5. Deskripsi
          const description = columns[1].replace(/^"|"$/g, "").trim();

          // 6. Nominal & Tipe (Mencari DB)
          let rawAmount = columns[3].replace(/^"|"$/g, "").trim();

          // Cek kolom sebelah jika format bergeser
          if (!rawAmount.includes("CR") && !rawAmount.includes("DB")) {
            if (
              columns[4] &&
              (columns[4].includes("CR") || columns[4].includes("DB"))
            )
              rawAmount = columns[4];
          }

          // FILTER KHUSUS: SKIP JIKA BUKAN DEBIT (DB)
          if (rawAmount.includes("CR")) continue;

          // Bersihkan angka
          const amount = parseFloat(
            rawAmount.replace("DB", "").replace(/,/g, "").trim()
          );

          if (amount > 0) {
            mutationsToInsert.push({
              business_id: businessId,
              branch_id: defaultBranchId || null,
              transaction_date: isoDate,
              description: description,
              amount: -amount, // Simpan sebagai negatif (karena uang keluar)
              type: "DB", // Tipe Debit
              status: "unmatched",
              imported_by: userId,
            });
            processedCount++;
          }
        }

        if (processedCount === 0)
          return toast.warning(
            "Tidak ditemukan mutasi keluar (DB) di file ini."
          );

        // Insert ke Supabase
        const { error } = await supabase
          .schema("finance")
          .from("bank_mutations")
          .upsert(mutationsToInsert, {
            onConflict:
              "business_id, transaction_date, description, amount, type",
            ignoreDuplicates: true,
          });

        if (error) throw error;

        toast.success(`${processedCount} mutasi pengeluaran berhasil diimpor.`);
        if (onUploadSuccess) onUploadSuccess();
      } catch (err) {
        console.error(err);
        toast.error("Gagal proses file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Card className="border-l-4 border-l-red-500 h-[650px] flex flex-col shadow-md">
      <CardHeader className="bg-slate-50 pb-3 border-b py-3 flex flex-row justify-between items-center">
        <CardTitle className="text-red-700 flex items-center gap-2 text-base">
          <ArrowRightLeft className="h-4 w-4" /> Mutasi Keluar (DB)
        </CardTitle>

        {/* Tombol Upload (Tanpa Dropdown) */}
        <div className="relative">
          <Input
            type="file"
            accept=".csv, .xlsx, .xls"
            className="hidden"
            id="expense-upload"
            onChange={handleFileUpload}
          />
          <label htmlFor="expense-upload">
            <div className="cursor-pointer bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded flex items-center gap-2 transition-colors shadow-sm">
              <Upload className="h-3 w-3" /> Import DB
            </div>
          </label>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-y-auto bg-slate-100/50">
        <div className="divide-y divide-slate-200">
          {mutations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm italic">
              Tidak ada mutasi keluar (DB) yang pending.
            </div>
          ) : (
            mutations.map((m) => (
              <div
                key={m.id}
                onClick={() => onSelect(m)}
                className={`p-3 cursor-pointer transition-all hover:bg-white bg-white/50 ${
                  selectedId === m.id
                    ? "ring-2 ring-inset ring-red-500 bg-red-50"
                    : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] bg-slate-200 px-1 rounded text-slate-600">
                    {new Date(m.transaction_date).toLocaleDateString("id-ID")}
                  </span>
                  <span className="font-bold text-red-700">
                    {formatRupiah(Math.abs(m.amount))}
                  </span>
                </div>
                <div className="mt-1">
                  <p
                    className="text-xs text-slate-700 font-medium line-clamp-2"
                    title={m.description}
                  >
                    {m.description}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {m.status === "matched" && (
                      <Badge className="bg-green-600 text-[9px] h-4 px-1">
                        MATCHED
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
