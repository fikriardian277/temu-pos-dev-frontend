// src/components/struk/PrintStrukButton.jsx (VERSI JS INLINE + PORTAL)

import React from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/Button.jsx";
import { Printer } from "lucide-react";
import { toast } from "sonner";

function PrintStrukButton({ componentRef, disabled }) {
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "struk-transaksi",
    removeAfterPrint: false,

    // HAPUS pageStyle
    // HAPUS bodyClass

    onBeforeGetContent: () => {
      return new Promise((resolve) => {
        // 1. Ambil #root (Aplikasi React lu)
        const rootEl = document.getElementById("root");

        // 2. Ambil struk (dari portal)
        const strukEl = componentRef.current;

        // 3. Sembunyikan #root PAKSA pake INLINE STYLE
        if (rootEl) {
          rootEl.style.display = "none";
        }

        // 4. "Buka" struk PAKSA pake INLINE STYLE
        // Ini akan ngalahin class 'h-0' dan 'opacity-0'
        if (strukEl) {
          strukEl.style.position = "static";
          strukEl.style.height = "auto";
          strukEl.style.opacity = "1";
          strukEl.style.visibility = "visible";
        }

        // 5. Jeda 300ms (WAJIB, biar Spooler baca style baru)
        setTimeout(resolve, 300);
      });
    },

    onAfterPrint: () => {
      // 1. Kembalikan #root
      const rootEl = document.getElementById("root");
      if (rootEl) {
        rootEl.style.display = null; // null = balikin ke default (dihapus)
      }

      // 2. "Tutup" struk (balikin ke class Tailwind)
      const strukEl = componentRef.current;
      if (strukEl) {
        strukEl.style.position = null;
        strukEl.style.height = null;
        strukEl.style.opacity = null;
        strukEl.style.visibility = null;
      }
    },

    onPrintError: (error) => {
      // Bersih-bersih juga kalo error
      const rootEl = document.getElementById("root");
      if (rootEl) {
        rootEl.style.display = null;
      }
      const strukEl = componentRef.current;
      if (strukEl) {
        strukEl.style.position = null;
        strukEl.style.height = null;
        strukEl.style.opacity = null;
        strukEl.style.visibility = null;
      }

      console.error("REACT-TO-PRINT ERROR:", error);
      toast.error("Gagal menyiapkan print. Coba lagi.");
    },
  });

  // ... (return button-nya biarin, udah bener)
  return (
    <Button
      onClick={() => {
        if (componentRef?.current && componentRef.current.innerHTML !== "") {
          handlePrint();
        } else {
          console.error("Ref struk kosong!");
          toast.error("Struk belum siap dicetak.");
        }
      }}
      variant="outline"
      className="w-full"
      disabled={disabled}
    >
      <Printer className="mr-2 h-4 w-4" />
      Cetak Struk
    </Button>
  );
}

export default PrintStrukButton;
