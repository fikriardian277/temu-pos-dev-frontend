// src/pages/LoginSuccessPage.jsx

import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react"; // Impor ikon spinner

function LoginSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const doLogin = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get("token");

      if (token) {
        await login(token); // <- tambahin await
        navigate("/dashboard", { replace: true });
      } else {
        console.error("Login via Google berhasil, tapi tidak menerima token.");
        navigate("/login?error=token-missing", { replace: true });
      }
    };

    doLogin();
  }, [location, navigate, login]);

  // Kita akan upgrade tampilan loading di bawah ini
  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 text-center">
        <img src="/logo.png" alt="App Logo" className="w-20 h-20 mb-4" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div>
          <p className="text-xl font-semibold">Mengautentikasi...</p>
          <p className="text-muted-foreground">Anda akan segera diarahkan.</p>
        </div>
      </div>
    </div>
  );
}

export default LoginSuccessPage;
