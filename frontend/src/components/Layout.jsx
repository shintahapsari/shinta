import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { NAV, ROLE_LABELS, INSTITUTION_SHORT } from "@/lib/constants";
import NotificationBell from "@/components/NotificationBell";
import { Sprout, LogOut, Menu, X, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function Logo({ compact }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F5A623] to-[#FFC72C] flex items-center justify-center shadow-lg shrink-0">
        <Sprout className="w-6 h-6 text-[#0B2545]" strokeWidth={2.5} />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display font-extrabold text-white text-sm">Kemitraan TIP</div>
          <div className="text-[10px] text-slate-300">Universitas Jember</div>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV.filter((n) => n.roles.includes(user.role));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-white/10">
        <Logo />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scroll-thin">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={`nav-${item.to.replace("/", "")}`}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-[#F5A623] text-[#0B2545] shadow-md"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-white/10">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Peran Aktif</div>
        <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#FFC72C] border border-[#F5A623]/40">
          {ROLE_LABELS[user.role]}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 sidebar-gradient fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 sidebar-gradient">
            <button
              className="absolute top-4 right-4 text-white"
              onClick={() => setMobileOpen(false)}
              data-testid="close-mobile-menu"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-20 backdrop-blur-md bg-white/85 border-b border-slate-200">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
            <button
              className="lg:hidden text-slate-700"
              onClick={() => setMobileOpen(true)}
              data-testid="open-mobile-menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display font-bold text-[#0B2545] text-sm sm:text-base truncate">
                Sistem Terintegrasi Kemitraan Teknologi Industri Pertanian
              </h1>
              <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                Fakultas Teknologi Pertanian · Universitas Jember
              </p>
            </div>
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="user-menu-trigger"
                  className="flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-xs font-bold">
                    {(user.name || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-xs text-slate-500 font-normal">{user.username || user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="logout-button" className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto animate-fade-up">
          {children}
        </main>
        <footer className="px-6 py-4 text-center text-[11px] text-slate-400 border-t border-slate-200">
          {INSTITUTION_SHORT} · © {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
