import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCode2 } from "lucide-react";

export default function SmartContracts() {
  const { t } = useLang();
  const [contracts, setContracts] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/contracts").then(({ data }) => setContracts(data));
    api.get("/contracts/logs?limit=100").then(({ data }) => setLogs(data));
    const t = setInterval(() => api.get("/contracts/logs?limit=100").then(({ data }) => setLogs(data)), 8000);
    return () => clearInterval(t);
  }, []);

  const resultColor = (r) => {
    if (["PASSED", "AUTHORIZED"].includes(r)) return "bg-emerald-100 border-emerald-300 text-emerald-700";
    if (["HOLD", "WARNING"].includes(r)) return "bg-amber-100 border-amber-300 text-amber-700";
    return "bg-rose-100 border-rose-300 text-rose-700";
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-2">Smart Contract Engine (rules-based)</div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900"><FileCode2 className="w-8 h-8"/>{t("contracts_title")}</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {contracts.map((c) => (
          <Card key={c.id} className="glass-card border-slate-200" data-testid={`contract-${c.id}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="text-xs font-mono uppercase tracking-widest text-emerald-700">{c.id}</div>
                <Badge className="bg-emerald-100 border border-emerald-300 text-emerald-700 text-[10px]">ACTIVE</Badge>
              </div>
              <div className="font-semibold text-sm">{c.name}</div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{c.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card border-slate-200"><CardContent className="p-6">
        <div className="text-xs font-mono uppercase tracking-widest text-cyan-700 mb-4">Live Console (Auto-refresh 8s)</div>
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto font-mono text-xs bg-slate-50 rounded-lg p-4 border border-slate-200">
          {logs.map((l, i) => (
            <div key={i} className="flex gap-3 items-center py-1 border-b border-slate-200 last:border-0">
              <span className="text-slate-500 text-[10px] w-40 shrink-0">{l.timestamp?.slice(11, 19)}</span>
              <span className="text-emerald-700 w-16 shrink-0">{l.contract_id}</span>
              <Badge className={`${resultColor(l.result)} border text-[10px] shrink-0`}>{l.result}</Badge>
              <span className="text-slate-600 truncate">{l.detail}</span>
              <span className="text-slate-600 shrink-0 text-[10px]">{l.batch_id}</span>
            </div>
          ))}
          {logs.length === 0 && <div className="text-slate-500 text-center py-8">Belum ada eksekusi smart contract.</div>}
        </div>
      </CardContent></Card>
    </div>
  );
}
