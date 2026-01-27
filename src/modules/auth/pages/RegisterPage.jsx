// src/pages/RegisterPage.jsx

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/supabaseClient";
import { toast } from "sonner";

// Impor komponen-komponen dari shadcn/ui
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

function RegisterPage() {
  const [formData, setFormData] = useState({
    nama_usaha: "",
    nama_lengkap: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // INI DIA CARA YANG BENAR
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          // "Menitipkan" data tambahan untuk dibaca oleh Trigger di backend
          data: {
            full_name: formData.nama_lengkap,
            business_name: formData.nama_usaha,
            username: formData.username,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Jika berhasil, AuthContext akan otomatis mendeteksi sesi baru
      // Kita tidak perlu login manual lagi!
      toast.success("Registrasi berhasil! silakan cek email Anda.");
    } catch (err) {
      const message = err.message || "Terjadi kesalahan. Coba lagi.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="mx-auto max-w-sm">
        <CardHeader className="text-center">
          <img
            src="/logo.png"
            alt="App Logo"
            className="w-16 h-16 mx-auto mb-2"
          />
          <CardTitle className="text-2xl">Daftarkan Usaha Anda</CardTitle>
          <CardDescription>
            Buat akun owner dan mulai kelola bisnis laundry Anda hari ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nama_usaha">Nama Usaha</Label>
              <Input
                id="nama_usaha"
                name="nama_usaha"
                value={formData.nama_usaha}
                onChange={handleChange}
                placeholder="Contoh: Superclean Laundry"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nama_lengkap">Nama Lengkap Owner</Label>
              <Input
                id="nama_lengkap"
                name="nama_lengkap"
                value={formData.nama_lengkap}
                onChange={handleChange}
                placeholder="Contoh: Diki Gunawan"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Username untuk login"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contoh@email.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Daftar & Buat Akun
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link to="/login" className="underline font-semibold text-primary">
              Login di sini
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RegisterPage;
