import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  Printer,
  Building2,
  Calendar,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// IMPORT TEMPLATE
import HotelInvoiceTemplate from "@/components/documents/HotelInvoiceTemplate";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");
const formatDate = (date) =>
  new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function HotelInvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authState } = useAuth(); // Ambil Auth State

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ambil nama user yang sedang login
  const currentUserName = authState.user?.user_metadata?.full_name || "Admin";

  // FETCH DATA DETAIL
  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const { data: invoiceData, error } = await supabase
          .from("hotel_invoices")
          .select(
            `
                        *,
                        customers(name, address, phone_number),
                        hotel_delivery_notes (
                            id, invoice_code, pickup_date, notes, branch_id,
                            hotel_delivery_items (
                                id, qty, total_price,
                                packages (name, unit, price)
                            )
                        )
                    `,
          )
          .eq("id", id)
          .single();

        if (error) throw error;

        // LOGIC CARI DATA CABANG (BRANCH)
        let branchData = null;
        const targetBranchId = invoiceData.hotel_delivery_notes?.[0]?.branch_id;

        if (targetBranchId) {
          const { data: bData, error: bError } = await supabase
            .from("branches")
            .select(
              `
                            name, address, phone_number, email, website,
                            bank_name, bank_account_number, bank_account_holder
                        `,
            )
            .eq("id", targetBranchId)
            .single();

          if (!bError) {
            branchData = bData;
          }
        }

        setInvoice({ ...invoiceData, branch_info: branchData });
      } catch (e) {
        console.error(e);
        toast.error("Gagal memuat invoice.");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id, navigate]);

  const handlePrint = () => {
    window.print();
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  if (!invoice) return null;

  return (
    <>
      {/* UI UTAMA (LAYAR) */}
      <div className="min-h-screen bg-slate-50/50 p-6 pb-20 font-sans print:hidden">
        <div className="max-w-5xl mx-auto flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <Printer className="mr-2 h-4 w-4" /> Print Invoice
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto space-y-6">
          <Card className="border-l-4 border-l-blue-600 shadow-sm">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  Invoice #{invoice.invoice_number}
                  <Badge
                    className={
                      invoice.payment_status === "paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }
                  >
                    {invoice.payment_status === "paid" ? "PAID" : "UNPAID"}
                  </Badge>
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Created: {formatDate(invoice.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">
                  Total Amount
                </p>
                <p className="text-3xl font-mono font-bold text-blue-700">
                  {formatRupiah(invoice.grand_total)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* PREVIEW CONTENT */}
          <div className="bg-white p-8 border rounded-lg shadow-sm text-center text-slate-400 italic">
            Preview konten akan muncul saat dicetak (Print Preview).
          </div>
        </div>
      </div>

      {/* --- TEMPLATE CETAK --- */}
      <HotelInvoiceTemplate
        invoiceData={invoice}
        settings={authState.pengaturan}
        branchInfo={invoice.branch_info}
        generatedBy={currentUserName} // <--- KIRIM NAMA USER DISINI
      />
    </>
  );
}
