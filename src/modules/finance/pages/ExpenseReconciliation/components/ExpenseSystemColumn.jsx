import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs"; // Hapus TabsContent biar fleksibel manual
import { Save, Wallet, Zap } from "lucide-react"; // Tambah Icon Wallet

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function ExpenseSystemColumn({
  paymentList,
  selectedPaymentId,
  onSelectPayment,
  pettyCashList = [],
  selectedPettyCashId,
  onSelectPettyCash,
  expenseList = [],
  selectedExpenseId,
  onSelectExpense, // Props Baru
  mutationMatch,
  onAction,
}) {
  const [activeTab, setActiveTab] = useState("payment");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mutationMatch && activeTab === "expense") {
      setExpenseDesc(mutationMatch.description || "");
    }
  }, [mutationMatch, activeTab]);

  const handleExpenseSubmit = () => {
    if (!mutationMatch) return;
    setIsSubmitting(true);
    onAction({
      type: "record_expense",
      category: expenseCategory,
      description: expenseDesc,
    }).finally(() => setIsSubmitting(false));
  };

  const handleMatchPayment = () => {
    if (!selectedPaymentId) return;
    setIsSubmitting(true);
    onAction({ type: "match_payment", paymentId: selectedPaymentId }).finally(
      () => setIsSubmitting(false)
    );
  };

  // HANDLE MATCH PETTY CASH
  const handleMatchPettyCash = () => {
    if (!selectedPettyCashId) return;
    setIsSubmitting(true);
    onAction({
      type: "match_petty_cash",
      pettyCashId: selectedPettyCashId,
    }).finally(() => setIsSubmitting(false));
  };

  const handleMatchExpense = () => {
    if (!selectedExpenseId) return;
    setIsSubmitting(true);
    onAction({ type: "match_expense", expenseId: selectedExpenseId }).finally(
      () => setIsSubmitting(false)
    );
  };

  return (
    <Card className="border-l-4 border-l-red-500 h-[650px] flex flex-col shadow-md">
      <CardHeader className="bg-slate-50 pb-0 pt-2 border-b px-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-2">
            <TabsTrigger value="payment">Hutang Supplier</TabsTrigger>
            <TabsTrigger value="petty_cash">Petty Cash</TabsTrigger>{" "}
            <TabsTrigger value="ops_expense" className="text-xs">
              Tagihan Ops
            </TabsTrigger>{" "}
            {/* TAB BARU */}
            <TabsTrigger value="expense">Biaya Langsung</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-y-auto bg-slate-100/50 relative">
        {/* === TAB 1: SUPPLIER PAYMENT === */}
        {activeTab === "payment" && (
          // ... (Kodingan List Payment Tetap Sama) ...
          <div className="flex flex-col h-full">
            <div className="p-2 bg-yellow-50 text-xs text-yellow-800 border-b">
              Pilih pembayaran supplier yang cocok.
            </div>
            <div className="divide-y divide-slate-200 flex-1 overflow-y-auto">
              {paymentList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Kosong.
                </div>
              ) : (
                paymentList.map((pay) => (
                  <div
                    key={pay.id}
                    onClick={() => onSelectPayment(pay.id)}
                    className={`p-3 cursor-pointer hover:bg-blue-50 bg-white ${
                      selectedPaymentId === pay.id
                        ? "ring-2 ring-blue-500 bg-blue-50"
                        : ""
                    }`}
                  >
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>
                        {new Date(pay.payment_date).toLocaleDateString()}
                      </span>
                      <span>{formatRupiah(pay.total_paid)}</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      {pay.supplier_name} ({pay.payment_number})
                    </div>
                    {mutationMatch &&
                      Math.abs(mutationMatch.amount) ===
                        Number(pay.total_paid) && (
                        <Badge className="bg-green-600 animate-pulse text-[10px] mt-1">
                          COCOK
                        </Badge>
                      )}
                  </div>
                ))
              )}
            </div>
            {selectedPaymentId && (
              <div className="p-4 border-t bg-white sticky bottom-0">
                <Button
                  className="w-full bg-blue-600"
                  onClick={handleMatchPayment}
                  disabled={isSubmitting}
                >
                  Jodohkan Payment
                </Button>
              </div>
            )}
          </div>
        )}

        {/* === TAB 2: PETTY CASH (BARU) === */}
        {activeTab === "petty_cash" && (
          <div className="flex flex-col h-full">
            <div className="p-2 bg-purple-50 text-xs text-purple-800 border-b">
              Cocokkan transfer ke cabang (Klaim Approved).
            </div>
            <div className="divide-y divide-slate-200 flex-1 overflow-y-auto">
              {pettyCashList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Tidak ada transfer petty cash pending.
                </div>
              ) : (
                pettyCashList.map((pc) => (
                  <div
                    key={pc.id}
                    onClick={() => onSelectPettyCash(pc.id)}
                    className={`p-3 cursor-pointer transition-all hover:bg-purple-50 bg-white ${
                      selectedPettyCashId === pc.id
                        ? "ring-2 ring-inset ring-purple-500 bg-purple-50"
                        : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            pc.type === "initial"
                              ? "bg-blue-600"
                              : "bg-purple-600"
                          }
                        >
                          {pc.type === "initial" ? "SALDO" : "REIMBURSE"}
                        </Badge>
                        <span className="font-bold text-slate-800">
                          {pc.branch_name}
                        </span>
                      </div>
                      <span className="font-bold text-purple-700">
                        {formatRupiah(pc.total_amount)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between items-center text-xs text-slate-500">
                      <span>Req: {pc.requester_email}</span>
                      <span>
                        {new Date(pc.approved_date).toLocaleDateString()}
                      </span>
                    </div>
                    {/* Auto Match Indicator */}
                    {mutationMatch &&
                      Math.abs(mutationMatch.amount) ===
                        Number(pc.total_amount) && (
                        <Badge className="bg-green-600 animate-pulse text-[10px] mt-1">
                          COCOK NOMINAL
                        </Badge>
                      )}
                  </div>
                ))
              )}
            </div>
            {/* Tombol Match */}
            {selectedPettyCashId && (
              <div className="p-4 border-t bg-white sticky bottom-0">
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handleMatchPettyCash}
                  disabled={isSubmitting}
                >
                  <Wallet className="w-4 h-4 mr-2" /> Verifikasi Transfer Cabang
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "ops_expense" && (
          <div className="flex flex-col h-full">
            <div className="p-2 bg-orange-50 text-xs text-orange-800 border-b">
              Cocokkan pembayaran Listrik, Sewa, dll.
            </div>
            <div className="divide-y divide-slate-200 flex-1 overflow-y-auto">
              {expenseList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Tidak ada tagihan pending rekonsil.
                </div>
              ) : (
                expenseList.map((exp) => (
                  <div
                    key={exp.id}
                    onClick={() => onSelectExpense(exp.id)}
                    className={`p-3 cursor-pointer transition-all hover:bg-orange-50 bg-white ${
                      selectedExpenseId === exp.id
                        ? "ring-2 ring-inset ring-orange-500 bg-orange-50"
                        : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-orange-600 border-orange-200 text-[10px]"
                        >
                          {exp.category}
                        </Badge>
                        <span className="font-bold text-slate-700 text-sm truncate max-w-[120px]">
                          {exp.description}
                        </span>
                      </div>
                      <span className="font-bold text-orange-700">
                        {formatRupiah(exp.amount)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between items-center text-xs text-slate-500">
                      <span>Vendor: {exp.payee || "-"}</span>
                      <span>
                        {new Date(exp.payment_date).toLocaleDateString()}
                      </span>
                    </div>
                    {/* Auto Match Indicator */}
                    {mutationMatch &&
                      Math.abs(mutationMatch.amount) === Number(exp.amount) && (
                        <Badge className="bg-green-600 animate-pulse text-[10px] mt-1">
                          COCOK NOMINAL
                        </Badge>
                      )}
                  </div>
                ))
              )}
            </div>
            {/* Tombol Match */}
            {selectedExpenseId && (
              <div className="p-4 border-t bg-white sticky bottom-0">
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  onClick={handleMatchExpense}
                  disabled={isSubmitting}
                >
                  <Zap className="w-4 h-4 mr-2" /> Jodohkan Biaya Ops
                </Button>
              </div>
            )}
          </div>
        )}

        {/* === TAB 3: EXPENSE DIRECT === */}
        {activeTab === "expense" && (
          // ... (Kodingan Expense Tetap Sama - Copy Paste yg lama) ...
          <div className="p-6 space-y-6 bg-white h-full">
            {!mutationMatch ? (
              <div className="text-center text-slate-400 mt-10">
                Pilih mutasi bank di kiri dulu.
              </div>
            ) : (
              <>
                <div className="bg-red-50 p-4 rounded border border-red-200">
                  <p className="text-xs font-bold text-red-800 uppercase mb-1">
                    UANG KELUAR
                  </p>
                  <p className="text-2xl font-mono font-bold text-red-700">
                    {formatRupiah(Math.abs(mutationMatch.amount))}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {mutationMatch.description}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Kategori Biaya</Label>
                    <Select
                      value={expenseCategory}
                      onValueChange={setExpenseCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kategori..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Operational">
                          Operasional (Listrik/Air/Internet)
                        </SelectItem>
                        <SelectItem value="Consumables">
                          Perlengkapan (ATK/Plastik)
                        </SelectItem>
                        <SelectItem value="Maintenance">
                          Maintenance & Perbaikan
                        </SelectItem>
                        <SelectItem value="Bank Admin">
                          Biaya Admin Bank
                        </SelectItem>
                        <SelectItem value="Marketing">
                          Marketing / Iklan
                        </SelectItem>
                        <SelectItem value="Payroll">Gaji Karyawan</SelectItem>{" "}
                        {/* Payroll masuk sini aja sementara */}
                        <SelectItem value="Other Expense">Lain-lain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Keterangan</Label>
                    <Textarea
                      value={expenseDesc}
                      onChange={(e) => setExpenseDesc(e.target.value)}
                      placeholder="Contoh: Beli Token Listrik"
                      rows={3}
                    />
                  </div>
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700 h-12"
                    disabled={!expenseCategory || isSubmitting}
                    onClick={handleExpenseSubmit}
                  >
                    <Save className="mr-2 h-4 w-4" /> CATAT SEBAGAI BIAYA
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
