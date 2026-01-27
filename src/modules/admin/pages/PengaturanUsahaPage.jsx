import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// Impor komponen-komponen UI
import { Button } from "@/components/ui/Button.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card.jsx";
import { Receipt } from "lucide-react";
import { Input } from "@/components/ui/Input.jsx";
import { Label } from "@/components/ui/Label.jsx";
import { Checkbox } from "@/components/ui/Checkbox.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/Tabs.jsx";
import { CreditCard } from "lucide-react";
import { ArrowUpCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/Radio-group.jsx";
import { Separator } from "@/components/ui/Separator.jsx";
import VariableBadge from "@/components/VariableBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/Alert-dialog.jsx";
import { Loader2, HardDrive, Link as LinkIcon, FileText } from "lucide-react";
import PromoSettingsTab from "./components/PromoSettingsTab";

function PengaturanUsahaPage() {
  const { authState, refetchAuthData } = useAuth();
  const [settings, setSettings] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTextarea, setActiveTextarea] = useState({
    name: null,
    ref: null,
  });
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    nextScheme: null,
  });

  // REF & HELPER LAMA (AMAN)
  const waHeaderRef = useRef(null);
  const waStrukPembukaRef = useRef(null);
  const waStrukPenutupRef = useRef(null);
  const waSiapDiambilPembukaRef = useRef(null);
  const waSiapDiambilPenutupRef = useRef(null);

  const handleInsertVariable = (variable) => {
    if (!activeTextarea.name || !activeTextarea.ref?.current) {
      toast.warning("Klik dulu di dalam kotak pesan sebelum memilih variabel.");
      return;
    }
    const textarea = activeTextarea.ref.current;
    const currentText = textarea.value || "";
    const cursorPos = textarea.selectionStart;
    const newText =
      currentText.substring(0, cursorPos) +
      variable +
      currentText.substring(cursorPos);

    setSettings((prev) => ({ ...prev, [activeTextarea.name]: newText }));

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = cursorPos + variable.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumericChange = (e) => {
    const { name, value } = e.target;
    const numericValue = value === "" ? null : parseFloat(value);
    setSettings((prev) => ({ ...prev, [name]: numericValue }));
  };

  const handleCheckedChange = (name, checked) => {
    setSettings((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSkemaChange = (value) => {
    if (value !== settings.points_scheme) {
      setConfirmationModal({ isOpen: true, nextScheme: value });
    }
  };

  const handleConfirmSkemaChange = () => {
    if (confirmationModal.nextScheme) {
      setSettings((prev) => ({
        ...prev,
        points_scheme: confirmationModal.nextScheme,
      }));
    }
    setConfirmationModal({ isOpen: false, nextScheme: null });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleUseDefaultTemplate = (type) => {
    if (type === "struk") {
      setSettings((prev) => ({
        ...prev,
        wa_template_header: "*Struk Digital Superclean Laundry*",
        wa_template_receipt_opening:
          "Halo Kak {nama_pelanggan}! \nTerima kasih telah laundry di tempat kami. Berikut rincian transaksinya:",
        wa_template_receipt_closing:
          "Mohon simpan struk digital ini sebagai bukti transaksi.\nDitunggu kedatangannya kembali ya! ",
      }));
      toast.info("Template struk default telah dimuat.");
    } else if (type === "siap_diambil") {
      setSettings((prev) => ({
        ...prev,
        wa_template_ready_opening:
          "Halo Kak {nama_pelanggan}! \nKabar gembira! Cucian Anda dengan invoice *{kode_invoice}* sudah selesai diproses, bersih, wangi, dan siap untuk diambil.",
        wa_template_ready_closing:
          "Kami tunggu kedatangannya di outlet kami ya.\nTerima kasih!",
      }));
      toast.info("Template pesan 'Siap Diambil' default telah dimuat.");
    }
  };

  const fetchSettings = useCallback(async () => {
    if (!authState.business_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("business_id", authState.business_id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        if (data.logo_url) setLogoPreview(data.logo_url);
      } else {
        setSettings({
          business_id: authState.business_id,
          owner_id: authState.user.id,
        });
        toast.info("Silakan isi pengaturan usaha Anda.");
      }
    } catch (err) {
      toast.error("Gagal memuat pengaturan.");
    } finally {
      setLoading(false);
    }
  }, [authState.business_id, authState.user?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalSettings = { ...settings };

      if (logoFile) {
        const filePath = `public/${authState.business_id}-${Date.now()}-${logoFile.name}`;
        const cleanFile = new Blob([logoFile], { type: logoFile.type });

        const { error: uploadError } = await supabase.storage
          .from("business_assets")
          .upload(filePath, cleanFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("business_assets")
          .getPublicUrl(filePath);

        finalSettings.logo_url = publicUrlData.publicUrl;
      }

      delete finalSettings.created_at;
      const { error: saveError } = await supabase
        .from("settings")
        .upsert(finalSettings, { onConflict: "business_id" });

      if (saveError) throw saveError;

      toast.success("Pengaturan berhasil disimpan!");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await refetchAuthData();
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="text-center p-10">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  if (!settings) return <p className="text-center">Data tidak ditemukan.</p>;
  if (authState.role !== "owner")
    return <p className="text-center">Akses ditolak.</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pengaturan Usaha</h1>
          <p className="text-muted-foreground">Sesuaikan aspek bisnis Anda.</p>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
            </>
          ) : (
            "Simpan Perubahan"
          )}
        </Button>
      </div>

      <Tabs defaultValue="profil" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profil">Profil & Struk</TabsTrigger>
          <TabsTrigger value="poin">Poin & Member</TabsTrigger>
          <TabsTrigger value="promo">Promo</TabsTrigger>
          <TabsTrigger value="operasional">Operasional</TabsTrigger>
          <TabsTrigger value="inventory">Integrasi & Storage</TabsTrigger>{" "}
          {/* Ganti Nama Tab */}
        </TabsList>

        <TabsContent value="profil">
          <Card>
            <CardHeader>
              <CardTitle>Profil Usaha & Branding</CardTitle>
              <CardDescription>
                Informasi ini akan muncul di struk.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="business_name">Nama Usaha</Label>
                <Input
                  id="business_name"
                  name="business_name"
                  value={settings.business_name || ""}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="business_address">Alamat Usaha</Label>
                <Textarea
                  id="business_address"
                  name="business_address"
                  value={settings.business_address || ""}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="business_phone">Nomor Telepon</Label>
                <Input
                  id="business_phone"
                  name="business_phone"
                  value={settings.business_phone || ""}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label>Logo Usaha</Label>
                <div className="flex items-center gap-4 mt-2">
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-20 h-20 rounded-md object-cover bg-muted"
                    />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div className="pt-4 space-y-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show_logo_on_receipt"
                    name="show_logo_on_receipt"
                    checked={settings.show_logo_on_receipt}
                    onCheckedChange={(checked) =>
                      handleCheckedChange("show_logo_on_receipt", checked)
                    }
                  />
                  <Label htmlFor="show_logo_on_receipt">
                    Tampilkan Logo di Struk
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show_header_on_receipt"
                    name="show_header_on_receipt"
                    checked={settings.show_header_on_receipt}
                    onCheckedChange={(checked) =>
                      handleCheckedChange("show_header_on_receipt", checked)
                    }
                  />
                  <Label htmlFor="show_header_on_receipt">
                    Tampilkan Info Usaha di Struk
                  </Label>
                </div>
              </div>
              <div>
                <Label htmlFor="receipt_footer_text">Teks Footer Struk</Label>
                <Input
                  id="receipt_footer_text"
                  name="receipt_footer_text"
                  value={settings.receipt_footer_text || ""}
                  onChange={handleChange}
                />
              </div>

              {/* WA Templates */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold mb-1">
                  Template WhatsApp
                </h3>
                <div className="text-sm p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg mb-4">
                  <strong>Tips:</strong> Klik variabel di bawah untuk
                  menyisipkannya.
                </div>

                {/* Struk Template */}
                <div className="p-4 border bg-muted/50 rounded-lg space-y-4 mb-4">
                  <div className="flex justify-between items-center">
                    <Label className="font-semibold">
                      Template Struk Digital
                    </Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => handleUseDefaultTemplate("struk")}
                    >
                      Default
                    </Button>
                  </div>
                  <div>
                    <Label>Header Pesan</Label>
                    <Input
                      ref={waHeaderRef}
                      name="wa_template_header"
                      value={settings.wa_template_header || ""}
                      onChange={handleChange}
                      onFocus={() =>
                        setActiveTextarea({
                          name: "wa_template_header",
                          ref: waHeaderRef,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Pesan Pembuka</Label>
                    <Textarea
                      ref={waStrukPembukaRef}
                      name="wa_template_receipt_opening"
                      value={settings.wa_template_receipt_opening || ""}
                      onChange={handleChange}
                      onFocus={() =>
                        setActiveTextarea({
                          name: "wa_template_receipt_opening",
                          ref: waStrukPembukaRef,
                        })
                      }
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <VariableBadge
                        label="Nama Pelanggan"
                        value="{nama_pelanggan}"
                        onInsert={handleInsertVariable}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Pesan Penutup</Label>
                    <Textarea
                      ref={waStrukPenutupRef}
                      name="wa_template_receipt_closing"
                      value={settings.wa_template_receipt_closing || ""}
                      onChange={handleChange}
                      onFocus={() =>
                        setActiveTextarea({
                          name: "wa_template_receipt_closing",
                          ref: waStrukPenutupRef,
                        })
                      }
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <VariableBadge
                        label="Kode Invoice"
                        value="{kode_invoice}"
                        onInsert={handleInsertVariable}
                      />
                      <VariableBadge
                        label="Total Belanja"
                        value="{total_belanja}"
                        onInsert={handleInsertVariable}
                      />
                    </div>
                  </div>
                </div>

                {/* Ready Template */}
                <div className="p-4 border bg-muted/50 rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="font-semibold">
                      Template Siap Diambil
                    </Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => handleUseDefaultTemplate("siap_diambil")}
                    >
                      Default
                    </Button>
                  </div>
                  <div>
                    <Label>Pesan Pembuka</Label>
                    <Textarea
                      ref={waSiapDiambilPembukaRef}
                      name="wa_template_ready_opening"
                      value={settings.wa_template_ready_opening || ""}
                      onChange={handleChange}
                      onFocus={() =>
                        setActiveTextarea({
                          name: "wa_template_ready_opening",
                          ref: waSiapDiambilPembukaRef,
                        })
                      }
                      rows={4}
                    />
                    <div className="flex gap-2 mt-2">
                      <VariableBadge
                        label="Nama Pelanggan"
                        value="{nama_pelanggan}"
                        onInsert={handleInsertVariable}
                      />
                      <VariableBadge
                        label="Kode Invoice"
                        value="{kode_invoice}"
                        onInsert={handleInsertVariable}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Pesan Penutup</Label>
                    <Textarea
                      ref={waSiapDiambilPenutupRef}
                      name="wa_template_ready_closing"
                      value={settings.wa_template_ready_closing || ""}
                      onChange={handleChange}
                      onFocus={() =>
                        setActiveTextarea({
                          name: "wa_template_ready_closing",
                          ref: waSiapDiambilPenutupRef,
                        })
                      }
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promo">
          <PromoSettingsTab />
        </TabsContent>

        <TabsContent value="poin">
          <Card>
            <CardHeader>
              <CardTitle>Skema Poin & Membership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={settings.points_scheme}
                onValueChange={handleSkemaChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nonaktif" id="s-non" />
                  <Label htmlFor="s-non">Tidak Aktif</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nominal" id="s-nom" />
                  <Label htmlFor="s-nom">Nominal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="berat" id="s-ber" />
                  <Label htmlFor="s-ber">Berat</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="kunjungan" id="s-kun" />
                  <Label htmlFor="s-kun">Kunjungan</Label>
                </div>
              </RadioGroup>
              {settings.points_scheme !== "nonaktif" && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rpm"
                      checked={settings.require_paid_membership}
                      onCheckedChange={(c) =>
                        handleCheckedChange("require_paid_membership", c)
                      }
                    />
                    <Label htmlFor="rpm">Wajib Membership Berbayar</Label>
                  </div>
                  {settings.require_paid_membership && (
                    <div>
                      <Label>Biaya Member</Label>
                      <Input
                        name="membership_fee"
                        type="number"
                        value={settings.membership_fee || ""}
                        onChange={handleNumericChange}
                      />
                    </div>
                  )}
                  {/* Input Scheme Logic */}
                  {settings.points_scheme === "nominal" && (
                    <div>
                      <Label>Setiap Belanja (Rp)</Label>
                      <Input
                        name="rupiah_per_point_earn"
                        type="number"
                        value={settings.rupiah_per_point_earn || ""}
                        onChange={handleNumericChange}
                      />
                    </div>
                  )}
                  {settings.points_scheme === "berat" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Berat (Kg)</Label>
                        <Input
                          name="berat_per_poin"
                          type="number"
                          value={settings.berat_per_poin || ""}
                          onChange={handleNumericChange}
                        />
                      </div>
                      <div>
                        <Label>Poin Didapat</Label>
                        <Input
                          name="poin_per_kg"
                          type="number"
                          value={settings.poin_per_kg || ""}
                          onChange={handleNumericChange}
                        />
                      </div>
                    </div>
                  )}
                  {settings.points_scheme === "kunjungan" && (
                    <div>
                      <Label>Poin per Kunjungan</Label>
                      <Input
                        name="poin_per_kunjungan"
                        type="number"
                        value={settings.poin_per_kunjungan || ""}
                        onChange={handleNumericChange}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nilai 1 Poin (Rp)</Label>
                      <Input
                        name="rupiah_per_point_redeem"
                        type="number"
                        value={settings.rupiah_per_point_redeem || ""}
                        onChange={handleNumericChange}
                      />
                    </div>
                    <div>
                      <Label>Min. Tukar Poin</Label>
                      <Input
                        name="min_points_to_redeem"
                        type="number"
                        value={settings.min_points_to_redeem || ""}
                        onChange={handleNumericChange}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id="merch"
                        checked={settings.is_merch_bonus_active}
                        onCheckedChange={(c) =>
                          handleCheckedChange("is_merch_bonus_active", c)
                        }
                      />
                      <Label htmlFor="merch">Bonus Merchandise</Label>
                    </div>
                    {settings.is_merch_bonus_active && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nama Barang</Label>
                          <Input
                            name="merch_bonus_name"
                            value={settings.merch_bonus_name || ""}
                            onChange={handleChange}
                          />
                        </div>
                        <div>
                          <Label>Poin Dibutuhkan</Label>
                          <Input
                            name="bonus_poin_merchandise"
                            type="number"
                            value={settings.bonus_poin_merchandise || ""}
                            onChange={handleNumericChange}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operasional">
          <Card>
            <CardHeader>
              <CardTitle>Aturan Operasional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Pajak (PPN %)</Label>
                  <Input
                    name="tax_percentage"
                    type="number"
                    step="0.1"
                    value={settings.tax_percentage || ""}
                    onChange={handleNumericChange}
                  />
                </div>
                <div>
                  <Label>Format Invoice</Label>
                  <Input
                    name="invoice_prefix"
                    value={settings.invoice_prefix || ""}
                    onChange={handleChange}
                    placeholder="INV"
                  />
                </div>
              </div>

              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-4">Layanan Antar-Jemput</h3>
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="del"
                    checked={settings.is_delivery_service_active}
                    onCheckedChange={(c) =>
                      handleCheckedChange("is_delivery_service_active", c)
                    }
                  />
                  <Label htmlFor="del">Aktifkan Antar-Jemput</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Gratis Jemput (Km)</Label>
                    <Input
                      name="delivery_free_pickup_distance"
                      type="number"
                      value={settings.delivery_free_pickup_distance || ""}
                      onChange={handleNumericChange}
                      disabled={!settings.is_delivery_service_active}
                    />
                  </div>
                  <div>
                    <Label>Biaya Jemput</Label>
                    <Input
                      name="delivery_pickup_fee"
                      type="number"
                      value={settings.delivery_pickup_fee || ""}
                      onChange={handleNumericChange}
                      disabled={!settings.is_delivery_service_active}
                    />
                  </div>
                  <div>
                    <Label>Gratis Antar (Km)</Label>
                    <Input
                      name="delivery_free_dropoff_distance"
                      type="number"
                      value={settings.delivery_free_dropoff_distance || ""}
                      onChange={handleNumericChange}
                      disabled={!settings.is_delivery_service_active}
                    />
                  </div>
                  <div>
                    <Label>Biaya Antar</Label>
                    <Input
                      name="delivery_dropoff_fee"
                      type="number"
                      value={settings.delivery_dropoff_fee || ""}
                      onChange={handleNumericChange}
                      disabled={!settings.is_delivery_service_active}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- UPDATE BAGIAN INI --- */}
        <TabsContent value="inventory">
          <Card className="border-blue-200 shadow-sm">
            <CardHeader className="bg-blue-50/50 rounded-t-lg border-b border-blue-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <HardDrive className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <CardTitle className="text-blue-900">
                    Integrasi & Penyimpanan Cloud
                  </CardTitle>
                  <CardDescription className="text-blue-700/80">
                    Hubungkan aplikasi dengan Google Apps Script untuk fitur
                    upload foto/bukti.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              {/* SECTION: STOCK ADJUSTMENT */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-dashed">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-orange-600" />
                    1. Stock Adjustment / Opname
                  </h3>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="google_script_url">
                    Link Script (Stock Adjustment)
                  </Label>
                  <Input
                    id="google_script_url"
                    name="google_script_url"
                    value={settings.google_script_url || ""}
                    onChange={handleChange}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="font-mono text-xs bg-slate-50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="proof_drive_link">
                    Folder ID / Link Drive (Bukti Stok)
                  </Label>
                  <Input
                    id="proof_drive_link"
                    name="proof_drive_link"
                    value={settings.proof_drive_link || ""}
                    onChange={handleChange}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="font-mono text-xs bg-slate-50"
                  />
                </div>
              </div>

              {/* SECTION: EXPENSE INVOICE (BARU) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-dashed">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    2. Expense / Biaya Operasional
                  </h3>
                </div>

                {/* INPUT 1: LINK SCRIPT (TUKANG POS) - Dipake barengan sama Inventory */}
                <div className="grid gap-2">
                  <Label htmlFor="link_invoice_script">
                    Link Script (Apps Script URL)
                  </Label>
                  <Input
                    id="link_invoice_script"
                    name="link_invoice_script"
                    value={settings.link_invoice_script || ""}
                    onChange={handleChange}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="font-mono text-xs bg-slate-50"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    *Gunakan URL yang sama dengan Script Stock Opname jika pakai
                    1 script.
                  </p>
                </div>

                {/* INPUT 2: FOLDER ID KHUSUS EXPENSE */}
                <div className="grid gap-2">
                  <Label htmlFor="expense_drive_folder_id">
                    Folder ID (Khusus Invoice Expense)
                  </Label>
                  <Input
                    id="expense_drive_folder_id"
                    name="expense_drive_folder_id" // Pastikan sama dengan DB
                    value={settings.expense_drive_folder_id || ""}
                    onChange={handleChange}
                    placeholder="Contoh: 1ALAX6KtPf__ryK_Fh0bl7mBPvz7Ao9GF"
                    className="font-mono text-xs bg-slate-50"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Masukkan ID Folder Google Drive tempat menyimpan invoice
                    biaya.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-dashed">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-purple-600" />
                    3. Petty Cash / Kas Kecil
                  </h3>
                </div>

                {/* Kita gunakan Link Script yang sama (Tukang Pos Sama) */}

                <div className="grid gap-2">
                  <Label htmlFor="petty_cash_drive_folder_id">
                    Folder ID (Bukti Petty Cash)
                  </Label>
                  <Input
                    id="petty_cash_drive_folder_id"
                    name="petty_cash_drive_folder_id"
                    value={settings.petty_cash_drive_folder_id || ""}
                    onChange={handleChange}
                    placeholder="Contoh: 1ope4luAAm_wn9zfJnAAAp2kzSmxK5oLX"
                    className="font-mono text-xs bg-slate-50"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    ID Folder Google Drive untuk menyimpan foto struk/nota kas
                    kecil.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-dashed">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4 text-blue-600" />
                    4. Cash Deposit / Setoran Kasir
                  </h3>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cash_deposit_drive_folder_id">
                    Folder ID (Bukti Setor Tunai)
                  </Label>
                  <Input
                    id="cash_deposit_drive_folder_id"
                    name="cash_deposit_drive_folder_id"
                    value={settings.cash_deposit_drive_folder_id || ""}
                    onChange={handleChange}
                    placeholder="Contoh: 1kL_mNoP..."
                    className="font-mono text-xs bg-slate-50"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    ID Folder Google Drive untuk menyimpan foto bukti setoran
                    bank kasir.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-dashed">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    5. Supplier Payment / Bukti Bayar Hutang
                  </h3>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="supplier_payment_drive_folder_id">
                    Folder ID (Bukti Transfer Supplier)
                  </Label>
                  <Input
                    id="supplier_payment_drive_folder_id"
                    name="supplier_payment_drive_folder_id"
                    value={settings.supplier_payment_drive_folder_id || ""}
                    onChange={handleChange}
                    placeholder="Contoh: 1kL_mNoP..."
                    className="font-mono text-xs bg-slate-50"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    ID Folder Google Drive untuk menyimpan bukti transfer
                    pembayaran ke supplier (Hutang/DP).
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-800 flex gap-2 items-start">
                <div className="mt-0.5 min-w-[16px]">💡</div>
                <p>
                  Pastikan script GAS sudah di-deploy dengan akses{" "}
                  <strong>"Anyone (Siapa saja)"</strong> agar aplikasi bisa
                  mengupload file tanpa login Google.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={confirmationModal.isOpen}
        onOpenChange={(isOpen) =>
          setConfirmationModal({ ...confirmationModal, isOpen })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ubah Skema Poin?</AlertDialogTitle>
            <AlertDialogDescription>
              Perubahan ini akan mempengaruhi cara perhitungan poin transaksi
              baru.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() =>
                setConfirmationModal({ isOpen: false, nextScheme: null })
              }
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSkemaChange}>
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

export default PengaturanUsahaPage;
