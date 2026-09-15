import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Bell, CheckCheck, AlertTriangle, Info, ClipboardCheck } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const ICONS = { warning: AlertTriangle, approval: ClipboardCheck, info: Info };
const COLORS = { warning: "text-amber-600 bg-amber-50", approval: "text-blue-600 bg-blue-50", info: "text-slate-600 bg-slate-100" };

export default function NotificationBell() {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      setData(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const markAll = async () => {
    await api.post("/notifications/read-all");
    load();
  };
  const markOne = async (id) => {
    await api.post(`/notifications/${id}/read`);
    load();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button data-testid="notification-bell" className="relative p-2 rounded-full hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          {data.unread > 0 && (
            <span data-testid="notification-unread-badge" className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F5A623] text-[#0B2545] text-[10px] font-bold flex items-center justify-center">
              {data.unread}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display text-[#0B2545]">Notifikasi</SheetTitle>
            <Button variant="ghost" size="sm" onClick={markAll} data-testid="mark-all-read" className="text-xs">
              <CheckCheck className="w-4 h-4 mr-1" /> Tandai semua
            </Button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scroll-thin">
          {data.items.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-12">Belum ada notifikasi</p>
          )}
          {data.items.map((n) => {
            const Icon = ICONS[n.type] || Info;
            return (
              <button
                key={n.id}
                data-testid="notification-item"
                onClick={() => markOne(n.id)}
                className={`w-full text-left flex gap-3 px-5 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors ${n.is_read ? "opacity-60" : ""}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${COLORS[n.type] || COLORS.info}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{n.title}</span>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#F5A623]" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
