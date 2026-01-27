// src/components/kasir/ServiceSelector.jsx (VERSI PINTAR & MANDIRI)

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card.jsx";
import { Input } from "@/components/ui/Input.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select.jsx";

function ServiceSelector({ categories, onAddToCart }) {
  // State internal, dikelola sendiri oleh komponen ini
  const [selectedKategoriId, setSelectedKategoriId] = useState("");
  const [selectedLayananId, setSelectedLayananId] = useState("");
  const [selectedPaketId, setSelectedPaketId] = useState("");
  const [jumlah, setJumlah] = useState("");

  // Opsi dropdown yang dihitung berdasarkan pilihan
  const [layananOptions, setLayananOptions] = useState([]);
  const [paketOptions, setPaketOptions] = useState([]);

  // Fungsi internal untuk handle perubahan
  const handleKategoriChange = (kategoriId) => {
    setSelectedKategoriId(kategoriId);
    setSelectedLayananId(""); // Reset pilihan layanan
    setSelectedPaketId(""); // Reset pilihan paket
    const selectedKategori = categories.find(
      (k) => k.id === parseInt(kategoriId)
    );
    setLayananOptions(selectedKategori?.services || []);
    setPaketOptions([]);
  };

  const handleLayananChange = (layananId) => {
    setSelectedLayananId(layananId);
    setSelectedPaketId(""); // Reset pilihan paket
    const selectedLayanan = layananOptions.find(
      (l) => l.id === parseInt(layananId)
    );
    setPaketOptions(selectedLayanan?.packages || []);
  };

  const handleAddToCart = () => {
    if (!selectedPaketId || !jumlah) {
      return toast.error("Pilih paket dan masukkan jumlah.");
    }
    const selectedPaket = paketOptions.find(
      (p) => p.id === parseInt(selectedPaketId)
    );
    if (selectedPaket) {
      onAddToCart(selectedPaket, parseFloat(jumlah));
      // Reset form setelah berhasil
      setSelectedPaketId("");
      setJumlah("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pilih Layanan & Paket</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            onValueChange={handleKategoriChange}
            value={selectedKategoriId}
          >
            <SelectTrigger>
              <SelectValue placeholder="-- Pilih Kategori --" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((k) => (
                <SelectItem key={k.id} value={String(k.id)}>
                  {k.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={handleLayananChange}
            value={selectedLayananId}
            disabled={!layananOptions.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="-- Pilih Layanan --" />
            </SelectTrigger>
            <SelectContent>
              {layananOptions.map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            onValueChange={setSelectedPaketId}
            value={selectedPaketId}
            disabled={!paketOptions.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="-- Pilih Paket --" />
            </SelectTrigger>
            <SelectContent>
              {paketOptions.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Jumlah"
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
            min=""
          />
        </div>
        <Button onClick={handleAddToCart} className="w-full">
          Tambah ke Keranjang
        </Button>
      </CardContent>
    </Card>
  );
}

export default ServiceSelector;
