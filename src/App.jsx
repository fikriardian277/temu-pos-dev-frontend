// src/App.jsx

import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./context/AuthContext";

// Impor semua halamanmu
import RoleBasedLayout from "./layouts/RoleBasedLayout.jsx";
import LoginPage from "./modules/auth/pages/LoginPage.jsx";
import RegisterPage from "./modules/auth/pages/RegisterPage.jsx";
import DashboardPage from "./modules/dashboard/DashboardPage.jsx";
import LayananManagementPage from "./modules/admin/pages/LayananManagementPage.jsx";
import UserManagementPage from "./modules/admin/pages/UserManagementPage.jsx";
import CabangManagementPage from "./modules/admin/pages/CabangManagementPage.jsx";
import PelangganManagementPage from "./modules/admin/pages/PelangganManagementPage.jsx";
import KasirPage from "./modules/pos/pages/KasirPage";
import ProsesPage from "./modules/pos/pages/Proses/ProsesPage";
import RiwayatPage from "./modules/pos/pages/RiwayatPage.jsx";
import AkunPage from "./modules/account/pages/AkunPage.jsx";

import PesananPage from "./modules/pos/pages/PesananPage.jsx";
import PengaturanUsahaPage from "./modules/admin/pages/PengaturanUsahaPage.jsx";
import RiwayatDetailPage from "./modules/pos/pages/RiwayatDetailPage.jsx";
import HotelLaundryPage from "./modules/pos/pages/HotelLaundryPage";
import IdentitasBisnisPage from "./modules/admin/pages/IdentitasBisnisPage";
import PrintPage from "./modules/pos/pages/PrintPage";
import MasterProdukPage from "./modules/inventory/pages/MasterProdukPage";
import MasterGudangPage from "./modules/inventory/pages/MasterGudangPage";
import MasterSupplierPage from "./modules/inventory/pages/MasterSupplierPage";
import PurchaseOrderPage from "./modules/inventory/pages/PurchaseOrderPage";
import CreatePOPage from "./modules/inventory/pages/CreatePOPage";
import StockInventoryPage from "./modules/inventory/pages/StockInventoryPage";
import PODetailPage from "./modules/inventory/pages/PODetailPage";
import TransferPage from "./modules/inventory/pages/TransferPage";
import CreateTransferPage from "./modules/inventory/pages/CreateTransferPage";
import TransferDetailPage from "./modules/inventory/pages/TransferDetailPage";
import StockMovementPage from "./modules/inventory/pages/StockMovementPage.jsx";
import CreateUsagePage from "./modules/inventory/pages/CreateUsagePage";
import UsageHistoryPage from "./modules/inventory/pages/UsageHistoryPage";
import CreateAdjustmentPage from "./modules/inventory/pages/CreateAdjustmentPage";
import AdjustmentPage from "./modules/inventory/pages/AdjustmentPage";
import MasterAkunPage from "./modules/finance/pages/MasterAkunPage";
import MasterKategoriPage from "./modules/finance/pages/MasterKategoriPage";
import CashSubmissionPage from "./modules/finance/pages/CashSubmissionPage";
import ReconciliationPage from "./modules/finance/pages/ReconciliationPage";
import MismatchLogPage from "./modules/finance/pages/MismatchLogPage";
import CancellationApprovalPage from "./modules/finance/pages/CancellationApprovalPage";
import TransferReconciliationPage from "@/modules/finance/pages/TransferReconciliation";

// --- PERBAIKAN INVENTORY ---
import HotelInvoicePage from "./modules/inventory/pages/HotelInvoicePage";
// Pastikan folder 'component' atau 'components' sesuai nama aslimu!
// Disini saya pakai 'component' sesuai info kamu sebelumnya.
import HotelInvoiceDetailPage from "./modules/inventory/components/HotelInvoiceDetailPage";

