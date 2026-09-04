import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Thermometer, Droplets, Leaf, Sparkles } from "lucide-react";

export default function QualityIoT() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = () => api.get("/iot/live").then(({ data }) => setData(data));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <div className="text-slate-600">Menghubungkan sensor IoT...</div>;
  const c = data.current;

  const cards = [
    { label: "Suhu Storage", value: `${c.temperature_c}°C`, icon: Thermometer, status: c.temperature_c > 30 ? "exception" : "verified", color: "cyan" },
    { label: "Kelembaban", value: `${c.humidity_pct}%`, icon: Droplets, status: c.humidity_pct > 75 ? "exception" : "verified", color: "blue" },
    { label: "Kadar Air Daun", value: `${c.moisture_pct}%`, icon: Leaf, status: "verified", color: "emerald" },
    { label: "Leaf Grade", value: c.leaf_grade, icon: Sparkles, status: "verified", color: "amber" },
  ];

  const sty = { verified: "border-emerald-300 bg-emerald-50 text-emerald-700", exception: "border-rose-300 bg-rose-50 text-rose-700" };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-2">Proposed Integration (Mocked)</div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Activity className="w-8 h-8"/>IoT & AI Quality Inspection</h1>
        </div>
        <Badge className="bg-amber-100 border border-amber-300 text-amber-700">PROPOSED INTEGRATION · SIMULATED SENSOR STREAM</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((k, i) => {
          const Icon = k.icon;
          return (
            <Card key={i} className={`glass-card border ${sty[k.status]}`}>
              <CardContent className="p-5">
                <Icon className={`w-5 h-5 mb-3`} />
                <div className="text-xs uppercase tracking-widest opacity-80 font-mono">{k.label}</div>
                <div className="text-2xl font-bold mt-1">{k.value}</div>
                <div className="text-[10px] uppercase tracking-wider mt-2">{k.status === "verified" ? "✓ Normal" : "⚠ Anomali"}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass-card border-slate-200 lg:col-span-2"><CardContent className="p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-cyan-700 mb-4">Telemetri 100 Menit Terakhir</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="timestamp" stroke="#64748B" tick={{ fontSize: 10 }} tickFormatter={(t) => t?.slice(11, 16)} />
              <YAxis stroke="#64748B" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#0A0E17", border: "1px solid #1E293B", borderRadius: 8 }} />
              <Line type="monotone" dataKey="temperature_c" stroke="#06B6D4" strokeWidth={2} dot={false} name="Suhu °C" />
              <Line type="monotone" dataKey="humidity_pct" stroke="#4ADE80" strokeWidth={2} dot={false} name="Kelembaban %" />
              <Line type="monotone" dataKey="moisture_pct" stroke="#F59E0B" strokeWidth={2} dot={false} name="Kadar Air %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card className="glass-card border-slate-200"><CardContent className="p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4"/>AI Inspection</div>
          <div className="space-y-3 text-sm">
            <div><div className="text-slate-500 text-xs">Grade Terklasifikasi</div><div className="text-2xl font-bold text-emerald-700">{data.ai_inspection.grade}</div></div>
            <div><div className="text-slate-500 text-xs">Confidence</div><div className="text-xl font-semibold">{data.ai_inspection.confidence_pct}%</div></div>
            <div><div className="text-slate-500 text-xs">Foreign Material Score</div><div>{data.ai_inspection.foreign_material_score}%</div></div>
            <div><div className="text-slate-500 text-xs">Disease</div><Badge className="bg-emerald-100 border border-emerald-300 text-emerald-700 text-[10px]">{data.ai_inspection.disease_detected ? "TERDETEKSI" : "TIDAK ADA"}</Badge></div>
            <div className="pt-3 border-t border-slate-200">
              <div className="text-slate-500 text-xs mb-1">Rekomendasi</div>
              <div className="text-xs text-emerald-600">{data.ai_inspection.recommendation}</div>
            </div>
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}
