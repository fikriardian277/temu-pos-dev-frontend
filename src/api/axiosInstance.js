import axios from "axios";
import { jwtDecode } from "jwt-decode";

// Buat instance Axios dengan konfigurasi dasar
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // <-- PERUBAHAN DI SINI
  withCredentials: true,
});

// [INTERCEPTOR PERMINTAAN]
// Ini berjalan SETIAP KALI kamu mengirim permintaan (GET, POST, dll.)
api.interceptors.request.use(
  (config) => {
    // Ambil token dari localStorage
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      // Cek apakah token sudah kedaluwarsa
      const decodedToken = jwtDecode(accessToken);
      if (decodedToken.exp * 1000 < Date.now()) {
        // Jika sudah kedaluwarsa, jangan kirim header-nya.
        // Biarkan interceptor response yang menanganinya.
        console.log(
          "Access token kedaluwarsa di sisi client, menunggu refresh..."
        );
      } else {
        // Jika masih valid, tambahkan ke header
        config.headers["Authorization"] = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// [INTERCEPTOR RESPON]
// Ini berjalan SETIAP KALI kamu menerima respons dari server
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // URL dari request yang gagal
    const failedUrl = originalRequest.url;

    // [FIX] Tambahkan pengecualian untuk rute-rute autentikasi
    const isAuthRoute =
      failedUrl.includes("/pengguna/login") ||
      failedUrl.includes("/usaha/register") ||
      failedUrl.includes("/pengguna/refresh-token");

    // Hanya coba refresh token jika error 401, BUKAN dari rute auth, dan belum di-retry
    if (
      error.response?.status === 401 &&
      !isAuthRoute &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        console.log("Mencoba me-refresh token...");
        const response = await api.get("/pengguna/refresh-token");
        const newAccessToken = response.data.accessToken;

        localStorage.setItem("accessToken", newAccessToken);
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        console.error("Refresh token gagal, sesi berakhir.", refreshError);
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Untuk semua error lain (termasuk 401 dari /login), langsung kembalikan errornya
    return Promise.reject(error);
  }
);

export default api;