import SupplierPayablePage from "./modules/finance/pages/SupplierPayablePage";
import ExpenseReconciliationPage from "./modules/finance/pages/ExpenseReconciliation";
import PettyCashRequestPage from "./modules/finance/pages/PettyCash/PettyCashRequestPage";
import PettyCashApprovalPage from "./modules/finance/pages/PettyCash/PettyCashApprovalPage";
import ExpenseRequestPage from "./modules/finance/pages/Expenses/ExpenseRequestPage";
import ExpenseApprovalPage from "./modules/finance/pages/Expenses/ExpenseApprovalPage";
import EmployeesPage from "./modules/hr/pages/Employees/EmployeesPage";
import SalaryComponentsPage from "./modules/hr/pages/Components/SalaryComponentsPage";
import SalarySettingsPage from "./modules/hr/pages/SalarySettings/SalarySettingsPage";
import PayrollRunPage from "./modules/hr/pages/Payroll/PayrollRunPage";
import PayrollDetailPage from "./modules/hr/pages/Payroll/PayrollDetailPage";

import PromoSettingsTab from "./modules/admin/pages/components/PromoSettingsTab.jsx";
import LaporanPenjualan from "./modules/laporan/pages/LaporanPenjualan.jsx";
import LaporanPengeluaran from "./modules/laporan/pages/LaporanPengeluaran";
import LaporanLabaRugi from "./modules/laporan/pages/LaporanLabaRugi";
import LaporanCashFlow from "./modules/laporan/pages/LaporanCashFlow";
import LaporanPiutang from "./modules/laporan/pages/LaporanPiutang";
import LaporanOperasional from "./modules/laporan/pages/LaporanOperasional";
import ManagementFeePage from "./modules/finance/pages/ManagementFeePage.jsx";
import AssetPage from "./modules/finance/pages/AssetPage";
import ChartOfAccountsPage from "./modules/accounting/pages/COA/ChartOfAccountsPage.jsx";
import AccountMappingPage from "./modules/accounting/pages/Mapping/AccountMappingPage.jsx";
import GeneralLedgerPage from "./modules/accounting/pages/Ledger/GeneralLedgerPage.jsx";
import ClosingBookPage from "./modules/accounting/pages/Closing/ClosingBookPage.jsx";
import GoodsReceiptPage from "./modules/inventory/pages/GoodsReceiptPage";
import LaporanNeraca from "./modules/laporan/pages/LaporanNeraca";
import LaporanHutang from "./modules/laporan/pages/LaporanHutang";
import LaporanValuasiStok from "./modules/laporan/pages/LaporanValuasiStok";

// Templates (Opsional jika mau diakses langsung via URL untuk testing)
import DeliveryNoteTemplate from "./components/documents/DeliveryNoteTemplate";
import PurchaseOrderTemplate from "./components/documents/PurchaseOrderTemplate";
import HotelInvoiceTemplate from "./components/documents/HotelInvoiceTemplate";

function ProtectedLayout() {
  const { authState } = useAuth();
  if (!authState.isReady) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  if (!authState.user) {
    return <Navigate to="/login" replace />;
  }
  return <RoleBasedLayout />;
}

