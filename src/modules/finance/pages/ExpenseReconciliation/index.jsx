import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

// Import Komponen
import ExpenseBankColumn from "./components/ExpenseBankColumn";
import ExpenseSystemColumn from "./components/ExpenseSystemColumn";

export default function ExpenseReconciliationPage() {
  const { authState } = useAuth();

  // State Data
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState("");

  // Ambil data akun lengkap (biar bisa dapet branch_id nya)
  const selectedAccountData = bankAccounts.find(
    (acc) => String(acc.id) === selectedBankAccount
  );

  const [mutations, setMutations] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [selectedMutation, setSelectedMutation] = useState(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);

  const [pettyCashList, setPettyCashList] = useState([]);
  const [selectedPettyCashId, setSelectedPettyCashId] = useState(null);
  const [expenseList, setExpenseList] = useState([]);
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);

  // 1. Fetch Master Data (Akun Bank)
  useEffect(() => {
    const initMasterData = async () => {
      if (!authState.business_id) return;

      try {
        // Ambil Akun Bank beserta BRANCH ID pemiliknya
        const { data: accData, error: accError } = await supabase
          .schema("finance")
          .from("accounts")
          .select("id, name, type:account_type, branch_id")
          .eq("business_id", authState.business_id)
          .eq("account_type", "bank");
        console.log("DATA AKUN BANK:", accData);
        if (accError) throw accError;
        setBankAccounts(accData || []);

        // Auto select bank pertama
        if (accData?.[0]) setSelectedBankAccount(String(accData[0].id));
      } catch (e) {
        console.error("Gagal load master:", e);
      }
    };
    initMasterData();
  }, [authState.business_id]);

  // 2. Fetch Data Rekonsiliasi
  const fetchData = async () => {
    if (!selectedBankAccount) return;
    setLoading(true);
    try {
      // A. Ambil Mutasi Bank (Hanya Debit / Keluar & Unmatched)
      const { data: mutData } = await supabase
        .schema("finance")
        .from("bank_mutations")
        .select("*")
        .eq("type", "DB") // Hanya Uang Keluar
        .eq("status", "unmatched")
        .order("transaction_date", { ascending: false });

      // B. Ambil Candidate Payment
      const { data: payData } = await supabase
        .schema("finance")
        .from("view_unreconciled_payments")
        .select("*")
        .eq("business_id", authState.business_id);

      const { data: pcData } = await supabase
        .schema("finance")
        .from("view_unreconciled_petty_cash")
        .select("*")
        .eq("business_id", authState.business_id);

      const { data: expData } = await supabase
        .schema("finance")
        .from("view_unreconciled_expenses") // View yang udah kita buat
        .select("*")
        .eq("business_id", authState.business_id);

      setMutations(mutData || []);
      setPayments(payData || []);
      setPettyCashList(pcData || []);
      setExpenseList(expData || []);

      // Reset pilihan
      setSelectedMutation(null);
      setSelectedPaymentId(null);
      setSelectedPettyCashId(null);
      setSelectedExpenseId(null);
    } catch (err) {
      console.error(err);
      toast.error("Gagal load data rekonsiliasi.");
    } finally {
      setLoading(false);
    }
  };

  // Refresh data saat ganti bank
  useEffect(() => {
    fetchData();
  }, [selectedBankAccount]);

  // 3. Handler Aksi (Match / Record Expense)
  const handleAction = async (payload) => {
    if (!selectedMutation) return;
    try {
      const { error } = await supabase.rpc("process_expense_reconciliation", {
        p_mutation_id: selectedMutation.id,
        p_action_type: payload.type,

        p_payment_id:
          payload.type === "match_payment" ? payload.paymentId : null,
        p_petty_cash_id:
          payload.type === "match_petty_cash" ? payload.pettyCashId : null,

        // PARAMETER BARU EXPENSE
        p_expense_id:
          payload.type === "match_expense" ? payload.expenseId : null,

        p_category: payload.type === "record_expense" ? payload.category : null,
        p_description:
          payload.type === "record_expense" ? payload.description : null,

        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
        p_account_id: parseInt(selectedBankAccount),
      });

      if (error) throw error;
      toast.success("Berhasil direkonsiliasi!");
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Gagal: " + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-red-700">
            Rekonsiliasi Pengeluaran
          </h1>
          <p className="text-muted-foreground">
            Cocokkan mutasi keluar (Debit) dengan pembayaran atau catat biaya
            baru.
          </p>
        </div>

        {/* Dropdown Pilih Bank */}
        <div className="w-[250px]">
          <Select
            value={selectedBankAccount}
            onValueChange={setSelectedBankAccount}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih Bank" />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts.map((acc) => (
                <SelectItem key={acc.id} value={String(acc.id)}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[700px]">
        {loading ? (
          <div className="col-span-2 flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-red-600" />
          </div>
        ) : (
          <>
            {/* KOLOM KIRI: Mutasi Bank (Upload & List DB) */}
            <ExpenseBankColumn
              mutations={mutations}
              selectedId={selectedMutation?.id}
              onSelect={setSelectedMutation}
              businessId={authState.business_id}
              userId={authState.user.id}
              onUploadSuccess={fetchData}
              // PASSING CABANG DARI BANK TERPILIH (One Gate Policy)
              defaultBranchId={selectedAccountData?.branch_id}
            />

            {/* KOLOM KANAN: Sistem (Payment / Expense) */}
            <ExpenseSystemColumn
              paymentList={payments}
              selectedPaymentId={selectedPaymentId}
              onSelectPayment={setSelectedPaymentId}
              pettyCashList={pettyCashList}
              selectedPettyCashId={selectedPettyCashId}
              onSelectPettyCash={setSelectedPettyCashId}
              expenseList={expenseList}
              selectedExpenseId={selectedExpenseId}
              onSelectExpense={setSelectedExpenseId}
              mutationMatch={selectedMutation}
              onAction={handleAction}
            />
          </>
        )}
      </div>
    </div>
  );
}
