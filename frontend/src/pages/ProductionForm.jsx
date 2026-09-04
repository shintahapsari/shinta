import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Factory, Sparkles } from "lucide-react";

export default function ProductionForm() {
  const { t } = useLang();
  const [form, setForm] = useState({ source_collection_id: "", input_kg: "", output_units: "", blend_notes: "", packaging: "Karton 20 slop", excise_number: "", quality_grade: "A" });
  const [sources, setSources] = useState([]);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);
  const set = (k, v) => setForm({ ...form, [k]: v });

  useEffect(() => { api.get("/batches?prefix=CB").then(({ data }) => setSources(data)); }, [last]);

  const submit = async (e) => {
    e.preventDefault();
    const missing = [];
    if (!form.source_collection_id) missing.push(t("source_collection"));
    if (!form.input_kg || parseFloat(form.input_kg) <= 0) missing.push(t("input_kg"));
    if (!form.output_units || parseInt(form.output_units) <= 0) missing.push(t("output_units"));
    if (!form.blend_notes) missing.push(t("blend_notes"));
    if (!form.packaging) missing.push(t("packaging"));
    if (!form.excise_number) missing.push(t("excise"));
    if (!form.quality_grade) missing.push(t("quality_grade_final"));
    if (missing.length) { toast.error(`${t("required_fields")}: ${missing.join(", ")}`); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/production", { ...form, input_kg: parseFloat(form.input_kg), output_units: parseInt(form.output_units) });
      toast.success(`${data.batch.batch_id} ${t("saved_to_ledger")}`);
      setLast(data);
    } catch (err) { toast.error(err.response?.data?.detail || t("save_fail")); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-blue-700 mb-2">{t("manufacturer_module")}</div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900"><Factory className="w-8 h-8 text-blue-600"/>{t("production_rec")}</h1>
      </div>
      <Card className="glass-card"><CardContent className="p-6">
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>{t("source_collection")}</Label>
            <Select value={form.source_collection_id} onValueChange={(v) => set("source_collection_id", v)}>
              <SelectTrigger data-testid="production-source-select" className="bg-white border-slate-200 mt-1.5"><SelectValue placeholder={t("pick_cb")} /></SelectTrigger>
              <SelectContent>{sources.map((h) => <SelectItem key={h.batch_id} value={h.batch_id}>{h.batch_id} — {h.received_kg}kg — Grade {h.grade}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>{t("input_kg")}</Label><Input data-testid="production-input-kg" type="number" step="0.1" value={form.input_kg} onChange={(e) => set("input_kg", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
          <div><Label>{t("output_units")}</Label><Input data-testid="production-output-units" type="number" value={form.output_units} onChange={(e) => set("output_units", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
          <div className="md:col-span-2"><Label>{t("blend_notes")}</Label><Input data-testid="production-blend-notes" value={form.blend_notes} onChange={(e) => set("blend_notes", e.target.value)} className="bg-white border-slate-200 mt-1.5" /></div>
          <div><Label>{t("packaging")}</Label><Input data-testid="production-packaging" value={form.packaging} onChange={(e) => set("packaging", e.target.value)} className="bg-white border-slate-200 mt-1.5" /></div>
          <div><Label>{t("excise")}</Label><Input data-testid="production-excise" value={form.excise_number} onChange={(e) => set("excise_number", e.target.value)} placeholder="CHT-2026-000123" className="bg-white border-slate-200 mt-1.5 font-mono" /></div>
          <div className="md:col-span-2">
            <Label>{t("quality_grade_final")}</Label>
            <Select value={form.quality_grade} onValueChange={(v) => set("quality_grade", v)}>
              <SelectTrigger data-testid="production-grade-select" className="bg-white border-slate-200 mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{["A Super", "A", "B", "C"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 flex gap-3">
            <div className="flex-1 p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4"/> {t("ai_qc_line")}
            </div>
          </div>
          <div className="md:col-span-2"><Button data-testid="production-submit-button" disabled={busy} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11">{busy ? "..." : t("submit_production")}</Button></div>
        </form>
      </CardContent></Card>
    </div>
  );
}
