// src/pages/LayananManagementPage.jsx (VERSI UI/UX UPDATE - VISUAL ZONING)

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit,
  MoreVertical,
  Loader2,
  Download,
  Store,
  Package, // Icon Paket
  Layers, // Icon Layanan
} from "lucide-react";

// Impor komponen UI (Pastikan path import sesuai dengan project lu)
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog.jsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/Alert-dialog.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown-menu.jsx";
import { Checkbox } from "@/components/ui/Checkbox.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge"; // Optional: Jika ada badge component

const ActionMenu = ({ onEdit, onDelete, type }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={onEdit}>
        <Edit className="mr-2 h-4 w-4" />
        <span>Edit {type}</span>
      </DropdownMenuItem>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Hapus {type}</span>
          </DropdownMenuItem>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {type} ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Aksi ini akan menghapus data {type} ini beserta turunannya secara
              permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenuContent>
  </DropdownMenu>
);

function LayananManagementPage() {
  const { authState } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCSV, setLoadingCSV] = useState(false);
  const [branches, setBranches] = useState([]);
  const [branchConfig, setBranchConfig] = useState({});
  const [modalState, setModalState] = useState({
    type: null,
    data: null,
    isOpen: false,
  });
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LOGIC FETCHING (TIDAK BERUBAH) ---
  const fetchData = useCallback(async () => {
    if (!authState.business_id) return;
    try {
      setLoading(true);
      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select(`*, services (*, packages (*))`)
        .eq("business_id", authState.business_id)
        .order("urutan", { ascending: true })
        .order("name", { ascending: true })
        .order("urutan", { foreignTable: "services", ascending: true })
        .order("name", { foreignTable: "services", ascending: true })
        .order("urutan", {
          foreignTable: "services.packages",
          ascending: true,
        })
        .order("name", {
          foreignTable: "services.packages",
          ascending: true,
        });

      if (catError) throw catError;
      setCategories(catData);

      const { data: branchData } = await supabase
        .from("branches")
        .select("id, name")
        .eq("business_id", authState.business_id);

      setBranches(branchData || []);
    } catch (err) {
      toast.error("Gagal mengambil data layanan.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authState.business_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- LOGIC CSV (TIDAK BERUBAH) ---
  const handleDownloadCSV = async () => {
    if (!authState.isReady || !authState.business_id || loadingCSV) return;
    setLoadingCSV(true);
    try {
      const { data, error } = await supabase.rpc("get_services_for_csv", {
        p_business_id: authState.business_id,
      });
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info("Tidak ada data layanan/paket untuk di-download.");
        return;
      }
      const headers = [
        "Kategori",
        "Layanan",
        "Nama Paket",
        "Harga (Rp)",
        "Satuan",
        "Estimasi Waktu",
        "Estimasi Jam",
        "Minimal Order",
      ];
      const escapeCsvValue = (value) => {
        if (value === null || typeof value === "undefined") return "";
        const stringValue = String(value);
        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };
      const csvData = data.map((row) => [
        row.nama_kategori,
        row.nama_layanan,
        row.nama_paket,
        row.harga,
        row.satuan,
        row.estimasi_waktu,
        row.estimasi_jam,
        row.minimal_order,
      ]);
      const headerString = headers.map(escapeCsvValue).join(",");
      const dataString = csvData
        .map((row) => row.map(escapeCsvValue).join(","))
        .join("\n");
      const csvContent =
        "\ufeff" + "sep=,\n" + headerString + "\n" + dataString;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      const today = new Date().toISOString().split("T")[0];
      const fileName = `Layanan_${today}.csv`;
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Gagal download CSV Layanan:", error);
      toast.error(error.message || "Gagal mengunduh data layanan.");
    } finally {
      setLoadingCSV(false);
    }
  };

  // --- LOGIC MODAL (TIDAK BERUBAH) ---
  const handleOpenModal = async (type, data = {}) => {
    setModalState({ type, data, isOpen: true });
    setBranchConfig({}); // Reset

    if (type.startsWith("new_")) {
      if (type === "new_kategori" || type === "new_layanan") {
        setFormData({ name: "" });
      } else if (type === "new_paket") {
        setFormData({
          name: "",
          price: "",
          unit: "",
          time_estimation: "",
          min_order: "",
          estimation_in_hours: "",
          urutan: formData.urutan || 0,
        });
      } else {
        setFormData({});
      }
    } else {
      setFormData(data);
      if (type === "edit_paket") {
        const { data: configs } = await supabase
          .from("package_branch_prices")
          .select("branch_id, price, is_active")
          .eq("package_id", data.id);

        if (configs) {
          const configMap = {};
          configs.forEach((c) => {
            configMap[c.branch_id] = {
              price: c.price,
              is_active: c.is_active,
            };
          });
          setBranchConfig(configMap);
        }
      }
    }
  };

  const handleCloseModal = () => {
    setModalState({ type: null, data: null, isOpen: false });
    setFormData({});
    setBranchConfig({});
  };

  const handleFormChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleBranchConfigChange = (branchId, field, value) => {
    setBranchConfig((prev) => ({
      ...prev,
      [branchId]: {
        ...prev[branchId],
        [field]: value,
      },
    }));
  };

  // --- LOGIC SUBMIT (TIDAK BERUBAH) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { type, data: modalData } = modalState;
    setIsSubmitting(true);

    try {
      let error;
      const business_id = authState.business_id;

      if (type === "new_kategori") {
        ({ error } = await supabase.from("categories").insert({
          name: formData.name,
          business_id,
          urutan: formData.urutan || 0,
        }));
      } else if (type === "edit_kategori") {
        ({ error } = await supabase
          .from("categories")
          .update({ name: formData.name, urutan: formData.urutan || 0 })
          .eq("id", modalData.id)
          .eq("business_id", business_id));
      } else if (type === "new_layanan") {
        ({ error } = await supabase.from("services").insert({
          name: formData.name,
          category_id: modalData.id,
          business_id,
          urutan: formData.urutan || 0,
        }));
      } else if (type === "edit_layanan") {
        ({ error } = await supabase
          .from("services")
          .update({ name: formData.name, urutan: formData.urutan || 0 })
          .eq("id", modalData.id)
          .eq("business_id", business_id));
      } else if (type === "new_paket") {
        ({ error } = await supabase.from("packages").insert({
          name: formData.name,
          price: formData.price,
          unit: formData.unit,
          time_estimation: formData.time_estimation,
          min_order: formData.min_order,
          service_id: modalData.id,
          business_id,
          estimation_in_hours: formData.estimation_in_hours,
          urutan: formData.urutan || 0,
          is_prioritas: formData.is_prioritas || false,
        }));
      } else if (type === "edit_paket") {
        ({ error } = await supabase
          .from("packages")
          .update({
            name: formData.name,
            price: formData.price,
            unit: formData.unit,
            time_estimation: formData.time_estimation,
            min_order: formData.min_order,
            estimation_in_hours: formData.estimation_in_hours,
            urutan: formData.urutan || 0,
            is_prioritas: formData.is_prioritas || false,
          })
          .eq("id", modalData.id)
          .eq("business_id", business_id));

        if (error) throw error;

        const configInserts = branches.map((branch) => {
          const config = branchConfig[branch.id] || {};
          return {
            business_id,
            branch_id: branch.id,
            package_id: modalData.id,
            price: config.price ? parseFloat(config.price) : 0,
            is_active: config.is_active !== undefined ? config.is_active : true,
          };
        });

        const { error: configError } = await supabase
          .from("package_branch_prices")
          .upsert(configInserts, { onConflict: "branch_id, package_id" });

        if (configError) throw configError;
      }

      if (error) throw error;
      toast.success("Data berhasil disimpan!");
      handleCloseModal();
      fetchData();
    } catch (err) {
      toast.error(`Gagal memproses data: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- LOGIC DELETE (TIDAK BERUBAH) ---
  const handleDelete = async (type, id) => {
    try {
      let error;
      const business_id = authState.business_id;
      if (type === "kategori") {
        ({ error } = await supabase
          .from("categories")
          .delete()
          .eq("id", id)
          .eq("business_id", business_id));
      } else if (type === "layanan") {
        ({ error } = await supabase
          .from("services")
          .delete()
          .eq("id", id)
          .eq("business_id", business_id));
      } else if (type === "paket") {
        ({ error } = await supabase
          .from("packages")
          .delete()
          .eq("id", id)
          .eq("business_id", business_id));
      }
      if (error) throw error;
      toast.success(`Data ${type} berhasil dihapus.`);
      fetchData();
    } catch (err) {
      toast.error(`Gagal menghapus ${type}: ${err.message}`);
    }
  };

  if (loading)
    return (
      <div className="flex h-[50vh] items-center justify-center flex-col gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Memuat data layanan...</p>
      </div>
    );

  return (
    <div className="pb-20 container mx-auto max-w-6xl">
      {/* HEADER PAGE */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manajemen Layanan
          </h1>
          <p className="text-muted-foreground mt-1">
            Atur Kategori, Layanan, dan Paket Harga untuk outlet laundry.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDownloadCSV}
            disabled={loading || loadingCSV || categories.length === 0}
            variant="outline"
            className="hidden sm:flex"
          >
            {loadingCSV ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}{" "}
            Export CSV
          </Button>
          <Button onClick={() => handleOpenModal("new_kategori")}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Kategori
          </Button>
        </div>
      </div>

      {/* EMPTY STATE */}
      {!loading && categories.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed rounded-xl bg-slate-50">
          <Layers className="h-10 w-10 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">
            Belum ada kategori
          </h3>
          <p className="text-slate-500 mb-4">
            Mulai dengan membuat kategori layanan baru.
          </p>
          <Button onClick={() => handleOpenModal("new_kategori")}>
            Buat Kategori Baru
          </Button>
        </div>
      )}

      {/* CONTENT LIST */}
      <div className="space-y-8">
        {categories?.map((kategori) => (
          // LEVEL 1: KATEGORI (CARD UTAMA)
          <Card
            key={kategori.id}
            className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow"
          >
            <CardHeader className="flex flex-row items-start justify-between pb-2 border-b">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  {kategori.name}
                </CardTitle>
                <CardDescription>
                  {kategori.services?.length || 0} Layanan di kategori ini
                </CardDescription>
              </div>
              <ActionMenu
                type="Kategori"
                onEdit={() => handleOpenModal("edit_kategori", kategori)}
                onDelete={() => handleDelete("kategori", kategori.id)}
              />
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* LEVEL 2: LAYANAN (CONTAINER ABU-ABU) */}
              {kategori.services?.map((layanan) => (
                <div
                  key={layanan.id}
                  className="bg-slate-50/80 rounded-lg border border-slate-200 overflow-hidden"
                >
                  {/* HEADER LAYANAN */}
                  <div className="px-4 py-3 flex justify-between items-center bg-slate-100/50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-slate-800">
                        {layanan.name}
                      </h3>
                    </div>
                    <ActionMenu
                      type="Layanan"
                      onEdit={() => handleOpenModal("edit_layanan", layanan)}
                      onDelete={() => handleDelete("layanan", layanan.id)}
                    />
                  </div>

                  {/* AREA PAKET */}
                  <div className="p-4">
                    <div className="space-y-3">
                      {/* LEVEL 3: PAKET (ITEM PUTIH) */}
                      {layanan.packages?.map((paket) => (
                        <div
                          key={paket.id}
                          className="group bg-background p-3 rounded-md border shadow-sm hover:border-primary/50 transition-all flex justify-between items-center"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900">
                                {paket.name}
                              </p>
                              {paket.is_prioritas && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-5"
                                >
                                  Prioritas
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground gap-3 mt-1">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                                {paket.time_estimation}
                              </span>
                              <span>
                                Rp {paket.price.toLocaleString("id-ID")} /{" "}
                                {paket.unit}
                              </span>
                            </div>
                          </div>

                          <ActionMenu
                            type="Paket"
                            onEdit={() => handleOpenModal("edit_paket", paket)}
                            onDelete={() => handleDelete("paket", paket.id)}
                          />
                        </div>
                      ))}

                      {(!layanan.packages || layanan.packages.length === 0) && (
                        <p className="text-sm text-center text-muted-foreground py-2 italic">
                          Belum ada paket harga.
                        </p>
                      )}
                    </div>

                    {/* TOMBOL TAMBAH PAKET */}
                    <div className="mt-4 pt-3 border-t border-slate-200 border-dashed">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-slate-500 hover:text-primary hover:bg-white border border-dashed border-slate-300 hover:border-primary"
                        onClick={() => handleOpenModal("new_paket", layanan)}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Tambah Paket di{" "}
                        {layanan.name}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {(!kategori.services || kategori.services.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  Belum ada layanan di kategori ini.
                </p>
              )}

              {/* TOMBOL TAMBAH LAYANAN (DASHED BESAR) */}
              <Button
                variant="outline"
                className="w-full border-2 border-dashed border-slate-200 text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 h-12"
                onClick={() => handleOpenModal("new_layanan", kategori)}
              >
                <Plus className="mr-2 h-5 w-5" /> Tambah Layanan Baru di{" "}
                {kategori.name}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* --- MODAL DIALOG (LOGIC & ISI TETAP SAMA) --- */}
      <Dialog open={modalState.isOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {modalState.type?.startsWith("edit_")
                ? `Edit ${modalState.type.split("_")[1]}`
                : `Tambah ${modalState.type?.split("_")[1]} Baru`}
            </DialogTitle>
          </DialogHeader>

          {modalState.type === "edit_paket" ? (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Info Dasar</TabsTrigger>
                <TabsTrigger value="branch">Config Cabang</TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <TabsContent value="info" className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nama Paket</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleFormChange}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Harga Default</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      value={formData.price || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="unit">Satuan</Label>
                      <Input
                        id="unit"
                        name="unit"
                        value={formData.unit || ""}
                        onChange={handleFormChange}
                        placeholder="Kg/Pcs"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="min_order">Min. Order</Label>
                      <Input
                        id="min_order"
                        name="min_order"
                        type="number"
                        value={formData.min_order || ""}
                        onChange={handleFormChange}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="time_estimation">Estimasi</Label>
                      <Input
                        id="time_estimation"
                        name="time_estimation"
                        value={formData.time_estimation || ""}
                        onChange={handleFormChange}
                        placeholder="2-3 Hari"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="estimation_in_hours">Jam</Label>
                      <Input
                        id="estimation_in_hours"
                        name="estimation_in_hours"
                        type="number"
                        value={formData.estimation_in_hours || ""}
                        onChange={handleFormChange}
                        placeholder="48"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="urutan">Urutan</Label>
                    <Input
                      id="urutan"
                      name="urutan"
                      type="number"
                      value={formData.urutan || ""}
                      onChange={handleFormChange}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_prioritas"
                      checked={formData.is_prioritas || false}
                      onCheckedChange={(checked) =>
                        handleFormChange({
                          target: { name: "is_prioritas", value: !!checked },
                        })
                      }
                    />
                    <Label htmlFor="is_prioritas">Prioritas (Daily)</Label>
                  </div>
                </TabsContent>

                <TabsContent
                  value="branch"
                  className="space-y-4 max-h-[400px] overflow-y-auto pr-2"
                >
                  <div className="bg-blue-50 p-3 rounded-md mb-2 text-sm text-blue-800">
                    <p>
                      Atur harga khusus dan ketersediaan layanan di tiap cabang.
                    </p>
                  </div>
                  {branches.map((branch) => {
                    const config = branchConfig[branch.id] || {};
                    const isActive =
                      config.is_active !== undefined ? config.is_active : true;

                    return (
                      <div
                        key={branch.id}
                        className="flex items-center justify-between border-b pb-3 mb-2"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-slate-500" />
                            <Label className="font-medium text-base">
                              {branch.name}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`active-${branch.id}`}
                              checked={isActive}
                              onCheckedChange={(checked) =>
                                handleBranchConfigChange(
                                  branch.id,
                                  "is_active",
                                  !!checked,
                                )
                              }
                            />
                            <Label
                              htmlFor={`active-${branch.id}`}
                              className={`text-xs cursor-pointer ${
                                isActive ? "text-green-600" : "text-slate-400"
                              }`}
                            >
                              {isActive ? "Tampil di POS" : "Sembunyikan"}
                            </Label>
                          </div>
                        </div>

                        <div
                          className={`flex items-center gap-2 ${
                            !isActive ? "opacity-50 pointer-events-none" : ""
                          }`}
                        >
                          <span className="text-sm text-muted-foreground">
                            Rp
                          </span>
                          <Input
                            type="number"
                            className="w-32 text-right"
                            placeholder={formData.price}
                            value={config.price || ""}
                            onChange={(e) =>
                              handleBranchConfigChange(
                                branch.id,
                                "price",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCloseModal}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Simpan Perubahan"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Tabs>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              {(modalState.type === "new_kategori" ||
                modalState.type === "edit_kategori") && (
                <>
                  <div>
                    <Label htmlFor="name">Nama Kategori</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleFormChange}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label htmlFor="urutan">Nomor Urut</Label>
                    <Input
                      id="urutan"
                      name="urutan"
                      type="number"
                      value={formData.urutan || ""}
                      onChange={handleFormChange}
                    />
                  </div>
                </>
              )}
              {(modalState.type === "new_layanan" ||
                modalState.type === "edit_layanan") && (
                <>
                  <div>
                    <Label htmlFor="name">Nama Layanan</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleFormChange}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label htmlFor="urutan">Nomor Urut</Label>
                    <Input
                      id="urutan"
                      name="urutan"
                      type="number"
                      value={formData.urutan || ""}
                      onChange={handleFormChange}
                    />
                  </div>
                </>
              )}
              {modalState.type === "new_paket" && (
                <>
                  <div>
                    <Label htmlFor="name">Nama Paket</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleFormChange}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Harga Default</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      value={formData.price || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="unit">Satuan</Label>
                      <Input
                        id="unit"
                        name="unit"
                        value={formData.unit || ""}
                        onChange={handleFormChange}
                        placeholder="Kg/Pcs"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="min_order">Min. Order</Label>
                      <Input
                        id="min_order"
                        name="min_order"
                        type="number"
                        value={formData.min_order || ""}
                        onChange={handleFormChange}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="time_estimation">Estimasi</Label>
                      <Input
                        id="time_estimation"
                        name="time_estimation"
                        value={formData.time_estimation || ""}
                        onChange={handleFormChange}
                        placeholder="2-3 Hari"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="estimation_in_hours">Jam</Label>
                      <Input
                        id="estimation_in_hours"
                        name="estimation_in_hours"
                        type="number"
                        value={formData.estimation_in_hours || ""}
                        onChange={handleFormChange}
                        placeholder="48"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="urutan">Urutan</Label>
                    <Input
                      id="urutan"
                      name="urutan"
                      type="number"
                      value={formData.urutan || ""}
                      onChange={handleFormChange}
                      placeholder="0"
                    />
                  </div>
                </>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Simpan"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LayananManagementPage;
