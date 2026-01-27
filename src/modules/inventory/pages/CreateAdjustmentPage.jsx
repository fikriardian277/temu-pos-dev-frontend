import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  UploadCloud,
  Loader2,
  FileImage,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";

export default function CreateAdjustmentPage() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Data Master
  const [warehouses, setWarehouses] = useState([]);
  const [productList, setProductList] = useState([]);

  // --- SETTING DINAMIS DARI DATABASE ---
  const [driveFolderId, setDriveFolderId] = useState(null);
  const [scriptUrl, setScriptUrl] = useState(null);

  // Header State
  const [selectedWh, setSelectedWh] = useState("");
  const [reasonCategory, setReasonCategory] = useState("Damaged");
  const [notes, setNotes] = useState("");

  // Item Input State
  const [selectedProduct, setSelectedProduct] = useState("");
  const [adjType, setAdjType] = useState("minus"); // minus/plus
  const [qty, setQty] = useState(1);
  const [itemNote, setItemNote] = useState("");

  const [cart, setCart] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // --- STATE UPLOAD BUKTI (MULTI FILE) ---
  const [files, setFiles] = useState([]);

  // HELPER: Ekstrak ID Folder dari Link Drive
  const extractFolderId = (url) => {
    if (!url) return null;
    const match = url.match(/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  // 1. Fetch Gudang & Settings (Sekaligus saat mount)
  useEffect(() => {
    const initData = async () => {
      if (!authState.business_id) return;

      // A. Fetch Warehouses
      const { data: whData } = await supabase
        .schema("inventory")
        .from("warehouses")
        .select("*")
        .eq("business_id", authState.business_id)
        .eq("is_active", true);

      // Security Check: Admin hanya lihat gudang sendiri
      if (authState.role !== "owner" && whData) {
        const myWh = whData.find((w) => w.branch_id === authState.branch_id);
        if (myWh) {
          setWarehouses([myWh]);
          setSelectedWh(myWh.id);
        } else {
          toast.error("Akun tidak terhubung gudang manapun.");
        }
      } else {
        setWarehouses(whData || []);
      }

      // B. Fetch Settings (Ambil URL Script & Link Folder)
      const { data: settingData } = await supabase
        .from("settings")
        .select("proof_drive_link, google_script_url")
        .eq("business_id", authState.business_id)
        .single();

      if (settingData) {
        // Set Script URL
        if (settingData.google_script_url) {
          setScriptUrl(settingData.google_script_url);
        }
        // Set Folder ID
        if (settingData.proof_drive_link) {
          const extractedId = extractFolderId(settingData.proof_drive_link);
          if (extractedId) setDriveFolderId(extractedId);
        }
      }
    };
    initData();
  }, [authState.business_id, authState.role, authState.branch_id]);

  // 2. Fetch Produk berdasarkan Gudang Terpilih
  useEffect(() => {
    if (!selectedWh) {
      setProductList([]);
      return;
    }
    const fetchStock = async () => {
      const { data } = await supabase
        .schema("inventory")
        .from("inventory_items")
        .select("product_id, quantity, products(name, unit, sku)")
        .eq("warehouse_id", selectedWh);
      setProductList(data || []);
      setCart([]); // Reset cart jika ganti gudang
    };
    fetchStock();
  }, [selectedWh]);

  // --- FUNGSI UPLOAD KE GOOGLE DRIVE (REAL VIA GAS) ---
  const handleFileChange = (e) => {
    const newSelected = Array.from(e.target.files);
    if (!newSelected.length) return;

    // Validasi Limit
    if (files.length + newSelected.length > 3) {
      return toast.error("Maksimal 3 foto.");
    }

    // Validasi Size & Buat Object File
    const validFiles = newSelected
      .filter((f) => f.size <= 5 * 1024 * 1024)
      .map((f) => ({
        id: Date.now() + Math.random(),
        file: f, // File mentah disimpan disini
        name: f.name,
        status: "pending", // Status 'pending' belum upload
        url: "",
      }));

    if (validFiles.length < newSelected.length) {
      toast.error("Beberapa file terlalu besar (Max 5MB).");
    }

    setFiles((prev) => [...prev, ...validFiles]);
    e.target.value = null;
  };

  const handleRemoveFile = (id) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  // 3. Add Item ke Cart
  const handleAddItem = () => {
    if (!selectedProduct || qty <= 0)
      return toast.error("Data item tidak valid.");

    const stockItem = productList.find((i) => i.product_id == selectedProduct);
    if (!stockItem) return;

    // Tentukan nilai positif atau negatif
    const finalQty = adjType === "minus" ? -Math.abs(qty) : Math.abs(qty);

    // Validasi Stok (Tidak boleh mengurangi melebihi sisa stok)
    if (finalQty < 0 && Math.abs(finalQty) > stockItem.quantity) {
      return toast.error(
        `Stok tidak cukup untuk dikurangi! Sisa: ${stockItem.quantity}`,
      );
    }

    setCart([
      ...cart,
      {
        product_id: stockItem.product_id,
        name: stockItem.products.name,
        unit: stockItem.products.unit,
        current_qty: stockItem.quantity,
        adj_type: adjType,
        qty_input: parseFloat(qty),
        qty_diff: finalQty,
        note: itemNote,
      },
    ]);

    // Reset Form Item
    setSelectedProduct("");
    setQty(1);
    setItemNote("");
  };

  // 4. Pre-Submit Check
  const handlePreSubmit = () => {
    if (!selectedWh) return toast.error("Pilih Gudang terlebih dahulu.");
    if (cart.length === 0) return toast.error("Daftar item masih kosong.");
    setConfirmOpen(true);
  };

  // 5. Final Submit ke Database
  const handleConfirmSubmit = async () => {
    setLoading(true);
    const toastId = toast.loading("Sedang mengupload bukti & menyimpan...");

    try {
      // A. CEK & UPLOAD FILE DULU
      let finalUrls = [];

      // Filter file yang belum diupload
      const pendingFiles = files.filter((f) => f.status === "pending");
      const alreadyUploadedUrls = files
        .filter((f) => f.status === "done")
        .map((f) => f.url);

      if (pendingFiles.length > 0) {
        // Validasi Setting Drive
        if (!scriptUrl || !driveFolderId) {
          throw new Error("Link Google Script/Drive belum disetting!");
        }

        // Proses Upload Paralel
        const uploadPromises = pendingFiles.map(async (entry) => {
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(entry.file);
          });

          const response = await fetch(scriptUrl, {
            method: "POST",
            body: JSON.stringify({
              filename: `adj_${Date.now()}_${entry.name}`,
              mimeType: entry.file.type,
              base64: base64,
              targetFolderId: driveFolderId,
              folderType: "adjustment",
            }),
          });

          const result = await response.json();
          if (result.status !== "success")
            throw new Error("Gagal upload ke Drive");
          return result.url;
        });

        // Tunggu semua upload selesai
        const newUrls = await Promise.all(uploadPromises);
        finalUrls = [...alreadyUploadedUrls, ...newUrls];
      } else {
        finalUrls = alreadyUploadedUrls;
      }

      // B. SIMPAN KE DATABASE
      const { data: docNumber } = await supabase.rpc("generate_doc_number", {
        p_business_id: authState.business_id,
        p_type: "ADJ",
      });

      const { data: header, error: headErr } = await supabase
        .schema("inventory")
        .from("adjustments")
        .insert({
          business_id: authState.business_id,
          adjustment_number: docNumber,
          warehouse_id: selectedWh,
          status: "draft",
          reason_category: reasonCategory,
          notes: notes,
          proof_link: JSON.stringify(finalUrls), // Link hasil upload tadi
          created_by: authState.user.id,
        })
        .select()
        .single();

      if (headErr) throw headErr;

      // Insert Items
      const itemsPayload = cart.map((i) => ({
        business_id: authState.business_id,
        adjustment_id: header.id,
        product_id: i.product_id,
        qty_diff: i.qty_diff,
        notes: i.note,
      }));

      const { error: itemErr } = await supabase
        .schema("inventory")
        .from("adjustment_items")
        .insert(itemsPayload);
      if (itemErr) throw itemErr;

      toast.dismiss(toastId);
      toast.success("Berhasil! Draft tersimpan.");
      navigate("/inventory/adjustments");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Gagal: " + err.message);
      setConfirmOpen(false); // Tutup modal biar bisa coba lagi
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      {/* HEADER PAGE */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-red-900">
            Koreksi Stok (Opname)
          </h1>
          <p className="text-muted-foreground">
            Penyesuaian stok fisik dan sistem (Selisih/Rusak/Hilang).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PANEL KIRI: INFO UTAMA & UPLOAD */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Gudang</Label>
                <select
                  className="w-full p-2 border rounded bg-background disabled:bg-muted focus:ring-2 focus:ring-red-200 outline-none transition-all"
                  value={selectedWh}
                  onChange={(e) => setSelectedWh(e.target.value)}
                  disabled={
                    authState.role !== "owner" && warehouses.length === 1
                  }
                >
                  <option value="">-- Pilih --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Kategori Alasan</Label>
                <Select
                  value={reasonCategory}
                  onValueChange={setReasonCategory}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Damaged">
                      Barang Rusak / Expired
                    </SelectItem>
                    <SelectItem value="Lost">Barang Hilang</SelectItem>
                    <SelectItem value="Found">
                      Barang Ditemukan (Lebih)
                    </SelectItem>
                    <SelectItem value="Opname">Selisih Stock Opname</SelectItem>
                    <SelectItem value="Other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* --- AREA UPLOAD MULTI FILE (Dinamis) --- */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex justify-between items-center">
                  <Label>Bukti Foto / Dokumen</Label>
                  <span className="text-xs text-muted-foreground">
                    {files.length}/3 Uploaded
                  </span>
                </div>

                {/* List File Terupload */}
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="border rounded-lg p-3 bg-slate-50 flex items-center justify-between animate-in fade-in"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-10 w-10 bg-white rounded border flex items-center justify-center shrink-0">
                          {file.status === "uploading" ? (
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                          ) : (
                            <FileImage className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate max-w-[150px]">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {file.status === "pending"
                              ? "Menunggu Simpan..."
                              : "Tersimpan"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFile(file.id)}
                        className="shrink-0 text-red-500 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Tombol Upload (Hanya jika < 3 file) */}
                {files.length < 3 && (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center gap-1">
                      <UploadCloud className="h-6 w-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      <p className="text-sm text-slate-600 font-medium">
                        {files.length === 0
                          ? "Upload ke Google Drive"
                          : "Tambah foto lagi"}
                      </p>

                      {/* Indikator Status Koneksi Drive */}
                      {scriptUrl && driveFolderId ? (
                        <div className="flex items-center gap-1 text-[10px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
                          Drive Connected
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          Drive Not Configured
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Catatan Global</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan tambahan untuk owner..."
                />
              </div>
            </CardContent>
          </Card>

          {/* INPUT BARANG */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-slate-800 flex gap-2">
                <Plus className="h-4 w-4" /> Input Item
              </h3>
              <div className="space-y-2">
                <Label>Produk</Label>
                <select
                  className="w-full p-2 border rounded bg-background focus:ring-2 focus:ring-red-100 outline-none"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <option value="">-- Cari Produk --</option>
                  {productList.map((item) => (
                    <option key={item.product_id} value={item.product_id}>
                      {item.products.name} (Sisa: {item.quantity}{" "}
                      {item.products.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipe Koreksi</Label>
                  <Select value={adjType} onValueChange={setAdjType}>
                    <SelectTrigger
                      className={
                        adjType === "minus"
                          ? "text-red-600 font-bold border-red-200 bg-red-50"
                          : "text-green-600 font-bold border-green-200 bg-green-50"
                      }
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="minus"
                        className="text-red-600 font-medium"
                      >
                        PENGURANGAN (-)
                      </SelectItem>
                      <SelectItem
                        value="plus"
                        className="text-green-600 font-medium"
                      >
                        PENAMBAHAN (+)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jumlah</Label>
                  <Input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    min="0.1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Keterangan Item (Opsional)</Label>
                <Input
                  placeholder="Cth: Pecah saat display"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleAddItem}
                disabled={!selectedProduct}
              >
                Tambahkan ke List
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* PANEL KANAN: LIST CART */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col shadow-md">
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="bg-slate-100/50 p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  Daftar Item Koreksi
                </h3>
                <span className="text-xs bg-white border px-2 py-1 rounded-full text-slate-600 font-medium">
                  {cart.length} Item
                </span>
              </div>
              <div className="p-0 overflow-auto flex-1 min-h-[300px]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 font-medium">
                    <tr>
                      <th className="p-4">Produk</th>
                      <th className="p-4 text-center">Stok Awal</th>
                      <th className="p-4 text-center">Koreksi</th>
                      <th className="p-4 text-center">Keterangan</th>
                      <th className="p-4 w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="p-10 text-center text-slate-400 italic"
                        >
                          Belum ada item yang ditambahkan.
                        </td>
                      </tr>
                    ) : (
                      cart.map((item, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="p-4 font-medium text-slate-800">
                            {item.name}{" "}
                            <span className="text-xs text-slate-400 font-normal">
                              ({item.unit})
                            </span>
                          </td>
                          <td className="p-4 text-center text-slate-500 font-mono">
                            {item.current_qty}
                          </td>
                          <td className="p-4 text-center">
                            <Badge
                              className={
                                item.qty_diff < 0
                                  ? "bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                                  : "bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                              }
                            >
                              {item.qty_diff > 0 ? "+" : ""}
                              {item.qty_diff}
                            </Badge>
                          </td>
                          <td className="p-4 text-center text-xs italic text-slate-500 truncate max-w-[150px]">
                            {item.note || "-"}
                          </td>
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setCart(cart.filter((_, i) => i !== idx))
                              }
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>

            {/* FOOTER ACTIONS */}
            <div className="p-6 border-t flex justify-end gap-3 bg-slate-50/30">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Batal
              </Button>
              <Button
                onClick={handlePreSubmit}
                // Disabled jika: Loading, Cart Kosong, atau Ada File yg Masih Mengunggah
                disabled={
                  loading ||
                  cart.length === 0 ||
                  files.some((f) => f.status === "uploading")
                }
                className="bg-red-600 hover:bg-red-700 text-white shadow-sm min-w-[140px]"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Simpan Koreksi
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* --- CONFIRMATION MODAL --- */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Konfirmasi Penyesuaian Stok
            </DialogTitle>
            <DialogDescription>
              Anda akan membuat draft koreksi untuk{" "}
              <strong>{cart.length} item</strong>.
              <br />
              Dokumen ini butuh <strong>Persetujuan Owner</strong> sebelum stok
              berubah.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 p-3 rounded border text-sm my-2">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">Lokasi:</span>
              <span className="font-medium text-slate-800">
                {warehouses.find((w) => w.id == selectedWh)?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Alasan:</span>
              <span className="font-medium text-slate-800">
                {reasonCategory}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Periksa Lagi
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmSubmit}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Simpan Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
