import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Thermometer, Droplets } from "lucide-react";

export default function ShipmentForm() {
  const { t } = useLang();
  const [form, setForm] = useState({ source_production_id: "", destination: "", ship_date: "", eta_date: "", quantity_units: "", temperature_c: 24, humidity_pct: 60 });
  const [sources, setSources] = useState([]);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);
  const set = (k, v) => setForm({ ...form, [k]: v });

  useEffect(() => { api.get("/batches?prefix=PB").then(({ data }) => setSources(data)); }, [last]);

  const submit = async (e) => {
    e.preventDefault();
    const missing = [];
    if (!form.source_production_id) missing.push(t("source_production"));
    if (!form.destination) missing.push(t("destination"));
    if (!form.ship_date) missing.push(t("ship_date"));
    if (!form.eta_date) missing.push(t("eta_date"));
    if (!form.quantity_units || parseInt(form.quantity_units) <= 0) missing.push(t("qty_units"));
    if (form.temperature_c === "" || form.temperature_c === null) missing.push(t("temp_max"));
    if (form.humidity_pct === "" || form.humidity_pct === null) missing.push(t("humidity_pct"));
    if (missing.length) { toast.error(`${t("required_fields")}: ${missing.join(", ")}`); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/shipment", { ...form, quantity_units: parseInt(form.quantity_units), temperature_c: parseFloat(form.temperature_c), humidity_pct: parseFloat(form.humidity_pct) });
      toast.success(`${data.batch.batch_id} ${t("saved_to_ledger")}`);
      setLast(data);
    } catch (err) { toast.error(err.response?.data?.detail || t("save_fail")); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-purple-700 mb-2">{t("distributor_module")}</div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900"><Truck className="w-8 h-8 text-purple-600"/>{t("shipment_track")}</h1>
      </div>
      <Card className="glass-card"><CardContent className="p-6">
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>{t("source_production")}</Label>
            <Select value={form.source_production_id} onValueChange={(v) => set("source_production_id", v)}>
              <SelectTrigger data-testid="shipment-source-select" className="bg-white border-slate-200 mt-1.5"><SelectValue placeholder={t("pick_pb")} /></SelectTrigger>
              <SelectContent>{sources.map((h) => <SelectItem key={h.batch_id} value={h.batch_id}>{h.batch_id} — {h.output_units} · Grade {h.quality_grade}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>{t("destination")}</Label><Input data-testid="shipment-destination-input" value={form.destination} onChange={(e) => set("destination", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
          <div><Label>{t("qty_units")}</Label><Input data-testid="shipment-qty-input" type="number" value={form.quantity_units} onChange={(e) => set("quantity_units", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
          <div><Label>{t("ship_date")}</Label><Input data-testid="shipment-date-input" type="date" value={form.ship_date} onChange={(e) => set("ship_date", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
          <div><Label>{t("eta_date")}</Label><Input data-testid="shipment-eta-input" type="date" value={form.eta_date} onChange={(e) => set("eta_date", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
          <div><Label className="flex items-center gap-2"><Thermometer className="w-3.5 h-3.5"/>{t("temp_max")}</Label><Input data-testid="shipment-temp-input" type="number" step="0.1" value={form.temperature_c} onChange={(e) => set("temperature_c", e.target.value)} className="bg-white border-slate-200 mt-1.5" /></div>
          <div><Label className="flex items-center gap-2"><Droplets className="w-3.5 h-3.5"/>{t("humidity_pct")}</Label><Input data-testid="shipment-humidity-input" type="number" step="0.1" value={form.humidity_pct} onChange={(e) => set("humidity_pct", e.target.value)} className="bg-white border-slate-200 mt-1.5" /></div>
          <div className="md:col-span-2 p-3 rounded-lg bg-cyan-50 border border-cyan-300 text-xs text-cyan-800">
            <strong>PROPOSED INTEGRATION</strong> — {t("iot_note")}
          </div>
          <div className="md:col-span-2"><Button data-testid="shipment-submit-button" disabled={busy} type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white h-11">{busy ? "..." : t("submit_shipment")}</Button></div>
        </form>
      </CardContent></Card>
    </div>
  );
}