function PublicLayout() {
  const { authState } = useAuth();
  if (!authState.isReady) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  if (authState.user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "akun", element: <AkunPage /> },
      { path: "riwayat", element: <RiwayatPage /> },
      { path: "riwayat/:kode_invoice", element: <RiwayatDetailPage /> },
      { path: "kasir", element: <KasirPage /> },
      { path: "proses", element: <ProsesPage /> },
      { path: "pelanggan", element: <PelangganManagementPage /> },
      { path: "layanan", element: <LayananManagementPage /> },
      { path: "users", element: <UserManagementPage /> },
      { path: "cabang", element: <CabangManagementPage /> },

      { path: "pesanan", element: <PesananPage /> },
      { path: "pengaturan-usaha", element: <PengaturanUsahaPage /> },
      { path: "laundry-hotel", element: <HotelLaundryPage /> },
      { path: "identitas-bisnis", element: <IdentitasBisnisPage /> },

      // === MODULE INVENTORY ===
      { path: "/inventory/products", element: <MasterProdukPage /> },
      { path: "/inventory/warehouses", element: <MasterGudangPage /> },
      { path: "/inventory/suppliers", element: <MasterSupplierPage /> },
      { path: "/inventory/purchase-orders", element: <PurchaseOrderPage /> },
      { path: "/inventory/purchase-orders/create", element: <CreatePOPage /> },
      { path: "/inventory/purchase-orders/:id", element: <PODetailPage /> },
      { path: "/inventory/goods-receipt", element: <GoodsReceiptPage /> },
      { path: "/inventory/stocks", element: <StockInventoryPage /> },
      { path: "/inventory/transfers", element: <TransferPage /> },
      { path: "/inventory/transfers/create", element: <CreateTransferPage /> },
      { path: "/inventory/transfers/:id", element: <TransferDetailPage /> },
      { path: "/inventory/history", element: <StockMovementPage /> },
      { path: "/inventory/usage", element: <UsageHistoryPage /> },
      { path: "/inventory/usage/create", element: <CreateUsagePage /> },
      { path: "/inventory/adjustments", element: <AdjustmentPage /> },
      {
        path: "/inventory/adjustments/create",
        element: <CreateAdjustmentPage />,
      },

      // --- RUTE HOTEL INVOICE (FIXED) ---
      // Pastikan route ini MATCH dengan navigate() di halaman List
      { path: "/inventory/hotel-invoices", element: <HotelInvoicePage /> },
      {
        path: "/inventory/hotel-invoices/:id",
        element: <HotelInvoiceDetailPage />,
      },

      // === MODULE FINANCE ===
      { path: "/finance/accounts", element: <MasterAkunPage /> },
      { path: "/finance/categories", element: <MasterKategoriPage /> },
      { path: "/finance/cash-in", element: <CashSubmissionPage /> },
      { path: "/finance/reconciliation", element: <ReconciliationPage /> },
      { path: "/finance/mismatch-log", element: <MismatchLogPage /> },
      {
        path: "/cancellation-approvals",
        element: <CancellationApprovalPage />,
      },
      {
        path: "/finance/transfer-reconciliation",
        element: <TransferReconciliationPage />,
      },
      { path: "/finance/supplier-payables", element: <SupplierPayablePage /> },
      {
        path: "/finance/expense-reconciliation",
        element: <ExpenseReconciliationPage />,
      },
      {
        path: "/finance/petty-cash-requests",
        element: <PettyCashRequestPage />,
      },
      {
        path: "/finance/petty-cash-approvals",
        element: <PettyCashApprovalPage />,
      },
      {
        path: "/finance/expenses",
        element: <Navigate to="/finance/expenses/request" replace />,
      },
      { path: "/finance/expenses/request", element: <ExpenseRequestPage /> },
      { path: "/finance/expenses/approval", element: <ExpenseApprovalPage /> },
      { path: "/finance/management-fee", element: <ManagementFeePage /> },
      { path: "/finance/assets", element: <AssetPage /> },

      // === MODULE HR ===
      { path: "/hr/employees", element: <EmployeesPage /> },
      { path: "/hr/components", element: <SalaryComponentsPage /> },
      { path: "/hr/settings", element: <SalarySettingsPage /> },
      { path: "/hr/payroll", element: <PayrollRunPage /> },
      { path: "/hr/payroll/:id", element: <PayrollDetailPage /> },

      // === MODULE ACCOUNTING & REPORTS ===
      { path: "/promo-settings", element: <PromoSettingsTab /> },
      { path: "/laporan/penjualan", element: <LaporanPenjualan /> },
      { path: "/laporan/pengeluaran", element: <LaporanPengeluaran /> },
      { path: "/laporan/laba-rugi", element: <LaporanLabaRugi /> },
      { path: "/laporan/cashflow", element: <LaporanCashFlow /> },
      { path: "/laporan/piutang", element: <LaporanPiutang /> },
      { path: "/laporan/operasional", element: <LaporanOperasional /> },
      { path: "/laporan/neraca", element: <LaporanNeraca /> },
      { path: "/laporan/hutang", element: <LaporanHutang /> },
      { path: "/laporan/valuasi-stok", element: <LaporanValuasiStok /> },

      { path: "/accounting/coa", element: <ChartOfAccountsPage /> },
      { path: "/accounting/mapping", element: <AccountMappingPage /> },
      { path: "/accounting/ledger", element: <GeneralLedgerPage /> },
      { path: "/accounting/closing", element: <ClosingBookPage /> },

      // Templates Testing (Optional)
      { path: "/delivery-note-template", element: <DeliveryNoteTemplate /> },
      { path: "/purchase-order-template", element: <PurchaseOrderTemplate /> },
      { path: "/hotel-invoice-template", element: <HotelInvoiceTemplate /> },
    ],
  },
  {
    path: "/print-struk",
    element: <PrintPage />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
