import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Pake navigate
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  FileText,
  CheckSquare,
  Loader2,
  ArrowRight,
  DollarSign,
  Eye,
  Calendar,
  Building,
  History,
  XCircle,
  FileCheck,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function HotelInvoicePage() {
  const { authState } = useAuth();
  const navigate = useNavigate(); // Hook navigasi
  const [activeTab, setActiveTab] = useState("generator");

  // --- STATE GENERATOR ---
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState("");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = useState("");

  const [unbilledNotes, setUnbilledNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- STATE HISTORY ---
  const [invoiceList, setInvoiceList] = useState([]);

  // 1. FETCH DAFTAR HOTEL
  useEffect(() => {
    const fetchHotels = async () => {
      if (!authState.business_id) return;
      const { data } = await supabase
        .from("customers")
        .select("id, name")
        .eq("business_id", authState.business_id)
        .eq("tipe_pelanggan", "hotel");
      setHotels(data || []);
    };
    fetchHotels();
  }, [authState.business_id]);

  // 2. FETCH UNBILLED NOTES
  const fetchUnbilledNotes = async () => {
    if (!selectedHotel) return toast.error("Pilih Hotel dulu.");
    setLoadingData(true);
    try {
      const { data: notes, error } = await supabase
        .from("hotel_delivery_notes")
        .select(
          `
            id, invoice_code, pickup_date, status, notes, 
            hotel_delivery_items ( qty, packages ( price ) )
          `,
        )
        .eq("business_id", authState.business_id)
        .eq("customer_id", selectedHotel)
        .eq("status", "delivered")
        .is("invoice_id", null)
        .gte("pickup_date", startDate)
        .lte("pickup_date", endDate)
        .order("pickup_date", { ascending: true });

      if (error) throw error;

      const processed = notes.map((n) => {
        const calculatedTotal = n.hotel_delivery_items.reduce((sum, item) => {
          const price = item.packages?.price || 0;
          return sum + item.qty * price;
        }, 0);
        return { ...n, total_amount: calculatedTotal };
      });

      setUnbilledNotes(processed);
      setSelectedNotes([]);

      if (processed.length === 0) {
        toast.info("Tidak ditemukan Surat Jalan yang belum ditagih.");
      }
    } catch (e) {
      toast.error("Gagal cari data: " + e.message);
    } finally {
      setLoadingData(false);
    }
  };

  // 3. SELECTION & GENERATE
  const toggleSelect = (id) =>
    setSelectedNotes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleSelectAll = () =>
    setSelectedNotes(
      selectedNotes.length === unbilledNotes.length
        ? []
        : unbilledNotes.map((n) => n.id),
    );

  const estimatedTotal = unbilledNotes
    .filter((n) => selectedNotes.includes(n.id))
    .reduce((sum, n) => sum + n.total_amount, 0);

  const handleGenerate = async () => {
    if (selectedNotes.length === 0)
      return toast.error("Pilih minimal satu Surat Jalan.");
    if (!dueDate) return toast.error("Tentukan Jatuh Tempo.");

    setIsGenerating(true);
    try {
      const { error } = await supabase.rpc("generate_hotel_invoice", {
        p_business_id: authState.business_id,
        p_note_ids: selectedNotes,
        p_customer_id: parseInt(selectedHotel),
        p_start_date: startDate,
        p_end_date: endDate,
        p_due_date: dueDate,
        p_user_id: authState.user.id,
      });

      if (error) throw error;

      toast.success("Invoice Berhasil Dibuat!");
      setUnbilledNotes([]);
      setSelectedNotes([]);
      setDueDate("");
      setActiveTab("history"); // Pindah ke tab history
    } catch (e) {
      toast.error("Gagal: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. FETCH HISTORY
  useEffect(() => {
    if (activeTab === "history") {
      const loadHistory = async () => {
        const { data } = await supabase
          .from("hotel_invoices")
          .select(`*, customers(name)`)
          .eq("business_id", authState.business_id)
          .order("created_at", { ascending: false })
          .limit(20);
        setInvoiceList(data || []);
      };
      loadHistory();
    }
  }, [activeTab, authState.business_id]);

  return (
    <div className="space-y-6 animate-in fade-in p-6 pb-24 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building className="h-6 w-6 text-blue-600" /> Tagihan Hotel (B2B)
          </h1>
          <p className="text-slate-500 mt-1">Kelola tagihan hotel bulanan.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setActiveTab("history")}
            className={activeTab === "history" ? "bg-slate-100" : ""}
          >
            <History className="mr-2 h-4 w-4" /> Riwayat
          </Button>
          <Button
            onClick={() => setActiveTab("generator")}
            className={
              activeTab === "generator" ? "bg-blue-600 hover:bg-blue-700" : ""
            }
          >
            <DollarSign className="mr-2 h-4 w-4" /> Buat Tagihan
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* --- TAB GENERATOR (Sama kayak sebelumnya, cuma UI Clean up dikit) --- */}
        <TabsContent value="generator" className="mt-0 space-y-6">
          <Card className="border-l-4 border-l-blue-500 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" /> Filter Data
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-6 items-end">
              {/* ... INPUT FORM SAMA PERSIS ... */}
              <div className="w-full md:w-1/3 space-y-2">
                <label className="text-sm font-semibold">Hotel</label>
                <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Hotel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels.map((h) => (
                      <SelectItem key={h.id} value={String(h.id)}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-1/3 space-y-2">
                <label className="text-sm font-semibold">Periode</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span>-</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-full md:w-auto pb-0.5">
                <Button
                  onClick={fetchUnbilledNotes}
                  disabled={loadingData || !selectedHotel}
                  className="bg-blue-600 hover:bg-blue-700 w-full"
                >
                  {loadingData ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}{" "}
                  Cari
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List Surat Jalan */}
            <Card className="lg:col-span-2 shadow-md h-[500px] flex flex-col">
              <CardHeader className="py-3 bg-slate-50 border-b flex flex-row justify-between items-center">
                <CardTitle className="text-base">
                  Surat Jalan Tersedia
                </CardTitle>
                {unbilledNotes.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={
                        unbilledNotes.length > 0 &&
                        selectedNotes.length === unbilledNotes.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />{" "}
                    Pilih Semua
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto">
                {unbilledNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <XCircle className="h-10 w-10 mb-2 opacity-20" />
                    <p>Tidak ada data.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {unbilledNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-3 flex items-center gap-3 cursor-pointer ${selectedNotes.includes(note.id) ? "bg-blue-50" : "hover:bg-slate-50"}`}
                        onClick={() => toggleSelect(note.id)}
                      >
                        <Checkbox checked={selectedNotes.includes(note.id)} />
                        <div className="flex-1">
                          <div className="flex justify-between font-bold text-sm">
                            <span>{note.invoice_code || `SJ-${note.id}`}</span>
                            <span className="text-green-700 font-mono">
                              {formatRupiah(note.total_amount)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {new Date(note.pickup_date).toLocaleDateString(
                              "id-ID",
                            )}{" "}
                            • {note.notes || "-"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Box */}
            <Card className="shadow-lg border-t-4 border-t-blue-600 h-fit sticky top-4">
              <CardHeader className="py-3 border-b bg-slate-50">
                <CardTitle className="text-base text-blue-800">
                  Ringkasan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between font-bold text-lg text-blue-700">
                  <span>Total</span>
                  <span>{formatRupiah(estimatedTotal)}</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold">Jatuh Tempo</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={
                    selectedNotes.length === 0 || isGenerating || !dueDate
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isGenerating ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <FileCheck className="mr-2 h-4 w-4" />
                  )}{" "}
                  BUAT INVOICE
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- TAB HISTORY (NAVIGASI KE DETAIL) --- */}
        <TabsContent value="history" className="mt-0">
          <Card className="shadow-md border-0">
            <CardContent className="p-0">
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="p-4">No Invoice</th>
                      <th className="p-4">Hotel</th>
                      <th className="p-4">Periode</th>
                      <th className="p-4 text-right">Total</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {invoiceList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-slate-400"
                        >
                          Belum ada history.
                        </td>
                      </tr>
                    ) : (
                      invoiceList.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="p-4 font-bold text-blue-600 font-mono">
                            {inv.invoice_number}
                          </td>
                          <td className="p-4">{inv.customers?.name}</td>
                          <td className="p-4 text-xs text-slate-500">
                            {new Date(inv.period_start).toLocaleDateString(
                              "id-ID",
                            )}{" "}
                            -{" "}
                            {new Date(inv.period_end).toLocaleDateString(
                              "id-ID",
                            )}
                          </td>
                          <td className="p-4 text-right font-bold font-mono">
                            {formatRupiah(inv.grand_total)}
                          </td>
                          <td className="p-4 text-center">
                            <Badge
                              variant={
                                inv.payment_status === "paid"
                                  ? "success"
                                  : "outline"
                              }
                            >
                              {inv.payment_status === "paid"
                                ? "LUNAS"
                                : "BELUM BAYAR"}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            {/* --- BUTTON NAVIGASI KE HALAMAN DETAIL --- */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 hover:bg-blue-50"
                              // Pastikan huruf kecil semua '/inventory/' sesuai yang didaftarkan di App.jsx
                              onClick={() =>
                                navigate(`/inventory/hotel-invoices/${inv.id}`)
                              }
                            >
                              <Eye className="w-4 h-4 mr-1" /> Detail
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
