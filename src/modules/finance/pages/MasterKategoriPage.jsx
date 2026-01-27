import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Tags, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";

export default function MasterKategoriPage() {
  const { authState } = useAuth();
  const [categories, setCategories] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchCats = useCallback(async () => {
    if (!authState.business_id) return;
    const { data } = await supabase
      .schema("finance")
      .from("expense_categories")
      .select("*")
      .eq("business_id", authState.business_id)
      .order("name");
    setCategories(data || []);
  }, [authState.business_id]);

  useEffect(() => {
    fetchCats();
  }, [fetchCats]);

  const handleSubmit = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .schema("finance")
        .from("expense_categories")
        .insert({
          business_id: authState.business_id,
          name: newName,
          type: "expense",
        });
      if (error) throw error;
      toast.success("Kategori disimpan!");
      setNewName("");
      setIsOpen(false);
      fetchCats();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus kategori ini?")) return;
    try {
      const { error } = await supabase
        .schema("finance")
        .from("expense_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Dihapus.");
      fetchCats();
    } catch (e) {
      toast.error("Gagal hapus (Mungkin sudah dipakai di transaksi).");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kategori Biaya</h1>
          <p className="text-muted-foreground">
            Pos-pos pengeluaran (Chart of Accounts).
          </p>
        </div>
        {authState.role === "owner" && (
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Kategori
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {categories.map((cat) => (
          <Card key={cat.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded text-slate-600">
                <Tags className="h-5 w-5" />
              </div>
              <span className="font-medium">{cat.name}</span>
            </div>
            {authState.role === "owner" && (
              <Button
                variant="ghost"
                size="icon"
                className="text-red-400 hover:text-red-600"
                onClick={() => handleDelete(cat.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Kategori Biaya</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Nama Kategori</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contoh: Listrik, Gaji, ATK"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
