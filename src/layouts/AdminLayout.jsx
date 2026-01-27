import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  LogOut,
  UserCircle,
  Menu,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { menuConfig } from "@/lib/menuConfig.jsx";

import { Button } from "@/components/ui/Button.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown-menu";

// --- SIDEBAR ITEM COMPONENT ---
// Menangani item single link maupun parent accordion
const SidebarItem = ({ item, currentPath, onNavigate, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Deteksi apakah item ini atau anaknya sedang aktif
  const isActiveParent =
    item.children && item.children.some((child) => child.to === currentPath);

  const isExactActive = item.to === currentPath;

  // Auto-open accordion jika anak aktif
  useEffect(() => {
    if (isActiveParent) {
      setIsOpen(true);
    }
  }, [isActiveParent]);

  // Style dasar untuk link/button
  // Level 0 (Main Item) vs Level 1 (Sub Item)
  const baseClasses = `
    group flex items-center w-full rounded-md transition-all duration-200
    ${level === 0 ? "px-3 py-2.5 mb-1" : "px-3 py-2 mt-1"}
    text-sm font-medium
  `;

  // --- RENDERING PARENT (ACCORDION) ---
  if (item.children) {
    return (
      <div className="w-full mb-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            ${baseClasses} justify-between
            ${
              isActiveParent
                ? "bg-primary/10 text-primary" // Parent aktif (ada anak terpilih)
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }
          `}
        >
          <div className="flex items-center gap-3">
            {/* Icon hanya untuk Level 0 */}
            {item.icon && (
              <span
                className={`flex-shrink-0 ${
                  isActiveParent
                    ? "text-primary"
                    : "text-slate-500 group-hover:text-slate-700"
                }`}
              >
                {item.icon}
              </span>
            )}
            <span className="truncate">{item.label}</span>
          </div>
          {/* Chevron dengan rotasi */}
          <ChevronRight
            size={16}
            className={`transition-transform duration-200 opacity-50 ${
              isOpen ? "rotate-90" : ""
            }`}
          />
        </button>

        {/* Container Anak */}
        <div
          className={`
            overflow-hidden transition-all duration-300 ease-in-out
            ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}
          `}
        >
          <div className="pl-4 ml-3 border-l border-slate-200 my-1 space-y-1">
            {item.children.map((child) => (
              <SidebarItem
                key={child.key}
                item={child}
                currentPath={currentPath}
                onNavigate={onNavigate}
                level={level + 1}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING SINGLE LINK (CHILD ATAU MAIN MENU TANPA ANAK) ---
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) => `
        ${baseClasses} gap-3
        ${
          isActive
            ? level === 0
              ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" // Aktif Level 0 (Solid)
              : "bg-primary/10 text-primary font-semibold" // Aktif Level 1 (Soft)
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900" // Tidak Aktif
        }
      `}
    >
      {/* Icon hanya muncul di Level 0, atau jika Level 1 punya icon sendiri (opsional) */}
      {item.icon && level === 0 && (
        <span
          className={`flex-shrink-0 ${
            isExactActive
              ? "text-primary-foreground"
              : "text-slate-500 group-hover:text-slate-700"
          }`}
        >
          {item.icon}
        </span>
      )}

      <span className="truncate">{item.label}</span>
    </NavLink>
  );
};

// --- SIDEBAR CONTENT ---
const SidebarContent = ({ navItems, currentPath, onNavigate }) => (
  <div className="flex flex-col h-full bg-card">
    {/* LOGO AREA - Fixed Height & Sticky */}
    <div className="h-16 flex items-center px-6 border-b shrink-0 bg-card/50 backdrop-blur-sm sticky top-0 z-10 gap-3">
      {/* Balikin Logo Gambar */}
      <img src="/logo.png" alt="Logo" className="h-8 w-8 flex-shrink-0" />

      {/* Balikin Nama App */}
      <h1 className="text-lg font-bold text-primary whitespace-nowrap tracking-tight">
        SuperApp
      </h1>
    </div>

    {/* SCROLLABLE MENU AREA */}
    <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
      <nav className="space-y-1">
        {navItems.map((item, index) => {
          // Render Section Header
          if (item.isHeader) {
            return (
              <div
                key={item.key}
                className={`px-3 flex items-center ${
                  index === 0 ? "mb-2" : "mt-6 mb-2"
                }`}
              >
                <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                  {item.label}
                </span>
                <div className="ml-3 h-px bg-border flex-1 opacity-50"></div>
              </div>
            );
          }

          // Render Menu Item
          return (
            <SidebarItem
              key={item.key}
              item={item}
              currentPath={currentPath}
              onNavigate={onNavigate}
            />
          );
        })}
      </nav>
    </div>

    {/* FOOTER AREA (Opsional: Copyright) */}
    <div className="p-4 border-t text-center text-xs text-muted-foreground shrink-0 bg-card/30">
      <p>&copy; {new Date().getFullYear()} SuperApp</p>
    </div>
  </div>
);

// --- MAIN LAYOUT ---
function AdminLayout() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { authState, logout } = useAuth();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Filter Menu berdasarkan Role
  const filterMenu = (items) => {
    return items
      .filter((item) => !item.roles || item.roles.includes(authState.role))
      .map((item) => {
        if (item.children) {
          const filteredChildren = filterMenu(item.children);
          // Tampilkan parent jika punya anak ATAU jika dia header section yang valid
          if (filteredChildren.length === 0 && !item.isHeader) return null;
          return { ...item, children: filteredChildren };
        }
        return item;
      })
      .filter(Boolean);
  };

  const navItems = filterMenu(menuConfig);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-slate-50/50 dark:bg-background font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:block w-[260px] border-r bg-white dark:bg-card shadow-sm z-30 shrink-0">
        <SidebarContent
          navItems={navItems}
          currentPath={location.pathname}
          onNavigate={() => {}}
        />
      </aside>

      {/* MOBILE SIDEBAR (DRAWER) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          isMobileSidebarOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileSidebarOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileSidebarOpen(false)}
        />
        {/* Sidebar Panel */}
        <aside
          className={`absolute top-0 left-0 h-full w-[280px] bg-card shadow-2xl transform transition-transform duration-300 ${
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarContent
            navItems={navItems}
            currentPath={location.pathname}
            onNavigate={() => setIsMobileSidebarOpen(false)}
          />
        </aside>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* TOP HEADER */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white/80 dark:bg-background/80 backdrop-blur-md border-b sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-500 hover:text-slate-700"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu size={24} />
            </Button>

            {/* Breadcrumb Sederhana / Judul Halaman */}
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white capitalize tracking-tight">
                {location.pathname.split("/")[1]?.replace(/-/g, " ") ||
                  "Dashboard"}
              </h2>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <UserCircle size={20} />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold leading-tight text-slate-800 dark:text-slate-200">
                      {authState.full_name || "User"}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium capitalize">
                      {authState.role?.replace("_", " ")}
                    </p>
                  </div>
                  <ChevronDown
                    size={14}
                    className="text-slate-400 hidden md:block"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mt-2" align="end">
                <DropdownMenuLabel className="font-normal text-xs text-muted-foreground uppercase tracking-wider">
                  My Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate("/akun")}
                  className="cursor-pointer"
                >
                  <UserCircle className="mr-2 h-4 w-4" /> Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="cursor-pointer"
                >
                  {theme === "dark" ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-black/20 custom-scrollbar">
          {/* HAPUS 'max-w-7xl mx-auto' DISINI BIAR FULL WIDTH */}
          <div className="w-full min-h-full animate-in fade-in slide-in-from-bottom-3 duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
