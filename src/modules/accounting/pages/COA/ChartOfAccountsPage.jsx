import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import {
  Plus,
  Search,
  Loader2,
  X,
  Save,
  RefreshCw,
  FileText,
  Pencil, // Icon Edit
  Trash2, // Icon Delete
  CheckCircle, // Icon Aktif
  XCircle, // Icon Non-Aktif (opsional jika mau fitur toggle)
} from "lucide-react";

const ChartOfAccountsPage = () => {
  // --- KONSTANTA ---
  const BUSINESS_ID = 2; // Hardcode dulu, nanti ambil dari session

  // --- STATE ---
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // State untuk Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State Mode Edit
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "asset",
    normal_balance: "debit",
  });

  // --- 1. FETCH DATA ---
  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .schema("accounting")
        .from("coa")
        .select("*")
        .eq("business_id", BUSINESS_ID)
        .order("code", { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error:", error);
      alert("Gagal ambil data COA.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // --- 2. HANDLER EDIT (PREPARE DATA) ---
  const handleEdit = (account) => {
    setIsEditMode(true);
    setEditId(account.id);
    setFormData({
      code: account.code,
      name: account.name,
      type: account.type,
      normal_balance: account.normal_balance,
    });
    setIsModalOpen(true);
  };

  // --- 3. HANDLER DELETE ---
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus akun "${name}"?`)) return;

    try {
      const { error } = await supabase
        .schema("accounting")
        .from("coa")
        .delete()
        .eq("id", id);

      if (error) throw error;

      alert("Akun berhasil dihapus.");
      fetchAccounts(); // Refresh
    } catch (error) {
      console.error("Error deleting:", error);
      alert(
        "Gagal menghapus! (Mungkin akun ini sudah dipakai di transaksi lain)"
      );
    }
  };

  // --- 4. HANDLER SIMPAN (CREATE / UPDATE) ---
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Validasi
      if (!formData.code || !formData.name) {
        alert("Kode dan Nama wajib diisi!");
        setIsSaving(false);
        return;
      }

      // Cek Duplikasi Kode (Hanya jika Create, atau jika Edit tapi kode berubah)
      // Logic ini disederhanakan: kalau edit mode, kita skip cek duplikasi dulu biar cepat
      if (!isEditMode) {
        const { data: existing } = await supabase
          .schema("accounting")
          .from("coa")
          .select("id")
          .eq("business_id", BUSINESS_ID)
          .eq("code", formData.code)
          .single();

        if (existing) {
          alert("Kode Akun sudah ada!");
          setIsSaving(false);
          return;
        }
      }

      let error;

      if (isEditMode) {
        // --- LOGIC UPDATE ---
        const { error: updateError } = await supabase
          .schema("accounting")
          .from("coa")
          .update({
            code: formData.code,
            name: formData.name,
            type: formData.type,
            normal_balance: formData.normal_balance,
          })
          .eq("id", editId);
        error = updateError;
      } else {
        // --- LOGIC INSERT ---
        const { error: insertError } = await supabase
          .schema("accounting")
          .from("coa")
          .insert([
            {
              business_id: BUSINESS_ID,
              code: formData.code,
              name: formData.name,
              type: formData.type,
              normal_balance: formData.normal_balance,
              is_active: true,
              created_at: new Date().toISOString(),
            },
          ]);
        error = insertError;
      }

      if (error) throw error;

      alert(isEditMode ? "Akun berhasil diupdate!" : "Akun berhasil dibuat!");
      closeModal();
      fetchAccounts();
    } catch (error) {
      console.error("Error saving:", error);
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- HELPER ---
  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      type: "asset",
      normal_balance: "debit",
    });
    setIsEditMode(false);
    setEditId(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const filteredAccounts = accounts.filter(
    (acc) =>
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-blue-600" />
            Chart of Accounts (COA)
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Master Data Akun (Schema: Accounting.COA)
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={18} />
          <span>Tambah Akun</span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Cari Kode atau Nama..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <button
          onClick={fetchAccounts}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Refresh Data"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 w-32">Kode</th>
                <th className="px-6 py-3">Nama Akun</th>
                <th className="px-6 py-3">Tipe</th>
                <th className="px-6 py-3">Saldo Normal</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <Loader2
                      className="animate-spin text-blue-500 inline-block mr-2"
                      size={20}
                    />
                    Loading...
                  </td>
                </tr>
              ) : filteredAccounts.length > 0 ? (
                filteredAccounts.map((account) => (
                  <tr
                    key={account.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-medium text-blue-600">
                      {account.code}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {account.name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border uppercase ${
                          account.type === "asset"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : account.type === "liability"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : account.type === "equity"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : account.type === "revenue"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-orange-50 text-orange-700 border-orange-200"
                        }`}
                      >
                        {account.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 capitalize">
                      {account.normal_balance}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {account.is_active ? (
                        <div className="flex items-center justify-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium border border-green-100">
                          <CheckCircle size={12} /> Aktif
                        </div>
                      ) : (
                        <span className="text-gray-400 bg-gray-100 px-2 py-1 rounded-full text-xs border">
                          Non-Aktif
                        </span>
                      )}
                    </td>

                    {/* --- KOLOM AKSI (YANG DIUBAH) --- */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        {/* Tombol Edit */}
                        <button
                          onClick={() => handleEdit(account)}
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          title="Edit Akun"
                        >
                          <Pencil size={16} />
                        </button>

                        {/* Tombol Delete */}
                        <button
                          onClick={() => handleDelete(account.id, account.name)}
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                          title="Hapus Akun"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL FORM --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">
                {isEditMode ? "Edit Akun" : "Tambah Akun Baru"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kode Akun <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  placeholder="Contoh: 1-1001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Akun <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Contoh: Bank BCA"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipe Akun
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saldo Normal
                  </label>
                  <select
                    value={formData.normal_balance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        normal_balance: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  {isEditMode ? "Update" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartOfAccountsPage;
