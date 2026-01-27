import ManagementFeePage from "@/modules/finance/pages/ManagementFeePage";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  UserCircle,
  Store,
  PackageSearch,
  History,
  Building2,
  ShoppingCart,
  Wallet,
  Tags,
  RefreshCw,
  BarChart3,
  Boxes,
  Briefcase,
  BookOpen,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpCircle,
  AlertTriangle,
  Activity,
  User,
  FileText,
} from "lucide-react";

export const menuConfig = [
  // =========================================
  // 1. DASHBOARD (MAIN)
  // =========================================
  {
    key: "main_section",
    label: "MAIN",
    isHeader: true,
    // Sesuai Gambar: Admin Pusat, Kasir (Finance & Branch biasanya juga butuh, kita buka semua)
    roles: ["owner", "admin_branch", "finance", "kasir"],
  },
  {
    key: "dashboard",
    label: "Dashboard",
    to: "/dashboard",
    icon: <LayoutDashboard size={20} />,
    roles: ["owner", "admin_branch", "finance", "kasir"],
  },

  // =========================================
  // 2. OPERATIONS (FRONT OFFICE) - KHUSUS KASIR
  // =========================================
  {
    key: "ops_section",
    label: "OPERATIONS",
    isHeader: true,
    roles: ["kasir"], // Sesuai Gambar: Hanya Kasir
  },
  {
    key: "pos_system",
    label: "Point of Sales (POS)",
    to: "/kasir",
    icon: <PackageSearch size={20} />,
    roles: ["kasir"],
  },
  {
    key: "daily_transactions",
    label: "Daily Transactions",
    icon: <History size={20} />,
    roles: ["kasir"],
    children: [
      {
        key: "trx_history",
        label: "Transaction History", // Riwayat Transaksi
        to: "/riwayat",
        roles: ["kasir"],
      },
      {
        key: "production_process",
        label: "Production Process", // Proses
        to: "/proses",
        icon: <ClipboardList size={20} />,
        roles: ["kasir"],
      },
      {
        key: "b2b_entry",
        label: "Input Hotel", // Input Hotel
        to: "/laundry-hotel",
        roles: ["kasir"],
      },
    ],
  },

  // =========================================
  // 3. INVENTORY & LOGISTICS
  // =========================================
  {
    key: "inventory_section",
    label: "INVENTORY & LOGISTICS",
    isHeader: true,
    roles: ["owner", "admin_branch"],
  },
  {
    key: "catalog_mgmt",
    label: "Catalog Management",
    icon: <Tags size={20} />,
    roles: ["owner"], // Sesuai Gambar: Admin Pusat
    children: [
      {
        key: "products",
        label: "Product Master",
        to: "/inventory/products",
        roles: ["owner"],
      },
      {
        key: "services",
        label: "Manajemen Layanan",
        to: "/layanan",
        roles: ["owner"],
      },
    ],
  },
  {
    key: "stock_control",
    label: "Stock Control",
    icon: <Boxes size={20} />,
    roles: ["owner", "admin_branch"],
    children: [
      {
        key: "warehouses",
        label: "Warehouses",
        to: "/inventory/warehouses",
        roles: ["owner"], // Admin Pusat
      },
      {
        key: "stock_report",
        label: "Stock Levels",
        to: "/inventory/stocks",
        roles: ["owner", "admin_branch"], // Pusat & Branch
      },
      {
        key: "stock_movement",
        label: "Movement History",
        to: "/inventory/history",
        roles: ["owner", "admin_branch"], // Pusat & Branch
      },
      {
        key: "stock_transfer",
        label: "Stock Transfer",
        to: "/inventory/transfers",
        roles: ["owner", "admin_branch"], // Pusat & Branch
      },
      {
        key: "stock_usage",
        label: "Material Usage",
        to: "/inventory/usage",
        roles: ["admin_branch", "owner"], // Sesuai Gambar: Hanya Admin Branch
      },
      {
        key: "stock_opname",
        label: "Stock Opname/Adj.",
        to: "/inventory/adjustments",
        roles: ["owner", "admin_branch"], // Pusat & Branch
      },
    ],
  },
  {
    key: "procurement",
    label: "Procurement",
    icon: <ShoppingCart size={20} />,
    roles: ["owner", "admin_branch", "finance"],
    children: [
      {
        key: "suppliers",
        label: "Supplier Data",
        to: "/inventory/suppliers",
        roles: ["owner"], // Admin Pusat
      },
      {
        key: "purchase_orders",
        label: "Purchase Orders (PO)",
        to: "/inventory/purchase-orders",
        roles: ["owner", "admin_branch", "finance"], // Pusat & Branch
      },
      {
        key: "goods_receipt",
        label: "Goods Receipt (GR)",
        to: "/inventory/goods-receipt",
        roles: ["owner", "admin_branch"], // Pusat & Branch
      },
      {
        key: "invoices",
        label: "Hotel Invoices",
        to: "/inventory/hotel-invoices",
        roles: ["owner"], // Sesuai Gambar: Admin Pusat
      },
    ],
  },

  // =========================================
  // 4. FINANCE & ACCOUNTING
  // =========================================
  {
    key: "finance_section",
    label: "FINANCE & ACCOUNTING",
    isHeader: true,
    roles: ["owner", "finance", "admin_branch"],
  },
  {
    key: "treasury",
    label: "Treasury",
    icon: <Wallet size={20} />,
    roles: ["owner", "finance", "admin_branch"],
    children: [
      {
        key: "accounts",
        label: "Cash & Bank Account",
        to: "/finance/accounts",
        roles: ["finance"], // Sesuai Gambar: Finance
      },
      {
        key: "cash_inflow",
        label: "Cash Deposit",
        to: "/finance/cash-in",
        roles: ["finance", "admin_branch"], // Sesuai Gambar: Finance
      },
      {
        key: "cost_categories",
        label: "Cost Categories",
        to: "/finance/categories",
        roles: ["finance"], // Sesuai Gambar: Finance
      },
      {
        key: "supplier_payables",
        label: "Supplier Payable",
        to: "/finance/supplier-payables",
        roles: ["finance"], // Sesuai Gambar: Finance
      },
      {
        key: "assets",
        label: "Asset Management",
        to: "/finance/assets", // Route baru
        roles: ["owner", "finance"], // Owner buat Request, Finance buat Approve
      },
      {
        key: "petty_cash_requests",
        label: "Pettycash Request",
        to: "/finance/petty-cash-requests",
        roles: ["admin_branch"], // Sesuai Gambar: Admin Branch
      },
      {
        key: "petty_cash_approvals",
        label: "Pettycash Approval",
        to: "/finance/petty-cash-approvals",
        roles: ["finance"], // Sesuai Gambar: Finance
      },
      {
        key: "expense_request",
        label: "Input Biaya Ops",
        to: "/finance/expenses/request",
        roles: ["owner"], // Sesuai Gambar: Admin Pusat
      },
      {
        key: "expense_approval",
        label: "Approval & Bayar Ops",
        to: "/finance/expenses/approval",
        roles: ["finance"], // Sesuai Gambar: Finance
      },

      {
        key: "management_fee",
        label: "Management Fee",
        to: "/finance/management-fee",
        roles: ["finance"],
        element: <ManagementFeePage />,
      },
    ],
  },

  {
    key: "reconciliation_group",
    label: "Reconciliation",
    icon: <RefreshCw size={20} />,
    roles: ["finance"], // Sesuai Gambar: Semua Recon ada di Finance
    children: [
      {
        key: "sales_recon",
        label: "Sales & Settlement Recon",
        to: "/finance/reconciliation",
        roles: ["finance"],
      },
      {
        key: "transfer_recon",
        label: "Transfer Matching",
        to: "/finance/transfer-reconciliation",
        roles: ["finance"],
      },
      {
        key: "expense_reconciliation",
        label: "Expense Recon",
        to: "/finance/expense-reconciliation",
        roles: ["finance"],
      },
      {
        key: "mismatch_log",
        label: "Mismatch Investigation",
        to: "/finance/mismatch-log",
        roles: ["finance"],
      },
    ],
  },

  {
    key: "accounting",
    label: "Accounting",
    icon: <FileText size={20} />,
    roles: ["finance"],
    children: [
      {
        key: "chart_of_accounts",
        label: "Chart of Accounts (COA)",
        to: "/accounting/coa",
        roles: ["finance"],
      },
      {
        key: "account_mapping",
        label: "Account Mapping",
        to: "/accounting/mapping", // URL baru
        roles: ["finance"],
      },
      {
        key: "general_ledger",
        label: "General Ledger", // Atau "Jurnal Umum"
        to: "/accounting/ledger",
        roles: ["owner", "finance"],
      },
      {
        key: "closing_book",
        label: "Period Closing",
        to: "/accounting/closing",
        roles: ["owner", "finance"], // Fitur sensitif, batasi role
      },
    ],
  },

  // =========================================
  // 5. HUMAN RESOURCES (HR) - DI FINANCE
  // =========================================
  {
    key: "hr_section",
    label: "HUMAN RESOURCES",
    isHeader: true,
    roles: ["finance"], // Sesuai Gambar: Finance pegang HR
  },
  {
    key: "hr_management",
    label: "HR & Payroll",
    icon: <Briefcase size={20} />,
    roles: ["finance"],
    children: [
      {
        key: "hr_employees",
        label: "Data Karyawan",
        to: "/hr/employees",
        roles: ["finance"],
      },
      {
        key: "hr_components",
        label: "Komponen Gaji",
        to: "/hr/components",
        roles: ["finance"],
      },
      {
        key: "hr_settings",
        label: "Setting Gaji",
        to: "/hr/settings",
        roles: ["finance"],
      },
      {
        key: "hr_payroll",
        label: "Proses Gaji",
        to: "/hr/payroll",
        roles: ["finance"],
      },
    ],
  },

  // =========================================
  // 6. CRM & SALES
  // =========================================
  {
    key: "crm_section",
    label: "CRM & SALES",
    isHeader: true,
    roles: ["owner", "admin_branch", "kasir"],
  },
  {
    key: "sales_mgmt",
    label: "Sales Management",
    icon: <ClipboardList size={20} />,
    roles: ["owner", "admin_branch"],
    children: [
      {
        key: "all_orders",
        label: "All Order Overview",
        to: "/pesanan",
        roles: ["owner", "admin_branch"], // Sesuai Gambar: Pusat & Branch
      },
    ],
  },
  {
    key: "customer_mgmt",
    label: "Customer Base",
    to: "/pelanggan",
    icon: <Users size={20} />,
    roles: ["owner", "admin_branch", "kasir"], // Sesuai Gambar: Pusat, Branch, Kasir
  },

  // =========================================
  // 7. ADMINISTRATION & SETTINGS (PUSAT)
  // =========================================
  {
    key: "admin_section",
    label: "ADMINISTRATION",
    isHeader: true,
    roles: ["owner"], // Admin Pusat
  },
  {
    key: "company_settings",
    label: "Business Settings",
    icon: <Building2 size={20} />,
    roles: ["owner"],
    children: [
      {
        key: "branches",
        label: "Branch Management",
        to: "/cabang",
        roles: ["owner"],
      },
      {
        key: "business_profile",
        label: "Business Profile",
        to: "/pengaturan-usaha",
        roles: ["owner"],
      },
      {
        key: "receipt_branding",
        label: "Receipt Branding",
        to: "/identitas-bisnis",
        roles: ["owner"],
      },
    ],
  },
  {
    key: "user_access",
    label: "User Access",
    icon: <UserCircle size={20} />,
    roles: ["owner"],
    children: [
      {
        key: "staff_list",
        label: "Staff Management",
        to: "/users",
        roles: ["owner"],
      },
      {
        key: "approvals",
        label: "Approval Request",
        to: "/cancellation-approvals",
        roles: ["owner"], // Sesuai Gambar: Admin Pusat
      },
    ],
  },

  // =========================================
  // 8. REPORTS (PUSAT ONLY)
  // =========================================
  {
    key: "analytics_section",
    label: "REPORTS & ANALYTICS",
    isHeader: true,
    roles: ["owner", "finance"], // Sesuai Gambar: Hanya Admin Pusat
  },
  {
    key: "reports",
    label: "Business Reports",
    icon: <BarChart3 size={20} />,
    roles: ["owner", "finance"],
    children: [
      {
        key: "sales_report",
        label: "Sales Report",
        to: "/laporan/penjualan",
        icon: <TrendingUp size={18} />,
        roles: ["owner", "finance"],
      },
      {
        key: "expense_report",
        label: "Expense Report",
        to: "/laporan/pengeluaran",
        icon: <TrendingDown size={18} />,
        roles: ["owner", "finance"],
      },
      {
        key: "pnl_report",
        label: "Profit & Loss",
        to: "/laporan/laba-rugi",
        icon: <DollarSign size={18} />,
        roles: ["owner", "finance"],
      },
      {
        key: "balance_sheet_report",
        label: "Balance Sheet",
        to: "/laporan/neraca",
        icon: <BookOpen size={18} />,
        roles: ["owner", "finance"],
      },
      {
        key: "cashflow_report",
        label: "Cash Flow",
        to: "/laporan/cashflow",
        icon: <ArrowUpCircle size={18} />,
        roles: ["owner", "finance"],
      },
      {
        key: "ar_report",
        label: "Account Receivable",
        to: "/laporan/piutang",
        icon: <AlertTriangle size={18} />,
        roles: ["owner", "finance"],
      },
      {
        key: "ap_report",
        label: "Account Payable",
        to: "/laporan/hutang",
        icon: <User size={18} />,
        roles: ["owner", "finance"],
      },
      {
        key: "stock_valuation_report",
        label: "Stock Valuation",
        to: "/laporan/valuasi-stok",
        icon: <Boxes size={18} />,
        roles: ["owner", "finance"],
      },
      {
        key: "ops_report",
        label: "Operational & Audit",
        to: "/laporan/operasional",
        icon: <Activity size={18} />,
        roles: ["owner", "finance"],
      },
    ],
  },
];
