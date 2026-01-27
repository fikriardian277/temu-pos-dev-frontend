import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  Printer,
  CheckCircle,
  XCircle,
  Loader2,
  Truck,
  MapPin,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card"; // Card UI biasa
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import ReceiveTransferModal from "../components/ReceiveTransferModal";

// --- IMPORT TEMPLATE BARU ---
import DeliveryNoteTemplate from "../../../components/documents/DeliveryNoteTemplate";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function TransferDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authState } = useAuth();

  // --- STATE DATA UTAMA ---
  const [trf, setTrf] = useState(null);
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // --- STATE MODALS ---
  const [receiveModal, setReceiveModal] = useState(null);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustReason, setAdjustReason] = useState("");
  const [approveSourceModal, setApproveSourceModal] = useState(false);
  const [sendDialog, setSendDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // --- STATE FORM KIRIM/APPROVE ---
  const [selectedSource, setSelectedSource] = useState("");
  const [approvalShippingCost, setApprovalShippingCost] = useState(0);
  const [fundSource, setFundSource] = useState("HO_BCA");

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const { data: trfRaw, error: headErr } = await supabase
        .schema("inventory")
        .from("stock_transfers")
        .select("*")
        .eq("id", id)
        .single();
      if (headErr) throw headErr;

      const [sourceRes, targetRes, userRes, itemRes] = await Promise.all([
        trfRaw.source_warehouse_id
          ? supabase
              .schema("inventory")
              .from("warehouses")
              .select("id, name, address, branch_id")
              .eq("id", trfRaw.source_warehouse_id)
              .single()
          : { data: null },
        trfRaw.target_warehouse_id
          ? supabase
              .schema("inventory")
              .from("warehouses")
              .select("id, name, address, branch_id")
              .eq("id", trfRaw.target_warehouse_id)
              .single()
          : { data: null },
        trfRaw.created_by
          ? supabase
              .from("profiles")
              .select("full_name")
              .eq("id", trfRaw.created_by)
              .single()
          : { data: null },
        supabase
          .schema("inventory")
          .from("transfer_items")
          .select(`*, products(name, sku, unit)`)
          .eq("transfer_id", id),
      ]);

      setTrf({
        ...trfRaw,
        source: sourceRes.data,
        target: targetRes.data,
        creator: userRes.data,
      });
      setItems(itemRes.data || []);

      if (
        (authState.role === "owner" && trfRaw.status === "requested") ||
        trfRaw.status === "draft"
      ) {
        const { data: wh } = await supabase
          .schema("inventory")
          .from("warehouses")
          .select("id, name, is_main_warehouse, branch_id")
          .eq("business_id", authState.business_id)
          .eq("is_active", true);
        setWarehouses(wh || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal load data.");
    } finally {
      setLoading(false);
    }
  }, [id, authState.role, authState.business_id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const getPayerParams = () => {
    const hoNode = warehouses.find((w) => w.is_main_warehouse);
    const HO_BRANCH_ID = hoNode ? hoNode.branch_id : 7;
    let targetBranchId = trf?.target?.branch_id;
    if (!targetBranchId && trf?.target_warehouse_id) {
      const targetWh = warehouses.find((w) => w.id === trf.target_warehouse_id);
      if (targetWh) targetBranchId = targetWh.branch_id;
    }
    if (fundSource === "HO_BCA") {
      return { payerId: HO_BRANCH_ID, method: "BANK_HO" };
    } else {
      return { payerId: targetBranchId, method: "CASH" };
    }
  };

  const handleApproveClick = () => {
    const main = warehouses.find((w) => w.is_main_warehouse);
    if (main) setSelectedSource(main.id);
    setApprovalShippingCost(0);
    setFundSource("HO_BCA");
    setApproveSourceModal(true);
  };

  const confirmSendRequest = async () => {
    if (!selectedSource) return toast.error("Pilih gudang sumber!");
    const cost = parseFloat(approvalShippingCost) || 0;
    const { payerId, method } = getPayerParams();
    if (cost > 0 && fundSource === "BRANCH_CASH" && !payerId) {
      return toast.error("Data Cabang Penerima tidak valid.");
    }
    setProcessing(true);
    try {
      await supabase
        .schema("inventory")
        .from("stock_transfers")
        .update({
          source_warehouse_id: selectedSource,
          shipping_cost: cost,
          status: "draft",
        })
        .eq("id", id);
      const { error } = await supabase.rpc("send_stock_transfer", {
        p_transfer_id: id,
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
        p_payer_branch_id: cost > 0 ? payerId : null,
        p_payment_method: cost > 0 ? method : null,
      });
      if (error) throw error;
      toast.success("Request Disetujui & Barang Dikirim!");
      setApproveSourceModal(false);
      fetchDetail();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const openSendDialog = () => {
    if (!trf.source_warehouse_id)
      return toast.error("Gudang asal belum dipilih.");
    setApprovalShippingCost(trf.shipping_cost || 0);
    setFundSource("HO_BCA");
    setSendDialog(true);
  };

  const confirmManualSend = async () => {
    const cost = parseFloat(approvalShippingCost) || 0;
    const { payerId, method } = getPayerParams();
    if (cost > 0 && fundSource === "BRANCH_CASH" && !payerId) {
      return toast.error("Data Cabang Penerima tidak valid.");
    }
    setProcessing(true);
    try {
      const { error: updateError } = await supabase
        .schema("inventory")
        .from("stock_transfers")
        .update({ shipping_cost: cost, updated_at: new Date() })
        .eq("id", id);
      if (updateError) throw updateError;
      const { error } = await supabase.rpc("send_stock_transfer", {
        p_transfer_id: id,
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
        p_payer_branch_id: cost > 0 ? payerId : null,
        p_payment_method: cost > 0 ? method : null,
      });
      if (error) throw error;
      toast.success("Barang Berhasil Dikirim!");
      setSendDialog(false);
      fetchDetail();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = () => {
    setRejectReason("");
    setRejectDialog(true);
  };
  const confirmReject = async () => {
    if (!rejectReason.trim()) return toast.error("Alasan wajib diisi.");
    setProcessing(true);
    try {
      const { error } = await supabase
        .schema("inventory")
        .from("stock_transfers")
        .update({
          status: "rejected",
          notes: (trf.notes || "") + ` [DITOLAK: ${rejectReason}]`,
          updated_at: new Date(),
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Request Ditolak.");
      setRejectDialog(false);
      fetchDetail();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const confirmAdjust = async () => {
    if (!adjustReason.trim()) return toast.error("Alasan wajib diisi.");
    setProcessing(true);
    try {
      const { error } = await supabase.rpc("resolve_transfer_discrepancy", {
        p_transfer_id: id,
        p_business_id: authState.business_id,
        p_user_id: authState.user.id,
        p_notes: adjustReason,
      });
      if (error) throw error;
      toast.success("Selisih diselesaikan (Adjusted).");
      setAdjustModalOpen(false);
      fetchDetail();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="p-10 text-center">Memuat...</div>;
  if (!trf) return <div className="p-10 text-center">Data tidak ditemukan</div>;

  return (
    <>
      {/* --- AREA TAMPILAN LAYAR (UI DASHBOARD) - HIDDEN PAS PRINT --- */}
      <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20 max-w-5xl mx-auto font-sans print:hidden">
        {/* HEADER & BUTTONS */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Detail Mutasi</h1>
              <p className="text-sm text-muted-foreground">
                {trf.transfer_number}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Cetak Surat Jalan
            </Button>
            {trf.status === "requested" && authState.role === "owner" && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={processing}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Tolak
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleApproveClick}
                  disabled={processing}
                >
                  <Truck className="mr-2 h-4 w-4" /> Proses & Kirim
                </Button>
              </>
            )}
            {trf.status === "draft" && (
              <Button
                onClick={openSendDialog}
                disabled={processing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {processing ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Kirim Barang
              </Button>
            )}
            {(trf.status === "partial" || trf.status === "in_transit") &&
              authState.role === "owner" && (
                <Button
                  variant="destructive"
                  onClick={() => setAdjustModalOpen(true)}
                  disabled={processing}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Adjust Loss (Tutup)
                </Button>
              )}
            {(trf.status === "in_transit" || trf.status === "partial") && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setReceiveModal(trf)}
                disabled={processing}
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Terima Barang
              </Button>
            )}
          </div>
        </div>

        {/* CARD DETAIL (TAMPILAN UI - INDONESIA) */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-bold text-lg text-slate-800">
                  Informasi Pengiriman
                </h2>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{trf.status.toUpperCase()}</Badge>
                  {trf.shipping_cost > 0 && (
                    <Badge variant="outline">
                      Ongkir: {formatRupiah(trf.shipping_cost)}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>{new Date(trf.created_at).toLocaleDateString("id-ID")}</p>
                <p>Created by: {trf.creator?.full_name}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                  Dari (Sumber)
                </h3>
                <div className="p-3 bg-slate-50 rounded border">
                  <p className="font-bold text-slate-800">
                    {trf.source?.name || "-"}
                  </p>
                  <p className="text-sm text-slate-600 mt-1 flex gap-2">
                    <MapPin className="h-4 w-4" /> {trf.source?.address}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                  Ke (Tujuan)
                </h3>
                <div className="p-3 bg-slate-50 rounded border">
                  <p className="font-bold text-slate-800">
                    {trf.target?.name || "-"}
                  </p>
                  <p className="text-sm text-slate-600 mt-1 flex gap-2">
                    <MapPin className="h-4 w-4" /> {trf.target?.address}
                  </p>
                </div>
              </div>
            </div>

            <h3 className="font-bold text-slate-800 mb-4">Rincian Barang</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Produk</th>
                    <th className="px-4 py-3 text-center">Dikirim</th>
                    <th className="px-4 py-3 text-center">Diterima</th>
                    <th className="px-4 py-3 text-center">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.products?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.products?.sku}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {trf.status.includes("received")
                          ? item.qty_received
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground text-xs uppercase">
                        {item.products?.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-yellow-50 p-4 rounded text-sm text-yellow-800 border border-yellow-100">
              <strong>Catatan:</strong> {trf.notes || "Tidak ada catatan."}
            </div>
          </CardContent>
        </Card>

        {/* --- MODALS (APPROVE, REJECT, DLL) TETAP DI SINI --- */}
        <Dialog open={approveSourceModal} onOpenChange={setApproveSourceModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Proses Permintaan Stok</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label className="mb-2 block">Ambil Barang Dari:</Label>
              <select
                className="w-full p-2 border rounded mb-4"
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.is_main_warehouse && "(Pusat)"}
                  </option>
                ))}
              </select>
              <div className="mt-4">
                <Label>Biaya Ongkir Real</Label>
                <div className="flex items-center mt-2">
                  <span className="bg-slate-100 border border-r-0 border-slate-300 px-3 py-2 rounded-l text-sm text-slate-600">
                    Rp
                  </span>
                  <Input
                    type="number"
                    className="rounded-l-none"
                    value={approvalShippingCost}
                    onChange={(e) => setApprovalShippingCost(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              {parseFloat(approvalShippingCost) > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
                  <Label className="text-blue-800 font-bold mb-2 block">
                    Sumber Dana Pembayaran:
                  </Label>
                  <div className="space-y-2">
                    <label
                      className={`flex items-center p-3 border rounded cursor-pointer ${fundSource === "HO_BCA" ? "bg-white border-blue-500" : "bg-slate-50"}`}
                    >
                      <input
                        type="radio"
                        name="fundSource"
                        value="HO_BCA"
                        checked={fundSource === "HO_BCA"}
                        onChange={(e) => setFundSource(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-bold text-sm">
                          Bank Pusat (BCA)
                        </div>
                      </div>
                    </label>
                    <label
                      className={`flex items-center p-3 border rounded cursor-pointer ${fundSource === "BRANCH_CASH" ? "bg-white border-green-500" : "bg-slate-50"}`}
                    >
                      <input
                        type="radio"
                        name="fundSource"
                        value="BRANCH_CASH"
                        checked={fundSource === "BRANCH_CASH"}
                        onChange={(e) => setFundSource(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-bold text-sm">Cash Cabang</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setApproveSourceModal(false)}
              >
                Batal
              </Button>
              <Button onClick={confirmSendRequest} disabled={processing}>
                <Truck className="mr-2 h-4 w-4" /> Kirim
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={sendDialog} onOpenChange={setSendDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Konfirmasi Kirim</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label>Biaya Ongkir Real</Label>
              <div className="flex items-center mt-2">
                <span className="bg-slate-100 border border-r-0 border-slate-300 px-3 py-2 rounded-l text-sm">
                  Rp
                </span>
                <Input
                  type="number"
                  className="rounded-l-none"
                  value={approvalShippingCost}
                  onChange={(e) => setApprovalShippingCost(e.target.value)}
                  placeholder="0"
                />
              </div>
              {parseFloat(approvalShippingCost) > 0 && (
                /* Copy paste logic sumber dana sama kayak diatas */
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
                  <Label className="text-blue-800 font-bold mb-2 block">
                    Sumber Dana:
                  </Label>
                  <div className="space-y-2">
                    <label
                      className={`flex items-center p-3 border rounded cursor-pointer ${fundSource === "HO_BCA" ? "bg-white border-blue-500" : "bg-slate-50"}`}
                    >
                      <input
                        type="radio"
                        name="fundSourceSend"
                        value="HO_BCA"
                        checked={fundSource === "HO_BCA"}
                        onChange={(e) => setFundSource(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-bold text-sm">Bank Pusat</div>
                      </div>
                    </label>
                    <label
                      className={`flex items-center p-3 border rounded cursor-pointer ${fundSource === "BRANCH_CASH" ? "bg-white border-green-500" : "bg-slate-50"}`}
                    >
                      <input
                        type="radio"
                        name="fundSourceSend"
                        value="BRANCH_CASH"
                        checked={fundSource === "BRANCH_CASH"}
                        onChange={(e) => setFundSource(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-bold text-sm">Cash Cabang</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSendDialog(false)}>
                Batal
              </Button>
              <Button onClick={confirmManualSend} disabled={processing}>
                Ya, Kirim
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600">Tolak Request</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Label>Alasan</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog(false)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={confirmReject}
                disabled={processing}
              >
                Tolak
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Konfirmasi Loss</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Label>Alasan/Kronologi</Label>
              <Textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAdjustModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={confirmAdjust}
                disabled={processing}
              >
                Konfirmasi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ReceiveTransferModal
          isOpen={!!receiveModal}
          onClose={() => setReceiveModal(null)}
          transferData={receiveModal}
          onSuccess={fetchDetail}
        />
      </div>

      {/* --- AREA CETAK (TEMPLATE BARU) - HIDDEN PAS LAYAR BIASA --- */}
      <DeliveryNoteTemplate
        data={trf}
        items={items}
        settings={authState.pengaturan}
      />
    </>
  );
}
