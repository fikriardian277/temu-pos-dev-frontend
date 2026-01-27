import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Box,
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  Building,
  Archive,
  Filter,
  Info,
  FileText,
  History,
  PlayCircle,
  AlertTriangle,
  User,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function AssetPage() {
  const { authState } = useAuth();
  const [activeTab, setActiveTab] = useState("assets");
  const [loading, setLoading] = useState(false);

  // DATA STATE
  const [assets, setAssets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // FILTER STATE
  const [filterBranch, setFilterBranch] = useState("all");

  // FORM STATE: REQUEST BARU (ASET BARU)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    name: "",
    category: "",
    branch_id: "",
    supplier_id: "",
    estimated_price: "",
    description: "",
    useful_life_years: "4",
    residual_value: "0",
  });

  // FORM STATE: ASET LAMA (EXISTING)
  const [isLegacyModalOpen, setIsLegacyModalOpen] = useState(false);
  const [legacyAsset, setLegacyAsset] = useState({
    name: "",
    category: "",
    branch_id: "",
    purchase_date: "",
    purchase_price: "",
    description: "",
    useful_life_years: "4",
    residual_value: "0",
  });

  // FORM STATE: APPROVAL
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalData, setApprovalData] = useState({
    real_price: "",
    supplier_id: "",
    due_date: "",
    useful_life_years: "4",
    residual_value: "0",
  });

  // DEPRECIATION STATE
  const [depreciationPeriod, setDepreciationPeriod] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [depreciationLogs, setDepreciationLogs] = useState([]);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Assets
      let qAssets = supabase
        .from("fixed_assets")
        .select(`*, branches(name)`)
        .eq("business_id", authState.business_id)
        .order("purchase_date", { ascending: false });

      if (filterBranch !== "all") {
        qAssets = qAssets.eq("branch_id", filterBranch);
      }
      const { data: assetData } = await qAssets;

      // 2. Fetch Requests
      const { data: reqData } = await supabase
        .schema("finance")
        .from("view_asset_requests")
        .select("*")
        .eq("business_id", authState.business_id)
        .order("created_at", { ascending: false });

      // 3. Fetch Depreciation Logs
      const { data: logData, error: logError } = await supabase
        .schema("finance")
        .from("view_asset_depreciation_logs")
        .select("*")
        .eq("business_id", authState.business_id)
        .order("period_date", { ascending: false })
        .limit(50);

      if (logError) console.error("Log Error:", logError);

      setDepreciationLogs(logData || []);
      setAssets(assetData || []);
      setRequests(reqData || []);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat data aset.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterBranch]);

  useEffect(() => {
    const fetchMeta = async () => {
      const { data: b } = await supabase
        .from("branches")
        .select("id, name")
        .eq("business_id", authState.business_id);
      setBranches(b || []);
      const { data: s } = await supabase
        .schema("inventory")
        .from("suppliers")
        .select("id, name")
        .eq("business_id", authState.business_id);
      setSuppliers(s || []);
    };
    fetchMeta();
  }, [authState.business_id]);

  // --- HANDLER: REQUEST ASET BARU (OWNER/STAFF) ---
  const handleSubmitRequest = async () => {
    try {
      if (!newRequest.name || !newRequest.branch_id)
        return toast.error("Nama aset dan cabang wajib diisi!");

      const { error } = await supabase.from("asset_requests").insert({
        business_id: authState.business_id,
        branch_id: newRequest.branch_id,
        supplier_id: newRequest.supplier_id || null,
        name: newRequest.name,
        category: newRequest.category || "Umum",
        description: newRequest.description,
        estimated_price: newRequest.estimated_price || 0,
        useful_life_years: parseInt(newRequest.useful_life_years) || 4,
        residual_value: parseFloat(newRequest.residual_value) || 0,
        status: "pending",
        requested_by: authState.user.id,
      });

      if (error) throw error;
      toast.success("Request Aset Terkirim ke Finance!");
      setIsRequestModalOpen(false);
      setNewRequest({
        name: "",
        category: "",
        branch_id: "",
        supplier_id: "",
        estimated_price: "",
        description: "",
        useful_life_years: "4",
        residual_value: "0",
      });
      fetchData();
    } catch (e) {
      toast.error("Gagal request: " + e.message);
    }
  };

  // --- HANDLER: JALANKAN PENYUSUTAN ---
  const handleRunDepreciation = async () => {
    if (
      !confirm(
        `Yakin proses penyusutan periode ${depreciationPeriod}? \nIni akan mencatat beban ke Laporan Laba Rugi.`,
      )
    )
      return;

    setLoading(true);
    try {
      const [year, month] = depreciationPeriod.split("-");
      const lastDay = new Date(year, month, 0).getDate();
      const periodDateFull = `${depreciationPeriod}-${lastDay}`;

      const { data, error } = await supabase.rpc(
        "generate_monthly_depreciation",
        {
          p_business_id: authState.business_id,
          p_period_date: periodDateFull,
          p_user_id: authState.user.id,
        },
      );

      if (error) throw error;

      if (data.processed_count > 0) {
        toast.success(
          `Sukses! ${data.processed_count} aset disusutkan. Total: ${formatRupiah(data.total_depreciation)}`,
        );
      } else {
        toast.info("Tidak ada aset yang perlu disusutkan periode ini.");
      }

      fetchData();
    } catch (e) {
      toast.error("Gagal closing aset: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLER: INPUT ASET LAMA ---
  const handleLegacySubmit = async () => {
    try {
      if (
        !legacyAsset.name ||
        !legacyAsset.branch_id ||
        !legacyAsset.purchase_price
      )
        return toast.error("Data wajib tidak boleh kosong!");

      const { error } = await supabase.rpc("add_existing_asset", {
        p_business_id: authState.business_id,
        p_branch_id: legacyAsset.branch_id,
        p_name: legacyAsset.name,
        p_category: legacyAsset.category || "Umum",
        p_description: legacyAsset.description,
        p_purchase_date: legacyAsset.purchase_date || new Date().toISOString(),
        p_purchase_price: legacyAsset.purchase_price,
        p_useful_life_years: legacyAsset.useful_life_years,
        p_residual_value: legacyAsset.residual_value,
      });

      if (error) throw error;
      toast.success("Aset Lama Berhasil Disimpan!");
      setIsLegacyModalOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // --- HANDLER: REJECT REQUEST (FIX: FUNGSI INI DULU HILANG) ---
  const handleReject = async (requestId) => {
    if (!confirm("Yakin ingin menolak request ini?")) return;

    try {
      const { error } = await supabase
        .from("asset_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;
      toast.success("Request berhasil ditolak/dibatalkan.");
      fetchData();
    } catch (e) {
      toast.error("Gagal reject: " + e.message);
    }
  };

  // --- HANDLER: OPEN APPROVE MODAL ---
  const openApproveModal = (req) => {
    setSelectedRequest(req);
    const today = new Date().toISOString().split("T")[0];

    // Finance hanya perlu memastikan Vendor & Harga Real
    setApprovalData({
      real_price: req.estimated_price,
      supplier_id: req.supplier_id ? String(req.supplier_id) : "",
      due_date: today,
      useful_life_years: req.useful_life_years || "4",
      residual_value: req.residual_value || "0",
    });

    setIsApproveModalOpen(true);
  };

  // --- HANDLER: EXECUTE APPROVAL (FINANCE) ---
  const handleExecuteApproval = async () => {
    if (!approvalData.supplier_id || !approvalData.real_price) {
      return toast.error(
        "Vendor dan Harga Realisasi wajib diisi oleh Finance!",
      );
    }

    try {
      const { error } = await supabase.rpc("approve_asset_request", {
        p_request_id: selectedRequest.id,
        p_real_price: approvalData.real_price,
        p_supplier_id: approvalData.supplier_id,
        p_due_date: approvalData.due_date,
        p_user_id: authState.user.id,
      });
      if (error) throw error;
      toast.success("Aset Disetujui & Tagihan Dibuat!");
      setIsApproveModalOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in p-6 pb-24 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Box className="w-6 h-6 text-blue-600" /> Manajemen Aset
          </h1>
          <p className="text-slate-500 mt-1">
            Database Harta Tetap, Request Pembelian & Penyusutan.
          </p>
        </div>
        <div className="flex gap-2">
          {/* TOMBOL INI BISA DIAKSES OWNER & FINANCE */}
          <Button
            variant="outline"
            onClick={() => setIsLegacyModalOpen(true)}
            className="border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100"
          >
            <Archive className="w-4 h-4 mr-2" /> Input Aset Lama
          </Button>
          <Button
            onClick={() => setIsRequestModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" /> Request Aset Baru
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="assets" className="px-4">
              Aset Aktif
            </TabsTrigger>
            <TabsTrigger value="requests" className="px-4 relative">
              Request Pembelian
              {requests.filter((r) => r.status === "pending").length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </TabsTrigger>
            <TabsTrigger value="depreciation" className="px-4 gap-2">
              <History className="w-3 h-3" /> Penyusutan
            </TabsTrigger>
          </TabsList>

          {activeTab === "assets" && (
            <div className="flex items-center gap-2 bg-white p-1 rounded-md border border-slate-200">
              <Filter className="w-4 h-4 text-slate-400 ml-2" />
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="w-[180px] h-8 text-xs border-0 focus:ring-0">
                  <SelectValue placeholder="Semua Cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* TAB 1: LIST ASET */}
        <TabsContent value="assets" className="mt-0">
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b text-slate-600 uppercase text-xs font-semibold">
                  <tr>
                    <th className="p-4">Detail Aset</th>
                    <th className="p-4">Lokasi</th>
                    <th className="p-4">Tgl Perolehan</th>
                    <th className="p-4">Info Penyusutan</th>
                    <th className="p-4 text-right">Nilai Buku</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-slate-400"
                      >
                        Tidak ada data aset.
                      </td>
                    </tr>
                  ) : (
                    assets.map((asset) => (
                      <tr
                        key={asset.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-bold text-slate-800">
                            {asset.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex gap-2 items-center">
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 px-1.5"
                            >
                              {asset.category}
                            </Badge>
                            <span className="truncate max-w-[200px]">
                              {asset.description || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building className="w-3 h-3" />{" "}
                            {asset.branches?.name || "Pusat"}
                          </div>
                        </td>
                        <td className="p-4 text-slate-600">
                          {new Date(asset.purchase_date).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-500">
                          UE: {asset.useful_life_years} Thn <br />
                          Residu: {formatRupiah(asset.residual_value)}
                        </td>
                        <td className="p-4 text-right font-mono font-medium text-slate-700">
                          {formatRupiah(asset.current_value)}
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Beli: {formatRupiah(asset.purchase_price)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: REQUEST PEMBELIAN */}
        <TabsContent value="requests" className="mt-0">
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b text-slate-600 uppercase text-xs font-semibold">
                  <tr>
                    <th className="p-4">Item Request</th>
                    <th className="p-4">Requestor</th>
                    <th className="p-4">Estimasi Budget</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-8 text-center text-slate-500"
                      >
                        Belum ada request pembelian aset.
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr
                        key={req.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-bold text-slate-800">
                            {req.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 max-w-[250px] truncate">
                            {req.description || "Tidak ada deskripsi"}
                          </div>
                          {req.supplier_name && (
                            <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <Building className="w-3 h-3" /> Vendor:{" "}
                              {req.supplier_name}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <User className="w-3 h-3" />{" "}
                            {req.requested_by_name || "Staff"}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(req.created_at).toLocaleDateString(
                              "id-ID",
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-mono font-medium text-slate-700">
                          {formatRupiah(req.estimated_price)}
                        </td>
                        <td className="p-4 text-center">
                          {req.status === "pending" && (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200">
                              Menunggu Approval
                            </Badge>
                          )}
                          {req.status === "approved" && (
                            <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200">
                              Disetujui
                            </Badge>
                          )}
                          {req.status === "rejected" && (
                            <Badge
                              variant="destructive"
                              className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                            >
                              Ditolak
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {req.status === "pending" ? (
                            <div className="flex justify-center gap-2">
                              {/* JIKA FINANCE: BISA APPROVE & REJECT */}
                              {authState.role === "finance" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50 h-8 px-2"
                                    onClick={() => handleReject(req.id)}
                                    title="Tolak Request"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 h-8 px-3"
                                    onClick={() => openApproveModal(req)}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1.5" />{" "}
                                    Approve
                                  </Button>
                                </>
                              )}

                              {/* JIKA OWNER: HANYA BISA BATALKAN REQUEST SENDIRI (GAK BISA APPROVE) */}
                              {authState.role === "owner" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-700 h-8 text-xs"
                                  onClick={() => handleReject(req.id)}
                                >
                                  Batalkan
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              Selesai
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PENYUSUTAN (DEPRECIATION) */}
        <TabsContent value="depreciation" className="mt-0 space-y-6">
          <Card className="border-l-4 border-l-indigo-600 shadow-md bg-indigo-50/30">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                    <PlayCircle className="w-5 h-5 text-indigo-600" /> Proses
                    Closing Aset Bulanan
                  </h3>
                  <p className="text-sm text-slate-600 max-w-xl leading-relaxed">
                    Sistem akan menghitung penyusutan (depresiasi) untuk semua
                    aset aktif dan mencatatnya sebagai
                    <span className="font-bold text-red-600">
                      {" "}
                      Beban Operasional
                    </span>{" "}
                    di Laporan Laba Rugi periode terpilih.
                  </p>
                </div>

                <div className="flex items-end gap-3 bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Pilih Periode
                    </label>
                    <Input
                      type="month"
                      value={depreciationPeriod}
                      onChange={(e) => setDepreciationPeriod(e.target.value)}
                      className="bg-white border-slate-300 h-9"
                    />
                  </div>
                  <Button
                    onClick={handleRunDepreciation}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 h-9"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Jalankan Closing"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b bg-slate-50">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <History className="w-4 h-4" /> Riwayat Penyusutan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-slate-100">
                  {depreciationLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan="3"
                        className="p-8 text-center text-slate-500"
                      >
                        Belum ada riwayat penyusutan.
                      </td>
                    </tr>
                  ) : (
                    depreciationLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-4 font-mono text-slate-600 text-xs w-[150px]">
                          {new Date(log.period_date).toLocaleDateString(
                            "id-ID",
                            { year: "numeric", month: "long" },
                          )}
                        </td>
                        <td className="p-4 font-medium text-slate-800">
                          {log.asset_name || "Aset Terhapus"}
                          <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">
                            {log.asset_category}
                          </div>
                        </td>
                        <td className="p-4 text-right text-red-600 font-mono font-medium">
                          - {formatRupiah(log.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: REQUEST ASET BARU */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Aset Baru</DialogTitle>
            <DialogDescription>
              Isi detail kebutuhan aset untuk cabang.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-700">
                Nama Barang
              </label>
              <Input
                placeholder="Contoh: Macbook Air M1"
                value={newRequest.name}
                onChange={(e) =>
                  setNewRequest({ ...newRequest, name: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">
                Untuk Cabang
              </label>
              <Select
                onValueChange={(val) =>
                  setNewRequest({ ...newRequest, branch_id: val })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">
                Estimasi Harga (Rp)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={newRequest.estimated_price}
                onChange={(e) =>
                  setNewRequest({
                    ...newRequest,
                    estimated_price: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div className="col-span-2 bg-slate-50 p-3 rounded border border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" /> Estimasi Penyusutan (Opsional)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold">
                    Umur Ekonomis (Thn)
                  </label>
                  <Input
                    type="number"
                    className="h-8 text-xs bg-white"
                    value={newRequest.useful_life_years}
                    onChange={(e) =>
                      setNewRequest({
                        ...newRequest,
                        useful_life_years: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold">
                    Nilai Sisa (Rp)
                  </label>
                  <Input
                    type="number"
                    className="h-8 text-xs bg-white"
                    value={newRequest.residual_value}
                    onChange={(e) =>
                      setNewRequest({
                        ...newRequest,
                        residual_value: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-700">
                Deskripsi / Spek
              </label>
              <Textarea
                placeholder="Spesifikasi detail..."
                value={newRequest.description}
                onChange={(e) =>
                  setNewRequest({ ...newRequest, description: e.target.value })
                }
                className="mt-1 resize-none h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmitRequest}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Kirim Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: INPUT ASET LAMA (LEGACY) - UTK DATA AWAL */}
      <Dialog open={isLegacyModalOpen} onOpenChange={setIsLegacyModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-orange-700 flex items-center gap-2">
              <Archive className="w-5 h-5" /> Input Saldo Awal Aset
            </DialogTitle>
            <DialogDescription>
              Gunakan ini untuk mencatat aset yang{" "}
              <b>SUDAH DIBELI SEBELUMNYA</b>. Data ini tidak akan membuat
              tagihan hutang baru.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <label className="text-xs font-bold">Nama Aset</label>
              <Input
                value={legacyAsset.name}
                onChange={(e) =>
                  setLegacyAsset({ ...legacyAsset, name: e.target.value })
                }
                placeholder="Cth: Mesin Cuci Samsung 2022"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold">Lokasi Cabang</label>
              <Select
                onValueChange={(val) =>
                  setLegacyAsset({ ...legacyAsset, branch_id: val })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih Cabang" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold">Kategori</label>
              <Select
                onValueChange={(val) =>
                  setLegacyAsset({ ...legacyAsset, category: val })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mesin">Mesin</SelectItem>
                  <SelectItem value="Kendaraan">Kendaraan</SelectItem>
                  <SelectItem value="Elektronik">Elektronik</SelectItem>
                  <SelectItem value="Furniture">Furniture</SelectItem>
                  <SelectItem value="Bangunan">Bangunan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold">
                Tanggal Pembelian Dulu
              </label>
              <Input
                type="date"
                value={legacyAsset.purchase_date}
                onChange={(e) =>
                  setLegacyAsset({
                    ...legacyAsset,
                    purchase_date: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold">
                Harga Beli (Perolehan)
              </label>
              <Input
                type="number"
                value={legacyAsset.purchase_price}
                onChange={(e) =>
                  setLegacyAsset({
                    ...legacyAsset,
                    purchase_price: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div className="col-span-2 border-t pt-4 mt-2">
              <h4 className="font-bold text-sm text-slate-700 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Setting Penyusutan
              </h4>
            </div>

            <div>
              <label className="text-xs font-bold">Umur Ekonomis (Tahun)</label>
              <Input
                type="number"
                value={legacyAsset.useful_life_years}
                onChange={(e) =>
                  setLegacyAsset({
                    ...legacyAsset,
                    useful_life_years: e.target.value,
                  })
                }
                className="mt-1"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Elektronik ~4 thn, Mesin ~8 thn
              </p>
            </div>
            <div>
              <label className="text-xs font-bold">Nilai Sisa (Residu)</label>
              <Input
                type="number"
                value={legacyAsset.residual_value}
                onChange={(e) =>
                  setLegacyAsset({
                    ...legacyAsset,
                    residual_value: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-bold">Deskripsi</label>
              <Textarea
                value={legacyAsset.description}
                onChange={(e) =>
                  setLegacyAsset({
                    ...legacyAsset,
                    description: e.target.value,
                  })
                }
                className="mt-1 h-16"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleLegacySubmit}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Archive className="w-4 h-4 mr-2" /> Simpan Saldo Awal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: FINANCE APPROVAL (PEMBELIAN BARU) */}
      <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-700 flex items-center gap-2">
              <Wallet className="w-5 h-5" /> Approve Pembelian Aset
            </DialogTitle>
            <DialogDescription>
              Aksi ini akan mencatat aset baru dan membuat tagihan hutang ke
              supplier (Account Payable).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-slate-50 p-3 rounded text-sm border border-slate-200">
              <div className="flex justify-between border-b pb-2 mb-2">
                <span className="text-slate-500">Item:</span>
                <span className="font-bold">{selectedRequest?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estimasi User:</span>
                <span className="font-mono">
                  {formatRupiah(selectedRequest?.estimated_price)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">
                Harga Realisasi (Sesuai Invoice Vendor)
              </label>
              <Input
                type="number"
                value={approvalData.real_price}
                onChange={(e) =>
                  setApprovalData({
                    ...approvalData,
                    real_price: e.target.value,
                  })
                }
                className="font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">
                Pilih Vendor / Supplier
              </label>
              <Select
                value={approvalData.supplier_id}
                onValueChange={(val) =>
                  setApprovalData({ ...approvalData, supplier_id: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">
                Jatuh Tempo Pembayaran
              </label>
              <Input
                type="date"
                value={approvalData.due_date}
                onChange={(e) =>
                  setApprovalData({ ...approvalData, due_date: e.target.value })
                }
              />
            </div>

            {/* Finance bisa override umur ekonomis jika perlu */}
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="col-span-2">
                <h4 className="font-bold text-xs text-slate-500 uppercase">
                  Konfirmasi Penyusutan
                </h4>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">
                  Umur (Thn)
                </label>
                <Input
                  type="number"
                  value={approvalData.useful_life_years}
                  onChange={(e) =>
                    setApprovalData({
                      ...approvalData,
                      useful_life_years: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">
                  Residu (Rp)
                </label>
                <Input
                  type="number"
                  value={approvalData.residual_value}
                  onChange={(e) =>
                    setApprovalData({
                      ...approvalData,
                      residual_value: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              onClick={handleExecuteApproval}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Approve & Catat Hutang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
