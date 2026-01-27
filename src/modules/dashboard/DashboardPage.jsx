// src/pages/DashboardPage.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/supabaseClient";

// Impor komponen
// Impor komponen
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card.jsx";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/Table.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Badge } from "@/components/ui/Badge.jsx";
import {
  ArrowUpRight,
  DollarSign,
  ShoppingCart,
  Users,
  PlusCircle,
  CheckCircle, // <-- TAMBAH INI
  AlertCircle,
} from "lucide-react";

// Komponen kartu statistik (reusable)
const StatCard = ({ title, value, icon, subtext }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </CardContent>
  </Card>
);

// Komponen untuk Tampilan Owner
const OwnerDashboard = ({ data }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Transaksi Hari Ini"
          value={data.stats.transactionsToday}
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
        />
        {/* VVV Stat Card Lunas VVV */}
        <StatCard
          title="Total Lunas (Hari Ini)"
          value={`Rp ${data.stats.totalLunasHariIni.toLocaleString("id-ID")}`}
          icon={<CheckCircle className="h-4 w-4 text-green-500" />} // Ganti ikon
        />
        {/* VVV Stat Card Belum Lunas VVV */}
        <StatCard
          title="Total Belum Lunas (Hari Ini)"
          value={`Rp ${data.stats.totalBelumLunasHariIni.toLocaleString(
            "id-ID"
          )}`}
          icon={<AlertCircle className="h-4 w-4 text-yellow-500" />} // Ganti ikon
        />
        {/* --- Pindahkan kartu lain ke bawah jika perlu --- */}
        <StatCard
          title="Total Order Aktif"
          value={data.stats.activeOrders}
          icon={<ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
          subtext="Order yang belum selesai"
        />
        <StatCard
          title="Pelanggan Baru (Bulan Ini)"
          value={`+${data.stats.newCustomersThisMonth}`}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        {/* Kartu Pendapatan Hari Ini bisa dihapus karena sudah diwakili Total Lunas */}
        {/* <StatCard title="Pendapatan Hari Ini" ... /> */}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Tren Pendapatan (7 Hari Terakhir)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={data.dailyRevenue7Days}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="tanggal"
                  stroke="hsl(var(--foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `Rp${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="pendapatan"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Transaksi Terbaru</CardTitle>
            <CardDescription>
              5 transaksi terakhir dari semua cabang.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentTransactions?.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="font-medium">
                        {tx.customer_name || "N/A"}{" "}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tx.invoice_code} {/* <-- Pake invoice_code dari RPC */}
                      </div>
                    </TableCell>
                    <TableCell>{tx.branch_name || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      Rp {tx.grand_total.toLocaleString("id-ID")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Komponen untuk Tampilan Kasir/Admin
const KasirDashboard = ({ data }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Transaksi Cabang (Hari Ini)" // Label diubah sedikit
          value={data.stats.transactionsToday}
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
        />
        {/* VVV Stat Card Lunas VVV */}
        <StatCard
          title="Total Lunas Cabang (Hari Ini)" // Label diubah sedikit
          value={`Rp ${data.stats.totalLunasHariIni.toLocaleString("id-ID")}`}
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
        />
        {/* VVV Stat Card Belum Lunas VVV */}
        <StatCard
          title="Total Belum Lunas Cabang (Hari Ini)" // Label diubah sedikit
          value={`Rp ${data.stats.totalBelumLunasHariIni.toLocaleString(
            "id-ID"
          )}`}
          icon={<AlertCircle className="h-4 w-4 text-yellow-500" />}
        />
        {/* Kartu Order Aktif bisa tetap di sini atau dipindah */}
        <StatCard
          title="Order Aktif di Cabang Ini"
          value={data.stats.activeOrders}
          icon={<ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
        />
        {/* Kartu Pendapatan bisa dihapus */}
        {/* <StatCard title="Pendapatan Cabang (Hari Ini)" ... /> */}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full md:w-auto"
              onClick={() => navigate("/kasir")}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Buat Transaksi Baru
            </Button>
          </CardContent>
        </Card>
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Transaksi Terbaru di Cabang Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentTransactions?.map((tx) => (
                  <TableRow
                    key={tx.id}
                    onClick={() => navigate(`/riwayat/${tx.invoice_code}`)} // <-- Benerin
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="font-medium">
                        {tx.customer_name || "N/A"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tx.invoice_code} {/* <-- Benerin */}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tx.process_status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      Rp {tx.grand_total.toLocaleString("id-ID")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { authState } = useAuth();

  // 1. PINDAHKAN LOGIKA PENGAMBILAN DATA KELUAR DARI useEffect
  // ...dan bungkus dengan useCallback agar fungsinya stabil.
  const fetchData = useCallback(async () => {
    // Cek dulu apakah authState sudah siap dengan semua data yang dibutuhkan
    if (!authState.isReady || !authState.business_id) {
      return; // Keluar jika data belum lengkap
    }
    if (authState.role !== "owner" && !authState.branch_id) {
      return; // Keluar jika Admin/Kasir belum punya branch_id
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_dashboard_data", {
        user_role: authState.role,
        user_branch_id: authState.branch_id,
        user_business_id: authState.business_id,
      });

      if (error) throw error;
      setDashboardData(data);
    } catch (error) {
      console.error("Gagal mengambil data dashboard:", error);
      // Atur data default jika terjadi error
      setDashboardData({
        stats: {
          revenueToday: 0,
          transactionsToday: 0,
          activeOrders: 0,
          newCustomersThisMonth: 0,
        },
        dailyRevenue7Days: [],
        recentTransactions: [],
      });
    } finally {
      setLoading(false);
    }
  }, [
    authState.isReady,
    authState.role,
    authState.branch_id,
    authState.business_id,
  ]); // <-- Dependency untuk useCallback

  // 2. GUNAKAN SATU useEffect UNTUK MEMANGGIL fetchData saat pertama kali render atau saat authState berubah
  useEffect(() => {
    fetchData();
  }, [fetchData]); // <-- Dependency-nya adalah fungsi fetchData itu sendiri

  const getGreeting = () => {
    const currentHour = new Date().getHours(); // Dapatkan jam sekarang (0-23)

    if (currentHour >= 5 && currentHour < 11) {
      // 05:00 - 10:59
      return "Selamat Pagi";
    } else if (currentHour >= 11 && currentHour < 15) {
      // 11:00 - 14:59
      return "Selamat Siang";
    } else if (currentHour >= 15 && currentHour < 18) {
      // 15:00 - 17:59
      return "Selamat Sore";
    } else {
      // 18:00 - 04:59
      return "Selamat Malam";
    }
  };
  const greeting = getGreeting();

  // Kondisi loading, ini sudah benar
  if (loading || !dashboardData) {
    return <p className="text-center">Memuat dashboard...</p>;
  }

  // Ganti `dashboardData.role` menjadi `authState.role`
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        {greeting}, {authState.full_name}! {/* <-- Pake variabel greeting */}
      </h1>
      {authState.role === "owner" ? (
        <OwnerDashboard data={dashboardData} />
      ) : (
        <KasirDashboard data={dashboardData} />
      )}
    </div>
  );
}

export default DashboardPage;
