// src/components/ui/EmptyState.jsx

import React from "react";

/**
 * Komponen untuk menampilkan state kosong (tidak ada data) dengan pesan dan aksi.
 * @param {object} props
 * @param {React.ReactNode} props.icon - Ikon yang akan ditampilkan (dari lucide-react).
 * @param {string} props.title - Judul utama pesan.
 * @param {string} props.description - Deskripsi atau sub-pesan.
 * @param {React.ReactNode} props.children - Tombol aksi atau elemen lain di bagian bawah.
 */
const EmptyState = ({ icon, title, description, children }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg bg-muted/50">
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}

      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>

      {description && (
        <p className="text-muted-foreground mt-2 text-sm">{description}</p>
      )}

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
};

export default EmptyState;
