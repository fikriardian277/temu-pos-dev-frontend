// src/context/AuthContext.jsx (REVISI FINAL: ANTI-NYANGKUT, ANTI-BLANK, & NUKLIR)

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isSlowNetwork, setIsSlowNetwork] = useState(false); // <-- Tambahan state sinyal jelek
  const isMounted = useRef(true);

  // ⏱️ TIMER DETEKSI NYANGKUT (Munculin tombol reset setelah 7 detik loading)
  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => {
        setIsSlowNetwork(true);
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // 💣 FUNGSI NUKLIR BUAT BERSIHIN LOCAL STORAGE
  const handleHardReset = () => {
    console.log("Melakukan Hard Reset Local Storage...");
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-")) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  };

  // Fungsi fetch data user
  const fetchUserData = useCallback(async (currentSession) => {
    try {
      if (!currentSession?.user?.id) {
        if (profile !== null) setProfile(null);
        if (settings !== null) setSettings(null);
        return;
      }

      // 1. Ambil profil
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentSession.user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      // 2. Jika profil ada, cari settings
      let settingsData = null;
      if (profileData?.business_id) {
        const { data, error: settingsError } = await supabase
          .from("settings")
          .select("*")
          .eq("business_id", profileData.business_id)
          .maybeSingle();

        if (settingsError) throw settingsError;
        settingsData = data;
      }

      // 3. Update State
      setProfile(profileData || null);
      setSettings(settingsData || null);
    } catch (error) {
      console.error("Gagal mengambil data profil/settings:", error);
      // 🔥 LOGOUT PAKSA JIKA GAGAL (Mencegah Zombie Token) 🔥
      supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setSettings(null);
    }
    // 🔥 DEPENDENCY DIKOSONGIN BIAR GAK INFINITY LOOP 🔥
  }, []);

  // useEffect Utama: Cek sesi awal & pasang listener
  useEffect(() => {
    isMounted.current = true;
    let authListener = null;

    async function initializeAuth() {
      try {
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Error getting initial session:", sessionError);
        }

        if (isMounted.current) {
          setSession(initialSession);
          if (initialSession) {
            await fetchUserData(initialSession);
          }
        }
      } finally {
        // 🔥 FINALLY: APAPUN YANG TERJADI MATIKAN LOADING 🔥
        if (isMounted.current) setLoading(false);
      }

      // Pasang Listener HANYA jika komponen masih mounted
      if (isMounted.current) {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          if (!isMounted.current) return;

          const currentUserId = session?.user?.id;
          const newUserId = newSession?.user?.id;

          if (_event === "SIGNED_IN" && currentUserId !== newUserId) {
            setSession(newSession);
          } else if (_event === "SIGNED_OUT" && currentUserId !== null) {
            setSession(null);
          } else if (_event === "USER_UPDATED" && newUserId) {
            await fetchUserData(newSession);
          }
        });
        authListener = subscription;
      }
    }

    initializeAuth();

    return () => {
      isMounted.current = false;
      authListener?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useEffect untuk fetch user data ketika sesi berubah
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserData(session);
    } else {
      if (profile !== null) setProfile(null);
      if (settings !== null) setSettings(null);
    }
  }, [session, fetchUserData]);

  const authState = {
    user: session?.user,
    ...profile,
    pengaturan: settings,
    isReady: !loading,
  };

  const logout = () => supabase.auth.signOut();

  const refetchAuthData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (currentSession) {
        setSession(currentSession);
        await fetchUserData(currentSession);
      } else {
        setProfile(null);
        setSettings(null);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchUserData]);

  const value = { authState, logout, refetchAuthData };

  // 🔥 RENDER LOADING SPINNER (GAK ADA LAGI BLANK PUTIH) 🔥
  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          fontFamily: "sans-serif",
          backgroundColor: "#f8fafc",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "4px solid #e2e8f0",
            borderTop: "4px solid #3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>
          {
            "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }"
          }
        </style>

        <p style={{ marginTop: "20px", color: "#64748b", fontWeight: "bold" }}>
          Menyiapkan Aplikasi...
        </p>

        {/* MUNCUL KALAU NYANGKUT LEBIH DARI 7 DETIK */}
        {isSlowNetwork && (
          <div
            style={{
              marginTop: "30px",
              padding: "20px",
              backgroundColor: "#fee2e2",
              borderRadius: "8px",
              border: "1px solid #f87171",
              maxWidth: "400px",
            }}
          >
            <p
              style={{
                color: "#b91c1c",
                fontWeight: "bold",
                marginBottom: "10px",
                fontSize: "14px",
              }}
            >
              ⚠️ Sinyal kurang stabil atau aplikasi tersangkut.
            </p>
            <p
              style={{
                color: "#991b1b",
                fontSize: "12px",
                marginBottom: "15px",
              }}
            >
              Jika layar ini tidak hilang, klik tombol di bawah ini untuk
              memperbaiki aplikasi.
            </p>
            <button
              onClick={handleHardReset}
              style={{
                backgroundColor: "#dc2626",
                color: "white",
                padding: "10px 15px",
                borderRadius: "5px",
                border: "none",
                fontWeight: "bold",
                width: "100%",
                cursor: "pointer",
              }}
            >
              🔄 Perbaiki & Muat Ulang
            </button>
          </div>
        )}
      </div>
    );
  }

  // JIKA LOADING SELESAI, TAMPILKAN APLIKASI
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
}
