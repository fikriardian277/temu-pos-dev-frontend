import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { DollarSign, Save, Search, UserCog, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";

const formatRupiah = (val) => "Rp " + Number(val || 0).toLocaleString("id-ID");

export default function SalarySettingsPage() {
  const { authState } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [salaryValues, setSalaryValues] = useState({}); // { component_id: amount }
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (authState.business_id) {
      fetchEmployees();
      fetchComponents();
    }
  }, [authState.business_id]);

  // 1. Fetch Master Data
  const fetchEmployees = async () => {
    setLoading(true);
    // Pake View biar ada nama cabang
    const { data } = await supabase
      .schema("hr")
      .from("view_employees")
      .select("*")
      .eq("business_id", authState.business_id)
      .eq("status", "active")
      .order("name");
    setEmployees(data || []);
    setLoading(false);
  };

  const fetchComponents = async () => {
    // Ambil komponen yg butuh setting (Fixed & Variable)
    // Deduction biasanya input manual pas payroll run (kasbon), tapi kalau ada potongan rutin (BPJS) bisa diset disini juga.
    const { data } = await supabase
      .schema("hr")
      .from("salary_components")
      .select("*")
      .eq("business_id", authState.business_id)
      .order("type", { ascending: false });
    setComponents(data || []);
  };

  // 2. Open Modal & Fetch Existing Settings
  const openSettingModal = async (emp) => {
    setSelectedEmp(emp);
    setSalaryValues({}); // Reset dulu

    // Ambil settingan gaji dia yg udah ada di DB
    const { data } = await supabase
      .schema("hr")
      .from("employee_salary_settings")
      .select("component_id, amount")
      .eq("employee_id", emp.id);

    // Convert array ke object biar gampang mapping { 1: 3000000, 2: 20000 }
    const existingVals = {};
    if (data) {
      data.forEach((item) => {
        existingVals[item.component_id] = item.amount;
      });
    }
    setSalaryValues(existingVals);
  };

  // 3. Save Logic
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Siapin data buat di-upsert (Insert or Update)
      const upsertData = Object.keys(salaryValues).map((compId) => ({
        employee_id: selectedEmp.id,
        component_id: parseInt(compId),
        amount: parseFloat(salaryValues[compId]) || 0,
      }));

      if (upsertData.length > 0) {
        const { error } = await supabase
          .schema("hr")
          .from("employee_salary_settings")
          .upsert(upsertData, { onConflict: "employee_id, component_id" });

        if (error) throw error;
      }

      toast.success(`Gaji ${selectedEmp.name} berhasil diset!`);
      setSelectedEmp(null); // Tutup modal
    } catch (e) {
      toast.error("Gagal simpan: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter UI
  const filteredList = employees.filter((e) =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 w-full space-y-6 pb-20">
      <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
        <UserCog className="text-green-600" /> Setting Gaji Karyawan
      </h1>

      <div className="flex gap-4 items-center bg-white p-3 rounded border max-w-md">
        <Search className="h-4 w-4 text-slate-400" />
        <Input
          placeholder="Cari Nama Karyawan..."
          className="border-none focus-visible:ring-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredList.map((emp) => (
          <Card
            key={emp.id}
            className="hover:border-green-400 transition-all cursor-pointer group"
            onClick={() => openSettingModal(emp)}
          >
            <CardContent className="p-5 flex justify-between items-center">
              <div>
                <p className="font-bold text-lg text-slate-800">{emp.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{emp.branch_name}</Badge>
                  <span className="text-xs text-slate-400 font-mono">
                    {emp.nik}
                  </span>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="group-hover:bg-green-50 text-green-600"
              >
                <DollarSign className="w-5 h-5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MODAL SETTING */}
      <Dialog open={!!selectedEmp} onOpenChange={() => setSelectedEmp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Atur Gaji: {selectedEmp?.name}</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-5 max-h-[60vh] overflow-y-auto pr-2">
            {components.length === 0 ? (
              <p className="text-center text-slate-400 italic">
                Belum ada komponen gaji. Bikin dulu di menu Komponen.
              </p>
            ) : (
              components.map((comp) => (
                <div key={comp.id} className="grid gap-1.5">
                  <Label className="flex justify-between">
                    <span>{comp.name}</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] uppercase"
                    >
                      {comp.type}
                    </Badge>
                  </Label>

                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">
                      Rp
                    </span>
                    <Input
                      type="number"
                      className="pl-10 font-mono font-bold"
                      placeholder="0"
                      value={salaryValues[comp.id] || ""}
                      onChange={(e) =>
                        setSalaryValues({
                          ...salaryValues,
                          [comp.id]: e.target.value,
                        })
                      }
                    />
                  </div>

                  {comp.type === "variable" && (
                    <p className="text-xs text-slate-500">
                      * Ini adalah <b>Rate (Tarif)</b> per satuan. Nanti dikali
                      jumlah {comp.excel_column_name || "Qty"}.
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEmp(null)}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Simpan Settingan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
