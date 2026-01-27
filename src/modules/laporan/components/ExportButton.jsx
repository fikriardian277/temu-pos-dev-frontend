import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

export default function ExportButton({
  data,
  filename = "laporan.csv",
  headers,
}) {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (!data || data.length === 0) {
      return toast.error("Tidak ada data untuk diexport.");
    }

    setLoading(true);
    try {
      // 1. Tentukan Separator (Pake Titik Koma ';' biar aman di Excel Indo)
      const SEPARATOR = ";";

      // 2. Buat Header CSV
      const csvHeaders = headers.map((h) => h.label).join(SEPARATOR);

      // 3. Mapping Data ke Baris CSV
      const csvRows = data.map((row) => {
        return headers
          .map((header) => {
            let val = row[header.key];

            // Handle value null/undefined jadi string kosong
            if (val === null || val === undefined) {
              val = "";
            }

            // Konversi ke string
            const stringVal = String(val);

            // Bersihkan data:
            // - Ganti spasi/enter (new line) jadi spasi biasa biar baris gak ancur
            // - Escape tanda kutip dua (") jadi double ("")
            const cleanVal = stringVal
              .replace(/(\r\n|\n|\r)/gm, " ")
              .replace(/"/g, '""');

            // Bungkus pake tanda kutip biar aman kalau ada karakter aneh
            return `"${cleanVal}"`;
          })
          .join(SEPARATOR);
      });

      // 4. Gabungin Semua (Pakai BOM \ufeff biar karakter unik/emoji kebaca bener)
      const csvContent = "\ufeff" + [csvHeaders, ...csvRows].join("\n");

      // 5. Download Trigger
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Download CSV berhasil!");
    } catch (e) {
      console.error(e);
      toast.error("Gagal export CSV.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      Export CSV
    </Button>
  );
}
