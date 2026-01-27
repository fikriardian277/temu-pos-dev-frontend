import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// Komponen & Ikon
import CustomerSection from "../components/kasir/CustomerSection";
import ServiceSelector from "../components/kasir/ServiceSelector.jsx";
import Cart from "../components/kasir/Cart";
import Struk from "@/components/struk/Struk";

import { CheckCircle, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Label } from "@/components/ui/Label.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";

function KasirPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authState } = useAuth();

  // Konstanta Config
  const isPoinSystemActive = authState.pengaturan?.points_scheme !== "nonaktif";
  const isPaidMembershipRequired =
    authState.pengaturan?.require_paid_membership;
  const isBonusMerchandiseActive = authState.pengaturan?.is_merch_bonus_active;
  const merchandiseName =
    authState.pengaturan?.merch_bonus_name || "Merchandise";
  const BIAYA_MEMBER = authState.pengaturan?.membership_fee || 0;

  // State Utama
  const [selectedPelanggan, setSelectedPelanggan] = useState(null);
  const [isUpgradingMember, setIsUpgradingMember] = useState(false);
  const [cart, setCart] = useState([]);

  // State Keuangan & Diskon
  const [subtotal, setSubtotal] = useState(0);
  const [diskonPoin, setDiskonPoin] = useState(0);

  // --- STATE BARU: PROMO OTOMATIS ---
  const [activePromos, setActivePromos] = useState([]); // Daftar promo hari ini
  const [promoDiscount, setPromoDiscount] = useState(0); // Total Rupiah potongan promo
  const [appliedPromoNames, setAppliedPromoNames] = useState([]); // Nama promo yg kepakai (buat info)
  // ----------------------------------

  // State Diskon Manual
  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0); // Ini diskon manual

  const [grandTotal, setGrandTotal] = useState(0);

  // State Lainnya
  const [catatan, setCatatan] = useState("");
  const [statusPembayaran, setStatusPembayaran] = useState("Belum Lunas");
  const [metodePembayaran, setMetodePembayaran] = useState("");
  const [bonusMerchandiseDibawa, setBonusMerchandiseDibawa] = useState(false);
  const [poinUntukDitukar, setPoinUntukDitukar] = useState(0);
  const [transaksiSuccess, setTransaksiSuccess] = useState(null);
  const [detailTransaksiSukses, setDetailTransaksiSukses] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [isPoinModalOpen, setIsPoinModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [poinInput, setPoinInput] = useState("");
  const [tipeLayanan, setTipeLayanan] = useState("dine_in");
  const [jarakKm, setJarakKm] = useState("");
  const [biayaLayanan, setBiayaLayanan] = useState(0);
  const [isAlamatModalOpen, setIsAlamatModalOpen] = useState(false);
  const [alamatToEdit, setAlamatToEdit] = useState("");
  const [loadingWA, setLoadingWA] = useState(false);

  // --- 1. FETCH PROMO AKTIF (Saat Load Page) ---
  useEffect(() => {
    const fetchPromos = async () => {
      if (!authState.business_id) return;
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      const { data, error } = await supabase
        .from("promo_programs")
        .select("*")
        .eq("business_id", authState.business_id)
        .eq("is_active", true)
        .lte("start_date", today) // Mulai sebelum/pas hari ini
        .gte("end_date", today); // Berakhir setelah/pas hari ini

      if (error) console.error("Gagal load promo:", error);
      else setActivePromos(data || []);
    };
    fetchPromos();
  }, [authState.business_id]);

  // Handler Print
  const handleBukaPrintTab = () => {
    if (!detailTransaksiSukses)
      return toast.error("Data transaksi tidak ditemukan.");
    const dataToPrint = {
      detailTransaksiSukses: detailTransaksiSukses,
      authStatePengaturan: authState.pengaturan,
    };
    sessionStorage.setItem("dataStrukToPrint", JSON.stringify(dataToPrint));
    window.open("/print-struk", "_blank");
  };

  const handleSelectPelanggan = (pelanggan) => {
    setSelectedPelanggan(pelanggan);
    setCart([]);
    setIsUpgradingMember(false);
    setPoinUntukDitukar(0);
    setDiskonPoin(0);
    setTipeLayanan("dine_in");
    setJarakKm("");
    setDiscountType("none");
    setDiscountValue(0);
    setDiscountAmount(0); // Reset manual
  };

  const handleUpgradeMember = () => setIsUpgradingMember(!isUpgradingMember);

  const addItemToCart = (itemToAdd, jumlah) => {
    let jumlahFinal = parseFloat(jumlah) || 1;
    if (itemToAdd.min_order && jumlahFinal < itemToAdd.min_order) {
      jumlahFinal = itemToAdd.min_order;
      toast.info("Minimal Order Diterapkan", {
        description: `Paket "${itemToAdd.name}" memiliki minimal order ${itemToAdd.min_order} ${itemToAdd.unit}.`,
      });
    }
    const existingItem = cart.find((item) => item.id === itemToAdd.id);
    if (existingItem) {
      const newJumlah = existingItem.jumlah + jumlahFinal;
      setCart(
        cart.map((item) =>
          item.id === itemToAdd.id
            ? { ...item, jumlah: newJumlah, subtotal: newJumlah * item.price }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ...itemToAdd,
          jumlah: jumlahFinal,
          subtotal: jumlahFinal * itemToAdd.price,
        },
      ]);
    }
  };

  const handleRemoveFromCart = (itemId) =>
    setCart(cart.filter((item) => item.id !== itemId));

  // --- LOGIC UTAMA: PERHITUNGAN TOTAL & DISKON ---
  useEffect(() => {
    const newSubtotal = cart.reduce((total, item) => total + item.subtotal, 0);
    let totalBiayaLayanan = 0;

    // Hitung Biaya Layanan (Antar Jemput)
    if (authState.pengaturan?.is_delivery_service_active) {
      const {
        delivery_free_pickup_distance,
        delivery_pickup_fee,
        delivery_free_dropoff_distance,
        delivery_dropoff_fee,
      } = authState.pengaturan;
      const jarak = parseFloat(jarakKm) || 0;
      if (
        tipeLayanan.includes("jemput") &&
        jarak > delivery_free_pickup_distance
      )
        totalBiayaLayanan += delivery_pickup_fee;
      if (
        tipeLayanan.includes("antar") &&
        jarak > delivery_free_dropoff_distance
      )
        totalBiayaLayanan += delivery_dropoff_fee;
    }

    // --- HITUNG DISKON PROMO OTOMATIS ---
    let autoDiscount = 0;
    let appliedNames = [];

    // 1. Promo Spesifik Paket (Prioritas)
    cart.forEach((item) => {
      // Cari promo yg targetnya paket ini
      const itemPromo = activePromos.find(
        (p) => p.target_package_id === item.id
      );
      if (itemPromo) {
        let pot = 0;
        if (itemPromo.discount_type === "percent") {
          pot = item.subtotal * (itemPromo.discount_value / 100);
        } else {
          pot = itemPromo.discount_value * item.jumlah; // Nominal dikali qty
        }
        autoDiscount += pot;
        if (!appliedNames.includes(itemPromo.name))
          appliedNames.push(itemPromo.name);
      }
    });

    // 2. Promo Global (Total Belanja)
    // Berlaku jika user belanja dan belum kena promo lain? Atau ditumpuk?
    // Biar simple & happy customer: KITA TUMPUK (Stackable) atau Cek lagi.
    // Logic: Ambil promo global pertama yg ketemu
    const globalPromo = activePromos.find((p) => p.target_package_id === null);
    if (globalPromo) {
      let globalPot = 0;
      if (globalPromo.discount_type === "percent") {
        globalPot = newSubtotal * (globalPromo.discount_value / 100);
      } else {
        globalPot = globalPromo.discount_value;
      }
      autoDiscount += globalPot;
      if (!appliedNames.includes(globalPromo.name))
        appliedNames.push(globalPromo.name);
    }

    // Validasi biar diskon ga minus
    if (autoDiscount > newSubtotal) autoDiscount = newSubtotal;

    setPromoDiscount(autoDiscount);
    setAppliedPromoNames(appliedNames);
    // ----------------------------------------

    // --- HITUNG DISKON MANUAL ---
    let manualDisc = 0;
    // Diskon manual dihitung dari sisa harga setelah promo (atau dari subtotal awal? Biasanya subtotal awal biar gampang)
    // Kita hitung dari Subtotal Awal aja biar ga pusing
    if (discountType === "manual_percent") {
      manualDisc = (newSubtotal * discountValue) / 100;
    } else if (discountType === "manual_nominal") {
      manualDisc = discountValue;
    }
    if (manualDisc > newSubtotal) manualDisc = newSubtotal; // Safety
    setDiscountAmount(manualDisc);

    // --- GRAND TOTAL ---
    const upgradeCost = isUpgradingMember ? BIAYA_MEMBER : 0;
    setSubtotal(newSubtotal);
    setBiayaLayanan(totalBiayaLayanan);

    // Rumus: (Subtotal + Biaya2) - Poin - PromoOtomatis - Manual
    let finalTotal =
      newSubtotal +
      upgradeCost +
      totalBiayaLayanan -
      diskonPoin -
      autoDiscount -
      manualDisc;
    if (finalTotal < 0) finalTotal = 0;
    setGrandTotal(finalTotal);
  }, [
    cart,
    diskonPoin,
    tipeLayanan,
    jarakKm,
    authState.pengaturan,
    isUpgradingMember,
    BIAYA_MEMBER,
    discountType,
    discountValue,
    activePromos, // <-- Dependency activePromos penting!
  ]);

  const handleProsesTransaksi = async () => {
    if (!selectedPelanggan || (cart.length === 0 && !isUpgradingMember))
      return toast.error("Data transaksi belum lengkap.");
    if (statusPembayaran === "Lunas" && !metodePembayaran)
      return toast.error("Pilih metode pembayaran.");

    setIsProcessing(true);

    // GABUNGKAN DISKON (Manual + Promo) buat dikirim ke DB
    // Database cuma punya 1 kolom `discount_amount`, jadi kita jumlahin
    const totalDiscountRupiah = discountAmount + promoDiscount;

    const transaksiData = {
      id_pelanggan: selectedPelanggan.id,
      catatan:
        catatan +
        (appliedPromoNames.length > 0
          ? ` [Promo: ${appliedPromoNames.join(", ")}]`
          : ""), // Catat nama promo di notes biar tau
      status_pembayaran: statusPembayaran,
      metode_pembayaran: statusPembayaran === "Lunas" ? metodePembayaran : null,
      items: cart.map((item) => ({ id_paket: item.id, jumlah: item.jumlah })),
      poin_ditukar: poinUntukDitukar,
      upgrade_member: isUpgradingMember,
      tipe_layanan: tipeLayanan,
      jarak_km: parseFloat(jarakKm) || 0,
      bonus_merchandise_dibawa: bonusMerchandiseDibawa,

      // Kirim Data Diskon (Gabungan)
      discount_type:
        discountType !== "none"
          ? discountType
          : promoDiscount > 0
          ? "promo_auto"
          : "none",
      discount_value: 0, // Nilai referensi (kurang relevan kalau gabungan, kita set 0 atau manual value)
      discount_amount: totalDiscountRupiah, // PENTING: Ini yg ngurangin harga di DB
    };

    try {
      const { data: newInvoiceCode, error } = await supabase.rpc(
        "create_new_order",
        { payload: transaksiData }
      );
      if (error) throw error;

      const { data: detailResponse, error: detailError } = await supabase
        .from("orders")
        .select(
          `*, tipe_order, pickup_date, customers!inner(id, name, tipe_pelanggan, id_identitas_bisnis), branches(id, name, address, phone_number), order_items(*, packages(*, services(name)))`
        )
        .eq("invoice_code", newInvoiceCode)
        .eq("business_id", authState.business_id)
        .single();

      if (detailError) throw detailError;

      setDetailTransaksiSukses(detailResponse);
      setTransaksiSuccess({ invoice_code: newInvoiceCode });
      toast.success("Transaksi berhasil!");
    } catch (err) {
      toast.error("Gagal proses: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ... (Sisa fungsi: handleKirimWA, resetForm, dll sama persis kayak file sebelumnya, gak perlu diubah) ...
  const handleKirimWA = async () => {
    if (!detailTransaksiSukses || loadingWA) return;
    setLoadingWA(true);
    try {
      const { data, error } = await supabase.rpc("generate_wa_message", {
        payload: {
          invoice_code: detailTransaksiSukses.invoice_code,
          tipe_pesan: "struk",
        },
      });
      if (error) throw error;
      const nomorHPNormalized = (data.nomor_hp || "").trim();
      if (!nomorHPNormalized) {
        toast.error("No HP invalid.");
        setLoadingWA(false);
        return;
      }
      const nomorHPFormatted = nomorHPNormalized.startsWith("0")
        ? "62" + nomorHPNormalized.substring(1)
        : nomorHPNormalized;
      window.open(
        `https://api.whatsapp.com/send?phone=${nomorHPFormatted}&text=${encodeURIComponent(
          data.pesan
        )}`,
        "_blank"
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingWA(false);
    }
  };

  const resetForm = () => {
    setCart([]);
    setSelectedPelanggan(null);
    setCatatan("");
    setStatusPembayaran("Belum Lunas");
    setMetodePembayaran("");
    setBonusMerchandiseDibawa(false);
    setIsUpgradingMember(false);
    setDiskonPoin(0);
    setPoinUntukDitukar(0);
    setIsPoinModalOpen(false);
    setFormError("");
    setTransaksiSuccess(null);
    setDetailTransaksiSukses(null);
    setDiscountType("none");
    setDiscountValue(0);
    setDiscountAmount(0); // Reset
    setPromoDiscount(0);
    setAppliedPromoNames([]); // Reset promo
    navigate("/kasir", { replace: true, state: {} });
  };

  const handlePoinSubmit = (e) => {
    e.preventDefault();
    const poin = parseInt(poinInput);
    if (!poin || poin < (authState.pengaturan?.min_points_to_redeem || 0))
      return setFormError(
        `Minimal ${authState.pengaturan?.min_points_to_redeem} poin.`
      );
    if (poin > selectedPelanggan.points) return setFormError("Poin kurang.");
    const diskon = poin * (authState.pengaturan?.rupiah_per_point_redeem || 0);
    if (diskon > subtotal + biayaLayanan)
      return setFormError("Diskon poin melebihi total.");
    setDiskonPoin(diskon);
    setPoinUntukDitukar(poin);
    setIsPoinModalOpen(false);
    setPoinInput("");
    setFormError("");
  };

  // ... (useEffect reset, fetchServices, dll sama persis) ...
  useEffect(() => {
    setIsUpgradingMember(false);
    setDiskonPoin(0);
    setPoinUntukDitukar(0);
  }, [selectedPelanggan]);
  useEffect(() => {
    if (location.state?.selectedCustomer) {
      setSelectedPelanggan(location.state.selectedCustomer);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const handleOpenAlamatModal = () => {
    if (selectedPelanggan) {
      setAlamatToEdit(selectedPelanggan.address || "");
      setIsAlamatModalOpen(true);
    }
  };
  const fetchServices = useCallback(async () => {
    // Validasi dasar: Harus ada Business ID
    if (!authState.business_id) return;

    try {
      // 1. Ambil Data Master (Kategori -> Layanan -> Paket)
      const { data: masterData, error: masterError } = await supabase
        .from("categories")
        .select("*, services(*, packages(*))")
        .eq("business_id", authState.business_id)
        .order("urutan", { ascending: true })
        .order("urutan", { foreignTable: "services", ascending: true })
        .order("urutan", {
          foreignTable: "services.packages",
          ascending: true,
        });

      if (masterError) throw masterError;

      // --- SAFETY CHECK: JIKA TIDAK ADA BRANCH ID (Misal Owner) ---
      // Langsung tampilkan data master apa adanya, jangan difilter
      if (!authState.branch_id) {
        // console.log("Mode Owner: Menampilkan semua data master");
        setAllCategories(masterData || []);
        return;
      }

      // --- JIKA KASIR (PUNYA BRANCH ID) ---
      // 2. Ambil Config Cabang
      const { data: branchConfig, error: configError } = await supabase
        .from("package_branch_prices")
        .select("package_id, price, is_active")
        .eq("branch_id", authState.branch_id)
        .eq("business_id", authState.business_id);

      if (configError) throw configError;

      // Mapping Config
      const configMap = {};
      branchConfig?.forEach((cfg) => {
        configMap[cfg.package_id] = cfg;
      });

      // 3. PROSES MERGE DATA
      const processedData = masterData
        .map((cat) => {
          // Filter Services
          const filteredServices = cat.services
            .map((svc) => {
              // Filter Packages
              const filteredPackages = svc.packages
                .map((pkg) => {
                  const cfg = configMap[pkg.id];

                  // A. LOGIC FILTER (HANYA JIKA CONFIG EXPLICITLY FALSE)
                  // Kalau cfg tidak ditemukan (belum diset), anggap TRUE (Muncul)
                  const isActive = cfg ? cfg.is_active : true;
                  if (!isActive) return null;

                  // B. LOGIC HARGA
                  // Kalau harga cabang > 0, pakai itu. Kalau tidak, pakai harga master
                  const finalPrice =
                    cfg && cfg.price > 0 ? cfg.price : pkg.price;

                  return {
                    ...pkg,
                    price: finalPrice,
                    // Tambahan flag buat debugging UI (optional)
                    is_branch_price: cfg && cfg.price > 0,
                  };
                })
                .filter((p) => p !== null); // Buang paket yang null (hidden)

              return { ...svc, packages: filteredPackages };
            })
            .filter((svc) => svc.packages.length > 0); // Buang layanan kosong

          return { ...cat, services: filteredServices };
        })
        .filter((cat) => cat.services.length > 0); // Buang kategori kosong

      setAllCategories(processedData || []);
    } catch (err) {
      console.error("Gagal load layanan:", err);
      toast.error("Gagal memuat menu.");
    }
  }, [authState.business_id, authState.branch_id]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleUpdateAlamat = async (e) => {
    e.preventDefault();
    const { data } = await supabase
      .from("customers")
      .update({ address: alamatToEdit })
      .eq("id", selectedPelanggan.id)
      .select()
      .single();
    setSelectedPelanggan(data);
    toast.success("Alamat diupdate.");
    setIsAlamatModalOpen(false);
  };

  return (
    <div>
      {!transaksiSuccess ? (
        <>
          <h1 className="text-3xl font-bold mb-6">Buat Transaksi Baru</h1>
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-7/12 flex flex-col gap-8">
              <CustomerSection
                selectedPelanggan={selectedPelanggan}
                onSelectPelanggan={handleSelectPelanggan}
                onUpgradeMember={handleUpgradeMember}
                isPoinSystemActive={isPoinSystemActive}
                isPaidMembershipRequired={isPaidMembershipRequired}
                isUpgradingMember={isUpgradingMember}
                onOpenPoinModal={() => setIsPoinModalOpen(true)}
                pengaturan={authState.pengaturan}
              />
              <ServiceSelector
                categories={allCategories}
                onAddToCart={addItemToCart}
              />
            </div>
            <div className="lg:w-5/12">
              <Cart
                cart={cart}
                onRemoveFromCart={handleRemoveFromCart}
                onProsesTransaksi={handleProsesTransaksi}
                isProcessing={isProcessing}
                subtotal={subtotal}
                diskonPoin={diskonPoin}
                grandTotal={grandTotal}
                catatan={catatan}
                setCatatan={setCatatan}
                statusPembayaran={statusPembayaran}
                setStatusPembayaran={setStatusPembayaran}
                metodePembayaran={metodePembayaran}
                setMetodePembayaran={setMetodePembayaran}
                selectedPelanggan={selectedPelanggan}
                isPoinSystemActive={isPoinSystemActive}
                isUpgradingMember={isUpgradingMember}
                isBonusMerchandiseActive={isBonusMerchandiseActive}
                merchandiseName={merchandiseName}
                bonusMerchandiseDibawa={bonusMerchandiseDibawa}
                setBonusMerchandiseDibawa={setBonusMerchandiseDibawa}
                pengaturan={authState.pengaturan}
                tipeLayanan={tipeLayanan}
                setTipeLayanan={setTipeLayanan}
                jarakKm={jarakKm}
                setJarakKm={setJarakKm}
                biayaLayanan={biayaLayanan}
                onOpenAlamatModal={handleOpenAlamatModal}
                // Props Diskon Manual
                discountType={discountType}
                setDiscountType={setDiscountType}
                discountValue={discountValue}
                setDiscountValue={setDiscountValue}
                // Props Promo Otomatis
                promoDiscount={promoDiscount}
                appliedPromoNames={appliedPromoNames}
              />
            </div>
          </div>
        </>
      ) : (
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <CardTitle>Transaksi Berhasil!</CardTitle>
            <CardDescription>
              Invoice {detailTransaksiSukses?.invoice_code}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg my-4 bg-muted/30 p-2">
              <div className="max-h-64 overflow-y-auto">
                <div className="w-[220px] mx-auto">
                  <Struk
                    transaksi={detailTransaksiSukses}
                    pengaturan={authState.pengaturan}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={handleBukaPrintTab} variant="outline">
                <Printer className="mr-2 h-4 w-4" /> Cetak
              </Button>
              <Button
                onClick={handleKirimWA}
                variant="outline"
                className="bg-green-500 text-white hover:bg-green-600"
                disabled={loadingWA}
              >
                {loadingWA ? <Loader2 className="animate-spin" /> : "Kirim WA"}
              </Button>
            </div>
            <Button onClick={resetForm} className="w-full mt-4">
              Transaksi Baru
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal2 Pendukung (Poin & Alamat) - Sama aja */}
      {selectedPelanggan && (
        <Dialog open={isPoinModalOpen} onOpenChange={setIsPoinModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tukar Poin</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePoinSubmit} className="space-y-4 py-4">
              <p>Poin: {selectedPelanggan.points}</p>
              {formError && <p className="text-red-500">{formError}</p>}
              <Input
                type="number"
                value={poinInput}
                onChange={(e) => setPoinInput(e.target.value)}
                placeholder="Jumlah Poin"
              />
              <Button type="submit">Tukar</Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={isAlamatModalOpen} onOpenChange={setIsAlamatModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Alamat</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateAlamat}>
            <Textarea
              value={alamatToEdit}
              onChange={(e) => setAlamatToEdit(e.target.value)}
            />
            <Button type="submit" className="mt-4">
              Simpan
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default KasirPage;
