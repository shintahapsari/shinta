import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export default function AuditLog() {
  const { t } = useLang();
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/audit").then(({ data }) => setLogs(data)); }, []);
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-2">{t("audit_sub")}</div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900"><ShieldCheck className="w-8 h-8"/>{t("audit_title")}</h1>
      </div>
      <div className="space-y-2">
        {logs.map((l, i) => (
          <Card key={i} className="glass-card border-slate-200"><CardContent className="p-4 text-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-emerald-700 text-xs">{l.timestamp?.slice(0, 19)}</div>
              <Badge className="bg-slate-50 border border-slate-200 text-slate-500 text-[10px]">CORRECTION</Badge>
            </div>
            <div className="text-slate-700"><strong>{l.admin}</strong> {t("corrected_batch")} <span className="font-mono text-emerald-700">{l.batch_id}</span></div>
            <div className="text-xs text-slate-500 mt-1">{t("reason_label")}: {l.reason}</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-rose-50 border border-rose-200"><div className="text-rose-700 text-[10px] uppercase mb-1">{t("before")}</div><pre className="text-slate-700 font-mono">{JSON.stringify(l.before, null, 2)}</pre></div>
              <div className="p-2 rounded bg-emerald-50 border border-emerald-200"><div className="text-emerald-700 text-[10px] uppercase mb-1">{t("after")}</div><pre className="text-slate-700 font-mono">{JSON.stringify(l.after, null, 2)}</pre></div>
            </div>
            <div className="hash-text text-slate-500 mt-2">{l.block_hash}</div>
          </CardContent></Card>
        ))}
        {logs.length === 0 && <div className="text-center text-slate-500 py-12">{t("no_corrections")}</div>}
      </div>
    </div>
  );
}
