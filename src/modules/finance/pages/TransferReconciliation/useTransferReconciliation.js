import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { toast } from "sonner";

export const useTransferReconciliation = (authState) => {
  // STATE
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [activeTab, setActiveTab] = useState("pending");
  const [reconMode, setReconMode] = useState("sales"); // sales | deposit | invoice

  const [branches, setBranches] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState("");

  // DATA LISTS
  const [bankMutations, setBankMutations] = useState([]);
  const [posOrders, setPosOrders] = useState([]);
  const [cashSubmissions, setCashSubmissions] = useState([]);
  const [hotelInvoices, setHotelInvoices] = useState([]);
  const [historyMatches, setHistoryMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  // SELECTION
  const [selectedMutation, setSelectedMutation] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // FETCH DATA UTAMA
  const fetchData = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);
    try {
      // 1. Master Data (Cuma sekali load idealnya, tapi disini gpp)
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

      if (activeTab === "pending") {
        // 2. Bank Mutations
        const { data: bankData } = await supabase
          .schema("finance")
          .from("bank_mutations")
          .select("*")
          .eq("business_id", authState.business_id)
          .eq("status", "unmatched")
          .eq("type", "CR")
          .gte("transaction_date", startDate)
          .lte("transaction_date", endDate)
          .order("transaction_date", { ascending: false });
        setBankMutations(bankData || []);

        // 3. System Data (Switch Mode)
        if (reconMode === "sales") {
          let q = supabase
            .from("orders")
            .select(
              "id, created_at, invoice_code, grand_total, customers(name), branch_id"
            )
            .eq("business_id", authState.business_id)
            .ilike("payment_method", "%Transfer%")
            // UPDATE: Pakai kolom baru & status baru
            .eq("reconciliation_status", "pending")
            .gte("created_at", `${startDate}T00:00:00`)
            .lte("created_at", `${endDate}T23:59:59`)
            .neq("payment_status", "Void")
            .neq("payment_status", "Refunded")
            .order("created_at", { ascending: false });

          if (selectedBranch !== "all") q = q.eq("branch_id", selectedBranch);
          const { data } = await q;
          setPosOrders(data || []);
        } else if (reconMode === "deposit") {
          let q = supabase
            .schema("finance")
            .from("cash_submissions")
            .select(
              "id, submission_date, actual_cash, branch_id, notes, status"
            )
            .eq("business_id", authState.business_id)
            .eq("status", "pending")
            .gte("submission_date", startDate)
            .lte("submission_date", endDate)
            .order("submission_date", { ascending: false });
          if (selectedBranch !== "all") q = q.eq("branch_id", selectedBranch);
          const { data } = await q;
          setCashSubmissions(data || []);
        } else if (reconMode === "invoice") {
          let q = supabase
            .from("hotel_invoices")
            .select(
              "id, created_at, invoice_number, grand_total, customers(name), period_start, period_end"
            )
            .eq("business_id", authState.business_id)
            .eq("payment_status", "unpaid")
            .gte("created_at", `${startDate}T00:00:00`)
            .lte("created_at", `${endDate}T23:59:59`)
            .order("created_at", { ascending: false });
          if (selectedBranch !== "all") q = q.eq("branch_id", selectedBranch);
          const { data } = await q;
          setHotelInvoices(data || []);
        }

        // Reset Selection pas refresh
        setSelectedMutation(null);
        setSelectedItem(null);
      } else {
        // Tab History
        const { data } = await supabase
          .schema("finance")
          .from("view_match_history")
          .select("*")
          .eq("business_id", authState.business_id)
          .order("matched_at", { ascending: false })
          .limit(50);
        setHistoryMatches(data || []);
      }
    } catch (e) {
      toast.error("Gagal load data: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [
    authState.business_id,
    startDate,
    endDate,
    selectedBranch,
    activeTab,
    reconMode,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    // State Variables
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedBranch,
    setSelectedBranch,
    activeTab,
    setActiveTab,
    reconMode,
    setReconMode,
    branches,
    accounts,
    selectedBankAccount,
    setSelectedBankAccount,
    bankMutations,
    posOrders,
    cashSubmissions,
    hotelInvoices,
    historyMatches,
    loading,
    selectedMutation,
    setSelectedMutation,
    selectedItem,
    setSelectedItem,
    // Functions
    fetchData,
  };
};
