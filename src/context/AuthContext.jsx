// src/context/AuthContext.jsx (REVISI INISIALISASI & LISTENER)

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef, // <-- Tambah useRef
} from "react";
import { supabase } from "@/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  // Fungsi fetch data user (sudah dioptimasi)
  const fetchUserData = useCallback(
    async (currentSession) => {
      // console.log("fetchUserData dipanggil untuk session:", currentSession?.user?.id); // Debug
      try {
        if (!currentSession?.user?.id) {
          // console.log("fetchUserData: Tidak ada user ID, reset state."); // Debug
          // Hanya reset jika state sebelumnya ada isinya
          if (profile !== null) setProfile(null);
          if (settings !== null) setSettings(null);
          return;
        }

        // 1. Ambil profil dulu
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentSession.user.id)
          .single(); // Pakai single()

        if (profileError && profileError.code !== "PGRST116") {
          // Abaikan error '0 rows'
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

        // 3. Bandingkan sebelum setState
        const profileChanged =
          JSON.stringify(profileData) !== JSON.stringify(profile);
        const settingsChanged =
          JSON.stringify(settingsData) !== JSON.stringify(settings);

        if (profileChanged) {
          // console.log("AuthProvider: Profile data changed, updating state."); // Debug
          setProfile(profileData);
        }
        if (settingsChanged) {
          // console.log("AuthProvider: Settings data changed, updating state."); // Debug
          setSettings(settingsData);
        }
      } catch (error) {
        console.error("Gagal mengambil data profil/settings:", error);
        // Jangan logout paksa
        setProfile(null);
        setSettings(null);
      }
      // Update dependency array
    },
    [profile, settings]
  ); // <-- Dependencies for useCallback

  // useEffect Utama: Cek sesi awal & pasang listener
  useEffect(() => {
    isMounted.current = true; // Set mount flag
    let authListener = null; // Variable buat nyimpen subscription

    async function initializeAuth() {
      // 1. Cek sesi awal DULU
      const {
        data: { session: initialSession },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error getting initial session:", sessionError);
      }

      // Kalau komponen masih mount, set sesi awal & fetch data awal
      if (isMounted.current) {
        setSession(initialSession);
        if (initialSession) {
          await fetchUserData(initialSession);
        }
        setLoading(false); // Selesai loading HANYA SETELAH sesi awal dicek & data (kalau ada) difetch

        // 2. BARU PASANG LISTENER setelah state session awal terpasang
        // 2. BARU PASANG LISTENER setelah state session awal terpasang
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          if (!isMounted.current) return;

          const currentUserId = session?.user?.id;
          const newUserId = newSession?.user?.id;

          if (_event === "SIGNED_IN" && currentUserId !== newUserId) {
            console.log(
              "AuthProvider: SIGNED_IN event, updating session state."
            );
            setSession(newSession);
          } else if (_event === "SIGNED_OUT" && currentUserId !== null) {
            console.log(
              "AuthProvider: SIGNED_OUT event, updating session state."
            );
            setSession(null);
          } else if (_event === "USER_UPDATED" && newUserId) {
            console.log(
              "AuthProvider: USER_UPDATED event, refetching user data."
            );
            await fetchUserData(newSession);
          } else {
            console.log(
              `AuthProvider: Event ${_event} diabaikan, user unchanged or event not relevant.`
            );
          }
        });
        authListener = subscription;
      }
    }

    initializeAuth();

    return () => {
      isMounted.current = false; // Set flag unmount
      authListener?.unsubscribe(); // Unsubscribe listener
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useEffect untuk fetch user data ketika sesi berubah (hanya jika ID user beda)
  useEffect(() => {
    // Periksa session?.user?.id untuk memastikan session valid
    if (session?.user?.id) {
      fetchUserData(session);
    } else {
      // Jika session jadi null (logout), pastikan profile & settings juga null
      if (profile !== null) setProfile(null);
      if (settings !== null) setSettings(null);
    }
    // Hanya fetch ulang jika objek session (identitas user) benar-benar berubah
  }, [session, fetchUserData]);

  // Objek authState
  const authState = {
    user: session?.user,
    ...profile, // Sebar profile, termasuk role, full_name, branch_id, business_id
    pengaturan: settings,
    isReady: !loading, // isReady true HANYA setelah loading awal selesai
  };

  // Fungsi logout
  const logout = () => supabase.auth.signOut();

  // Fungsi refetch (bisa dipanggil manual jika perlu)
  const refetchAuthData = useCallback(async () => {
    console.log("REFETCH: Mengambil data auth terbaru manual...");
    setLoading(true); // Set loading true saat refetch manual
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    if (currentSession) {
      await fetchUserData(currentSession);
    } else {
      setProfile(null);
      setSettings(null);
    }
    setLoading(false); // Selesai loading
  }, [fetchUserData]);

  // Value untuk context provider
  const value = { authState, logout, refetchAuthData };

  // Log tambahan untuk melihat kapan AuthProvider re-render
  // console.log("AuthProvider RENDER, loading:", loading, "isReady:", !loading, "User:", session?.user?.id);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Hook useAuth (tetap sama)
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
}
