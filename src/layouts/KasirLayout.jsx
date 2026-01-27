import React from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { menuConfig } from "@/lib/menuConfig.jsx";
import { LogOut, UserCircle, Sun, Moon, Users } from "lucide-react"; // Tambah Icon Users

import { Button } from "@/components/ui/Button.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown-menu";

// Fungsi Penyetrika Menu (Sama kayak sebelumnya)
const getFlatMenu = (items) => {
  let flat = [];
  items.forEach((item) => {
    if (item.children) {
      flat = [...flat, ...getFlatMenu(item.children)];
    } else if (item.to && !item.isHeader) {
      flat.push(item);
    }
  });
  return flat;
};

const NavItem = ({ to, icon, label, isMainButton = false }) => {
  // Fallback icon kalau undefined biar gak crash
  if (!icon && !label) return null;

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center w-full text-center py-1 transition-colors duration-200 ${
          isMainButton
            ? `h-16 w-16 rounded-full shadow-lg -mt-8 ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground border"
              }`
            : `text-xs ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`
        }`
      }
    >
      {/* Clone element biar bisa atur size, kalau icon valid */}
      {React.isValidElement(icon)
        ? React.cloneElement(icon, { size: isMainButton ? 32 : 24 })
        : null}
      {!isMainButton && <span className="mt-1 text-[10px]">{label}</span>}
    </NavLink>
  );
};

function KasirLayout() {
  const navigate = useNavigate();
  const { authState, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // 1. Ambil Menu Flat & Filter Role
  const allFlatMenus = getFlatMenu(menuConfig);
  const navItems = allFlatMenus.filter((item) =>
    item.roles.includes(authState.role || "kasir")
  );

  const kasirButton = navItems.find((item) => item.to === "/kasir");
  const getIcon = (path) => navItems.find((i) => i.to === path)?.icon;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50 text-foreground font-sans">
      {/* --- SIDEBAR (DESKTOP) --- */}
      <aside className="hidden md:flex md:w-64 bg-card border-r flex-col shadow-sm fixed h-full z-20">
        <div className="p-4 h-16 flex items-center gap-3 border-b bg-card">
          <img src="/logo.png" alt="Logo" className="h-8 w-8 flex-shrink-0" />
          <h1 className="text-lg font-extrabold text-primary tracking-tight whitespace-nowrap">
            POS LAUNDRY
          </h1>
        </div>

        <nav className="flex-grow px-3 py-4 overflow-y-auto scrollbar-thin">
          <ul className="space-y-1">
            {navItems?.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to}>
                  {({ isActive }) => (
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`w-full justify-start gap-3 font-medium ${
                        isActive
                          ? "bg-primary/10 text-primary hover:bg-primary/15"
                          : "text-slate-600"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Button>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-3 mt-auto border-t bg-slate-50/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-start gap-3 p-2 h-auto hover:bg-white border border-transparent hover:border-slate-200"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <UserCircle size={20} />
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-sm font-semibold truncate text-slate-800">
                    {authState.full_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {authState.role}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="start" side="top">
              <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate("/akun")}>
                Pengaturan Akun
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                Ganti Tema
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleLogout}
                className="text-destructive"
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* --- KONTEN UTAMA --- */}
      <main className="flex-1 flex flex-col w-full md:pl-64 transition-all duration-300">
        {/* 👇 DISINI PERBAIKAN PADDING (MEPET) 👇 */}
        <div className="flex-grow overflow-y-auto pb-24 md:pb-8 px-4 py-4 md:px-8 md:py-6 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* --- BOTTOM NAVIGATION BAR (MOBILE) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50 grid grid-cols-5 items-center h-16 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {/* 1. Dashboard (Home) */}
        <NavItem to="/dashboard" icon={getIcon("/dashboard")} label="Home" />

        {/* 2. Proses */}
        <NavItem to="/proses" icon={getIcon("/proses")} label="Proses" />

        {/* 3. Kasir (Tengah Gede) */}
        <div className="relative flex justify-center">
          {kasirButton ? (
            <NavItem
              to="/kasir"
              icon={kasirButton.icon}
              label=""
              isMainButton
            />
          ) : (
            <div className="w-16"></div>
          )}
        </div>

        {/* 4. Pelanggan (GANTI DARI RIWAYAT KE PELANGGAN) */}
        <NavItem
          to="/pelanggan"
          icon={getIcon("/pelanggan")}
          label="Pelanggan"
        />

        {/* 5. Akun */}
        <NavItem to="/akun" icon={<UserCircle />} label="Akun" />
      </nav>
    </div>
  );
}

export default KasirLayout;
