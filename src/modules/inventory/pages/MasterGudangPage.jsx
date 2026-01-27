import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Plus, Warehouse, MapPin, Edit, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter } from "@/components/ui/Card"; // Tambah CardFooter
import { Badge } from "@/components/ui/Badge";
import WarehouseForm from "../components/WarehouseForm";

export default function MasterGudangPage() {
  const { authState } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // State Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingData, setEditingData] = useState(null); // Data yang mau diedit

  const fetchWarehouses = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);
    try {
      // 1. Ambil Data Gudang (dari schema inventory)
      const { data: whData, error: whError } = await supabase
        .schema("inventory")
        .from("warehouses")
        .select("*")
        .eq("business_id", authState.business_id)
        .order("is_active", { ascending: false })
        .order("is_main_warehouse", { ascending: false });

      if (whError) throw whError;

      // 2. Ambil Data Cabang (dari schema public) - Manual Fetch
      const { data: branchData, error: branchError } = await supabase
        .from("branches")
        .select("id, name")
        .eq("business_id", authState.business_id);

      if (branchError) throw branchError;

      // 3. Gabungkan Manual (JS Join)
      // Kita cari nama cabang berdasarkan ID yang ada di gudang
      const mergedData = whData.map((wh) => ({
        ...wh,
        branches: branchData.find((b) => b.id === wh.branch_id) || null,
      }));

      setWarehouses(mergedData || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal memuat data gudang.");
    } finally {
      setLoading(false);
    }
  }, [authState.business_id]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // Handler Buka Form
  const handleAdd = () => {
    setEditingData(null); // Reset (Mode Tambah)
    setIsFormOpen(true);
  };

  const handleEdit = (wh) => {
    setEditingData(wh); // Isi data (Mode Edit)
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Gudang</h1>
          <p className="text-muted-foreground">
            Lokasi penyimpanan & status gudang.
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Gudang
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {warehouses.map((wh) => (
          <Card
            key={wh.id}
            className={`relative overflow-hidden transition-all ${
              !wh.is_active
                ? "opacity-60 bg-muted grayscale"
                : "hover:shadow-md"
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      wh.is_active
                        ? "bg-primary/10 text-primary"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    <Warehouse className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {wh.name}
                      {!wh.is_active && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] h-5 px-1"
                        >
                          <EyeOff className="h-3 w-3 mr-1" /> Nonaktif
                        </Badge>
                      )}
                    </h3>
                    {wh.is_main_warehouse && (
                      <Badge className="mt-1 bg-blue-600 hover:bg-blue-700">
                        Gudang Pusat
                      </Badge>
                    )}
                    <div className="text-sm mt-1">
                      {wh.branches ? (
                        <Badge
                          variant="outline"
                          className="text-blue-600 border-blue-200 bg-blue-50"
                        >
                          🔗 Outlet: {wh.branches.name}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-gray-500 border-gray-200"
                        >
                          🏠 Standalone (Gudang Lepas)
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-2 h-4 w-4" />
                {wh.address || "Alamat belum diisi"}
              </div>
            </CardContent>

            {/* Tombol Edit */}
            <CardFooter className="bg-muted/10 p-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(wh)}>
                <Edit className="mr-2 h-3 w-3" /> Edit Data
              </Button>
            </CardFooter>
          </Card>
        ))}
        {!loading && warehouses.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
            Belum ada data gudang.
          </div>
        )}
      </div>

      <WarehouseForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchWarehouses}
        initialData={editingData} // Oper data yang mau diedit
      />
    </div>
  );
}
