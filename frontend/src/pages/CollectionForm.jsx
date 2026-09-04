import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Boxes } from "lucide-react";

export default function CollectionForm() {
  const { t } = useLang();
  const [form, setForm] = useState({ source_harvest_id: "", received_kg: "", grade: "A", drying_method: "Sun-cured", notes: "" });
  const [harvests, setHarvests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);
  const set = (k, v) => setForm({ ...form, [k]: v });

  useEffect(() => { api.get("/batches?prefix=HB").then(({ data }) => setHarvests(data)); }, [last]);

  const submit = async (e) => {
    e.preventDefault();
    const missing = [];
    if (!form.source_harvest_id) missing.push(t("source_harvest"));
    if (!form.received_kg || parseFloat(form.received_kg) <= 0) missing.push(t("weight_received"));
    if (!form.grade) missing.push(t("leaf_grade"));
    if (!form.drying_method) missing.push(t("drying_method"));
    if (!form.notes) missing.push(t("sort_notes"));
    if (missing.length) { toast.error(`${t("required_fields")}: ${missing.join(", ")}`); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/collection", { ...form, received_kg: parseFloat(form.received_kg) });
      toast.success(`${data.batch.batch_id} ${t("saved_to_ledger")}`);
      setLast(data);
    } catch (err) { toast.error(err.response?.data?.detail || t("save_fail")); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-amber-700 mb-2">{t("collector_module")}</div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900"><Boxes className="w-8 h-8 text-amber-600"/>{t("collection_rec")}</h1>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-2"><CardContent className="p-6">
          <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>{t("source_harvest")}</Label>
              <Select value={form.source_harvest_id} onValueChange={(v) => set("source_harvest_id", v)}>
                <SelectTrigger data-testid="collection-source-select" className="bg-white border-slate-200 mt-1.5"><SelectValue placeholder={t("pick_hb")} /></SelectTrigger>
                <SelectContent>{harvests.map((h) => <SelectItem key={h.batch_id} value={h.batch_id}>{h.batch_id} — {h.variety} {h.weight_kg}kg — {h.location}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t("weight_received")}</Label><Input data-testid="collection-weight-input" type="number" step="0.1" value={form.received_kg} onChange={(e) => set("received_kg", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
            <div>
              <Label>{t("leaf_grade")}</Label>
              <Select value={form.grade} onValueChange={(v) => set("grade", v)}>
                <SelectTrigger data-testid="collection-grade-select" className="bg-white border-slate-200 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{["A", "B", "C"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>{t("drying_method")}</Label>
              <Select value={form.drying_method} onValueChange={(v) => set("drying_method", v)}>
                <SelectTrigger data-testid="collection-drying-select" className="bg-white border-slate-200 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{["Rajangan", "Sun-cured", "Flue-cured"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>{t("sort_notes")}</Label><Textarea data-testid="collection-notes-input" value={form.notes} onChange={(e) => set("notes", e.target.value)} className="bg-white border-slate-200 mt-1.5" /></div>
            <div className="md:col-span-2"><Button data-testid="collection-submit-button" disabled={busy} type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white h-11">{busy ? "..." : t("submit_collection")}</Button></div>
          </form>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-3">{t("available_harvests")}</div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {harvests.map((h) => (
              <div key={h.batch_id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="font-mono text-emerald-700">{h.batch_id}</div>
                <div className="text-slate-600">{h.variety} · {h.weight_kg}kg</div>
                <div className="text-slate-500 truncate">{h.location}</div>
              </div>
            ))}
            {harvests.length === 0 && <p className="text-slate-500 text-sm">{t("no_harvest_available")}</p>}
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}
