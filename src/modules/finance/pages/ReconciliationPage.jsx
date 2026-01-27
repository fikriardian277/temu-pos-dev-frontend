import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  CheckCircle,
  RefreshCw,
  Upload,
  Filter,
  XCircle,
  AlertTriangle,
  Activity,
  Wallet,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import * as XLSX from "xlsx";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function ReconciliationPage() {
  const { authState } = useAuth();

  // --- STATE ---
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedBranch, setSelectedBranch] = useState("all");

  const [recons, setRecons] = useState([]);
  const [branches, setBranches] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [detailModal, setDetailModal] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [matchedResults, setMatchedResults] = useState([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);

  // Action Modals
  const [confirmModal, setConfirmModal] = useState(null);
  const [targetAccount, setTargetAccount] = useState("");
  const [processingConfirm, setProcessingConfirm] = useState(false);
  const [investigateModal, setInvestigateModal] = useState(null);
  const [processingMismatch, setProcessingMismatch] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingReject, setProcessingReject] = useState(false);
  const [unsettledList, setUnsettledList] = useState([]);
  const [settleModal, setSettleModal] = useState(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleNotes, setSettleNotes] = useState("");
  const [processingSettle, setProcessingSettle] = useState(false);

  // 1. FETCH DATA
  const syncAndFetch = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);
    try {
      // Sync POS
      let curr = new Date(startDate);
      const end = new Date(endDate);
      const syncPromises = [];
      while (curr <= end) {
        syncPromises.push(
          supabase.rpc("sync_pos_sales_to_finance", {
            p_business_id: authState.business_id,
            p_date: curr.toISOString().split("T")[0],
          }),
        );
        curr.setDate(curr.getDate() + 1);
      }
      await Promise.all(syncPromises);

      // Fetch Master
      const [bRes, accRes] = await Promise.all([
        supabase
          .from("branches")
          .select("id, name")
          .eq("business_id", authState.business_id),
        supabase
          .schema("finance")
          .from("accounts")
          .select("id, name, account_number")
          .eq("business_id", authState.business_id)
          .eq("is_active", true),
      ]);
      setBranches(bRes.data || []);
      setAccounts(accRes.data || []);

      // Fetch Recons (ALL DATA)
      const { data, error } = await supabase
        .schema("finance")
        .from("daily_reconciliations")
        .select("*")
        .eq("business_id", authState.business_id)
        .in("payment_method", ["QRIS", "E-Wallet"])
        .gte("recon_date", startDate)
        .lte("recon_date", endDate)
        .order("recon_date", { ascending: false });

      if (error) throw error;
      setRecons(data || []);
      const { data: unsettledData } = await supabase.rpc(
        "get_unsettled_balances",
        {
          p_business_id: authState.business_id,
        },
      );
      setUnsettledList(unsettledData || []);
    } catch (e) {
      toast.error("Gagal sinkronisasi data.");
    } finally {
      setLoading(false);
    }
  }, [authState.business_id, startDate, endDate]);

  useEffect(() => {
    syncAndFetch();
  }, [syncAndFetch]);

  // 2. FILTER (SIMPLE BRANCH FILTER)
  const filteredRecons = recons.filter((item) => {
    if (
      selectedBranch !== "all" &&
      item.branch_id.toString() !== selectedBranch
    )
      return false;
    return true;
  });

  // --- ACTIONS ---
  const handleUpdateActual = async (id, val) => {
    setRecons((prev) =>
      prev.map((r) => (r.id === id ? { ...r, actual_amount: val } : r)),
    );
    await supabase
      .schema("finance")
      .from("daily_reconciliations")
      .update({ actual_amount: val })
      .eq("id", id);
  };

  const initiateVerify = (item) => {
    const target = Number(item.net_system_amount);
    const actual = Number(item.actual_amount);
    const diff = actual - target;
    setInvestigateModal({ ...item, variance: diff });
  };

  const initiateReject = (item) => {
    setRejectReason("");
    setRejectModal(item);
  };

  const executeConfirmMatch = async () => {
    if (!targetAccount) return toast.error("Pilih Akun Bank.");
    setProcessingConfirm(true);
    try {
      const { error } = await supabase.rpc("confirm_reconciliation_match", {
        p_recon_id: confirmModal.id,
        p_account_id: targetAccount,
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
      });
      if (error) throw error;
      toast.success("APPROVED! Saldo masuk.");
      setConfirmModal(null);
      syncAndFetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessingConfirm(false);
    }
  };

  const executeReject = async () => {
    if (!rejectReason.trim()) return toast.error("Isi alasan reject.");
    setProcessingReject(true);
    try {
      await supabase
        .schema("finance")
        .from("daily_reconciliations")
        .update({
          status: "discrepancy",
          verified_by: authState.user.id,
          verified_at: new Date(),
          notes: `[REJECT] ${rejectReason}`,
        })
        .eq("id", rejectModal.id);
      toast.success("Ditolak & Masuk Log.");
      setRejectModal(null);
      syncAndFetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessingReject(false);
    }
  };

  const executeMismatch = async () => {
    setProcessingMismatch(true);
    try {
      await supabase
        .schema("finance")
        .from("daily_reconciliations")
        .update({
          status: "discrepancy",
          verified_by: authState.user.id,
          verified_at: new Date(),
          notes: `[SELISIH] ${formatRupiah(investigateModal.variance)}`,
        })
        .eq("id", investigateModal.id);
      toast.warning("Dipindahkan ke Log.");
      setInvestigateModal(null);
      syncAndFetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessingMismatch(false);
    }
  };

  const initiateSettle = (item) => {
    setSettleModal(item);
    setSettleAmount(item.current_balance); // Default isi full amount
    setSettleNotes("");
  };

  const executeSettle = async () => {
    // [FIX] Cuma blokir kalau kosong atau 0. Negatif (Minus) dibolehkan!
    if (!settleAmount || Number(settleAmount) === 0)
      return toast.error("Nominal tidak boleh nol.");

    setProcessingSettle(true);
    try {
      const { error } = await supabase.rpc("process_late_settlement", {
        p_account_id: settleModal.account_id,
        p_amount: Number(settleAmount),
        p_notes: settleNotes,
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
      });

      if (error) throw error;

      toast.success(
        Number(settleAmount) > 0
          ? "Saldo berhasil dicairkan ke Bank HO!"
          : "Adjustment saldo berhasil dicatat!",
      );

      setSettleModal(null);
      syncAndFetch(); // Refresh data
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessingSettle(false);
    }
  };

  // --- IMPORT LOGIC ---
  const handleFileUpload = (event) => {
    if (selectedBranch === "all") {
      toast.error("⛔ PILIH CABANG DULU!", { duration: 4000 });
      event.target.value = null;
      return;
    }
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = null;

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {
          type: "array",
          cellDates: false,
          raw: true,
        });
        const sheetName = workbook.SheetNames[0];
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: 1,
        });

        let headerIndex = -1;
        for (let i = 0; i < Math.min(rawRows.length, 30); i++) {
          const rowStr = JSON.stringify(rawRows[i]).toLowerCase();
          if (
            rowStr.includes("original amount") &&
            (rowStr.includes("transaction date") || rowStr.includes("tanggal"))
          ) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex === -1)
          return toast.error("Format Excel tidak dikenali.");

        const headers = rawRows[headerIndex].map((h) => String(h || "").trim());
        const jsonData = [];
        for (let i = headerIndex + 1; i < rawRows.length; i++) {
          const rowData = rawRows[i];
          if (!rowData || rowData.length === 0) continue;
          const rowObj = {};
          headers.forEach((key, colIndex) => {
            let val = rowData[colIndex];
            if (typeof val === "string") val = val.trim();
            rowObj[key] = val;
          });
          if (rowObj["Transaction Date"] || rowObj["Tanggal Transaksi"])
            jsonData.push(rowObj);
        }
        runAutoMatch(jsonData);
      } catch (err) {
        toast.error("Gagal baca file: " + err.message);
      }
    };
  };

  const runAutoMatch = (rows) => {
    const groupedData = {};
    rows.forEach((row) => {
      const keys = Object.keys(row);
      const dateKey = keys.find(
        (k) =>
          k.match(/Transaction.*Date/i) ||
          k.match(/Tanggal.*Transaksi/i) ||
          k.match(/Date/i),
      );
      const amountKey = keys.find(
        (k) =>
          k.match(/Original.*Amount/i) ||
          k.match(/Nominal/i) ||
          k.match(/Amount/i),
      );
      const feeKey = keys.find((k) => k.match(/MDR/i) || k.match(/Fee/i));

      const rawDate = dateKey ? row[dateKey] : null;
      const rawAmount = amountKey ? row[amountKey] : 0;
      const rawFee = feeKey ? row[feeKey] : 0;

      const cleanNumber = (v) =>
        v
          ? parseFloat(
              v
                .toString()
                .replace(/[^0-9,.-]/g, "")
                .replace(",", "."),
            ) || 0
          : 0;
      const amountVal = cleanNumber(rawAmount);
      const feeVal = cleanNumber(rawFee);

      if (rawDate && amountVal > 0) {
        let isoDate = null;
        if (typeof rawDate === "string") {
          const dateOnly = rawDate.split(" ")[0].trim();
          const p = dateOnly.split(/[\/\-]/);
          if (p.length === 3) {
            // DD/MM/YYYY
            const d = p[0].padStart(2, "0");
            const m = p[1].padStart(2, "0");
            const y = p[2];
            if (y.length === 4) isoDate = `${y}-${m}-${d}`;
            else if (d.length === 4) isoDate = `${d}-${m}-${y}`;
          }
        } else if (typeof rawDate === "number") {
          const d = XLSX.SSF.parse_date_code(rawDate);
          if (d)
            isoDate = `${d.y}-${String(d.m).padStart(2, "0")}-${String(
              d.d,
            ).padStart(2, "0")}`;
        }

        if (isoDate) {
          if (!groupedData[isoDate])
            groupedData[isoDate] = { amount: 0, fee: 0 };
          groupedData[isoDate].amount += amountVal - feeVal;
          groupedData[isoDate].fee += feeVal;
        }
      }
    });

    const matches = [];
    const allDates = [
      ...new Set([
        ...filteredRecons.map((r) => r.recon_date),
        ...Object.keys(groupedData),
      ]),
    ]
      .sort()
      .reverse();

    allDates.forEach((dateKey) => {
      const recon = filteredRecons.find((r) => r.recon_date === dateKey);
      const excel = groupedData[dateKey] || { amount: 0, fee: 0 };
      const sysNet = recon ? Number(recon.net_system_amount) : 0;
      const excelActual = excel.amount;
      if (sysNet !== 0 || excelActual !== 0) {
        matches.push({
          id: recon?.id,
          recon_date: dateKey,
          branch_id: recon?.branch_id || parseInt(selectedBranch),
          net_system_amount: sysNet,
          found_amount: excelActual,
          found_fee: excel.fee,
          variance: excelActual - sysNet,
        });
      }
    });
    setMatchedResults(matches);
    setCsvModalOpen(true);
  };

  const applyMatches = async () => {
    setIsProcessingCsv(true);
    try {
      let count = 0;
      for (const m of matchedResults) {
        if (m.found_amount > 0) {
          const payload = {
            p_business_id: Number(authState.business_id),
            p_branch_id: Number(m.branch_id),
            p_recon_date: String(m.recon_date).trim(),
            p_payment_method: "QRIS",
            p_actual_amount: Number(m.found_amount),
            p_platform_fee: Number(m.found_fee || 0),
          };
          const { error } = await supabase.rpc(
            "upsert_recon_from_excel",
            payload,
          );
          if (error) throw error;
          count++;
        }
      }
      toast.success(`${count} data tersimpan.`);
      setCsvModalOpen(false);
      setTimeout(() => syncAndFetch(), 800);
    } catch (e) {
      toast.error("Error: " + e.message);
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const openDetail = async (item) => {
    setDetailModal(item);
    const { data } = await supabase
      .from("orders")
      .select("invoice_code, grand_total, customers(name)")
      .eq("branch_id", item.branch_id)
      .eq("payment_status", "Lunas")
      .or("payment_method.ilike.%QRIS%,payment_method.ilike.%E-Wallet%")
      .gte("created_at", `${item.recon_date}T00:00:00`)
      .lte("created_at", `${item.recon_date}T23:59:59`);
    setTransactions(data || []);
  };

  const summaryStats = filteredRecons.reduce(
    (acc, curr) => {
      acc.totalPOS += Number(curr.net_system_amount || 0);
      acc.totalSettlement += Number(curr.actual_amount || 0);
      acc.totalFee += Number(curr.platform_fee || 0);
      acc.totalVariance +=
        Number(curr.actual_amount) - Number(curr.net_system_amount);
      return acc;
    },
    { totalPOS: 0, totalSettlement: 0, totalFee: 0, totalVariance: 0 },
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Rekonsiliasi Harian</h1>
          <p className="text-muted-foreground">Settlement QRIS & E-Wallet.</p>
        </div>
        <div className="flex items-center gap-2 border p-2 rounded bg-white">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-sm outline-none"
          />{" "}
          -
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-sm outline-none"
          />
          <Button size="sm" variant="ghost" onClick={syncAndFetch}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-bold uppercase">
                Target POS (Net)
              </p>
              <h3 className="text-xl font-bold text-blue-900">
                {formatRupiah(summaryStats.totalPOS)}
              </h3>
            </div>
            <Activity className="h-5 w-5 text-blue-400" />
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-bold uppercase">
                Masuk Bank
              </p>
              <h3 className="text-xl font-bold text-green-900">
                {formatRupiah(summaryStats.totalSettlement)}
              </h3>
            </div>
            <Wallet className="h-5 w-5 text-green-400" />
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600 font-bold uppercase">
                Total Fee Admin
              </p>
              <h3 className="text-xl font-bold text-orange-900">
                {formatRupiah(summaryStats.totalFee)}
              </h3>
            </div>
            <TrendingDown className="h-5 w-5 text-orange-400" />
          </CardContent>
        </Card>

        <Card
          className={
            summaryStats.totalVariance === 0
              ? "bg-slate-50 border-slate-200"
              : "bg-red-50 border-red-200"
          }
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">
                Total Selisih
              </p>
              <h3
                className={`text-xl font-bold ${
                  summaryStats.totalVariance === 0
                    ? "text-slate-900"
                    : "text-red-600"
                }`}
              >
                {formatRupiah(summaryStats.totalVariance)}
              </h3>
            </div>
            <TrendingUp className="h-5 w-5 text-slate-400" />
          </CardContent>
        </Card>
      </div>

      {/* FILTER & IMPORT */}
      <div className="flex justify-between mb-4 mt-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="Pilih Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">-- Semua Cabang --</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id.toString()}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative">
          <Input
            type="file"
            className="hidden"
            id="upl"
            onChange={handleFileUpload}
            disabled={selectedBranch === "all"}
          />
          <Label
            htmlFor="upl"
            className={`px-4 py-2 rounded text-sm text-white cursor-pointer flex items-center gap-2 ${
              selectedBranch === "all"
                ? "bg-slate-400"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <Upload className="h-4 w-4" /> Import
          </Label>
        </div>
      </div>

      {/* LIST DATA (SATU LIST SAJA) */}
      <div className="space-y-4">
        {filteredRecons.map((item) => {
          const target = Number(item.net_system_amount);
          const actual = Number(item.actual_amount);
          const fee = Number(item.platform_fee || 0);
          const diff = actual - target;

          const isMatch = diff === 0 && actual > 0;
          const isApproved = item.status === "approved";
          const isResolved = item.status === "resolved";
          const isLogged = ["discrepancy", "investigating"].includes(
            item.status,
          );

          return (
            <Card
              key={item.id}
              className={
                isApproved
                  ? "bg-green-50/50 border-green-200"
                  : isResolved // <--- KITA KASIH WARNA BIRU MUDA BIAR BEDA
                    ? "bg-blue-50/50 border-blue-200"
                    : isLogged
                      ? "bg-red-50/50 border-red-200 opacity-80"
                      : "bg-white"
              }
            >
              <CardContent className="p-4 flex items-center gap-4">
                {/* INFO TANGGAL */}
                <div className="w-1/4">
                  <Badge variant="outline" className="bg-white mb-1">
                    {new Date(item.recon_date).toLocaleDateString("id-ID")}
                  </Badge>
                  <div className="font-bold">
                    {branches.find((b) => b.id === item.branch_id)?.name}
                  </div>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs"
                    onClick={() => openDetail(item)}
                  >
                    Lihat Rincian POS
                  </Button>
                </div>

                {/* INFO ANGKA POS */}
                <div className="flex-1 bg-slate-50 p-2 rounded border text-sm text-center">
                  <div className="text-muted-foreground">Target (POS)</div>
                  <div className="font-bold text-lg">
                    {formatRupiah(target)}
                  </div>
                </div>

                {/* INFO ANGKA BANK */}
                <div className="text-center relative">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Settlement
                  </div>
                  <Input
                    type="number"
                    value={item.actual_amount}
                    onChange={(e) =>
                      handleUpdateActual(item.id, e.target.value)
                    }
                    // KITA KUNCI INPUTNYA KALAU SUDAH RESOLVED
                    disabled={isApproved || isLogged || isResolved}
                    className={`text-right font-bold text-lg w-36 ${
                      diff !== 0 ? "text-red-600" : "text-green-600"
                    }`}
                  />
                  {fee > 0 && (
                    <div className="text-[10px] text-orange-600 mt-1 font-medium bg-orange-50 px-1 rounded inline-block">
                      Fee: {formatRupiah(fee)}
                    </div>
                  )}
                </div>

                {/* TOMBOL AKSI */}
                <div className="w-1/5 flex flex-col gap-2">
                  {/* 1. SUDAH SELESAI (MATCH) */}
                  {isApproved && (
                    <Badge className="bg-green-600 w-full justify-center py-2 text-sm">
                      <CheckCircle className="w-4 h-4 mr-1" /> APPROVED
                    </Badge>
                  )}

                  {/* 2. SUDAH RESOLVED (MANUAL FIX) ---> INI LOGIC BARUNYA */}
                  {isResolved && (
                    <div className="text-center w-full">
                      <Badge className="bg-blue-600 w-full justify-center py-2 text-sm mb-1">
                        <CheckCircle className="w-4 h-4 mr-1" /> RESOLVED
                      </Badge>
                      {/* Nampilin notes pendek biar user tau diapain */}
                      <span className="text-[10px] text-blue-600 font-medium px-1">
                        {item.notes?.includes("accept_system")
                          ? "Ikut System"
                          : "Ikut Bank"}
                      </span>
                    </div>
                  )}

                  {/* 3. MASUK LOG (MASIH GANTUNG) */}
                  {isLogged && (
                    <Badge
                      variant="destructive"
                      className="w-full justify-center py-2 text-sm"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> LOGGED
                    </Badge>
                  )}

                  {/* 4. MASIH PENDING (TOMBOL) */}
                  {/* Pastikan tombol GAK MUNCUL kalau isResolved true */}
                  {!isApproved && !isLogged && !isResolved && (
                    <>
                      {/* JIKA MATCH -> APPROVE & REJECT */}
                      {isMatch && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 w-full hover:bg-green-700"
                            onClick={() => {
                              setConfirmModal(item);
                              setTargetAccount("");
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 w-full h-6 text-xs hover:bg-red-50"
                            onClick={() => initiateReject(item)}
                          >
                            Reject
                          </Button>
                        </>
                      )}

                      {/* JIKA MISMATCH -> INVESTIGASI ONLY */}
                      {!isMatch && (
                        <div className="w-full">
                          <div className="text-[10px] text-center text-red-500 font-bold bg-red-50 py-1 rounded mb-1 border border-red-100">
                            Selisih: {formatRupiah(diff)}
                          </div>
                          <Button
                            size="sm"
                            className="bg-orange-500 w-full hover:bg-orange-600"
                            onClick={() => initiateVerify(item)}
                          >
                            Investigasi
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredRecons.length === 0 && (
          <div className="text-center py-10 border-dashed border-2 bg-slate-50 text-muted-foreground">
            Tidak ada data.
          </div>
        )}
      </div>

      {unsettledList.length > 0 && (
        <div className="mt-12 animate-in slide-in-from-bottom-5 duration-500">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-orange-100 rounded-full">
              <Wallet className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Dana Mengendap (Unsettled)
              </h2>
              <p className="text-sm text-muted-foreground">
                Saldo gantung di akun transit (QRIS/Transfer) yang belum masuk
                Rekening Pusat.
              </p>
            </div>
          </div>

          <Card className="border-orange-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-orange-50/50 text-orange-900 border-b border-orange-100">
                  <tr>
                    <th className="p-4 font-bold">Nama Akun (Transit)</th>
                    <th className="p-4 font-bold">Cabang</th>
                    <th className="p-4 font-bold">Terakhir Aktif</th>
                    <th className="p-4 font-bold text-right">Saldo Gantung</th>
                    <th className="p-4 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {unsettledList.map((item) => (
                    <tr
                      key={item.account_id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 font-medium text-slate-700">
                        {item.account_name}
                      </td>
                      <td className="p-4 text-slate-500">{item.branch_name}</td>
                      <td className="p-4 text-slate-500 text-xs">
                        {new Date(item.last_activity).toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-right">
                        <Badge
                          variant="outline"
                          className={`font-bold text-base px-3 py-1 ${
                            item.current_balance < 0
                              ? "bg-red-50 text-red-700 border-red-200" // Warna Merah kalau Minus
                              : "bg-orange-50 text-orange-700 border-orange-200" // Warna Oranye kalau Plus
                          }`}
                        >
                          {formatRupiah(item.current_balance)}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          className="bg-slate-800 hover:bg-slate-900 text-white"
                          onClick={() => initiateSettle(item)}
                        >
                          <Upload className="w-3 h-3 mr-2" />
                          Setor ke Pusat
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* MODALS TETAP SAMA */}
      <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Hasil Import</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {matchedResults.map((m, i) => (
              <div
                key={i}
                className="flex justify-between p-3 border rounded bg-slate-50"
              >
                <div>
                  <div className="font-bold">{m.recon_date}</div>
                  <div className="text-xs text-muted-foreground">
                    Sys: {formatRupiah(m.net_system_amount)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">
                    Excel: {formatRupiah(m.found_amount)}
                  </div>
                  {m.found_fee > 0 && (
                    <div className="text-[10px] text-orange-600">
                      Fee: {formatRupiah(m.found_fee)}
                    </div>
                  )}
                  <div
                    className={`text-xs font-bold ${
                      m.variance === 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {m.variance === 0
                      ? "COCOK"
                      : `Selisih: ${formatRupiah(m.variance)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={applyMatches}
              disabled={isProcessingCsv}
              className="w-full"
            >
              Apply Matches
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terima Dana</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Masuk ke Akun Bank:</Label>
            <Select value={targetAccount} onValueChange={setTargetAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              onClick={executeConfirmMatch}
              disabled={processingConfirm}
              className="bg-green-600"
            >
              Simpan & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!investigateModal}
        onOpenChange={() => setInvestigateModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-orange-600">
              Investigasi Selisih
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            Selisih: <b>{formatRupiah(investigateModal?.variance)}</b>
            <br />
            <span className="text-xs text-muted-foreground">
              Data akan dipindahkan ke Log Investigasi.
            </span>
          </div>
          <DialogFooter>
            <Button onClick={executeMismatch} className="bg-orange-600">
              Ya, Pindah ke Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectModal} onOpenChange={() => setRejectModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Tolak Match</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label>Alasan Penolakan:</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Salah transfer, bukan transaksi toko"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal(null)}>
              Batal
            </Button>
            <Button
              onClick={executeReject}
              disabled={processingReject}
              variant="destructive"
            >
              Tolak & Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailModal} onOpenChange={() => setDetailModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rincian Transaksi</DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Invoice</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">
                      {t.invoice_code}
                      <br />
                      <span className="text-[10px] text-slate-500">
                        {t.customers?.name}
                      </span>
                    </td>
                    <td className="p-2 text-right font-bold">
                      {formatRupiah(t.grand_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!settleModal} onOpenChange={() => setSettleModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-orange-600" /> Cairkan Saldo
              Gantung
            </DialogTitle>
            <DialogDescription>
              Memindahkan saldo dari <b>{settleModal?.account_name}</b> ke
              Rekening Pusat (BCA).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-slate-50 p-3 rounded border text-center">
              <span className="text-xs text-muted-foreground uppercase font-bold">
                Saldo Tersedia
              </span>
              <div className="text-2xl font-bold text-slate-800">
                {formatRupiah(settleModal?.current_balance)}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nominal yang Masuk Bank</Label>
              <Input
                type="number"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="font-bold text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label>Catatan (Opsional)</Label>
              <Textarea
                placeholder="Contoh: Masuk mutasi tanggal sekian..."
                value={settleNotes}
                onChange={(e) => setSettleNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleModal(null)}>
              Batal
            </Button>
            <Button
              onClick={executeSettle}
              disabled={processingSettle}
              className={
                Number(settleAmount) < 0
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {processingSettle
                ? "Memproses..."
                : Number(settleAmount) < 0
                  ? "Konfirmasi Adjustment"
                  : "Konfirmasi Setor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
