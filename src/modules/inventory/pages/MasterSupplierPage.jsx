import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  Truck,
  Phone,
  User,
  MapPin,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown-menu";
import SupplierForm from "../components/SupplierForm";

export default function MasterSupplierPage() {
  const { authState } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSuppliers = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema("inventory")
        .from("suppliers")
        .select("*")
        .eq("business_id", authState.business_id)
        .order("name", { ascending: true });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [authState.business_id]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleAdd = () => {
    setEditingData(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item) => {
    setEditingData(item);
    setIsFormOpen(true);
  };

  // Filter Search
  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      {/* HEADER PAGE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Supplier</h1>
          <p className="text-muted-foreground">
            Kelola database pemasok dan vendor.
          </p>
        </div>
        <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Tambah Supplier
        </Button>
      </div>

      {/* STATS & FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-slate-900">
              {suppliers.length}
            </span>{" "}
            Total
          </div>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="font-medium text-slate-900">
              {suppliers.filter((s) => s.is_active).length}
            </span>{" "}
            Aktif
          </div>
        </div>

        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama supplier..."
            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* GRID CARD */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            Memuat data...
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl bg-slate-50/50">
            <Truck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              Tidak ada supplier ditemukan.
            </p>
            {searchTerm && (
              <p className="text-sm text-slate-400">Coba kata kunci lain.</p>
            )}
          </div>
        ) : (
          filteredSuppliers.map((sup) => (
            <Card
              key={sup.id}
              className={`group transition-all hover:shadow-lg border-l-4 ${
                sup.is_active
                  ? "border-l-blue-500"
                  : "border-l-slate-300 opacity-70"
              }`}
            >
              <CardContent className="p-0">
                {/* Header Card */}
                <div className="p-5 flex justify-between items-start border-b bg-slate-50/30">
                  <div className="flex gap-3">
                    <div
                      className={`mt-1 p-2.5 rounded-lg ${sup.is_active ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}
                    >
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 leading-tight">
                        {sup.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {sup.category && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-white text-slate-600 border-slate-300"
                          >
                            {sup.category}
                          </Badge>
                        )}
                        <Badge
                          className={`text-[10px] font-medium border-0 ${
                            sup.term_of_payment === "COD"
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                          }`}
                        >
                          {sup.term_of_payment || "COD"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-700"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(sup)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit Data
                      </DropdownMenuItem>
                      {/* Nanti bisa tambah delete/non-aktif disini */}
                      {/* <DropdownMenuItem className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                </DropdownMenuItem> */}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Body Card */}
                <div className="p-5 space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-slate-600">
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-900">
                      {sup.contact_person || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{sup.phone || "-"}</span>
                  </div>
                  <div className="flex items-start gap-3 text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">
                      {sup.address || "Alamat belum diisi"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <SupplierForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchSuppliers}
        initialData={editingData}
      />
    </div>
  );
}
