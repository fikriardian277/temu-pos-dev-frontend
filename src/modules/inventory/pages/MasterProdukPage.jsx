import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Plus, Package, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import ProductForm from "../components/ProductForm";

export default function MasterProdukPage() {
  const { authState } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // State Modal & Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // <--- STATE PENTING

  const fetchProducts = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);
    try {
      let query = supabase
        .schema("inventory")
        .from("products")
        .select(`*, suppliers (name)`)
        .eq("business_id", authState.business_id)
        .order("name", { ascending: true });

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [authState.business_id, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // HANDLER BUKA MODAL
  const handleCreate = () => {
    setSelectedProduct(null);
    setIsFormOpen(true);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Produk</h1>
          <p className="text-muted-foreground">Database barang inventory.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Produk
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari produk..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="ghost" size="icon" onClick={fetchProducts}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Satuan</th>
                  <th className="px-4 py-3">Konversi</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center">
                      Memuat...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center">
                      Belum ada produk.
                    </td>
                  </tr>
                ) : (
                  products.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/5">
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {item.sku}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.suppliers?.name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{item.unit}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.conversion_rate > 1
                          ? `1 ${item.purchase_unit} = ${item.conversion_rate} ${item.unit}`
                          : "1:1"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={item.is_active ? "default" : "secondary"}
                          className={item.is_active ? "bg-green-600" : ""}
                        >
                          {item.is_active ? "Aktif" : "Mati"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL FORM - PASTIKAN PASSING initialData */}
      <ProductForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchProducts}
        initialData={selectedProduct}
      />
    </div>
  );
}
