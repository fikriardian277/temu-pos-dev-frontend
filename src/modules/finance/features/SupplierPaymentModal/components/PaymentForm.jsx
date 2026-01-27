// PaymentForm.jsx (UPDATE)
import React from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

export default function PaymentForm({ hookData }) {
  const {
    paymentDate,
    setPaymentDate,
    accountId,
    setAccountId,
    paymentMethod,
    setPaymentMethod,
    amountToPay,
    setAmountToPay,
    notes,
    setNotes,
    setProofFile,
    accounts,
    // HAPUS: branches, selectedBranch, setSelectedBranch
  } = hookData;

  return (
    <div className="grid gap-4 py-4">
      {/* TANGGAL BAYAR */}
      <div className="space-y-2">
        <Label>Tanggal Bayar</Label>
        <Input
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />
      </div>

      {/* SUMBER DANA & METODE */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Sumber Dana (Kas/Bank) *</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih Akun..." />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={String(acc.id)}>
                  {acc.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({acc.type})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-slate-500">
            Sistem akan otomatis mendeteksi cabang pemilik dana.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Metode Bayar</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="transfer">Transfer Bank</SelectItem>
              <SelectItem value="cash">Tunai (Cash)</SelectItem>
              <SelectItem value="qris">QRIS / E-Wallet</SelectItem>
              <SelectItem value="cek">Cek / Giro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* NOMINAL */}
      <div className="space-y-2 bg-slate-50 p-3 rounded border border-slate-200">
        <Label>Nominal yang Dibayar (Rp)</Label>
        <Input
          type="number"
          value={amountToPay}
          onChange={(e) => setAmountToPay(e.target.value)}
          className="font-bold text-lg border-slate-300"
          min={0}
        />
      </div>

      {/* CATATAN & BUKTI (Sama kayak sebelumnya...) */}
      <div className="space-y-2">
        <Label>Catatan / No. Referensi</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contoh: Pelunasan Invoice INV-001..."
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label>Upload Bukti (Opsional)</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setProofFile(e.target.files[0])}
          className="cursor-pointer"
        />
      </div>
    </div>
  );
}
