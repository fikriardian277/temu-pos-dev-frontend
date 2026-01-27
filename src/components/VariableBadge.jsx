// src/components/VariableBadge.jsx

import React from "react";
import { Badge } from "@/components/ui/Badge";

/**
 * Komponen Badge yang bisa diklik untuk MENYISIPKAN teks variabel.
 * @param {object} props
 * @param {string} props.label - Teks yang akan ditampilkan di badge.
 * @param {string} props.value - Teks variabel yang akan disisipkan.
 * @param {function} props.onInsert - Fungsi yang dipanggil saat badge diklik.
 */
const VariableBadge = ({ label, value, onInsert }) => {
  // Logikanya sekarang super simpel, hanya memanggil fungsi dari parent
  const handleClick = () => {
    if (onInsert) {
      onInsert(value); // Memanggil fungsi 'handleInsertVariable' dari parent
    }
  };

  return (
    <Badge
      variant="outline"
      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
      onClick={handleClick}
      title={`Klik untuk menyisipkan ${value}`}
    >
      {label}
    </Badge>
  );
};

export default VariableBadge;
