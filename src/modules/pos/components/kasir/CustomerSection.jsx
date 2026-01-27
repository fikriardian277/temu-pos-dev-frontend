// src/components/kasir/CustomerSection.jsx (VERSI ANTI-BOCOR & LENGKAP)

import React, { useState, useCallback, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { UserPlus, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ... (semua import komponen UI kamu tidak berubah)
import { Button } from "@/components/ui/Button.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Label } from "@/components/ui/Label.jsx";
import { Badge } from "@/components/ui/Badge.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/Dialog.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";

function CustomerSection({
  selectedPelanggan,
  onSelectPelanggan,
  onUpgradeMember,
  isPoinSystemActive,
  isPaidMembershipRequired,
  isUpgradingMember,
  onOpenPoinModal,
  pengaturan,
}) {
  const { authState } = useAuth(); // <-- DAPATKAN 'KTP DIGITAL' DARI SINI
  const [searchTerm, setSearchTerm] = useState("");
  const [pelangganList, setPelangganList] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPelangganData, setNewPelangganData] = useState({
    name: "",
    phone_number: "",
    address: "",
  });

  const fetchPelanggan = useCallback(async () => {
    if (searchTerm.trim().length < 3 || !authState.business_id) {
      setPelangganList([]);
      return;
    }
    setIsSearching(true);
    try {
      // PERUBAHAN #1: Gunakan Supabase dengan filter keamanan berlapis
      let query = supabase.from("customers").select("*");

      // Filter wajib berdasarkan 'Nomor Hotel'
      query = query.eq("business_id", authState.business_id);

      // Jika bukan Owner, filter lagi berdasarkan 'Nomor Kamar'
      if (authState.role !== "owner") {
        query = query.eq("branch_id", authState.branch_id);
      }

      query = query.eq("status", "aktif");

      // Lakukan pencarian
      query = query
        .or(`name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`)
        .limit(5);

      const { data, error } = await query;
      if (error) throw error;
      setPelangganList(data);
    } catch (error) {
      toast.error("Gagal mencari pelanggan.");
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, authState.business_id, authState.branch_id, authState.role]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPelanggan();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchPelanggan]);

  const handleNewPelangganChange = (e) => {
    setNewPelangganData({
      ...newPelangganData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreatePelanggan = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { name, phone_number, address } = newPelangganData;

    // Tambah validasi simpel
    if (!name || !phone_number) {
      toast.error("Nama dan Nomor HP wajib diisi.");
      setIsSubmitting(false);
      return;
    }
    if (phone_number.length < 10) {
      toast.error("Nomor HP minimal 10 digit.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Cek dulu nomor HP ini
      const { data: existingCustomer, error: checkError } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", authState.business_id)
        .eq("phone_number", phone_number)
        .maybeSingle(); // maybeSingle() gak error kalo datanya null

      if (checkError) throw checkError;

      if (existingCustomer) {
        // --- PELANGGAN DITEMUKAN ---
        if (existingCustomer.status === "aktif") {
          toast.error(
            "Nomor HP ini sudah terdaftar atas nama: " + existingCustomer.name
          );
          // Jangan tutup modal, biarkan kasir ganti nomor
        } else {
          // --- PELANGGAN NONAKTIF, TANYA UNTUK AKTIFKAN ---
          if (
            window.confirm(
              `Nomor HP ini sudah ada (status: Nonaktif) atas nama: ${existingCustomer.name}.\n\nAktifkan & update datanya?`
            )
          ) {
            // Kalo user klik "OK", kita UPDATE
            const { data: updatedCustomer, error: updateError } = await supabase
              .from("customers")
              .update({
                status: "aktif",
                name: name,
                address: address,
                branch_id: authState.branch_id, // Set ke cabang kasir saat ini
              })
              .eq("id", existingCustomer.id)
              .select()
              .single();

            if (updateError) throw updateError;

            toast.success(
              `Pelanggan "${updatedCustomer.name}" berhasil diaktifkan kembali!`
            );
            onSelectPelanggan(updatedCustomer); // Langsung pilih pelanggan ini
            setIsNewModalOpen(false); // Tutup modal
          }
          // Kalo user klik "Cancel", gajadi ngapa-ngapain
        }
      } else {
        // --- PELANGGAN BARU, INSERT ---
        const { data: newCustomer, error: insertError } = await supabase
          .from("customers")
          .insert({
            name: name,
            phone_number: phone_number,
            address: address,
            branch_id: authState.branch_id,
            business_id: authState.business_id,
            status: "aktif", // <-- Langsung set 'aktif'
          })
          .select()
          .single();

        if (insertError) throw insertError;

        toast.success("Pelanggan baru berhasil dibuat!");
        onSelectPelanggan(newCustomer); // Langsung pilih pelanggan baru ini
        setIsNewModalOpen(false); // Tutup modal
      }
    } catch (err) {
      toast.error(err.message || "Gagal memproses pelanggan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // PERUBAHAN #3: Gunakan nama kolom asli di seluruh JSX
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pelanggan</CardTitle>
      </CardHeader>
      <CardContent>
        {selectedPelanggan ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <div>
                <p className="font-bold text-primary">
                  {selectedPelanggan.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedPelanggan.phone_number}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectPelanggan(null)}
              >
                Ganti
              </Button>
            </div>

            {isPoinSystemActive && (
              <div className="border-t pt-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {isPaidMembershipRequired && (
                    <Badge
                      variant={
                        selectedPelanggan.is_member ? "default" : "secondary"
                      }
                    >
                      {selectedPelanggan.is_member ? "Member" : "Non-Member"}
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    Poin: {selectedPelanggan.points}
                  </span>
                </div>
                <Button
                  onClick={onOpenPoinModal}
                  disabled={
                    selectedPelanggan.points <
                    (pengaturan?.min_points_to_redeem || 0)
                  }
                  variant="secondary"
                  size="sm"
                >
                  <Star className="w-4 h-4 mr-2" /> Tukar Poin
                </Button>
              </div>
            )}

            {isPoinSystemActive &&
              isPaidMembershipRequired &&
              !selectedPelanggan.is_member &&
              !isUpgradingMember && (
                <Button
                  onClick={onUpgradeMember}
                  variant="default"
                  size="sm"
                  className="w-full"
                >
                  Upgrade Jadi Member
                </Button>
              )}

            {isUpgradingMember && (
              <p className="text-sm text-green-500 text-center">
                Biaya membership telah ditambahkan ke keranjang.
              </p>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Cari nama atau nomor HP (min 3 karakter)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <UserPlus className="h-4 w-4 mr-2" /> Baru
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
                    <DialogDescription>
                      Masukkan detail pelanggan untuk mendaftarkannya.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={handleCreatePelanggan}
                    className="space-y-4 py-4"
                  >
                    <div>
                      <Label htmlFor="name">Nama Pelanggan</Label>
                      <Input
                        id="name"
                        name="name"
                        value={newPelangganData.name}
                        onChange={handleNewPelangganChange}
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone_number">Nomor HP</Label>
                      <Input
                        id="phone_number"
                        name="phone_number"
                        value={newPelangganData.phone_number}
                        onChange={handleNewPelangganChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Alamat (Opsional)</Label>
                      <Textarea
                        id="address"
                        name="address"
                        value={newPelangganData.address}
                        onChange={handleNewPelangganChange}
                        placeholder="Masukkan alamat lengkap..."
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsNewModalOpen(false)}
                      >
                        Batal
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                            Menyimpan...
                          </>
                        ) : (
                          "Simpan"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {isSearching && (
              <p className="text-muted-foreground mt-2 text-sm">Mencari...</p>
            )}
            {pelangganList.length > 0 && (
              <div className="absolute z-10 w-full mt-1">
                <Card className="max-h-60 overflow-y-auto">
                  {pelangganList.map((pelanggan) => (
                    <div
                      key={pelanggan.id}
                      onClick={() => {
                        onSelectPelanggan(pelanggan);
                        setSearchTerm("");
                      }}
                      className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                    >
                      <p className="font-semibold">{pelanggan.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {pelanggan.phone_number}
                      </p>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CustomerSection;
