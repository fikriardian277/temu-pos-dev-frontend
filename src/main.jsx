// src/main.jsx (VERSI OPERASI NUKLIR)

import React from "react";
import ReactDOM from "react-dom/client";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "@/components/ui/Sonner.jsx";
import { supabase } from "./supabaseClient";
import App from "./App";

import "antd/dist/reset.css";
import "./index.css";

const {
  data: { session },
} = await supabase.auth.getSession();

// Setelah dapat jawaban, baru kita render aplikasi
ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider initialSession={session}>
    {" "}
    <ThemeProvider defaultTheme="light" storageKey="laundry-pos-theme">
      <App />
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  </AuthProvider>
);
