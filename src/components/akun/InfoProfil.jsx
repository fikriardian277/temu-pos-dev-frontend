import React, { useState, useEffect } from "react";
import api from "@/api/axiosInstance";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

// Terima props baru: onComplete
const InfoProfil = ({ userData, setUserData, onComplete }) => {
  const [namaLengkap, setNamaLengkap] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { updateAuthUser } = useAuth();

  useEffect(() => {
    if (userData) {
      setNamaLengkap(userData.nama_lengkap || "");
    }
  }, [userData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await api.put("/akun/profil", {
        nama_lengkap: namaLengkap,
      });
      updateAuthUser(response.data.user); // 1. Update data global
      setUserData(response.data.user);
      onComplete(); // <-- Kembali ke halaman ringkasan
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Terjadi kesalahan";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 p-8 rounded-lg border border-slate-700">
      <h2 className="text-2xl font-bold mb-6">Ubah Profil</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400">
            Username
          </label>
          <p className="mt-1 text-lg">{userData.username}</p>
        </div>
        <div>
          <label
            htmlFor="nama_lengkap"
            className="block text-sm font-medium text-slate-300"
          >
            Nama Lengkap
          </label>
          <input
            type="text"
            id="nama_lengkap"
            value={namaLengkap}
            onChange={(e) => setNamaLengkap(e.target.value)}
            className="mt-1 w-full p-2 bg-slate-600 rounded border border-slate-500"
            required
          />
        </div>
        <div className="flex gap-4 pt-4">
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
          {/* Tombol Batal */}
          <Button type="button" variant="secondary" onClick={onComplete}>
            Batal
          </Button>
        </div>
      </form>
    </div>
  );
};

export default InfoProfil;
