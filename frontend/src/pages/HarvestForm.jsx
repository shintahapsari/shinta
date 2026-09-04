import React, { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sprout } from "lucide-react";

const VARIETIES = ["Virginia", "Srintil", "Madura", "Kasturi", "Rajangan"];

export default function HarvestForm() {
  const [form, setForm] = useState({
    variety: "Srintil", location: "", gps: "", harvest_date: "",
    weight_kg: "", plant_age_days: 90, moisture_pct: 12, initial_grade: "A"
  });
  const [last, setLast] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/harvest", { ...form, weight_kg: parseFloat(form.weight_kg), plant_age_days: parseInt(form.plant_age_days), moisture_pct: parseFloat(form.moisture_pct) });
      toast.success(`Panen ${data.batch.batch_id} tercatat di ledger`);
      setLast(data);
      setForm({ ...form, weight_kg: "", location: "", gps: "", harvest_date: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal simpan");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-2">Modul Petani</div>
        <h1 className="text-3xl font-bold flex items-center gap-3"><Sprout className="w-8 h-8 text-emerald-700"/>Registrasi Panen Tembakau</h1>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass-card border-slate-200 lg:col-span-2">
          <CardContent className="p-6">
            <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Varietas Tembakau</Label>
                <Select value={form.variety} onValueChange={(v) => set("variety", v)}>
                  <SelectTrigger data-testid="harvest-variety-select" className="bg-white border-slate-200 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{VARIETIES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Lokasi Kebun</Label><Input data-testid="harvest-location-input" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Temanggung, Jawa Tengah" required className="bg-white border-slate-200 mt-1.5" /></div>
              <div><Label>Koordinat GPS</Label><Input data-testid="harvest-gps-input" value={form.gps} onChange={(e) => set("gps", e.target.value)} placeholder="-7.3167,110.1833" className="bg-white border-slate-200 mt-1.5 font-mono" /></div>
              <div><Label>Tanggal Panen</Label><Input data-testid="harvest-date-input" type="date" value={form.harvest_date} onChange={(e) => set("harvest_date", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
              <div><Label>Berat Total (kg)</Label><Input data-testid="harvest-weight-input" type="number" step="0.1" value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
              <div><Label>Umur Tanaman (hari)</Label><Input data-testid="harvest-age-input" type="number" value={form.plant_age_days} onChange={(e) => set("plant_age_days", e.target.value)} className="bg-white border-slate-200 mt-1.5" /></div>
              <div><Label>Kadar Air (%)</Label><Input data-testid="harvest-moisture-input" type="number" step="0.1" value={form.moisture_pct} onChange={(e) => set("moisture_pct", e.target.value)} className="bg-white border-slate-200 mt-1.5" /></div>
              <div>
                <Label>Grade Awal</Label>
                <Select value={form.initial_grade} onValueChange={(v) => set("initial_grade", v)}>
                  <SelectTrigger data-testid="harvest-grade-select" className="bg-white border-slate-200 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{["A", "B", "C"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button data-testid="harvest-submit-button" type="submit" disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700 h-11">
                  {busy ? "Menandatangani blok..." : "Terbitkan Smart Contract Panen (SC-001)"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-card border-slate-200">
          <CardContent className="p-6">
            <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-3">Transaksi Terakhir</div>
            {last ? (
              <div className="space-y-3 text-sm">
                <div><div className="text-slate-500 text-xs">Batch ID</div><div className="font-mono text-emerald-700 text-lg">{last.batch.batch_id}</div></div>
                <div><div className="text-slate-500 text-xs">Block #</div><div className="font-mono">#{last.block.block_index}</div></div>
                <div><div className="text-slate-500 text-xs">Hash</div><div className="hash-text text-emerald-600 truncate">{last.block.current_hash}</div></div>
              </div>
            ) : <p className="text-slate-500 text-sm">Belum ada transaksi. Isi form untuk mencatat panen pertama Anda ke ledger.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
