import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  Printer,
  CheckCircle,
  Loader2,
  Phone,
  XCircle,
  MapPin,
  Clock,
  Banknote,
  Send,
  Trash2,
  Info,
  AlertTriangle,
  PackageCheck, // <--- Tambah Icon PackageCheck
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";

import PurchaseOrderTemplate from "../../../components/documents/PurchaseOrderTemplate";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function PODetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const currentUserIdentifier =
    authState.user?.user_metadata?.full_name ||
    authState.user?.email ||
    "Unknown User";

  const [po, setPo] = useState(null);
  const [items, setItems] = useState([]);
  const [grList, setGrList] = useState([]); // <--- STATE BARU: List GR
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // STATE CONFIRM MODAL
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState({ type: "" });

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch PO Header
      const { data: poData, error: poError } = await supabase
        .schema("inventory")
        .from("purchase_orders")
        .select(`*, suppliers(*), warehouses(*)`)
        .eq("id", id)
        .single();
      if (poError) throw poError;

      // 2. Fetch PO Items
      const { data: itemData, error: itemError } = await supabase
        .schema("inventory")
        .from("purchase_items")
        .select(`*, products(name, unit, purchase_unit)`)
        .eq("po_id", id);
      if (itemError) throw itemError;

      // 3. FETCH HISTORY GR (PENERIMAAN BARANG) - NEW!
      const { data: grData, error: grError } = await supabase
        .schema("inventory")
        .from("goods_receipts")
        .select("*")
        .eq("purchase_order_id", id)
        .order("created_at", { ascending: false }); // Urutkan dari yang terbaru

      // Gak perlu throw error kalau kosong, cuma log aja
      if (grError) console.error("Error fetch GR:", grError);

      setPo(poData);
      setItems(itemData);
      setGrList(grData || []); // Simpan ke state
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat detail PO.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // --- TRIGGER CONFIRM ---
  const triggerConfirm = (type) => {
    setConfirmAction({ type });
    setConfirmModalOpen(true);
  };

  // --- EKSEKUTOR API ---
  const executeAction = async () => {
    const { type } = confirmAction;
    setProcessing(true);
    try {
      if (type === "submit") {
        const { error } = await supabase.rpc("submit_purchase_order", {
          p_po_id: id,
          p_user_id: authState.user.id,
          p_user_role: authState.role,
        });
        if (error) throw error;
        toast.success("PO berhasil disubmit!");
      } else if (type === "approve") {
        const { error } = await supabase.rpc("approve_purchase_order", {
          p_po_id: id,
          p_user_id: authState.user.id,
          p_user_name: currentUserIdentifier,
        });
        if (error) throw error;
        toast.success("PO Disetujui!");
      } else if (type === "finalize") {
        const { error } = await supabase.rpc("finalize_purchase_order", {
          p_po_id: id,
          p_user_id: authState.user.id,
          p_user_name: currentUserIdentifier,
        });
        if (error) throw error;
        toast.success("PO Resmi Di-Issue!");
      }
      setConfirmModalOpen(false);
      fetchDetail();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return toast.error("Alasan wajib diisi.");
    setProcessing(true);
    try {
      const { error } = await supabase.rpc("reject_purchase_order", {
        p_po_id: id,
        p_reason: rejectReason,
        p_user_id: authState.user.id,
        p_user_name: currentUserIdentifier,
      });
      if (error) throw error;
      toast.success("Order Rejected.");
      setRejectModalOpen(false);
      fetchDetail();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => window.print();

  const getPrice = (item) => item.purchase_price || item.cost_price || 0;
  const getTotal = (item) =>
    item.total_price || item.subtotal || getPrice(item) * item.quantity;

  const getStatusBadge = (status) => {
    const styles = {
      received: "bg-green-100 text-green-700 border-green-200",
      issued: "bg-blue-100 text-blue-700 border-blue-200",
      partial: "bg-purple-100 text-purple-700 border-purple-200",
      pending_approval:
        "bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse",
      verified: "bg-cyan-100 text-cyan-700 border-cyan-200",
      draft: "bg-slate-100 text-slate-700 border-slate-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
    };
    const labels = {
      received: "SELESAI",
      issued: "ISSUED",
      partial: "PARTIAL",
      pending_approval: "WAITING OWNER",
      verified: "WAITING FINANCE",
      draft: "DRAFT",
      rejected: "DITOLAK",
    };
    return (
      <Badge
        variant="outline"
        className={`font-bold border px-2 py-0.5 ${styles[status]}`}
      >
        {labels[status] || status.toUpperCase()}
      </Badge>
    );
  };

  const getConfirmContent = () => {
    const { type } = confirmAction;
    if (type === "submit")
      return {
        title: "Submit PO",
        desc: "Anda yakin ingin submit PO ini?",
        btnColor: "bg-blue-600 hover:bg-blue-700",
        btnText: "Ya, Submit",
        icon: <Send className="w-5 h-5 text-blue-600" />,
      };
    if (type === "approve")
      return {
        title: "Approve PO",
        desc: "Setujui PO ini dan teruskan ke Finance?",
        btnColor: "bg-green-600 hover:bg-green-700",
        btnText: "Ya, Approve",
        icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      };
    if (type === "finalize")
      return {
        title: "Finalize PO",
        desc: "Proses Final PO ini menjadi ISSUED?",
        btnColor: "bg-cyan-600 hover:bg-cyan-700 text-white",
        btnText: "Ya, Finalize",
        icon: <Banknote className="w-5 h-5 text-cyan-600" />,
      };
    return { title: "", desc: "", btnColor: "" };
  };
  const confirmContent = getConfirmContent();

  if (loading) return <div className="p-8 text-center">Loading details...</div>;
  if (!po) return <div className="p-8 text-center">PO not found.</div>;

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20 max-w-5xl mx-auto font-sans print:hidden">
        {/* NAV HEADER */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Detail PO</h1>
              <p className="text-sm text-muted-foreground">
                {po.purchase_number}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Cetak PO
            </Button>

            {/* --- ACTION BUTTONS --- */}
            {authState.role === "owner" && (
              <>
                {(po.status === "draft" ||
                  po.status === "pending_approval") && (
                  <Button
                    variant="destructive"
                    onClick={() => setRejectModalOpen(true)}
                    disabled={processing}
                  >
                    {po.status === "draft" ? (
                      <Trash2 className="mr-2 h-4 w-4" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    {po.status === "draft" ? "Hapus" : "Tolak"}
                  </Button>
                )}
                {po.status === "draft" && (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => triggerConfirm("submit")}
                    disabled={processing}
                  >
                    <Send className="mr-2 h-4 w-4" /> Submit
                  </Button>
                )}
                {po.status === "pending_approval" && (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => triggerConfirm("approve")}
                    disabled={processing}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                  </Button>
                )}
              </>
            )}

            {authState.role === "finance" && (
              <>
                {(po.status === "verified" ||
                  po.status === "pending_approval") && (
                  <Button
                    variant="destructive"
                    onClick={() => setRejectModalOpen(true)}
                    disabled={processing}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Reject
                  </Button>
                )}
                {po.status === "verified" && (
                  <Button
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                    onClick={() => triggerConfirm("finalize")}
                    disabled={processing}
                  >
                    <Banknote className="mr-2 h-4 w-4" /> Finalize PO
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* MAIN CARD */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-bold text-lg text-slate-800">
                  PURCHASE ORDER
                </h2>
                <div className="mt-2 flex gap-2">
                  {getStatusBadge(po.status)}
                  {po.dp_amount > 0 && (
                    <Badge variant="secondary">
                      DP: {formatRupiah(po.dp_amount)}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right text-sm">
                <h3 className="font-bold text-lg text-primary uppercase">
                  {authState.pengaturan?.business_name || "TEMU LAUNDRY"}
                </h3>
                <p className="text-slate-500 mt-1">
                  {new Date(po.created_at).toLocaleDateString("id-ID")}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-10">
            {/* SUPPLIER & WAREHOUSE INFO */}
            <div className="grid grid-cols-2 gap-12 text-sm">
              <div>
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-xs mb-2">
                  SUPPLIER:
                </h4>
                <div className="font-bold text-lg text-slate-900">
                  {po.suppliers?.name}
                </div>
                <div className="flex items-start gap-2 mt-1 text-slate-600">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{po.suppliers?.address || "-"}</p>
                </div>
                <div className="flex items-center gap-2 mt-1 text-slate-600">
                  <Phone className="h-4 w-4 shrink-0" />{" "}
                  {po.suppliers?.phone || "-"}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-xs mb-2">
                  DELIVERY TO:
                </h4>
                <div className="font-bold text-lg text-slate-900">
                  {po.warehouses?.name}
                </div>
                <div className="flex items-start gap-2 mt-1 text-slate-600">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{po.warehouses?.address || "-"}</p>
                </div>
              </div>
            </div>

            {/* TABEL ITEM */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-3 text-left uppercase text-xs">
                      Item Description
                    </th>
                    <th className="px-4 py-3 text-center uppercase text-xs">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right uppercase text-xs">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-right uppercase text-xs">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.products?.name}
                        {item.products?.purchase_unit && (
                          <span className="text-xs text-slate-400 ml-2">
                            ({item.products.purchase_unit})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-800">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 font-mono">
                        {formatRupiah(getPrice(item))}
                      </td>
                      <td className="px-4 py-3 text-right font-medium font-mono text-slate-900">
                        {formatRupiah(getTotal(item))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FOOTER TOTAL */}
            <div className="flex justify-end">
              <div className="w-1/2 md:w-1/3 space-y-3">
                <div className="flex justify-between text-slate-600 border-b border-slate-100 pb-2">
                  <span>Subtotal</span>
                  <span className="font-mono">
                    {formatRupiah(po.total_amount + (po.discount_amount || 0))}
                  </span>
                </div>
                {po.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600 border-b border-slate-100 pb-2">
                    <span>Discount</span>
                    <span className="font-mono">
                      - {formatRupiah(po.discount_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-extrabold text-slate-900 pt-2">
                  <span>Grand Total</span>
                  <span>{formatRupiah(po.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* NOTES & HISTORY STATUS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Note */}
              <div className="bg-yellow-50 p-4 rounded text-sm text-yellow-800 border border-yellow-200">
                <strong>Notes:</strong> {po.notes || "No additional notes."}
              </div>

              {/* --- HISTORY STATUS & LOG PENERIMAAN --- */}
              <div className="bg-slate-50 p-4 rounded text-sm border border-slate-200">
                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" /> History & Log
                </h4>
                <div className="space-y-3 text-slate-600 text-xs">
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span>Created:</span>
                    <span className="font-mono">
                      {new Date(po.created_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                  {po.approved_at && (
                    <div className="flex flex-col items-end text-green-700">
                      <span className="font-bold flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Approved
                      </span>
                      <span className="font-mono text-[10px]">
                        {new Date(po.approved_at).toLocaleString("id-ID")}
                      </span>
                      <span className="font-bold italic mt-0.5">
                        by {po.approved_by_name || "Owner"}
                      </span>
                    </div>
                  )}
                  {po.status === "rejected" && (
                    <div className="text-red-600 mt-2 border-t border-red-200 pt-2">
                      <div className="flex justify-between font-bold mb-1">
                        <span>REJECTED</span>
                        <span>by {po.rejected_by_name || "Owner/Finance"}</span>
                      </div>
                      <div className="bg-red-50 p-2 rounded border border-red-100 italic">
                        "
                        {po.notes
                          ?.split("[REJECTED")[1]
                          ?.split(": ")[1]
                          ?.replace("]", "") ||
                          po.notes ||
                          "No reason"}
                        "
                      </div>
                    </div>
                  )}

                  {/* --- NEW SECTION: LOG PENERIMAAN BARANG (GR) --- */}
                  <div className="border-t border-slate-200 mt-4 pt-3">
                    <h5 className="font-bold text-slate-700 text-xs mb-2 flex items-center gap-2">
                      <PackageCheck className="h-3 w-3" /> Log Penerimaan Barang
                    </h5>

                    {grList.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        Belum ada barang diterima.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {grList.map((gr, idx) => (
                          <div
                            key={gr.id}
                            className="bg-white p-2 rounded border border-slate-200 shadow-sm relative"
                          >
                            {/* Garis konektor visual kalau banyak */}
                            <div className="flex justify-between font-medium text-slate-800">
                              <span>
                                {new Date(gr.received_date).toLocaleDateString(
                                  "id-ID",
                                )}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0 h-5 border-green-200 text-green-700 bg-green-50"
                              >
                                RECEIVED
                              </Badge>
                            </div>
                            <div className="mt-1.5 flex flex-col gap-1">
                              <div className="flex items-start gap-1">
                                <span className="font-bold text-slate-500 w-16 shrink-0">
                                  Penerima:
                                </span>
                                <span className="text-slate-900 font-semibold">
                                  {gr.received_by || "-"}
                                </span>
                              </div>
                              <div className="flex items-start gap-1">
                                <span className="font-bold text-slate-500 w-16 shrink-0">
                                  Catatan:
                                </span>
                                <span className="italic text-slate-600">
                                  "{gr.notes || "-"}"
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MODAL REJECT */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Order</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Label>Reason</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmReject}>
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL CONFIRM */}
        <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-slate-100 rounded-full">
                  {confirmContent.icon || (
                    <AlertTriangle className="w-5 h-5 text-slate-600" />
                  )}
                </div>
                <DialogTitle>{confirmContent.title}</DialogTitle>
              </div>
              <DialogDescription className="text-slate-600">
                {confirmContent.desc}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                className={confirmContent.btnColor}
                onClick={executeAction}
                disabled={processing}
              >
                {processing ? "Memproses..." : confirmContent.btnText}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <PurchaseOrderTemplate
        data={po}
        items={items}
        settings={authState.pengaturan}
      />
    </>
  );
}
