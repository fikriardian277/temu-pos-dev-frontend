import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Label } from "@/components/ui/Label.jsx";
import { supabase } from "@/supabaseClient";

// ✅ React Icon Google
import { FcGoogle } from "react-icons/fc";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // INI DIA FUNGSI LOGIN SUPABASE
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        throw error; // Lemparkan error agar ditangkap catch
      }

      // Jika berhasil, AuthContext akan otomatis handle sisanya
    } catch (err) {
      const message = err.message || "Username atau password salah.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      // Browser akan redirect ke Google
    } catch (err) {
      setError("Gagal memulai login Google: " + err.message);
      setGoogleLoading(false); // Stop loading kalo gagal mulai
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
          <img
            src="/logo.png"
            alt="App Logo"
            className="w-16 h-16 mx-auto mb-2"
          />
          <CardTitle className="text-2xl font-bold">
            Selamat Datang BABI
          </CardTitle>
          <CardDescription>
            Masukkan username dan password Anda untuk masuk ke akun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email" // <-- Ganti tipenya jadi email biar ada validasi browser
                placeholder="Email Anda"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  // Ganti type jadi dinamis
                  type={showPassword ? "text" : "password"}
                  placeholder="Password Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10" // <-- Tambah padding kanan
                />
                {/* VVV Tombol Mata Absolut VVV */}
                <Button
                  type="button" // <-- Penting: jangan submit form
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground" // Posisi & style
                  onClick={() => setShowPassword((prev) => !prev)} // Toggle state
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Sembunyikan" : "Tampilkan"} password
                  </span>
                </Button>
                {/* ^^^ Selesai Tombol ^^^ */}
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>

            {/* ✅ Tombol Google pakai react-icons */}
            <Button
              variant="outline"
              className="w-full flex items-center justify-center"
              type="button"
              onClick={handleGoogleLogin} // <-- Panggil fungsi Supabase
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FcGoogle className="w-5 h-5 mr-2" />
              )}
              Lanjutkan dengan Google
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Belum punya akun?{" "}
            <Link to="/register" className="underline font-medium text-primary">
              Daftarkan Usaha
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
