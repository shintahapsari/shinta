import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

export default function Exceptions() {
  const { user } = useAuth();
  const { t } = useLang();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusRef = useRef(null);
  const [items, setItems] = useState([]);
  const [target, setTarget] = useState(null);
  const [note, setNote] = useState("");

  const load = () => api.get("/exceptions").then(({ data }) => setItems(data));
  useEffect(() => { load(); }, []);

  // Deep-link focus: if ?focus=<id> present, scroll to that exception and open resolve dialog
  useEffect(() => {
    const focusId = searchParams.get("focus");
    if (!focusId || items.length === 0) return;
    const target = items.find((e) => e._id === focusId);
    if (target) {
      setTimeout(() => {
        focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (user?.role === "admin" && target.status === "open") setTarget(target);
      }, 200);
      // Clear param so refresh doesn't re-open
      searchParams.delete("focus");
      setSearchParams(searchParams, { replace: true });
    }
  }, [items, searchParams, user, setSearchParams]);

  const resolve = async () => {
    try {
      await api.post(`/exceptions/${target._id}/resolve`, { resolution: note });
      toast.success(t("anomaly_resolved"));
      setTarget(null); setNote(""); load();
    } catch (err) { toast.error(err.response?.data?.detail || t("save_fail")); }
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
                <Button data-testid={`resolve-exception-${e._id}`} size="sm" onClick={() => setTarget(e)} className="bg-emerald-600 hover:bg-emerald-700 text-white">{t("resolve")}</Button>
                : <Badge className="bg-rose-100 border border-rose-300 text-rose-700">{t("open")}</Badge>
            ) : <Badge className="bg-emerald-100 border border-emerald-300 text-emerald-700">{t("resolved")}</Badge>}
          </CardContent></Card>
          );
        })}
        {items.length === 0 && <div className="text-center text-slate-500 py-12">{t("no_anomaly")}</div>}
      </div>

      <Dialog open={!!target} onOpenChange={() => setTarget(null)}>
        <DialogContent className="glass-card border-slate-200">
          <DialogHeader><DialogTitle>{t("resolve_anomaly")}</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">{target?.message}</p>
          <Textarea data-testid="resolution-textarea" placeholder={t("resolve_action")} value={note} onChange={(e) => setNote(e.target.value)} className="bg-white border-slate-200" />
          <Button data-testid="confirm-resolve-button" onClick={resolve} className="bg-emerald-600 hover:bg-emerald-700 text-white">{t("confirm")}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
