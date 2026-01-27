import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function MismatchLogPage() {
  const { authState } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Resolve Modal
  const [resolveModal, setResolveModal] = useState(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchMismatch = useCallback(async () => {
    if (!authState.business_id) return;
    setLoading(true);
    try {
      // 1. Ambil Data Discrepancy (TANPA JOIN BRANCHES BIAR GAK ERROR)
      const { data: rawData, error } = await supabase
        .schema("finance")
        .from("daily_reconciliations")
        .select("*")
        .eq("business_id", authState.business_id)
        .eq("status", "discrepancy") // Filter Status
        .order("recon_date", { ascending: false });

      if (error) throw error;

      // 2. Manual Fetch Nama Cabang
      if (rawData && rawData.length > 0) {
        const branchIds = [...new Set(rawData.map((i) => i.branch_id))];
        const { data: bData } = await supabase
          .from("branches")
          .select("id, name")
          .in("id", branchIds);

        const branchMap = {};
        bData?.forEach((b) => (branchMap[b.id] = b.name));

        const merged = rawData.map((item) => ({
          ...item,
          branch_name: branchMap[item.branch_id] || "Unknown Branch",
        }));
        setList(merged);
      } else {
        setList([]);
      }
    } catch (e) {
      console.error("Error fetching mismatch:", e);
      toast.error("Gagal memuat data log.");
    } finally {
      setLoading(false);
    }
  }, [authState.business_id]);

  useEffect(() => {
    fetchMismatch();
  }, [fetchMismatch]);

  // HANDLE RESOLVE
  const handleResolve = async (action) => {
    if (!reason.trim())
      return toast.error("Wajib isi catatan/alasan penyelesaian.");

    setProcessing(true);
    try {
      const { error } = await supabase.rpc("resolve_reconciliation", {
        p_recon_id: resolveModal.id,
        p_user_id: authState.user.id,
        p_business_id: authState.business_id,
        p_action: action, // 'accept_actual' atau 'accept_system'
        p_notes: reason,
      });

      if (error) throw error;
      toast.success("Masalah terselesaikan (Resolved).");
      setResolveModal(null);
      fetchMismatch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 pb-20">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-red-600">
            Mismatch Log
          </h1>
          <p className="text-muted-foreground">
            Daftar selisih keuangan yang perlu investigasi.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-10">Memuat Log...</div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900">
              Semua Bersih!
            </h3>
            <p className="text-muted-foreground">
              Tidak ada selisih yang menggantung.
            </p>
          </div>
        ) : (
          list.map((item) => {
            // Hitung ulang variance biar aman
            const target =
              item.payment_method === "Cash"
                ? item.system_amount
                : item.net_system_amount;
            const variance = Number(item.actual_amount) - Number(target);

            return (
              <Card key={item.id} className="border-red-200 bg-red-50/30">
                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* INFO */}
                  <div className="w-full md:w-1/3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className="bg-white border-red-200 text-red-700"
                      >
                        {new Date(item.recon_date).toLocaleDateString("id-ID")}
                      </Badge>
                      <Badge variant="secondary">{item.payment_method}</Badge>
                    </div>
                    <div className="font-bold text-lg">{item.branch_name}</div>
                    <p className="text-xs text-red-600 mt-1 font-bold uppercase bg-red-100 px-2 py-1 rounded w-fit">
                      Selisih: {formatRupiah(variance)}
                    </p>
                  </div>

                  {/* ANGKA PERBANDINGAN */}
                  <div className="flex-1 flex items-center justify-center gap-6 text-sm bg-white/60 p-3 rounded-lg border border-dashed border-red-200">
                    <div className="text-center">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">
                        Target (System)
                      </p>
                      <p className="font-mono font-bold text-lg text-slate-600">
                        {formatRupiah(target)}
                      </p>
                    </div>
                    <ArrowRight className="text-red-300" />
                    <div className="text-center">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">
                        Actual (Bank)
                      </p>
                      <p className="font-mono font-bold text-lg text-slate-900">
                        {formatRupiah(item.actual_amount)}
                      </p>
                    </div>
                  </div>

                  {/* AKSI */}
                  <div className="w-full md:w-1/4 text-right">
                    <Button
                      variant="destructive"
                      className="w-full shadow-sm"
                      onClick={() => {
                        setResolveModal(item);
                        setReason("");
                      }}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" /> Investigasi
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* MODAL RESOLVE */}
      <Dialog open={!!resolveModal} onOpenChange={() => setResolveModal(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Selesaikan Selisih
            </DialogTitle>
            <DialogDescription>
              Pilih angka mana yang akan dianggap <b>BENAR (Final)</b> untuk
              pembukuan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-slate-100 rounded text-sm space-y-2 border">
              <div className="flex justify-between">
                <span>Target System:</span>{" "}
                <b>
                  {formatRupiah(
                    resolveModal
                      ? resolveModal.payment_method === "Cash"
                        ? resolveModal.system_amount
                        : resolveModal.net_system_amount
                      : 0
                  )}
                </b>
              </div>
              <div className="flex justify-between">
                <span>Actual Bank:</span>{" "}
                <b>{formatRupiah(resolveModal?.actual_amount)}</b>
              </div>
              <div className="border-t border-slate-300 pt-1 mt-1 flex justify-between text-red-600 font-bold">
                <span>Selisih:</span>{" "}
                <span>
                  {formatRupiah(
                    (resolveModal?.actual_amount || 0) -
                      (resolveModal
                        ? resolveModal.payment_method === "Cash"
                          ? resolveModal.system_amount
                          : resolveModal.net_system_amount
                        : 0)
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Catatan Investigasi / Solusi{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                className="min-h-[80px]"
                placeholder="Contoh: Potongan admin bank belum tercatat, atau Human Error kasir..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setResolveModal(null)}>
              Batal
            </Button>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button
                className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                onClick={() => handleResolve("accept_actual")}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Pakai Angka Bank"
                )}
              </Button>
              <Button
                className="bg-slate-800 hover:bg-slate-900 flex-1 sm:flex-none"
                onClick={() => handleResolve("accept_system")}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Pakai Angka Sistem"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
