import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom"; // <--- TAMBAH INI
import {
  Play,
  Upload,
  FileSpreadsheet,
  Eye,
  CheckCircle,
  Loader2,
  Calendar,
  Search,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function PayrollRunPage() {
  const navigate = useNavigate();
  const { authState } = useAuth();

  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(false);
  const [runs, setRuns] = useState([]);

  // Form State
  const [periodName, setPeriodName] = useState("");
  const [dates, setDates] = useState({ start: "", end: "" });

  // Excel State
  const [workbook, setWorkbook] = useState(null); // Simpan File Mentah di Memory
  const [sheetNames, setSheetNames] = useState([]); // Daftar Nama Tab
  const [selectedSheet, setSelectedSheet] = useState(""); // Tab yg dipilih user

  const [excelData, setExcelData] = useState([]);
  const [parsingStatus, setParsingStatus] = useState(null);

  useEffect(() => {
    if (authState.business_id) fetchRuns();
  }, [authState.business_id]);

  const fetchRuns = async () => {
    const { data } = await supabase
      .schema("hr")
      .from("payroll_runs")
      .select("*")
      .eq("business_id", authState.business_id)
      .order("created_at", { ascending: false });
    setRuns(data || []);
  };

  // 1. UPLOAD FILE & BACA DAFTAR SHEET
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setParsingStatus("Membaca file...");
    setSheetNames([]);
    setSelectedSheet("");
    setExcelData([]);
    setWorkbook(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });

        // Simpan Workbook & List Sheet
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        setParsingStatus(null);

        toast.success(`File terbaca! Ditemukan ${wb.SheetNames.length} Sheet.`);
      } catch (error) {
        console.error(error);
        setParsingStatus("❌ Error membaca file excel.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // 2. SAAT USER PILIH SHEET -> SCANNING DIMULAI
  const handleSheetChange = (sheetName) => {
    setSelectedSheet(sheetName);
    if (!workbook) return;

    setParsingStatus(`Scanning Sheet: ${sheetName}...`);
    setExcelData([]);

    try {
      const ws = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });

      let idxNik = -1;
      let idxAtt = -1;
      let idxOt = -1;
      let idxTotal = -1; // 👈 1. TAMBAHIN VARIABEL INI
      let dataStartRow = -1;

      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        const row = rawRows[i] || [];
        for (let j = 0; j < row.length; j++) {
          const cellVal = String(row[j] || "")
            .toUpperCase()
            .trim();

          if (cellVal.includes("EMPLOYE ID")) idxNik = j;
          if (cellVal.includes("ATTENDANCE HOURS")) {
            idxAtt = j;
            dataStartRow = i + 1;
          }
          if (cellVal.includes("OVERTIME HOURS")) idxOt = j;
          // 👇 2. TAMBAHIN PENCARIAN INI 👇
          if (cellVal.includes("TOTAL WORKING HOURS")) idxTotal = j;
        }
      }

      // Validasi kalau kolomnya beneran gak ada
      if (idxNik === -1 || idxAtt === -1) {
        setParsingStatus(
          `❌ Gagal: Tidak menemukan kolom 'Employe ID' atau 'Total Working Days' di Sheet "${sheetName}".`,
        );
        return;
      }

      // ==========================================
      // AMBIL DATA KARYAWAN
      // ==========================================
      let extracted = [];
      // Looping dimulai dari baris tepat di bawah Header
      for (let i = dataStartRow; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row) continue;

        // Tangkep nilai di kolom ID
        const empId = String(row[idxNik] || "").trim();

        // 👇 FILTER ANTI-LEGEND 👇
        // Skip kalau kosong, ATAU hurufnya kurang dari 5, ATAU gak ada tanda strip (-)
        // Ini otomatis bakal nendang P6, P8, S, M, L, SK, DS dll.
        if (!empId || empId.length < 5 || !empId.includes("-")) {
          continue;
        }

        extracted.push({
          "Employe ID": empId,
          "Attendance Hours": row[idxAtt] || 0,
          "Overtime Hours": idxOt !== -1 ? row[idxOt] || 0 : 0,
          // 👇 3. MASUKIN DATA TOTALNYA 👇
          "Total Hours": idxTotal !== -1 ? row[idxTotal] || 0 : 0,
        });
      }

      setExcelData(extracted);
      setParsingStatus(
        `✅ Sukses! ${extracted.length} data karyawan siap diproses dari ${sheetName}.`,
      );
    } catch (error) {
      console.error(error);
      setParsingStatus("❌ Error parsing sheet.");
    }
  };

  // 3. GENERATE PAYROLL
  const handleGenerate = async () => {
    if (!periodName || !dates.start || !dates.end)
      return toast.error("Lengkapi info periode.");
    if (excelData.length === 0) return toast.error("Data Excel kosong.");

    setLoading(true);
    try {
      const { error } = await supabase.rpc("generate_payroll_draft", {
        p_business_id: authState.business_id,
        p_user_id: authState.user.id,
        p_period_start: dates.start,
        p_period_end: dates.end,
        p_run_name: periodName,
        p_attendance_data: excelData,
      });

      if (error) throw error;

      toast.success("Payroll Draft Berhasil Dibuat!");
      fetchRuns();
      setActiveTab("history");
      // Reset
      setPeriodName("");
      setExcelData([]);
      setWorkbook(null);
      setSheetNames([]);
      setSelectedSheet("");
    } catch (e) {
      toast.error("Gagal generate: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 w-full space-y-6 pb-20">
      <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
        <FileSpreadsheet className="text-green-600" /> Proses Gaji (Multi-Sheet)
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Buat Payroll Baru</TabsTrigger>
          <TabsTrigger value="history">Riwayat & Draft</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Info Periode</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Nama Payroll</Label>
                <Input
                  placeholder="Contoh: Gaji Desember 2025"
                  value={periodName}
                  onChange={(e) => setPeriodName(e.target.value)}
                />
              </div>
              <div>
                <Label>Tanggal Mulai (Cutoff)</Label>
                <Input
                  type="date"
                  value={dates.start}
                  onChange={(e) =>
                    setDates({ ...dates, start: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Tanggal Selesai (Cutoff)</Label>
                <Input
                  type="date"
                  value={dates.end}
                  onChange={(e) => setDates({ ...dates, end: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500 border-l-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" /> 2. Upload & Pilih Sheet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* AREA UPLOAD */}
              <div className="grid md:grid-cols-2 gap-4 items-end">
                <div>
                  <Label>Upload File Schedule (.xlsx)</Label>
                  <Input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                </div>

                {/* DROPDOWN SHEET (Muncul setelah upload) */}
                {sheetNames.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-left-2">
                    <Label className="text-blue-600 font-bold mb-1 flex items-center gap-1">
                      <Layers className="w-4 h-4" /> Pilih Tab / Sheet Bulan Ini
                    </Label>
                    <Select
                      value={selectedSheet}
                      onValueChange={handleSheetChange}
                    >
                      <SelectTrigger className="bg-blue-50 border-blue-200">
                        <SelectValue placeholder="Pilih Sheet..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sheetNames.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* STATUS BOX */}
              {parsingStatus && (
                <div
                  className={`p-4 rounded border text-sm font-medium flex items-center gap-2 ${
                    parsingStatus.includes("Sukses")
                      ? "bg-green-100 text-green-800 border-green-300"
                      : parsingStatus.includes("Gagal")
                        ? "bg-red-100 text-red-800 border-red-300"
                        : "bg-slate-100"
                  }`}
                >
                  {parsingStatus.includes("Sukses") ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Loader2 className="animate-spin w-4 h-4" />
                  )}
                  {parsingStatus}
                </div>
              )}

              {/* PREVIEW TABLE */}
              {excelData.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto border rounded text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="p-2">ID</th>
                        <th className="p-2">Kehadiran (Jam)</th>
                        <th className="p-2">Lembur (Jam)</th>
                        <th className="p-2 font-bold text-blue-700">
                          Total (Jam)
                        </th>{" "}
                        {/* 👈 Header Baru */}
                      </tr>
                    </thead>
                    <tbody>
                      {excelData.map((row, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2 font-mono">{row["Employe ID"]}</td>
                          <td className="p-2">{row["Attendance Hours"]}</td>
                          <td className="p-2">{row["Overtime Hours"]}</td>
                          {/* 👇 Data Baru (Biar lebih tebel dikit teksnya) 👇 */}
                          <td className="p-2 font-bold text-blue-700">
                            {row["Total Hours"]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="w-full bg-slate-900 hover:bg-slate-800"
            onClick={handleGenerate}
            disabled={loading || excelData.length === 0}
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            GENERATE DRAFT GAJI
          </Button>
        </TabsContent>

        {/* TAB 2: HISTORY (Tetap Sama) */}
        <TabsContent value="history">
          {/* ... (Copy dari kode sebelumnya, gak berubah) ... */}
          <div className="grid gap-4">
            {runs.length === 0 ? (
              <p className="text-center text-slate-400 p-10">
                Belum ada data payroll.
              </p>
            ) : (
              runs.map((run) => (
                <Card
                  key={run.id}
                  className="hover:border-blue-400 transition-all"
                >
                  <CardContent className="p-5 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{run.name}</span>
                        <Badge
                          variant={
                            run.status === "draft" ? "outline" : "default"
                          }
                          className={
                            run.status === "draft"
                              ? "text-yellow-600 border-yellow-400"
                              : "bg-green-600"
                          }
                        >
                          {run.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3" />{" "}
                        {new Date(run.period_start).toLocaleDateString()} -{" "}
                        {new Date(run.period_end).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-mono font-bold text-slate-800">
                        {formatRupiah(run.total_amount)}
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        onClick={() => navigate(`/hr/payroll/${run.id}`)} // <--- TAMBAH INI (Arahkan ke Detail)
                      >
                        <Eye className="w-4 h-4 mr-2" /> Detail & Approval
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
