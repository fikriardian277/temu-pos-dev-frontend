import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // 👈 WAJIB IMPORT INI BUAT PINDAH HALAMAN
import Struk from "@/components/struk/Struk";
import { Button } from "@/components/ui/Button"; // 👈 IMPORT BUTTON
import { AlertTriangle, Home } from "lucide-react"; // 👈 ICON BIAR CAKEP

function PrintPage() {
  const navigate = useNavigate(); // Inisialisasi navigasi
  const [transaksi, setTransaksi] = useState(null);
  const [pengaturan, setPengaturan] = useState(null);
  const [isDataNotFound, setIsDataNotFound] = useState(false); // 👈 STATE BARU BUAT DETEKSI ERROR

  useEffect(() => {
    // 1. Ambil data dari sessionStorage
    const dataStruk = sessionStorage.getItem("dataStrukToPrint");

    if (dataStruk) {
      try {
        const parsed = JSON.parse(dataStruk);
        // Support format lama & baru
        const txData = parsed.detailTransaksiSukses || parsed.transaksi;
        const setD = parsed.authStatePengaturan || parsed.pengaturan;

        // Kalau ternyata isinya kosong pas di-parse
        if (!txData) {
          setIsDataNotFound(true);
          return;
        }

        setTransaksi(txData);
        setPengaturan(setD);

        // 2. Auto Print setelah render sekejap
        const timer = setTimeout(() => {
          window.print();
        }, 500);

        return () => clearTimeout(timer);
      } catch (e) {
        console.error("Gagal parse data struk:", e);
        setIsDataNotFound(true); // 👈 TAMPILIN LAYAR ERROR, BUKAN ALERT
      }
    } else {
      setIsDataNotFound(true); // 👈 TAMPILIN LAYAR ERROR, BUKAN ALERT
    }
  }, []);

  // ==============================================================
  // 🚪 PINTU DARURAT (MUNCUL KALAU DATA HANGUS / APLIKASI DI-CLOSE)
  // ==============================================================
  if (isDataNotFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Sesi Struk Berakhir
        </h2>
        <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">
          Data cetak struk sudah tidak tersedia karena halaman telah ditutup
          atau direfresh.
        </p>
        <Button
          onClick={() => navigate("/kasir", { replace: true })}
          className="bg-blue-600 hover:bg-blue-700 w-full max-w-xs h-12 text-base font-medium shadow-md"
        >
          <Home className="mr-2 h-5 w-5" />
          Kembali ke Kasir
        </Button>
      </div>
    );
  }

  // Loading screen (sebelum auto-print jalan)
  if (!transaksi) return <p className="p-4 text-center">Memuat struk...</p>;

  // ==============================================================
  // 🖨️ RENDER STRUK NORMAL
  // ==============================================================
  return (
    <>
      {/* INJEKSI CSS KHUSUS STRUK (58mm) 
        Ini akan menimpa/melengkapi aturan global saat halaman ini dibuka.
      */}
      <style>{`
        @media print {
          @page { 
            size: 58mm auto; /* Lebar Thermal 58mm */
            margin: 0mm;     /* Nol margin wajib buat thermal */
          }
          body {
            margin: 0;
            padding: 0;
            background-color: white;
          }
          
          /* Pastikan elemen print terlihat */
          .print-content {
            display: block !important;
            visibility: visible !important;
            width: 100%;
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>

      {/* CONTAINER UTAMA 
        Wajib pakai class "print-content" biar gak di-hidden sama index.css 
      */}
      <div className="print-content">
        <Struk transaksi={transaksi} pengaturan={pengaturan} />
      </div>
    </>
  );
}

export default PrintPage;
