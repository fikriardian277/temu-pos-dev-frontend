// src/pages/AkunPage.jsx (VERSI SUPABASE)

import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient"; // <-- GANTI KE SUPABASE
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  KeyRound,
  User,
  History,
  LogOut,
  Loader2,
  ClipboardList,
  Eye,
  EyeOff,
} from "lucide-react"; // <-- Tambah Loader2
import { toast } from "sonner"; // <-- Pake toast biar konsisten

// Impor komponen-komponen dari shadcn/ui
import { Button } from "@/components/ui/Button.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Label } from "@/components/ui/Label.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/Tabs.jsx";

// ==========================================================
// InfoProfil (VERSI SUPABASE)
// ==========================================================
function InfoProfil({ currentName }) {
  const [formData, setFormData] = useState({
    nama_lengkap: currentName || "",
  });
  const [saving, setSaving] = useState(false);

  // Sinkronkan form jika authState berubah (misal setelah save)
  useEffect(() => {
    setFormData({ nama_lengkap: currentName || "" });
  }, [currentName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. VVV PANGGIL FUNGSI RPC BARU KITA VVV
      const { error: rpcError } = await supabase.rpc("update_user_full_name", {
        new_name: formData.nama_lengkap,
      });

      if (rpcError) throw rpcError;

      // 2. VVV TETEP PAKE REFRESH SESSION VVV
      // Ini buat maksa 'authState' ngambil data baru dari auth.users
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;

      toast.success("Profil berhasil diperbarui!");
    } catch (error) {
      console.error("Gagal update profil", error);
      toast.error(error.message || "Gagal update profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
        <Input
          id="nama_lengkap"
          value={formData.nama_lengkap}
          onChange={(e) => setFormData({ nama_lengkap: e.target.value })}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
            </>
          ) : (
            "Simpan Profil"
          )}
        </Button>
      </div>
    </form>
  );
}

// ==========================================================
// UbahPassword (VERSI SUPABASE)
// ==========================================================
function UbahPassword() {
  const { authState } = useAuth(); // Kita butuh email user
  const [formData, setFormData] = useState({
    password_lama: "",
    password_baru: "",
  });
  const [saving, setSaving] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false); // <-- State 1
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password_baru.length < 6) {
      toast.error("Password baru minimal 6 karakter.");
      return;
    }
    setSaving(true);

    try {
      // 1. Verifikasi password lama
      // Kita coba login 'lagi' pake password lama
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authState.email, // Ambil email dari context
        password: formData.password_lama,
      });

      if (signInError) {
        throw new Error("Password lama salah.");
      }

      // 2. Jika lolos, update ke password baru
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password_baru,
      });

      if (updateError) throw updateError;

      toast.success("Password berhasil diperbarui!");
      setFormData({ password_lama: "", password_baru: "" });
    } catch (err) {
      console.error("Gagal ubah password:", err);
      toast.error(err.message || "Gagal mengubah password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="password_lama">Password Lama</Label>
        <div className="relative">
          {" "}
          {/* <-- Wrapper */}
          <Input
            id="password_lama"
            type={showOldPassword ? "text" : "password"} // <-- Tipe dinamis
            value={formData.password_lama}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                password_lama: e.target.value,
              }))
            }
            className="pr-10" // <-- Padding kanan
            required // <-- Jangan lupa required kalau perlu
          />
          <Button
            type="button" // <-- Tipe button
            variant="ghost"
            size="icon"
            className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground" // <-- Posisi & style
            onClick={() => setShowOldPassword((prev) => !prev)} // <-- Toggle state lama
          >
            {showOldPassword ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
            <span className="sr-only">
              {showOldPassword ? "Sembunyikan" : "Tampilkan"} password lama
            </span>
          </Button>
        </div>
      </div>

      {/* --- Input Password Baru (dengan tombol mata) --- */}
      <div>
        <Label htmlFor="password_baru">Password Baru (Min. 6 karakter)</Label>
        <div className="relative">
          {" "}
          {/* <-- Wrapper */}
          <Input
            id="password_baru"
            type={showNewPassword ? "text" : "password"} // <-- Tipe dinamis
            value={formData.password_baru}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                password_baru: e.target.value,
              }))
            }
            className="pr-10" // <-- Padding kanan
            required // <-- Jangan lupa required kalau perlu
          />
          <Button
            type="button" // <-- Tipe button
            variant="ghost"
            size="icon"
            className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground" // <-- Posisi & style
            onClick={() => setShowNewPassword((prev) => !prev)} // <-- Toggle state baru
          >
            {showNewPassword ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
            <span className="sr-only">
              {showNewPassword ? "Sembunyikan" : "Tampilkan"} password baru
            </span>
          </Button>
        </div>
      </div>

      {/* --- Tombol Submit (tetap sama) --- */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
            </>
          ) : (
            "Ubah Password"
          )}
        </Button>
      </div>
    </form>
  );
}

// ==========================================================
// AkunPage (VERSI SUPABASE)
// ==========================================================
function AkunPage() {
  const { authState, logout } = useAuth(); // <-- Hapus 'api'
  const navigate = useNavigate();

  // HAPUS SEMUA 'useEffect' dan 'useState' untuk 'userData'
  // Kita pake 'authState.isReady' sebagai loading, kayak di RoleBasedLayout

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Pake 'isReady' dari authState buat loading
  if (!authState.isReady) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Pengaturan Akun</h1>
        <p className="text-muted-foreground">
          Kelola informasi profil dan keamanan akun Anda.
        </p>
      </div>

      <Tabs defaultValue="profil" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profil">
            <User className="w-4 h-4 mr-2" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="keamanan">
            <KeyRound className="w-4 h-4 mr-2" />
            Keamanan
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profil">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Profil</CardTitle>
              <CardDescription>
                Perbarui nama lengkap Anda yang akan ditampilkan di aplikasi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Kirim 'full_name' dari authState */}
              <InfoProfil currentName={authState.full_name} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="keamanan">
          <Card>
            <CardHeader>
              <CardTitle>Ubah Password</CardTitle>
              <CardDescription>
                Ganti password Anda secara berkala untuk menjaga keamanan akun.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UbahPassword />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* [FIX] Ganti 'authState.user?.role' jadi 'authState.role' */}
      {authState.role === "kasir" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Aksi Cepat</h2>
          <Card>
            <CardContent className="p-4">
              <Link
                to="/riwayat"
                className="flex items-center justify-between text-sm font-medium hover:text-primary"
              >
                <div className="flex items-center">
                  <History className="w-4 h-4 mr-3" />
                  <span>Lihat Riwayat Transaksi</span>
                </div>
              </Link>
            </CardContent>
            <CardContent className="p-4">
              <Link
                to="/laundry-hotel"
                className="flex items-center justify-between text-sm font-medium hover:text-primary border-t pt-3" // <-- Tambah border-t & pt-3
              >
                <div className="flex items-center">
                  <ClipboardList className="w-4 h-4 mr-3" />{" "}
                  {/* Ganti ikon jika mau */}
                  <span>Input Laundry Hotel</span>
                </div>
              </Link>
            </CardContent>
          </Card>
          {/* Tombol logout ini hanya muncul di HP (md:hidden) */}
          <div className="mt-8 pt-8 border-t flex justify-end md:hidden">
            <Button onClick={handleLogout} variant="destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AkunPage;
