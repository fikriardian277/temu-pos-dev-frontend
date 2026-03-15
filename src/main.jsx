// src/main.jsx (VERSI ANTI NUKLIR & ANTI BLANK)

import React from "react";
import ReactDOM from "react-dom/client";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "@/components/ui/Sonner.jsx";
import App from "./App";
import ErrorBoundary from "@/components/ErrorBoundary"; // 👈 1. IMPORT ERROR BOUNDARY YANG TADI DIBIKIN

import "antd/dist/reset.css";
import "./index.css";

// 👇 2. HAPUS Top-Level Await yang bikin Safari iPhone Crash!
// supabase.auth.getSession() biar diurus sama AuthContext aja di dalem.

ReactDOM.createRoot(document.getElementById("root")).render(
  // 👇 3. BUNGKUS PALING LUAR PAKE ERROR BOUNDARY
  <ErrorBoundary>
    {/* initialSession dihapus karena AuthContext udah ambil sendiri pas pertama load */}
    <AuthProvider>
      <ThemeProvider defaultTheme="light" storageKey="laundry-pos-theme">
        <App />
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </AuthProvider>
  </ErrorBoundary>,
);
