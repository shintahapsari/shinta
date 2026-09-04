import React, { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sprout } from "lucide-react";

const VARIETIES = ["Virginia", "Srintil", "Madura", "Kasturi", "Rajangan"];

export default function HarvestForm() {
  const { t } = useLang();
  const [form, setForm] = useState({ variety: "Srintil", location: "", gps: "", harvest_date: "", weight_kg: "", plant_age_days: 90, moisture_pct: 12, initial_grade: "A" });
  const [last, setLast] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    const missing = [];
    if (!form.variety) missing.push(t("variety_label"));
    if (!form.location) missing.push(t("location_label"));
    if (!form.gps) missing.push(t("gps_label"));
    if (!form.harvest_date) missing.push(t("harvest_date"));
    if (!form.weight_kg || parseFloat(form.weight_kg) <= 0) missing.push(t("weight_kg"));
    if (!form.plant_age_days || parseInt(form.plant_age_days) <= 0) missing.push(t("plant_age"));
    if (form.moisture_pct === "" || form.moisture_pct === null) missing.push(t("moisture_pct"));
    if (!form.initial_grade) missing.push(t("initial_grade"));
    if (missing.length) { toast.error(`${t("required_fields")}: ${missing.join(", ")}`); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/harvest", { ...form, weight_kg: parseFloat(form.weight_kg), plant_age_days: parseInt(form.plant_age_days), moisture_pct: parseFloat(form.moisture_pct) });
      toast.success(`${data.batch.batch_id} ${t("saved_to_ledger")}`);
      setLast(data);
      setForm({ ...form, weight_kg: "", location: "", gps: "", harvest_date: "" });
    } catch (err) { toast.error(err.response?.data?.detail || t("save_fail")); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-2">{t("farmer_module")}</div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900"><Sprout className="w-8 h-8 text-emerald-600"/>{t("harvest_reg")}</h1>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-2"><CardContent className="p-6">
          <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>{t("variety_label")}</Label>
              <Select value={form.variety} onValueChange={(v) => set("variety", v)}>
                <SelectTrigger data-testid="harvest-variety-select" className="bg-white border-slate-200 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{VARIETIES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t("location_label")}</Label><Input data-testid="harvest-location-input" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Temanggung, Jawa Tengah" required className="bg-white border-slate-200 mt-1.5" /></div>
            <div><Label>{t("gps_label")}</Label><Input data-testid="harvest-gps-input" value={form.gps} onChange={(e) => set("gps", e.target.value)} placeholder="-7.3167,110.1833" className="bg-white border-slate-200 mt-1.5 font-mono" /></div>
            <div><Label>{t("harvest_date")}</Label><Input data-testid="harvest-date-input" type="date" value={form.harvest_date} onChange={(e) => set("harvest_date", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
            <div><Label>{t("weight_kg")}</Label><Input data-testid="harvest-weight-input" type="number" step="0.1" value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
            <div><Label>{t("plant_age")}</Label><Input data-testid="harvest-age-input" type="number" value={form.plant_age_days} onChange={(e) => set("plant_age_days", e.target.value)} className="bg-white border-slate-200 mt-1.5" /></div>
            <div><Label>{t("moisture_pct")}</Label><Input data-testid="harvest-moisture-input" type="number" step="0.1" value={form.moisture_pct} onChange={(e) => set("moisture_pct", e.target.value)} className="bg-white border-slate-200 mt-1.5" /></div>
            <div>
              <Label>{t("initial_grade")}</Label>
              <Select value={form.initial_grade} onValueChange={(v) => set("initial_grade", v)}>
                <SelectTrigger data-testid="harvest-grade-select" className="bg-white border-slate-200 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{["A", "B", "C"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button data-testid="harvest-submit-button" type="submit" disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11">
                {busy ? t("signing_block") : t("submit_harvest")}
              </Button>
            </div>
          </form>
        </CardContent></Card>

        <Card className="glass-card"><CardContent className="p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-3">{t("last_tx")}</div>
          {last ? (
            <div className="space-y-3 text-sm">
              <div><div className="text-slate-500 text-xs">{t("batch_id")}</div><div className="font-mono text-emerald-700 text-lg">{last.batch.batch_id}</div></div>
              <div><div className="text-slate-500 text-xs">{t("block_num")}</div><div className="font-mono">#{last.block.block_index}</div></div>
              <div><div className="text-slate-500 text-xs">{t("hash")}</div><div className="hash-text text-emerald-700 truncate">{last.block.current_hash}</div></div>
            </div>
          ) : <p className="text-slate-500 text-sm">{t("no_tx_yet")}</p>}
        </CardContent></Card>
      </div>
    </div>
  );
}
