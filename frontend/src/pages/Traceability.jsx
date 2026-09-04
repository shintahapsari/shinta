import React, { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Package2, Sprout, Boxes, Factory, Truck, Store } from "lucide-react";

const ICON = { HB: Sprout, CB: Boxes, PB: Factory, SB: Truck, RB: Store };
const LABEL = { HB: "Panen", CB: "Pengumpulan", PB: "Produksi", SB: "Pengiriman", RB: "Ritel" };

export default function Traceability() {
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);

  const search = async (e) => {
    e?.preventDefault();
    if (!q) return;
    try {
      const { data } = await api.get(`/trace/${q}`);
      setData(data);
    } catch (err) { toast.error("Batch tidak ditemukan"); setData(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-2">Supply Chain Traceability</div>
        <h1 className="text-3xl font-bold flex items-center gap-3"><Search className="w-8 h-8"/>Cari & Rekonstruksi Rantai</h1>
      </div>
      <Card className="glass-card border-slate-200"><CardContent className="p-6">
        <form onSubmit={search} className="flex gap-3">
          <Input data-testid="trace-query-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Batch ID (HB-0001 / CB-0001 / PB-0001 / SB-0001 / RB-0001) atau Product ID (PRD-XXXXXXXX)" className="bg-white border-slate-200 flex-1 font-mono" />
          <Button data-testid="trace-search-button" type="submit" className="bg-emerald-600 hover:bg-emerald-700">Cari</Button>
        </form>
      </CardContent></Card>

      {data && (
        <>
          <Card className="glass-card border-slate-200"><CardContent className="p-6">
            <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-4">Timeline Rantai Pasok</div>
            <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
              {data.chain.map((c, i) => {
                const Icon = ICON[c.prefix] || Package2;
                return (
                  <React.Fragment key={c.batch_id}>
                    <Link to={`/batch/${c.batch_id}`} className="flex-1 min-w-[180px] p-4 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-950/50 transition">
                      <Icon className="w-5 h-5 text-emerald-700 mb-2" />
                      <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-700">{LABEL[c.prefix]}</div>
                      <div className="text-sm font-bold mt-1">{c.batch_id}</div>
                      <div className="text-[10px] text-slate-600 mt-1">{c.actor_name}</div>
                    </Link>
                    {i < data.chain.length - 1 && <div className="flex items-center w-6"><div className="h-0.5 w-full stripe-line"/></div>}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent></Card>

          <Card className="glass-card border-slate-200"><CardContent className="p-6">
            <div className="text-xs font-mono uppercase tracking-widest text-cyan-700 mb-4">Ledger Blocks ({data.blocks.length})</div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {data.blocks.map((b) => (
                <div key={b.block_index} className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-4 gap-3 text-xs">
                  <div><div className="text-slate-500">Block</div><div className="font-mono text-emerald-700">#{b.block_index}</div></div>
                  <div><div className="text-slate-500">Batch</div><div className="font-mono">{b.batch_id}</div></div>
                  <div><div className="text-slate-500">Aktor</div><div>{b.actor_name}</div></div>
                  <div className="col-span-4"><div className="text-slate-500">Hash</div><div className="hash-text text-emerald-600 truncate">{b.current_hash}</div></div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
