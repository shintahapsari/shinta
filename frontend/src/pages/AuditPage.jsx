import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { ScrollText, Search, Loader2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ACTION_STYLE = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-blue-100 text-blue-700",
  REVISE: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
  APPROVAL: "bg-violet-100 text-violet-700",
  LOGIN: "bg-slate-100 text-slate-600",
};

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (entity !== "all") params.entity_type = entity;
      const { data } = await api.get("/audit-logs", { params });
      setLogs(data);
    } catch { /* */ } finally { setLoading(false); }
  }, [q, entity]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0B2545] flex items-center gap-2">
          <ScrollText className="w-7 h-7 text-[#F5A623]" /> Audit Trail
        </h2>
        <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Log immutable — setiap aksi tercatat permanen.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input data-testid="audit-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari user, aksi, detail…" className="pl-10 bg-white" />
        </div>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger data-testid="audit-entity-filter" className="w-[180px] bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Entitas</SelectItem>
            {["partner", "document", "implementation", "user", "auth"].map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Waktu</th>
                <th className="px-4 py-3 font-semibold">Pengguna</th>
                <th className="px-4 py-3 font-semibold">Aksi</th>
                <th className="px-4 py-3 font-semibold">Entitas</th>
                <th className="px-4 py-3 font-semibold">Detail</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#0B2545] mx-auto" /></td></tr>}
              {!loading && logs.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-400">Tidak ada log.</td></tr>}
              {!loading && logs.map((l, idx) => (
                <tr key={l.id} data-testid={`audit-row-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap font-mono">{new Date(l.timestamp).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3"><div className="font-medium text-slate-700">{l.user_name}</div><div className="text-xs text-slate-400">{l.role}</div></td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded ${ACTION_STYLE[l.action] || "bg-slate-100 text-slate-600"}`}>{l.action}</span></td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{l.entity_type}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{l.detail}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400 font-mono">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
