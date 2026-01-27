import React, { useEffect, useState } from "react";
import Struk from "@/components/struk/Struk"; // Pastikan path import Struk benar

function PrintPage() {
  const [transaksi, setTransaksi] = useState(null);
  const [pengaturan, setPengaturan] = useState(null);

  useEffect(() => {
    // 1. Ambil data dari sessionStorage
    const dataStruk = sessionStorage.getItem("dataStrukToPrint");

    if (dataStruk) {
      try {
        const parsed = JSON.parse(dataStruk);
        // Support format lama & baru
        const txData = parsed.detailTransaksiSukses || parsed.transaksi;
        const setD = parsed.authStatePengaturan || parsed.pengaturan;

        setTransaksi(txData);
        setPengaturan(setD);

        // 2. Auto Print setelah render sekejap
        const timer = setTimeout(() => {
          window.print();
        }, 500);

        return () => clearTimeout(timer);
      } catch (e) {
        console.error("Gagal parse data struk:", e);
        alert("Gagal memuat data struk.");
      }
    } else {
      alert("Data struk tidak ditemukan.");
    }
  }, []);

  if (!transaksi) return <p className="p-4 text-center">Memuat struk...</p>;

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
