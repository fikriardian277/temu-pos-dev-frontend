import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Loader2,
  Printer,
  Truck,
  History,
  Trash2,
  Search,
  FileWarning,
  CheckCircle,
  Clock,
} from "lucide-react";
import Struk from "@/components/struk/Struk";

// UI Components
import { Button } from "@/components/ui/Button.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Label } from "@/components/ui/Label.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs"; // <-- Tab Baru
import { Badge } from "@/components/ui/Badge"; // <-- Badge status

function HotelLaundryPage() {
  const { authState } = useAuth();

  // --- 1. HELPER DATE (Paste ini di atas State) ---
  const getToday = () => {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().split("T")[0];
  };

  const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().split("T")[0];
  };

  // --- STATE UMUM ---
  const [activeTab, setActiveTab] = useState("input");

  // --- STATE INPUT FORM ---
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [hotelCustomers, setHotelCustomers] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [hotelPackages, setHotelPackages] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState("");

  // 👇 INI YANG KETINGGALAN / SALAH 👇
  const [pickupDate, setPickupDate] = useState(getYesterday());
  const [deliveryDate, setDeliveryDate] = useState(getToday()); // <--- INI DIA BIANG KEROKNYA

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATE RIWAYAT ---
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState(""); // Search filter

  // --- STATE MODAL ---
  const [createdNoteDetails, setCreatedNoteDetails] = useState(null);
  const [isStrukModalOpen, setIsStrukModalOpen] = useState(false);
  const [confirmVoidId, setConfirmVoidId] = useState(null); // ID yg mau divoid

  // ==========================================
  // BAGIAN 1: DATA MASTER (Input Form)
  // ==========================================
  useEffect(() => {
    const fetchHotelCustomers = async () => {
      if (!authState.business_id) return;
      setLoadingHotels(true);
      try {
        let query = supabase
          .from("customers")
          .select("id, name, default_service_id, branch_id")
          .eq("business_id", authState.business_id)
          .eq("tipe_pelanggan", "hotel")
          .eq("status", "aktif")
          .order("name", { ascending: true });

        if (authState.role !== "owner" && authState.branch_id) {
          query = query.eq("branch_id", authState.branch_id);
        }
        const { data, error } = await query;
        if (error) throw error;
        setHotelCustomers(data || []);
      } catch (error) {
        toast.error("Gagal memuat daftar hotel.");
      } finally {
        setLoadingHotels(false);
      }
    };
    fetchHotelCustomers();
  }, [authState.business_id, authState.branch_id]);

  useEffect(() => {
    const fetchPackages = async () => {
      if (!selectedHotelId) {
        setHotelPackages([]);
        setQuantities({});
        return;
      }
      setLoadingPackages(true);
      try {
        const selectedCustomer = hotelCustomers.find(
          (c) => String(c.id) === selectedHotelId,
        );
        if (!selectedCustomer?.default_service_id) {
          toast.warning("Hotel ini belum di-setting layanannya.");
          return;
        }

        const { data, error } = await supabase
          .from("packages")
          .select("*")
          .eq("business_id", authState.business_id)
          .eq("service_id", selectedCustomer.default_service_id)
          .order("urutan", { ascending: true })
          .order("name", { ascending: true });

        if (error) throw error;
        setHotelPackages(data || []);
        const initQty = {};
        data?.forEach((pkg) => (initQty[pkg.id] = ""));
        setQuantities(initQty);
      } catch (error) {
        toast.error("Gagal memuat item laundry.");
      } finally {
        setLoadingPackages(false);
      }
    };
    fetchPackages();
  }, [selectedHotelId, hotelCustomers]);

  const handleQuantityChange = (pkgId, val) => {
    const num = val === "" ? 0 : parseInt(val);
    setQuantities((prev) => ({
      ...prev,
      [pkgId]: val === "" ? "" : Math.max(0, num),
    }));
  };

  // ==========================================
  // BAGIAN 2: SUBMIT INPUT
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHotelId) return toast.error("Pilih Hotel dulu.");

    const itemsToSubmit = Object.entries(quantities)
      .map(([pkgId, qty]) => ({
        package_id: parseInt(pkgId),
        quantity: parseInt(qty) || 0,
      }))
      .filter((item) => item.quantity > 0);

    if (itemsToSubmit.length === 0)
      return toast.error("Isi minimal satu item.");

    setIsSubmitting(true);
    try {
      // 1. Dapatkan Branch ID yang valid
      // Prioritas 1: Branch ID dari user yang login (jika staff cabang)
      // Prioritas 2: Branch ID dari data Hotel yang dipilih (jika Owner)
      let finalBranchId = authState.branch_id;

      if (!finalBranchId) {
        const selectedHotel = hotelCustomers.find(
          (h) => String(h.id) === selectedHotelId,
        );
        // Kita perlu fetch ulang detail customer kalau di list awal kolom branch_id belum ada
        // Tapi biar cepet, kita asumsi di fetchHotelCustomers tadi kita tambah select branch_id
        // Cek dulu query fetchHotelCustomers di atas, tambahkan .select("id, name, default_service_id, branch_id")

        // Fallback: Ambil dari customer object jika ada (lihat instruksi bawah)
        if (selectedHotel?.branch_id) {
          finalBranchId = selectedHotel.branch_id;
        } else {
          // Fetch on demand kalau kepepet
          const { data: custData } = await supabase
            .from("customers")
            .select("branch_id")
            .eq("id", selectedHotelId)
            .single();
          if (custData) finalBranchId = custData.branch_id;
        }
      }

      if (!finalBranchId)
        throw new Error("Gagal menentukan Cabang (Branch ID).");

      const { data: newNoteId, error } = await supabase.rpc(
        "create_hotel_delivery_note",
        {
          p_customer_id: parseInt(selectedHotelId),
          p_branch_id: finalBranchId, // <-- PAKE YANG SUDAH DIPASTIKAN ADA
          p_business_id: authState.business_id,
          p_user_id: authState.user.id,
          p_pickup_date: pickupDate,
          p_delivery_date: deliveryDate,
          p_notes: notes,
          p_items: itemsToSubmit,
        },
      );

      if (error) throw error;
      if (!newNoteId) throw new Error("Gagal mendapatkan ID Surat Jalan.");

      // Fetch Detail for Receipt
      fetchAndOpenStruk(newNoteId);

      toast.success("Surat Jalan berhasil dibuat!");
      // Reset Form
      setSelectedHotelId("");
      setQuantities({});
      setNotes("");
    } catch (error) {
      console.error(error);
      toast.error("Gagal simpan: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // BAGIAN 3: RIWAYAT & HISTORY
  // ==========================================
  const fetchHistory = async () => {
    if (!authState.business_id) return;
    setLoadingHistory(true);
    try {
      let query = supabase
        .from("hotel_delivery_notes")
        .select(
          `
            id, pickup_date, status, invoice_code, notes, created_at,
            customers(name)
        `,
        )
        .eq("business_id", authState.business_id)
        .order("created_at", { ascending: false })
        .limit(50); // Ambil 50 terakhir aja biar enteng

      if (authState.role !== "owner" && authState.branch_id) {
        query = query.eq("branch_id", authState.branch_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setHistoryList(data || []);
    } catch (e) {
      toast.error("Gagal ambil riwayat.");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Trigger fetch history pas tab pindah
  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab]);

  // Fungsi Helper: VOID
  // Fungsi Helper: VOID
  const handleVoid = async () => {
    if (!confirmVoidId) return;

    // Pastikan authState.user.id ada
    if (!authState?.user?.id) {
      toast.error("User ID tidak ditemukan. Silakan login ulang.");
      return;
    }

    try {
      // PANGGIL RPC DENGAN 2 PARAMETER (SESUAI SQL BARU)
      const { data, error } = await supabase.rpc("void_hotel_delivery_note", {
        p_note_id: confirmVoidId,
        p_user_id: authState.user.id, // <--- WAJIB DITAMBAHIN INI
      });

      if (error) throw error;

      if (data.success) {
        // Tampilkan pesan sukses dari database (yg ada info jumlah jurnal dibalik)
        toast.success(data.message);
        fetchHistory();
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      console.error(e); // Cek console kalau ada error detail
      toast.error("Gagal void: " + e.message);
    } finally {
      setConfirmVoidId(null);
    }
  };

  // Fungsi Helper: REPRINT & VIEW DETAIL
  const fetchAndOpenStruk = async (noteId) => {
    try {
      console.log("DEBUG: Mencari Note ID:", noteId); // <-- Cek di Console Browser

      const { data: noteData, error: fetchError } = await supabase
        .from("hotel_delivery_notes")
        .select(
          `
            *, 
            customers(name, address, phone_number, id_identitas_bisnis), 
            branches(name, address, phone_number), 
            hotel_delivery_items(
                qty, 
                package_id,
                packages!fk_fix_final(name, unit) 
            )
        `,
        )
        // ^^^ LIHAT DI ATAS: Ada tanda seru (!) + nama constraint (fk_fix_final)
        // Ini perintah MUTLAK buat Supabase.

        .eq("id", noteId)
        .single();
      if (fetchError) {
        console.error("DEBUG ERROR DB:", fetchError); // <-- LIHAT ERROR INI DI CONSOLE
        throw fetchError;
      }

      if (!noteData) {
        throw new Error("Data kosong (Null) dari database.");
      }

      console.log("DEBUG SUKSES:", noteData); // <-- Cek datanya masuk gak

      // ... (Mapping data ke struk lanjutin di bawah) ...
      const mappedForStruk = {
        invoice_code: noteData.invoice_code || `SJ-${noteData.id}`,
        created_at: noteData.delivery_date,
        pickup_date: noteData.pickup_date,
        grand_total: 0,
        customers: noteData.customers,
        branches: noteData.branches, // ✅ TAMBAHKAN BARIS INI BRE!
        order_items: noteData.hotel_delivery_items
          ? noteData.hotel_delivery_items.map((item) => ({
              quantity: item.qty,
              price_per_qty: 0,
              total_price: 0,
              packages: item.packages || { name: "Item Terhapus", unit: "pcs" },
            }))
          : [],
        is_delivery_note: true,
      };

      setCreatedNoteDetails(mappedForStruk);
      setIsStrukModalOpen(true);
    } catch (e) {
      toast.error("Gagal buka struk: " + e.message);
    }
  };
  const handlePrint = () => {
    if (!createdNoteDetails) return;
    sessionStorage.setItem(
      "dataStrukToPrint",
      JSON.stringify({
        detailTransaksiSukses: createdNoteDetails,
        authStatePengaturan: authState.pengaturan,
        mode: "surat_jalan",
      }),
    );
    window.open("/print-struk", "_blank");
  };

  // --- Render Status Badge ---
  const getStatusBadge = (status) => {
    switch (status) {
      case "delivered":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Delivered
          </Badge>
        );
      case "billed":
        return (
          <Badge className="bg-blue-600">
            <CheckCircle className="w-3 h-3 mr-1" /> Billed
          </Badge>
        );
      case "void":
        return <Badge variant="destructive">VOID</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Truck className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Input Surat Jalan (Hotel)</h1>
          <p className="text-muted-foreground">
            Catat pengiriman laundry harian B2B.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="input">Input Baru</TabsTrigger>
          <TabsTrigger value="history">Riwayat Surat Jalan</TabsTrigger>
        </TabsList>

        {/* === TAB 1: INPUT FORM === */}
        <TabsContent value="input" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Input Harian</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* HOTEL SELECT */}
                <div>
                  <Label>Pilih Klien Hotel</Label>
                  <Select
                    value={selectedHotelId}
                    onValueChange={setSelectedHotelId}
                    disabled={loadingHotels}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingHotels ? "Memuat..." : "Pilih Hotel..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {hotelCustomers.map((h) => (
                        <SelectItem key={h.id} value={String(h.id)}>
                          {h.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* DATE PICKER */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tanggal Pickup</Label>
                    <Input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      required
                      max={new Date().toISOString().split("T")[0]} // Max hari ini
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Default: Kemarin
                    </p>
                  </div>
                  <div>
                    <Label>Tanggal Kirim</Label>
                    <Input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      required
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Default: Hari Ini
                    </p>
                  </div>
                </div>

                {/* ITEM INPUT (GRID) */}
                <div className="border-t pt-4">
                  <Label className="mb-2 block">Rincian Barang</Label>
                  {loadingPackages ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="animate-spin" />
                    </div>
                  ) : hotelPackages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                      {hotelPackages.map((pkg) => (
                        <div
                          key={pkg.id}
                          className={`flex items-center gap-3 p-3 border rounded-md ${
                            pkg.is_prioritas
                              ? "bg-green-50 border-green-200"
                              : "bg-slate-50"
                          }`}
                        >
                          <div className="flex-1">
                            <Label
                              htmlFor={`qty-${pkg.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {pkg.name}
                            </Label>
                            {pkg.is_prioritas && (
                              <span className="ml-2 text-[10px] bg-green-200 text-green-800 px-1 rounded">
                                Daily
                              </span>
                            )}
                          </div>
                          <Input
                            id={`qty-${pkg.id}`}
                            type="number"
                            min="0"
                            placeholder="0"
                            className="w-20 text-center font-bold"
                            value={quantities[pkg.id] || ""}
                            onChange={(e) =>
                              handleQuantityChange(pkg.id, e.target.value)
                            }
                          />
                          <span className="text-xs text-muted-foreground w-8">
                            {pkg.unit || "pcs"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-slate-50 rounded">
                      Pilih hotel dulu untuk melihat item.
                    </p>
                  )}
                </div>

                {/* NOTES */}
                <div>
                  <Label>Catatan Driver</Label>
                  <Textarea
                    placeholder="Contoh: Sprei sobek 1, Noda minyak..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* SUBMIT BUTTON */}
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={
                      isSubmitting ||
                      !selectedHotelId ||
                      hotelPackages.length === 0
                    }
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      <Truck className="mr-2 h-5 w-5" />
                    )}
                    Simpan Surat Jalan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TAB 2: HISTORY & VOID === */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" /> 50 Riwayat Terakhir
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={fetchHistory}>
                  <Loader2
                    className={`w-4 h-4 ${
                      loadingHistory ? "animate-spin" : ""
                    }`}
                  />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                      <th className="p-3">No. SJ</th>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">Hotel</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loadingHistory ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center">
                          Memuat riwayat...
                        </td>
                      </tr>
                    ) : historyList.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="p-8 text-center text-muted-foreground"
                        >
                          Belum ada surat jalan.
                        </td>
                      </tr>
                    ) : (
                      historyList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold">
                            {item.invoice_code || `SJ-${item.id}`}{" "}
                            {/* Fallback ke ID kalau data lama belum punya kode */}
                          </td>
                          <td className="p-3">
                            <div className="font-bold">
                              {new Date(item.pickup_date).toLocaleDateString(
                                "id-ID",
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Created:{" "}
                              {new Date(item.created_at).toLocaleDateString(
                                "id-ID",
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-medium">
                            {item.customers?.name}
                          </td>
                          <td className="p-3">{getStatusBadge(item.status)}</td>
                          <td className="p-3 text-center flex justify-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Cetak Ulang"
                              onClick={() => fetchAndOpenStruk(item.id)}
                            >
                              <Printer className="w-4 h-4 text-slate-600" />
                            </Button>

                            {/* Logic Tombol Void: Cuma muncul kalau belum VOID dan belum BILLED */}
                            {item.status === "delivered" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-500 hover:bg-red-50"
                                title="Void / Batalkan"
                                onClick={() => setConfirmVoidId(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL SUKSES & PRINT (Struk Preview) */}
      <Dialog open={isStrukModalOpen} onOpenChange={setIsStrukModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-blue-700 flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6" /> Surat Jalan
            </DialogTitle>
            <DialogDescription className="text-center">
              No: <b>{createdNoteDetails?.invoice_code}</b>
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 p-1 rounded border max-h-[400px] overflow-y-auto flex justify-center">
            {/* PANGGIL KOMPONEN STRUK */}
            <Struk
              transaksi={createdNoteDetails}
              pengaturan={authState.pengaturan}
            />
          </div>

          <DialogFooter className="flex gap-2 sm:justify-center mt-2">
            <Button
              variant="outline"
              onClick={() => setIsStrukModalOpen(false)}
            >
              Tutup
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="mr-2 h-4 w-4" /> Cetak Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL KONFIRMASI VOID */}
      <Dialog
        open={!!confirmVoidId}
        onOpenChange={() => setConfirmVoidId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <FileWarning /> Batalkan Surat Jalan?
            </DialogTitle>
            <DialogDescription>
              Surat Jalan <b>SJ-{confirmVoidId}</b> akan ditandai sebagai VOID
              dan tidak akan ditagihkan ke hotel.
              <br />
              <br />
              <span className="text-red-500 font-bold">
                Aksi ini tidak dapat dibatalkan.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmVoidId(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleVoid}>
              Ya, Void Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HotelLaundryPage;
