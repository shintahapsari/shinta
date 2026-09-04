import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

export default function Exceptions() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [target, setTarget] = useState(null);
  const [note, setNote] = useState("");

  const load = () => api.get("/exceptions").then(({ data }) => setItems(data));
  useEffect(() => { load(); }, []);

  const resolve = async () => {
    try {
      await api.post(`/exceptions/${target._id}/resolve`, { resolution: note });
      toast.success("Anomali diselesaikan");
      setTarget(null); setNote(""); load();
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal"); }
  };

  const sev = { critical: "bg-rose-100 border-rose-300 text-rose-700", high: "bg-rose-100 border-rose-300 text-rose-700", medium: "bg-amber-100 border-amber-300 text-amber-700", low: "bg-amber-100 border-amber-300 text-amber-700" };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-rose-700 mb-2">Deteksi Anomali Rantai Pasok</div>
        <h1 className="text-3xl font-bold flex items-center gap-3"><AlertTriangle className="w-8 h-8 text-rose-700"/>Exception Log</h1>
      </div>
      <div className="space-y-2">
        {items.map((e) => (
          <Card key={e._id} className="glass-card border-slate-200"><CardContent className="p-4 flex items-center gap-4">
            <Badge className={`${sev[e.severity]} border shrink-0 text-[10px] uppercase`}>{e.severity}</Badge>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{e.message}</div>
              <div className="text-xs text-slate-500 mt-0.5 font-mono">{e.type} · {e.batch_id} {e.reference_batch && `← ${e.reference_batch}`}</div>
            </div>
            {e.status === "open" ? (
              user?.role === "admin" ?
                <Button data-testid={`resolve-exception-${e._id}`} size="sm" onClick={() => setTarget(e)} className="bg-emerald-600 hover:bg-emerald-700">Selesaikan</Button>
                : <Badge className="bg-rose-100 border border-rose-300 text-rose-700">TERBUKA</Badge>
            ) : <Badge className="bg-emerald-100 border border-emerald-300 text-emerald-700">RESOLVED</Badge>}
          </CardContent></Card>
        ))}
        {items.length === 0 && <div className="text-center text-slate-500 py-12">Tidak ada anomali terdeteksi 🎉</div>}
      </div>

      <Dialog open={!!target} onOpenChange={() => setTarget(null)}>
        <DialogContent className="glass-card border-slate-200">
          <DialogHeader><DialogTitle>Selesaikan Anomali</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">{target?.message}</p>
          <Textarea data-testid="resolution-textarea" placeholder="Tindakan penyelesaian..." value={note} onChange={(e) => setNote(e.target.value)} className="bg-white border-slate-200" />
          <Button data-testid="confirm-resolve-button" onClick={resolve} className="bg-emerald-600 hover:bg-emerald-700">Konfirmasi</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
