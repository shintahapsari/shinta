import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Blocks, ShieldCheck } from "lucide-react";

export default function BlockchainExplorer() {
  const { t } = useLang();
  const [blocks, setBlocks] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [integrity, setIntegrity] = useState(null);

  useEffect(() => {
    api.get("/ledger?limit=100").then(({ data }) => setBlocks(data));
    api.get("/ledger/stats").then(({ data }) => setStats(data));
  }, []);

  const verify = async () => {
    const { data } = await api.get("/ledger/verify");
    setIntegrity(data);
    if (data.valid) toast.success(`${t("chain_valid_msg")} · ${data.total_blocks} ${t("blocks_verified")}`);
    else toast.error(`${t("chain_broken_at")} #${data.broken_at}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-2">Ledger Immutable</div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900"><Blocks className="w-8 h-8"/>{t("explorer_title")}</h1>
        </div>
        <Button data-testid="verify-chain-button" onClick={verify} className="bg-emerald-600 hover:bg-emerald-700 text-white"><ShieldCheck className="w-4 h-4 mr-2"/>{t("verify_integrity")}</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-slate-200"><CardContent className="p-5">
          <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Block Height</div>
          <div className="text-3xl font-bold text-emerald-700 mt-1">#{stats?.block_height ?? 0}</div>
        </CardContent></Card>
        <Card className="glass-card border-slate-200"><CardContent className="p-5">
          <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Latency</div>
          <div className="text-3xl font-bold mt-1">{stats?.avg_block_time_ms ?? 0}ms</div>
        </CardContent></Card>
        <Card className="glass-card border-slate-200"><CardContent className="p-5">
          <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Validators</div>
          <div className="text-3xl font-bold mt-1">{stats?.active_validators ?? 0}</div>
        </CardContent></Card>
        <Card className="glass-card border-slate-200"><CardContent className="p-5">
          <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Integrity</div>
          <div className="mt-1">
            {integrity ? (
              <Badge className={integrity.valid ? "bg-emerald-100 border border-emerald-300 text-emerald-700" : "bg-rose-100 border border-rose-300 text-rose-700"}>
                {integrity.valid ? "✓ VALID" : "✗ RUSAK"}
              </Badge>
            ) : <span className="text-slate-500 text-sm">Belum diperiksa</span>}
          </div>
        </CardContent></Card>
      </div>

      <Card className="glass-card border-slate-200"><CardContent className="p-6">
        <div className="text-xs font-mono uppercase tracking-widest text-cyan-700 mb-4">Blok Terbaru</div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {blocks.map((b) => (
            <button key={b.block_index} data-testid={`block-row-${b.block_index}`} onClick={() => setSelected(b)} className="w-full text-left p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-emerald-300 transition grid grid-cols-6 gap-3 items-center text-xs">
              <div className="font-mono text-emerald-700 font-semibold">#{b.block_index}</div>
              <div><Badge className="bg-slate-800 border border-slate-700 text-slate-700 uppercase text-[10px]">{b.data_type}</Badge></div>
              <div className="font-mono">{b.batch_id}</div>
              <div className="truncate">{b.actor_name}</div>
              <div className="col-span-2 hash-text text-emerald-600 truncate">{b.current_hash}</div>
            </button>
          ))}
        </div>
      </CardContent></Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="glass-card border-slate-200 max-w-2xl">
          <DialogHeader><DialogTitle className="font-mono text-emerald-700">Block #{selected?.block_index}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-xs">
              <div><div className="text-slate-500">Timestamp</div><div className="font-mono">{selected.timestamp}</div></div>
              <div><div className="text-slate-500">Previous Hash</div><div className="hash-text text-slate-600">{selected.previous_hash}</div></div>
              <div><div className="text-slate-500">Current Hash</div><div className="hash-text text-emerald-600">{selected.current_hash}</div></div>
              <div><div className="text-slate-500 mb-1">Payload</div><pre className="bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto text-[10px] font-mono">{JSON.stringify(selected.payload, null, 2)}</pre></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
