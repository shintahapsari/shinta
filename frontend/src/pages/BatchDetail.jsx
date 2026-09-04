import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BatchDetail() {
  const { batchId } = useParams();
  const [batch, setBatch] = useState(null);
  const [trace, setTrace] = useState(null);

  useEffect(() => {
    api.get(`/batches/${batchId}`).then(({ data }) => setBatch(data));
    api.get(`/trace/${batchId}`).then(({ data }) => setTrace(data));
  }, [batchId]);

  if (!batch) return <div className="text-slate-600">Memuat...</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/trace" className="text-xs text-cyan-700 font-mono">← Kembali ke Traceability</Link>
        <h1 className="text-3xl font-bold mt-2 font-mono text-emerald-700">{batch.batch_id}</h1>
        <p className="text-slate-500 text-sm mt-1">Aktor: {batch.actor_name} · Role: {batch.actor_role}</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card border-slate-200"><CardContent className="p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-4">Detail Batch</div>
          <div className="space-y-2 text-sm">
            {Object.entries(batch).filter(([k]) => !["_id", "prefix", "actor_id"].includes(k)).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2 border-b border-slate-200">
                <span className="text-slate-500 capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-mono text-right break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
        <Card className="glass-card border-slate-200"><CardContent className="p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-cyan-700 mb-4">Blockchain Blocks</div>
          <div className="space-y-2">
            {trace?.blocks?.filter((b) => b.batch_id === batchId).map((b) => (
              <div key={b.block_index} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-emerald-700">#{b.block_index}</span>
                  <Badge className="bg-emerald-100 border border-emerald-300 text-emerald-700">{b.status}</Badge>
                </div>
                <div className="hash-text mt-2 text-emerald-600">{b.current_hash}</div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}
