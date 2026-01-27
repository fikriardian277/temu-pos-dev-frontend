import React, { useState } from "react";
import { supabase } from "../supabaseClient"; // Sesuaikan path jika perlu
import { Button } from "@/components/ui/Button.jsx"; // Kita pinjam tombolmu

export default function DebugUploadPage() {
  const [logs, setLogs] = useState(["Log Tes Upload akan muncul di sini..."]);
  const [isTesting, setIsTesting] = useState(false);

  const addLog = (message, isError = false) => {
    console.log(isError ? "ERROR:" : "LOG:", message);
    setLogs((prev) => [...prev, message]);
  };

  async function runUploadTest() {
    setIsTesting(true);
    setLogs(["Memulai tes..."]);

    try {
      addLog("1. Siapkan file palsu (dummy file)...");
      const dummyFile = new Blob(["ini cuma file tes"], { type: "text/plain" });
      dummyFile.name = "tes-debug.txt";
      addLog("--> File palsu berhasil dibuat.");

      const businessId = 1; // Kita asumsikan ID bisnismu 1
      const filePath = `public/${businessId}-${Date.now()}-${dummyFile.name}`;
      addLog(`2. Path file target: ${filePath}`);

      addLog(
        "3. Mencoba menjalankan supabase.storage.from('business_assets').upload()..."
      );
      const { data, error } = await supabase.storage
        .from("business_assets")
        .upload(filePath, dummyFile);

      if (error) {
        addLog(
          `❌ GAGAL! Upload ditolak server. Pesan: ${error.message}`,
          true
        );
        addLog("--> Detail Error:", true);
        console.error(error); // Tampilkan objek error lengkap di console
      } else {
        addLog("✅ BERHASIL! File berhasil di-upload.", false);
        addLog("--> Data:", false);
        console.log(data); // Tampilkan objek data lengkap di console
        addLog(
          "--> KESIMPULAN: Masalah ada di kodemu di PengaturanUsahaPage.jsx.",
          false
        );
      }
    } catch (err) {
      addLog(`❌ GAGAL TOTAL! Error fatal: ${err.message}`, true);
      console.error(err);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "monospace",
        fontSize: "1rem",
        color: "#333",
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <h1>Laboratorium Tes Upload Supabase</h1>
      <p style={{ marginTop: "1rem", marginBottom: "1rem" }}>
        Klik tombol di bawah untuk menjalankan tes upload file paling simpel ke
        Supabase Storage. Hasilnya akan muncul di bawah dan di console (F12).
      </p>
      <Button onClick={runUploadTest} disabled={isTesting}>
        {isTesting ? "Mengetes..." : "Jalankan Tes Upload"}
      </Button>
      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "black",
          color: "#00ff00",
          borderRadius: "8px",
        }}
      >
        <h2>Log Tes:</h2>
        {logs.map((log, index) => (
          <p key={index} style={{ margin: "0.5rem 0" }}>{`> ${log}`}</p>
        ))}
      </div>
    </div>
  );
}
