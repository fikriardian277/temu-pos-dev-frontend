import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Loader2, CreditCard } from "lucide-react";

import { useSupplierPayment } from "./useSupplierPayment";
import InvoiceInfo from "./components/InvoiceInfo";
import PaymentForm from "./components/PaymentForm";

export default function SupplierPaymentModal({
  isOpen,
  onClose,
  payableData, // Diisi kalau bayar hutang
  poData, // Diisi kalau bayar DP
  authState,
  onSuccess,
}) {
  // Kirim kedua data ke hook
  const logic = useSupplierPayment(
    payableData,
    poData,
    authState,
    onSuccess,
    onClose
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-700">
            <CreditCard className="w-5 h-5" />
            {logic.mode === "advance"
              ? "Form Bayar DP"
              : "Form Pembayaran Supplier"}
          </DialogTitle>
        </DialogHeader>

        {/* Info Tagihan Dinamis */}
        <InvoiceInfo payable={payableData} poData={poData} />

        {/* Form Input */}
        <PaymentForm hookData={logic} />

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={logic.loading}>
            Batal
          </Button>
          <Button
            onClick={logic.handleSubmit}
            disabled={logic.loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {logic.loading ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : null}
            {logic.mode === "advance" ? "Bayar DP" : "Konfirmasi Bayar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
