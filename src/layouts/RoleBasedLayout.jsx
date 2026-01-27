// src/layouts/RoleBasedLayout.jsx

import React from "react";
import { useAuth } from "@/context/AuthContext";
import AdminLayout from "./AdminLayout";
import KasirLayout from "./KasirLayout";
import { Loader2 } from "lucide-react";

function RoleBasedLayout() {
  const { authState } = useAuth();

  // 1. Cek kesiapan data
  if (!authState.isReady || !authState.role) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4">Memvalidasi peran pengguna...</p>
      </div>
    );
  }

  // ============================================================
  // UPDATE LOGIC DISINI
  // ============================================================

  // Definisi siapa saja yang berhak pakai tampilan "Kantoran" (AdminLayout)
  const backOfficeRoles = [
    "owner",
    "admin",
    "admin_branch",
    "finance",
    "hr",
    "inventory",
  ];

  // Jika role user ada di daftar orang kantoran -> kasih AdminLayout
  if (backOfficeRoles.includes(authState.role)) {
    return <AdminLayout />;
  }

  // Khusus Kasir -> kasih KasirLayout (Tampilan POS Fullscreen biasanya)
  if (authState.role === "kasir") {
    return <KasirLayout />;
  }

  // Fallback jika role benar-benar tidak dikenal
  return (
    <div className="flex justify-center items-center h-screen flex-col gap-4">
      <h1 className="text-2xl font-bold text-red-500">Akses Ditolak</h1>
      <p>
        Role pengguna tidak valid atau belum terdaftar:{" "}
        <span className="font-mono bg-slate-200 px-2 py-1 rounded">
          {authState.role}
        </span>
      </p>
      <p className="text-sm text-slate-500">
        Hubungi Owner untuk update hak akses Anda.
      </p>
    </div>
  );
}

export default RoleBasedLayout;
