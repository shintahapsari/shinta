import React, { useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { Button } from "@/components/ui/button";
import {
  Leaf, LayoutDashboard, Sprout, Boxes, Factory, Truck, Store, Search,
  Blocks, FileCode2, Activity, AlertTriangle, ShieldCheck, Users, LogOut, BarChart3, QrCode, Languages
} from "lucide-react";

const NAV = [
  { to: "/", key: "nav_dashboard", icon: LayoutDashboard, roles: "all" },
  { to: "/harvest", key: "nav_harvest", icon: Sprout, roles: ["farmer", "admin"] },
  { to: "/collection", key: "nav_collection", icon: Boxes, roles: ["collector", "admin"] },
  { to: "/production", key: "nav_production", icon: Factory, roles: ["manufacturer", "admin"] },
  { to: "/shipment", key: "nav_shipment", icon: Truck, roles: ["distributor", "admin"] },
  { to: "/sales", key: "nav_sales", icon: Store, roles: ["retailer", "admin"] },
  { to: "/trace", key: "nav_trace", icon: Search, roles: "all" },
  { to: "/explorer", key: "nav_explorer", icon: Blocks, roles: "all" },
  { to: "/contracts", key: "nav_contracts", icon: FileCode2, roles: "all" },
  { to: "/quality", key: "nav_quality", icon: Activity, roles: "all" },
  { to: "/exceptions", key: "nav_exceptions", icon: AlertTriangle, roles: "all" },
  { to: "/analytics", key: "nav_analytics", icon: BarChart3, roles: ["admin"] },
  { to: "/audit", key: "nav_audit", icon: ShieldCheck, roles: ["admin"] },
  { to: "/users", key: "nav_users", icon: Users, roles: ["admin"] },
];

const ROLE_LABEL_ID = { admin: "Admin / Management", farmer: "Petani Tembakau", collector: "Pengepul", manufacturer: "Pabrik / Produsen", distributor: "Distributor", retailer: "Ritel" };
const ROLE_LABEL_EN = { admin: "Admin / Management", farmer: "Tobacco Farmer", collector: "Collector", manufacturer: "Manufacturer", distributor: "Distributor", retailer: "Retailer" };

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useLang();
  const nav = useNavigate();
  const seenExceptions = useRef(new Set());
  const initialized = useRef(false);
  const allowed = NAV.filter((n) => n.roles === "all" || n.roles.includes(user?.role));
  const roleLabel = (lang === "id" ? ROLE_LABEL_ID : ROLE_LABEL_EN)[user?.role];

  useEffect(() => {
    if (user?.role !== "admin") return;
    let cancelled = false;
    const poll = async () => {
      try {
        const { data } = await api.get("/exceptions?status=open");
        if (cancelled) return;
        if (!initialized.current) {
          data.forEach((e) => seenExceptions.current.add(e._id));
          initialized.current = true;
          return;
        }
        data.forEach((e) => {
          if (!seenExceptions.current.has(e._id)) {
            seenExceptions.current.add(e._id);
            const sev = e.severity || "medium";
            const title = lang === "id"
              ? `Anomali baru terdeteksi (${sev.toUpperCase()})`
              : `New anomaly detected (${sev.toUpperCase()})`;
            const desc = `${e.batch_id || ""} · ${e.message}`;
            if (sev === "critical" || sev === "high") toast.error(title, { description: desc, duration: 8000 });
            else toast.warning(title, { description: desc, duration: 8000 });
          }
        });
      } catch (err) {}
    };
    poll();
    const timer = setInterval(poll, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [user?.role, lang]);

  return (
    <div className="min-h-screen flex text-slate-900">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 h-screen flex flex-col">
        <div className="p-5 border-b border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight text-slate-900">Sintesa</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-700">Tembakau Nusantara</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {allowed.map((item) => {
            const Icon = item.icon;
            const label = t(item.key);
            return (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2 rounded-lg bg-emerald-50/60 border border-emerald-100 mb-2">
            <div className="text-xs font-semibold text-slate-900 truncate">{user?.name}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 truncate">{roleLabel}</div>
            <div className="text-[10px] text-slate-500 truncate">{user?.company}</div>
          </div>
          <Button data-testid="logout-button" variant="ghost" onClick={async () => { await logout(); nav("/login"); }} className="w-full justify-start text-slate-600 hover:text-rose-600 hover:bg-rose-50">
            <LogOut className="w-4 h-4 mr-2" /> {t("logout")}
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 chain-node-active" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500">{t("net_status")}: <span className="text-emerald-700">{t("healthy")}</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <button data-testid="lang-toggle-button" onClick={toggle} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-emerald-500/50 uppercase tracking-wider text-slate-600 hover:text-emerald-700 transition-all shadow-sm">
              <Languages className="w-3.5 h-3.5" /> {lang === "id" ? "EN" : "ID"}
            </button>
            <NavLink to="/verify" target="_blank" className="text-emerald-700 hover:text-emerald-600 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
              <QrCode className="w-3.5 h-3.5" /> {t("consumer_portal")}
            </NavLink>
          </div>
        </header>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
