// src/components/kasir/Cart.jsx (VERSI FINAL + TOMBOL TRANSFER)

import React from "react";
import { Button } from "@/components/ui/Button.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";
import { Trash2, Loader2, CreditCard } from "lucide-react"; // Tambah Icon CreditCard
import { Separator } from "@/components/ui/Separator.jsx";
import { Checkbox } from "@/components/ui/Checkbox.jsx";
import { Label } from "@/components/ui/Label.jsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/Radio-group.jsx";
import { Input } from "@/components/ui/Input.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select.jsx";

function Cart({
  cart,
  onRemoveFromCart,
  onProsesTransaksi,
  isProcessing,
  subtotal,
  diskonPoin,
  grandTotal,
  catatan,
  setCatatan,
  statusPembayaran,
  setStatusPembayaran,
  metodePembayaran,
  setMetodePembayaran,
  selectedPelanggan,
  isPoinSystemActive,
  isUpgradingMember,
  isBonusMerchandiseActive,
  merchandiseName,
  bonusMerchandiseDibawa,
  setBonusMerchandiseDibawa,
  pengaturan,
  tipeLayanan,
  setTipeLayanan,
  jarakKm,
  setJarakKm,
  biayaLayanan,
  onOpenAlamatModal,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  promoDiscount,
  appliedPromoNames,
}) {
  const isLayananAntarJemputAktif = pengaturan?.is_delivery_service_active;
  const isDeliverySelected = tipeLayanan !== "dine_in";

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Detail Transaksi</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Keranjang</Label>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-2">
              {cart.length > 0 ? (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center text-sm p-2 bg-muted rounded-md"
                  >
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-muted-foreground">
                        {item.jumlah} {item.unit} x Rp{" "}
                        {item.price.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-mono">
                        Rp {item.subtotal.toLocaleString("id-ID")}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onRemoveFromCart(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keranjang masih kosong.
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="catatan">Catatan (Opsional)</Label>
            <Textarea
              id="catatan"
              placeholder="Contoh: Jangan pakai pelembut..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>

          {isLayananAntarJemputAktif && selectedPelanggan && (
            <div className="space-y-3">
              <Separator />
              <div>
                <Label>Layanan Antar-Jemput</Label>
                <RadioGroup
                  value={tipeLayanan}
                  onValueChange={setTipeLayanan}
                  className="grid grid-cols-2 gap-2 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dine_in" id="dine_in" />
                    <Label htmlFor="dine_in">Datang Langsung</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="jemput" id="jemput" />
                    <Label htmlFor="jemput">Jemput Saja</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="antar" id="antar" />
                    <Label htmlFor="antar">Antar Saja</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="antar_jemput" id="antar_jemput" />
                    <Label htmlFor="antar_jemput">Jemput & Antar</Label>
                  </div>
                </RadioGroup>
              </div>

              {isDeliverySelected && (
                <div>
                  <Label htmlFor="jarakKm">Masukkan Jarak (Km)</Label>
                  <Input
                    id="jarakKm"
                    type="number"
                    step="0.1"
                    placeholder="Contoh: 3.5"
                    value={jarakKm}
                    onChange={(e) => setJarakKm(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedPelanggan.address ? (
                      <span>Alamat: {selectedPelanggan.address}</span>
                    ) : (
                      <span className="text-yellow-600">
                        Pelanggan ini belum punya alamat.
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-1 ml-1"
                      onClick={onOpenAlamatModal}
                    >
                      {selectedPelanggan.address ? "(Edit)" : "(Tambah)"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isPoinSystemActive && isBonusMerchandiseActive && (
            <div className="flex items-center space-x-2 pt-4 border-t">
              <Checkbox
                id="bonus_merchandise_dibawa"
                checked={bonusMerchandiseDibawa}
                onCheckedChange={setBonusMerchandiseDibawa}
              />
              <Label htmlFor="bonus_merchandise_dibawa">
                Pelanggan bawa {merchandiseName} (Bonus Poin)
              </Label>
            </div>
          )}

          <div>
            <Label>Status Pembayaran</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                variant={statusPembayaran === "Lunas" ? "default" : "outline"}
                onClick={() => setStatusPembayaran("Lunas")}
              >
                Lunas
              </Button>
              <Button
                variant={
                  statusPembayaran === "Belum Lunas" ? "default" : "outline"
                }
                onClick={() => setStatusPembayaran("Belum Lunas")}
              >
                Belum Lunas
              </Button>
            </div>
          </div>

          {/* VVV TOMBOL METODE PEMBAYARAN (UDPATED) VVV */}
          {statusPembayaran === "Lunas" && (
            <div>
              <Label>Metode Pembayaran</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  variant={metodePembayaran === "Cash" ? "default" : "outline"}
                  onClick={() => setMetodePembayaran("Cash")}
                  className={
                    metodePembayaran === "Cash"
                      ? "bg-green-600 hover:bg-green-700"
                      : ""
                  }
                >
                  Cash
                </Button>
                <Button
                  variant={metodePembayaran === "QRIS" ? "default" : "outline"}
                  onClick={() => setMetodePembayaran("QRIS")}
                  className={
                    metodePembayaran === "QRIS"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : ""
                  }
                >
                  QRIS
                </Button>
                <Button
                  variant={
                    metodePembayaran === "Transfer" ? "default" : "outline"
                  }
                  onClick={() => setMetodePembayaran("Transfer")}
                  className={
                    metodePembayaran === "Transfer"
                      ? "bg-purple-600 hover:bg-purple-700"
                      : ""
                  }
                >
                  <CreditCard className="mr-1 h-3 w-3" /> Transfer
                </Button>
              </div>
            </div>
          )}
          {/* ^^^ END UPDATE ^^^ */}

          <Separator />

          <div className="space-y-2 mt-4">
            <Label>Diskon Manual</Label>
            <div className="flex gap-2">
              <div className="w-[110px]">
                <Select
                  value={discountType}
                  onValueChange={(val) => {
                    setDiscountType(val);
                    setDiscountValue(0); // Reset angka pas ganti tipe
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak Ada</SelectItem>
                    <SelectItem value="manual_percent">Persen (%)</SelectItem>
                    <SelectItem value="manual_nominal">Rupiah (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder={
                    discountType === "manual_percent" ? "Contoh: 10" : "0"
                  }
                  value={discountValue > 0 ? discountValue : ""}
                  onChange={(e) =>
                    setDiscountValue(parseFloat(e.target.value) || 0)
                  }
                  disabled={discountType === "none"}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>Rp {subtotal.toLocaleString("id-ID")}</span>
            </div>
            {isUpgradingMember && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Biaya Membership</span>
                <span>
                  Rp {(pengaturan?.membership_fee || 0).toLocaleString("id-ID")}
                </span>
              </div>
            )}

            {biayaLayanan > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Biaya Layanan</span>
                <span>Rp {biayaLayanan.toLocaleString("id-ID")}</span>
              </div>
            )}
            {promoDiscount > 0 && (
              <div className="flex justify-between text-sm text-blue-600">
                <span className="flex flex-col">
                  <span>Promo Otomatis</span>
                  <span className="text-[10px] text-blue-400 italic">
                    {appliedPromoNames.join(", ")}
                  </span>
                </span>
                <span>- Rp {promoDiscount.toLocaleString("id-ID")}</span>
              </div>
            )}
            {diskonPoin > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="text-muted-foreground">Diskon Poin</span>
                <span>- Rp {diskonPoin.toLocaleString("id-ID")}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>Grand Total</span>
              <span>Rp {grandTotal.toLocaleString("id-ID")}</span>
            </div>
          </div>

          <Button
            onClick={onProsesTransaksi}
            disabled={
              isProcessing ||
              !selectedPelanggan ||
              (cart.length === 0 && !isUpgradingMember)
            }
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...
              </>
            ) : (
              "Proses Transaksi"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default Cart;
