import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "@/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fungsi fetch data dipisah dan dependency-nya DIBERSIHKAN
  const fetchUserData = useCallback(async (currentSession) => {
    try {
      if (!currentSession?.user?.id) {
        setProfile(null);
        setSettings(null);
        return;
      }

      // 1. Ambil Profil
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentSession.user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      // 2. Ambil Settings (Kalau ada profile)
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

      // 3. Update State (Langsung set aja, React udah pinter bandingin secara virtual)
      setProfile(profileData || null);
      setSettings(settingsData || null);
    } catch (error) {
      console.error("Gagal mengambil data profil/settings:", error);
      setProfile(null);
      setSettings(null);
    }
    // GAK PERLU MASUKIN profile & settings ke dependency biar gak infinity loop!
  }, []);

  // useEffect UTAMA: Jalankan 1x saat aplikasi baru dibuka
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // 1. Ambil sesi awal
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(initialSession);
          if (initialSession) {
            await fetchUserData(initialSession);
          }
        }
      } catch (error) {
        console.error("Error initial session:", error);
      } finally {
        // APAPUN YANG TERJADI (Sukses/Gagal), MATIKAN LOADING!
        if (mounted) setLoading(false);
      }
    }

    initializeAuth();

    // 2. Pasang Listener untuk perubahan Auth (Login/Logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setSession(newSession);
        await fetchUserData(newSession);
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setProfile(null);
        setSettings(null);
      } else if (event === "USER_UPDATED") {
        await fetchUserData(newSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  // Objek authState
  const authState = {
    user: session?.user || null,
    ...profile,
    pengaturan: settings,
    isReady: !loading,
  };

  // Fungsi logout
  const logout = () => supabase.auth.signOut();

  // Fungsi refetch manual
  const refetchAuthData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
      if (currentSession) {
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

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : null}
      {/* Jangan tampilin children kalo masih loading, biar ProtectedRoute gak bocor */}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
}
