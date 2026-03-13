import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
// IMPORT RENDER STRING
import { renderToStaticMarkup } from "react-dom/server";
// IMPORT TEMPLATE
import PayrollSlipTemplate from "@/components/documents/PayrollSlipTemplate";

import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  Printer,
  Search,
  Eye,
  Wallet,
  Loader2,
  Mail,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/Alert-dialog";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function PayrollDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authState } = useAuth();

  const [run, setRun] = useState(null);
  const [slips, setSlips] = useState([]);
  const [hoInfo, setHoInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [emailSending, setEmailSending] = useState(null);

  // States Modal
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isEditingSlip, setIsEditingSlip] = useState(false);
  const [newDeduction, setNewDeduction] = useState({ name: "", amount: "" });
  const [isSavingDeduction, setIsSavingDeduction] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: runData, error: runError } = await supabase
        .schema("hr")
        .from("payroll_runs")
        .select("*")
        .eq("id", id)
        .single();
      if (runError) throw runError;
      setRun(runData);

      const { data: slipData, error: slipError } = await supabase
        .schema("hr")
        .from("view_payroll_slips_detail")
        .select("*")
        .eq("run_id", id);
      if (slipError) throw slipError;
      setSlips(slipData || []);

      const { data: hoData } = await supabase
        .from("branches")
        .select("name, address, phone_number, email")
        .eq("id", 7)
        .single();
      setHoInfo(hoData);
    } catch (e) {
      toast.error("Gagal load data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    /* Logic Sama */
    setIsApproving(true);
    try {
      const { error } = await supabase.rpc("approve_payroll_run", {
        p_run_id: id,
        p_user_id: (await supabase.auth.getUser()).data.user.id,
      });
      if (error) throw error;
      toast.success("Payroll Disetujui!");
      setIsApproveDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Gagal approve: " + e.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleDelete = async () => {
    /* Logic Sama */
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .schema("hr")
        .from("payroll_runs")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Payroll berhasil dihapus.");
      navigate("/hr/payroll");
    } catch (e) {
      toast.error("Gagal menghapus: " + e.message);
      setIsDeleting(false);
    }
  };

  // --- 🔥 GENERATE HTML UTAMA 🔥 ---
  const generateFullHTML = (targetSlips) => {
    // 1. Render Component jadi String
    const componentMarkup = renderToStaticMarkup(
      <PayrollSlipTemplate
        slips={targetSlips}
        runData={run}
        settings={authState.pengaturan}
        customHeader={hoInfo}
      />,
    );

    // 2. Bungkus dengan Struktur HTML Lengkap
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Slip Gaji</title>
        </head>
        <body style="margin:0; padding:0; background-color: white;">
          ${componentMarkup}
        </body>
      </html>
    `;
  };

  // --- LOGIC PRINT (PAKE WINDOW POPUP BIAR GAK BLANK) ---
  const executePrint = (targetSlips) => {
    if (!targetSlips || targetSlips.length === 0)
      return toast.error("Data kosong.");

    // 1. Generate HTML
    const fullHtml = generateFullHTML(targetSlips);

    // 2. Buka Jendela Baru (Ini Kuncinya biar gak blank)
    const printWindow = window.open("", "_blank", "width=900,height=800");

    if (printWindow) {
      printWindow.document.write(fullHtml);
      printWindow.document.close(); // Stop loading biar siap print

      // Tunggu sebentar (500ms) buat mastiin style ke-load, baru print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        // printWindow.close(); // Opsional: tutup otomatis setelah print
      }, 500);
    } else {
      toast.error("Pop-up diblokir. Izinkan pop-up untuk nge-print.");
    }
  };

  // --- LOGIC EMAIL (KIRIM STRING HTML) ---
  const executeEmail = async (slip) => {
    if (!slip.employee_email) return toast.error("Email belum diisi!");
    if (!confirm(`Kirim ke ${slip.employee_email}?`)) return;

    setEmailSending(slip.id);
    try {
      const fullHtml = generateFullHTML([slip]);
      const { error } = await supabase.functions.invoke("send-payslip", {
        body: {
          email: slip.employee_email,
          subject: `Slip Gaji - ${run.name}`,
          html: fullHtml,
        },
      });
      if (error) throw error;
      toast.success("Terkirim!");
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setEmailSending(null);
    }
  };

  const filteredSlips = slips.filter(
    (s) =>
      s.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nik.includes(searchTerm),
  );

  if (loading)
    return (
      <div className="p-10 text-center">
        <Loader2 className="animate-spin inline" /> Loading...
      </div>
    );

  const handleAddDeduction = async () => {
    if (!newDeduction.name || !newDeduction.amount)
      return toast.error("Isi nama dan nominal potongan!");

    setIsSavingDeduction(true);
    try {
      // 1. Ambil array details yang lama
      const currentDetails = selectedSlip.details || [];
      const deductionAmount = parseFloat(newDeduction.amount);

      // 2. Tambahin item baru (tipe: deduction)
      const updatedDetails = [
        ...currentDetails,
        {
          name: newDeduction.name,
          type: "deduction",
          qty: 1,
          rate: deductionAmount,
          amount: deductionAmount, // Tetap positif di JSON, ntar diitung ngurangin
        },
      ];

      // 3. Hitung ulang THP (Total Gaji - Potongan Baru)
      const newTHP = selectedSlip.take_home_pay - deductionAmount;

      // 4. Update ke Database (Tabel payroll_slips)
      const { error: slipErr } = await supabase
        .schema("hr")
        .from("payroll_slips")
        .update({ details: updatedDetails, take_home_pay: newTHP })
        .eq("id", selectedSlip.id);

      if (slipErr) throw slipErr;

      // 5. Update Total Keseluruhan di payroll_runs
      const newRunTotal = run.total_amount - deductionAmount;
      const { error: runErr } = await supabase
        .schema("hr")
        .from("payroll_runs")
        .update({ total_amount: newRunTotal })
        .eq("id", id);

      if (runErr) throw runErr;

      toast.success("Potongan berhasil ditambahkan!");

      // Refresh Data & Tutup Form
      setNewDeduction({ name: "", amount: "" });
      setIsEditingSlip(false);
      setSelectedSlip(null); // Tutup modal biar ngerender ulang data fresh
      fetchData(); // Panggil ulang data dari DB
    } catch (e) {
      toast.error("Gagal simpan potongan: " + e.message);
    } finally {
      setIsSavingDeduction(false);
    }
  };

  return (
    <div className="p-4 w-full space-y-6 pb-20">
      {/* HEADER PAGE */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/hr/payroll")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{run?.name}</h1>
          <p className="text-slate-500 text-sm">
            Periode: {run?.period_start} s/d {run?.period_end}
          </p>
        </div>
        <div className="ml-auto">
          <Badge
            className={
              run?.status === "approved" ? "bg-green-600" : "bg-yellow-500"
            }
          >
            {run?.status?.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* SUMMARY CARD */}
      <Card className="bg-slate-900 text-white border-0">
        <CardContent className="p-6 flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-sm font-bold uppercase">
              Total Pembayaran
            </p>
            <p className="text-4xl font-mono font-bold mt-2">
              {formatRupiah(run?.total_amount)}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              {slips.length} Karyawan
            </p>
          </div>
          <div className="flex gap-2">
            {run?.status === "draft" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 w-4 h-4" /> Hapus
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setIsApproveDialogOpen(true)}
                >
                  <CheckCircle className="mr-2 w-4 h-4" /> Approve
                </Button>
              </>
            )}
            {run?.status === "approved" && (
              // TOMBOL PRINT SEMUA
              <Button variant="secondary" onClick={() => executePrint(slips)}>
                <Printer className="mr-2 w-4 h-4" /> Print Semua
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* FILTER & TABLE */}
      <div className="flex mt-4">
        <Input
          placeholder="Cari Karyawan..."
          className="max-w-sm bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b">
              <tr>
                <th className="p-4">Karyawan</th>
                <th className="p-4">Rekening</th>
                <th className="p-4 text-right">Take Home Pay</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSlips.map((slip) => (
                <tr
                  key={slip.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => setSelectedSlip(slip)}
                >
                  <td className="p-4">
                    <p className="font-bold text-slate-800">
                      {slip.employee_name}
                    </p>
                    <p className="text-xs text-slate-500">{slip.nik}</p>
                  </td>
                  <td className="p-4 flex items-center gap-2 text-slate-600">
                    <Wallet className="w-3 h-3" /> {slip.bank_name} -{" "}
                    {slip.account_number}
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-lg">
                    {formatRupiah(slip.take_home_pay)}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      {/* TOMBOL EMAIL */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          executeEmail(slip);
                        }}
                        disabled={emailSending === slip.id}
                      >
                        {emailSending === slip.id ? (
                          <Loader2 className="animate-spin w-4 h-4" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </Button>
                      {/* TOMBOL PRINT SINGLE */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          executePrint([slip]);
                        }}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSlip(slip)}
                      >
                        <Eye className="w-4 h-4 text-slate-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL PREVIEW */}
      <Dialog open={!!selectedSlip} onOpenChange={() => setSelectedSlip(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Rincian Gaji: {selectedSlip?.employee_name}
            </DialogTitle>
          </DialogHeader>

          {/* LIST KOMPONEN GAJI */}
          <div className="bg-slate-50 p-4 rounded border text-sm space-y-2 max-h-[60vh] overflow-y-auto">
            {selectedSlip?.details?.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between border-b border-dashed pb-1"
              >
                <span>{item.name}</span>
                <span
                  className={
                    item.type === "deduction" ? "text-red-600 font-bold" : ""
                  }
                >
                  {item.type === "deduction" ? "-" : ""}{" "}
                  {formatRupiah(item.amount)}
                </span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-lg pt-2 border-t-2 border-slate-300">
              <span>Total THP</span>
              <span>{formatRupiah(selectedSlip?.take_home_pay)}</span>
            </div>
          </div>

          {/* FORM TAMBAH POTONGAN (Muncul pas Edit) */}
          {isEditingSlip && run?.status === "draft" && (
            <div className="bg-red-50 p-3 rounded border border-red-200 space-y-3 mt-2 animate-in fade-in">
              <h4 className="font-bold text-red-700 text-sm">
                Tambah Potongan / Kasbon
              </h4>
              <Input
                placeholder="Nama Potongan (Misal: Kasbon 10 Feb)"
                value={newDeduction.name}
                onChange={(e) =>
                  setNewDeduction({ ...newDeduction, name: e.target.value })
                }
              />
              <Input
                type="number"
                placeholder="Nominal (Misal: 50000)"
                value={newDeduction.amount}
                onChange={(e) =>
                  setNewDeduction({ ...newDeduction, amount: e.target.value })
                }
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingSlip(false)}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleAddDeduction}
                  disabled={isSavingDeduction}
                >
                  {isSavingDeduction ? "Menyimpan..." : "Simpan Potongan"}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 flex gap-2">
            {/* TOMBOL EDIT KASBON (Cuma muncul kalau masih DRAFT) */}
            {!isEditingSlip && run?.status === "draft" && (
              <Button
                variant="destructive"
                className="mr-auto bg-red-100 text-red-700 hover:bg-red-200"
                onClick={() => setIsEditingSlip(true)}
              >
                + Tambah Potongan
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => executePrint([selectedSlip])}
            >
              <Printer className="mr-2 w-4 h-4" /> Print Resmi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOGS CONFIRMATION */}
      <AlertDialog
        open={isApproveDialogOpen}
        onOpenChange={setIsApproveDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              Aksi ini akan mengunci data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleApprove();
              }}
              disabled={isApproving}
            >
              Ya, Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Hapus Payroll?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Data akan hilang permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
