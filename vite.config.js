// Di file: vite.config.js

import path from "path"; // <-- 1. Tambahkan import ini
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // <-- 2. Tambahkan blok resolve ini -->
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
