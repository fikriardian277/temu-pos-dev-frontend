import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  BookOpen,
  Search,
  Filter,
  Eye,
  Plus,
  Loader2,
  Calendar as CalendarIcon,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"; // Pastikan punya komponen ini
import { Label } from "@/components/ui/label"; // Pastikan punya komponen ini
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Format Currency IDR
const formatCurrency = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

export default function GeneralLedgerPage() {
  const { authState } = useAuth();
  const businessId = authState.user?.business_id || 2;

  // --- STATE UTAMA ---
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- STATE FILTER TANGGAL ---
  // Default: 30 hari terakhir
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // --- STATE MODAL DETAIL ---
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryItems, setEntryItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // --- STATE MANUAL JURNAL ---
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [coaList, setCoaList] = useState([]); // Butuh list akun buat dropdown
  const [newJournal, setNewJournal] = useState({
    date: new Date().toISOString().split("T")[0],
    ref: "",
    desc: "",
    items: [
      { account_id: "", debit: 0, credit: 0, desc: "" },
      { account_id: "", debit: 0, credit: 0, desc: "" }, // Default 2 baris
    ],
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (businessId) {
      fetchEntries();
      fetchCoa();
    }
  }, [businessId, startDate, endDate]); // Refresh kalau tanggal berubah

  // 1. Fetch Header Jurnal (Dengan Filter Tanggal)
  const fetchEntries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .schema("accounting")
        .from("journal_entries")
        .select("*")
        .eq("business_id", businessId)
        .gte("entry_date", startDate) // >= Start Date
        .lte("entry_date", endDate) // <= End Date
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setEntries(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Gagal ambil data jurnal");
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch COA (Untuk Dropdown Manual Jurnal)
  const fetchCoa = async () => {
    const { data } = await supabase
      .schema("accounting")
      .from("coa")
      .select("id, code, name")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("code");
    setCoaList(data || []);
  };

  // 3. Fetch Detail Items
  const handleViewDetail = async (entry) => {
    setSelectedEntry(entry);
    setIsDetailOpen(true);
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .schema("accounting")
        .from("journal_items")
        .select(`*, coa:account_id ( code, name )`)
        .eq("journal_id", entry.id)
        .order("debit", { ascending: false });

      if (error) throw error;
      setEntryItems(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Gagal load detail item");
    } finally {
      setLoadingItems(false);
    }
  };

  // --- LOGIC MANUAL JURNAL ---

  // Tambah Baris
  const addRow = () => {
    setNewJournal((prev) => ({
      ...prev,
      items: [...prev.items, { account_id: "", debit: 0, credit: 0, desc: "" }],
    }));
  };

  // Hapus Baris
  const removeRow = (index) => {
    if (newJournal.items.length <= 2) {
      toast.warning("Minimal harus ada 2 baris jurnal.");
      return;
    }
    const newItems = newJournal.items.filter((_, i) => i !== index);
    setNewJournal((prev) => ({ ...prev, items: newItems }));
  };

  // Update Item Baris
  const updateItem = (index, field, value) => {
    const newItems = [...newJournal.items];
    newItems[index][field] = value;

    // Logic: Kalau isi Debit, Kredit jadi 0 (dan sebaliknya)
    if (field === "debit" && value > 0) newItems[index].credit = 0;
    if (field === "credit" && value > 0) newItems[index].debit = 0;

    setNewJournal((prev) => ({ ...prev, items: newItems }));
  };

  // Hitung Total
  const totalDebit = newJournal.items.reduce(
    (sum, item) => sum + parseFloat(item.debit || 0),
    0
  );
  const totalCredit = newJournal.items.reduce(
    (sum, item) => sum + parseFloat(item.credit || 0),
    0
  );
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  // Simpan Jurnal Manual
  const handleSaveManual = async () => {
    if (!newJournal.ref || !newJournal.desc)
      return toast.error("No. Ref dan Deskripsi wajib diisi.");
    if (!isBalanced) return toast.error("Jurnal belum balance (Seimbang)!");

    // Validasi akun kosong
    if (newJournal.items.some((i) => !i.account_id))
      return toast.error("Semua baris harus pilih akun.");

    setIsSaving(true);
    try {
      // 1. Insert Header
      const { data: header, error: headError } = await supabase
        .schema("accounting")
        .from("journal_entries")
        .insert({
          business_id: businessId,
          entry_date: newJournal.date,
          description: newJournal.desc,
          reference_id: newJournal.ref,
          source_module: "manual_journal",
          entry_type: "manual",
          status: "posted",
          created_by: authState.user.id,
        })
        .select()
        .single();

      if (headError) throw headError;

      // 2. Insert Items
      const itemsPayload = newJournal.items.map((item) => ({
        journal_id: header.id,
        account_id: parseInt(item.account_id),
        debit: parseFloat(item.debit || 0),
        credit: parseFloat(item.credit || 0),
        description: item.desc || newJournal.desc,
      }));

      const { error: itemError } = await supabase
        .schema("accounting")
        .from("journal_items")
        .insert(itemsPayload);

      if (itemError) {
        // Rollback Header kalau item gagal (Manual delete karena Supabase client gak support transaction mudah)
        await supabase
          .schema("accounting")
          .from("journal_entries")
          .delete()
          .eq("id", header.id);
        throw itemError;
      }

      toast.success("Jurnal Manual Berhasil Disimpan!");
      setIsCreateOpen(false);

      // Reset Form
      setNewJournal({
        date: new Date().toISOString().split("T")[0],
        ref: "",
        desc: "",
        items: [
          { account_id: "", debit: 0, credit: 0, desc: "" },
          { account_id: "", debit: 0, credit: 0, desc: "" },
        ],
      });
      fetchEntries(); // Refresh Table
    } catch (e) {
      console.error(e);
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEntries = entries.filter(
    (e) =>
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.reference_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <BookOpen className="text-blue-600" /> Jurnal Umum (General Ledger)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Rekam jejak seluruh transaksi keuangan (Otomatis & Manual).
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" /> Buat Jurnal Manual
        </Button>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <Input
              type="text"
              placeholder="Cari No. Ref atau Deskripsi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button
            variant="outline"
            className={`text-gray-600 border-gray-200 ${
              isFilterOpen ? "bg-gray-100" : ""
            }`}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter className="w-4 h-4 mr-2" />
            {isFilterOpen ? "Tutup Filter" : "Filter Tanggal"}
          </Button>
        </div>

        {/* AREA FILTER TANGGAL (Toggle) */}
        {isFilterOpen && (
          <div className="pt-3 border-t flex flex-col sm:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-2">
            <div>
              <Label className="text-xs text-gray-500 mb-1">Dari Tanggal</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1">
                Sampai Tanggal
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
            <div className="text-xs text-gray-400 pb-2">
              Menampilkan data periode terpilih.
            </div>
          </div>
        )}
      </div>

      {/* TABLE UTAMA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 w-32">Tanggal</th>
                <th className="px-6 py-3">No. Referensi</th>
                <th className="px-6 py-3">Deskripsi</th>
                <th className="px-6 py-3">Module</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <Loader2
                      className="animate-spin inline-block mr-2"
                      size={20}
                    />
                    Loading Jurnal...
                  </td>
                </tr>
              ) : filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CalendarIcon size={14} className="text-gray-400" />
                        {format(new Date(entry.entry_date), "dd MMM yyyy")}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-blue-600 text-xs">
                      {entry.reference_id || "-"}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {entry.description}
                      <div className="text-xs text-gray-400 mt-0.5 font-normal">
                        {entry.entry_type === "manual" && (
                          <span className="text-orange-600 font-bold bg-orange-50 px-1 rounded mr-2">
                            MANUAL
                          </span>
                        )}
                        Type: {entry.entry_type}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium uppercase">
                        {entry.source_module?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          entry.status === "posted"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : entry.status === "draft"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleViewDetail(entry)}
                      >
                        <Eye size={16} />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    Tidak ada data jurnal pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DETAIL JURNAL (Read Only) --- */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between border-b pb-4">
              <div className="flex flex-col gap-1">
                <span>Detail Jurnal</span>
                <span className="text-sm font-normal text-gray-500 font-mono">
                  #{selectedEntry?.reference_id}
                </span>
              </div>
              {selectedEntry && (
                <div className="text-right mr-6">
                  <div className="text-sm text-gray-500">Tanggal</div>
                  <div className="font-medium">
                    {format(new Date(selectedEntry.entry_date), "dd MMMM yyyy")}
                  </div>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2">
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mb-4 border border-gray-200">
              <span className="font-semibold">Deskripsi:</span>{" "}
              {selectedEntry?.description}
            </div>

            {loadingItems ? (
              <div className="py-8 text-center text-gray-500">
                <Loader2 className="animate-spin inline-block mr-2" /> Loading
                detail...
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600 font-medium">
                    <tr>
                      <th className="px-4 py-2 text-left">Akun (COA)</th>
                      <th className="px-4 py-2 text-left">Keterangan Line</th>
                      <th className="px-4 py-2 text-right text-green-700">
                        Debit
                      </th>
                      <th className="px-4 py-2 text-right text-red-700">
                        Kredit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entryItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-800">
                            {item.coa?.name || "Unknown Account"}
                          </div>
                          <div className="text-xs font-mono text-gray-500">
                            {item.coa?.code}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {item.description || "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-gray-700">
                          {item.debit > 0 ? formatCurrency(item.debit) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-gray-700">
                          {item.credit > 0 ? formatCurrency(item.credit) : "-"}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-bold border-t border-gray-200">
                      <td colSpan="2" className="px-4 py-3 text-right">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right text-green-700">
                        {formatCurrency(
                          entryItems.reduce((sum, i) => sum + i.debit, 0)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-red-700">
                        {formatCurrency(
                          entryItems.reduce((sum, i) => sum + i.credit, 0)
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL BUAT JURNAL MANUAL --- */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Jurnal Manual (Adjustment)</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <div>
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={newJournal.date}
                onChange={(e) =>
                  setNewJournal({ ...newJournal, date: e.target.value })
                }
              />
            </div>
            <div>
              <Label>No. Referensi (Manual)</Label>
              <Input
                placeholder="Contoh: ADJ-MANUAL-01"
                value={newJournal.ref}
                onChange={(e) =>
                  setNewJournal({ ...newJournal, ref: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-3">
              <Label>Deskripsi Jurnal</Label>
              <Textarea
                placeholder="Keterangan transaksi..."
                value={newJournal.desc}
                onChange={(e) =>
                  setNewJournal({ ...newJournal, desc: e.target.value })
                }
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left w-[30%]">Akun</th>
                  <th className="px-3 py-2 text-left w-[25%]">
                    Keterangan (Opsional)
                  </th>
                  <th className="px-3 py-2 text-right w-[18%]">Debit</th>
                  <th className="px-3 py-2 text-right w-[18%]">Kredit</th>
                  <th className="px-3 py-2 text-center w-[5%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {newJournal.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-2 py-2">
                      <Select
                        value={item.account_id ? String(item.account_id) : ""}
                        onValueChange={(val) =>
                          updateItem(idx, "account_id", val)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Pilih Akun" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {coaList.map((coa) => (
                            <SelectItem key={coa.id} value={String(coa.id)}>
                              {coa.code} - {coa.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        className="h-8"
                        placeholder="Ket. per baris"
                        value={item.desc}
                        onChange={(e) =>
                          updateItem(idx, "desc", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        className="h-8 text-right"
                        value={item.debit}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "debit",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        className="h-8 text-right"
                        value={item.credit}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "credit",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                        onClick={() => removeRow(idx)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t">
                <tr>
                  <td colSpan="2" className="px-4 py-2 text-right">
                    TOTAL
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${
                      totalDebit !== totalCredit
                        ? "text-red-500"
                        : "text-green-700"
                    }`}
                  >
                    {formatCurrency(totalDebit)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${
                      totalDebit !== totalCredit
                        ? "text-red-500"
                        : "text-green-700"
                    }`}
                  >
                    {formatCurrency(totalCredit)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-between items-center mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addRow}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4 mr-1" /> Tambah Baris
            </Button>

            <div className="text-xs text-gray-500">
              {totalDebit !== totalCredit ? (
                <span className="text-red-500 font-bold flex items-center gap-1">
                  <X size={14} /> BELUM BALANCE (Selisih:{" "}
                  {formatCurrency(Math.abs(totalDebit - totalCredit))})
                </span>
              ) : (
                <span className="text-green-600 font-bold">✓ BALANCE</span>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSaveManual}
              disabled={isSaving || !isBalanced || totalDebit === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Simpan Jurnal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
