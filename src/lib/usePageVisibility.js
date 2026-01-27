// src/lib/usePageVisibility.js (VERSI DEFIBRILATOR)

import { useEffect } from "react";

export function usePageVisibility() {
  useEffect(() => {
    let wasHidden = document.hidden; // Cek kondisi awal

    const handleVisibilityChange = () => {
      // Hanya picu jika KEMBALI dari kondisi 'hidden'
      if (wasHidden && !document.hidden) {
        console.log(
          "Tab kembali aktif. Melakukan hard reset untuk menyegarkan sesi..."
        );
        window.location.reload();
      }
      wasHidden = document.hidden;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []); // Kosong, hanya jalan sekali
}
