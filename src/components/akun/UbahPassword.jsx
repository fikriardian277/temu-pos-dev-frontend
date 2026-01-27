import React, { useState } from "react";
import api from "@/api/axiosInstance";
import { Button } from "@/components/ui/Button";

// Terima props baru: onComplete
const UbahPassword = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    password_lama: "",
    password_baru: "",
    konfirmasi_password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password_baru !== formData.konfirmasi_password) {
      alert("Konfirmasi password baru tidak cocok!");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.put("/akun/ubah-password", {
        password_lama: formData.password_lama,
        password_baru: formData.password_baru,
      });
      alert(response.data.message);
      onComplete();
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Terjadi kesalahan";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 p-8 rounded-lg border border-slate-700">
      <h2 className="text-2xl font-bold mb-6">Ubah Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input Password Lama */}
        <div>
          <label
            htmlFor="password_lama"
            className="block text-sm font-medium text-slate-300"
          >
            Password Lama
          </label>
          <input
            type="password"
            id="password_lama"
            name="password_lama"
            value={formData.password_lama}
            onChange={handleChange}
            className="mt-1 w-full p-2 bg-slate-600 rounded border border-slate-500 focus:ring-sky-500 focus:border-sky-500"
            required
          />
        </div>

        {/* Input Password Baru */}
        <div>
          <label
            htmlFor="password_baru"
            className="block text-sm font-medium text-slate-300"
          >
            Password Baru
          </label>
          <input
            type="password"
            id="password_baru"
            name="password_baru"
            value={formData.password_baru}
            onChange={handleChange}
            className="mt-1 w-full p-2 bg-slate-600 rounded border border-slate-500 focus:ring-sky-500 focus:border-sky-500"
            required
          />
          {/* [PENINGKATAN] Teks bantuan untuk syarat password */}
          <p className="mt-1 text-xs text-slate-400">Minimal 8 karakter.</p>
        </div>

        {/* Input Konfirmasi Password Baru */}
        <div>
          <label
            htmlFor="konfirmasi_password"
            className="block text-sm font-medium text-slate-300"
          >
            Konfirmasi Password Baru
          </label>
          <input
            type="password"
            id="konfirmasi_password"
            name="konfirmasi_password"
            value={formData.konfirmasi_password}
            onChange={handleChange}
            className="mt-1 w-full p-2 bg-slate-600 rounded border border-slate-500 focus:ring-sky-500 focus:border-sky-500"
            required
          />
        </div>

        {/* [PENINGKATAN] Grup tombol aksi */}
        <div className="flex gap-4 pt-4">
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? "Menyimpan..." : "Ganti Password"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onComplete} // Pastikan onComplete ada di props
          >
            Batal
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UbahPassword;
