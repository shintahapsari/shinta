import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sprout, Boxes, Factory, Truck, Store, ShieldCheck, AlertTriangle, Package2 } from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_STYLE = {
  verified: "bg-emerald-50 border-emerald-300 text-emerald-800",
  pending: "bg-amber-50 border-amber-300 text-amber-800",
  exception: "bg-rose-50 border-rose-300 text-rose-800",
};
const STAGE_ICON = { Petani: Sprout, Farmer: Sprout, Pengepul: Boxes, Collector: Boxes, Pabrik: Factory, Manufacturer: Factory, Distributor: Truck, Ritel: Store, Retailer: Store };

function Kpi({ icon: Icon, label, value, hint, color = "emerald" }) {
  return (
    <Card className="glass-card hover:-translate-y-0.5 transition-all">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg bg-${color}-100 border border-${color}-200 flex items-center justify-center`}>
            <Icon className={`w-5 h-5 text-${color}-700`} />
          </div>
          {hint && <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">{hint}</span>}
        </div>
        <div className="text-3xl font-bold tracking-tight text-slate-900">{value}</div>
        <div className="text-xs text-slate-500 mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [stats, setStats] = useState(null);
  const [ledger, setLedger] = useState(null);

  useEffect(() => {
    api.get("/stats/dashboard").then(({ data }) => setStats(data));
    api.get("/ledger/stats").then(({ data }) => setLedger(data));
  }, []);

  if (!stats) return <div className="text-slate-500 font-mono">Loading ledger data...</div>;

  const stageLabel = (s) => {
    if (lang === "en") {
      const map = { Petani: "Farmer", Pengepul: "Collector", Pabrik: "Manufacturer", Distributor: "Distributor", Ritel: "Retailer" };
      return map[s] || s;
    }
    return s;
  };

  return (
    <div className="space-y-8" data-testid="dashboard-root">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-2">{t("welcome")}, {user?.name}</div>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">{t("dashboard_title")}</h1>
        <p className="text-slate-600 text-sm mt-2">{t("dashboard_sub")}</p>
      </div>

      <Card className="glass-card">
        <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">{t("block_height")}</div>
            <div className="text-2xl font-bold text-emerald-700">#{ledger?.block_height ?? 0}</div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">{t("latency")}</div>
            <div className="text-2xl font-bold text-slate-900">{ledger?.avg_block_time_ms}ms</div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">{t("validators2")}</div>
            <div className="text-2xl font-bold text-slate-900">{ledger?.active_validators} / 3</div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">{t("data_sync")}</div>
            <Badge className="bg-emerald-100 border border-emerald-300 text-emerald-800">{t("synced")}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Sprout} label={t("active_harvests")} value={stats.active_harvests} hint="HB" />
        <Kpi icon={Boxes} label={t("collections")} value={stats.collections} hint="CB" color="amber" />
        <Kpi icon={Factory} label={t("production_batches")} value={stats.production_batches} hint="PB" color="blue" />
        <Kpi icon={Truck} label={t("shipments")} value={stats.shipments} hint="SB" color="purple" />
        <Kpi icon={Store} label={t("retail_batches")} value={stats.retail_batches} hint="RB" color="cyan" />
        <Kpi icon={Package2} label={t("trace_records")} value={stats.traceability_records} hint="BLOCKS" />
        <Kpi icon={ShieldCheck} label={t("quality_compliance")} value={`${stats.quality_compliance_pct}%`} color="emerald" />
        <Kpi icon={AlertTriangle} label={t("open_exceptions")} value={stats.open_exceptions} color={stats.open_exceptions > 0 ? "rose" : "emerald"} />
      </div>

      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-emerald-700">{t("supply_chain")}</div>
              <h3 className="text-lg font-semibold mt-1 text-slate-900">{t("journey")}</h3>
            </div>
            <Link to="/trace" data-testid="trace-shortcut" className="text-xs text-emerald-700 hover:text-emerald-600 font-mono">{t("search_batch")}</Link>
          </div>
          <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
            {stats.supply_chain_stages.map((s, i) => {
              const Icon = STAGE_ICON[s.stage] || Sprout;
              const cls = STATUS_STYLE[s.status] || STATUS_STYLE.pending;
              return (
                <React.Fragment key={s.stage}>
                  <div className={`flex-1 min-w-[140px] p-4 rounded-xl border ${cls}`}>
                    <Icon className="w-5 h-5 mb-2" />
                    <div className="text-xs font-mono uppercase tracking-widest opacity-80">{stageLabel(s.stage)}</div>
                    <div className="text-2xl font-bold mt-1">{s.count}</div>
                    <div className="text-[10px] mt-1 uppercase tracking-wider">{s.status === "verified" ? t("verified") : s.status === "exception" ? t("exception") : t("pending")}</div>
                  </div>
                  {i < stats.supply_chain_stages.length - 1 && <div className="flex items-center w-6"><div className="h-0.5 w-full stripe-line" /></div>}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
