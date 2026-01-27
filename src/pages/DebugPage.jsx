import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient"; // Sesuaikan path jika perlu

export default function DebugPage() {
  const [status, setStatus] = useState("Memulai tes...");

  useEffect(() => {
    async function runTest() {
      try {
        setStatus("1. Mencoba mengambil sesi dari Supabase...");
        console.log("DEBUG: 1. Mencoba mengambil sesi...");
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          setStatus(`ERROR di getSession: ${sessionError.message}`);
          console.error("DEBUG: ERROR di getSession:", sessionError);
          return;
        }

        if (!session) {
          setStatus(
            "2. Tes selesai. Tidak ada sesi aktif. Silakan login dulu, lalu kembali ke halaman ini."
          );
          console.log("DEBUG: 2. Tes selesai. Tidak ada sesi aktif.");
          return;
        }

        setStatus(
          `2. Sesi ditemukan untuk user: ${session.user.id}. Mencoba mengambil profil...`
        );
        console.log(
          `DEBUG: 2. Sesi ditemukan untuk user: ${session.user.id}. Mencoba mengambil profil...`
        );

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          setStatus(`ERROR saat mengambil profil: ${profileError.message}`);
          console.error("DEBUG: ERROR saat mengambil profil:", profileError);
          return;
        }

        setStatus(
          `3. TES BERHASIL! Profil ditemukan: ${profileData.full_name} (${profileData.role})`
        );
        console.log("DEBUG: 3. TES BERHASIL! Profil ditemukan:", profileData);
      } catch (err) {
        setStatus(`ERROR FATAL di dalam try...catch: ${err.message}`);
        console.error("DEBUG: ERROR FATAL di dalam try...catch:", err);
      }
    }

    runTest();
  }, []);

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "monospace",
        fontSize: "1.2rem",
        color: "white",
        backgroundColor: "black",
        minHeight: "100vh",
      }}
    >
      <h1>Halaman Debugging Supabase</h1>
      <p>Status Terakhir:</p>
      <p style={{ color: "#00ff00", fontWeight: "bold" }}>{status}</p>
      <p style={{ marginTop: "2rem" }}>
        Buka console (F12) untuk melihat log detail.
      </p>
    </div>
  );
}
