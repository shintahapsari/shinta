import { useEffect, useState } from "react";
import api from "@/lib/api";
import { MapPinned, Loader2, CheckCircle2, Circle, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function KampusBerdampakPage() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/kampus-berdampak").then((r) => setData(r.data)).catch(() => {}); }, []);

  if (!data) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" /></div>;
  const s = data.summary;
  const chartData = data.regions.map((r) => ({ region: r.region, Eligible: r.eligible, Implemented: r.implemented }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0B2545] flex items-center gap-2">
          <MapPinned className="w-7 h-7 text-[#F5A623]" /> Kampus Berdampak
        </h2>
        <p className="text-slate-500 text-sm mt-1">Eligible (dari PKS aktif) vs Implemented (dari kegiatan disetujui) — dinamis, riwayat dipertahankan.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5" data-testid="kb-eligible">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Eligible</p>
          <p className="font-display font-extrabold text-3xl text-emerald-600 mt-2">{s.total_eligible}</p>
          <p className="text-xs text-slate-500 mt-1">mitra dengan PKS/IA/MoU aktif</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5" data-testid="kb-implemented">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Implemented</p>
          <p className="font-display font-extrabold text-3xl text-blue-600 mt-2">{s.total_implemented}</p>
          <p className="text-xs text-slate-500 mt-1">mitra dengan kegiatan disetujui</p>
        </div>
        <div className="bg-gradient-to-br from-[#0B2545] to-[#1E3A8A] rounded-2xl p-5 text-white" data-testid="kb-coverage">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Coverage</p>
          <p className="font-display font-extrabold text-3xl mt-2 text-[#FFC72C]">{s.coverage_pct}%</p>
          <Progress value={s.coverage_pct} className="mt-3 h-2 bg-white/20" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-display font-semibold text-[#0B2545] mb-4">Sebaran per Region</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="region" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Eligible" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={44} />
            <Bar dataKey="Implemented" fill="#0B2545" radius={[6, 6, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-4">
        {data.regions.map((r) => (
          <div key={r.region} data-testid={`kb-region-${r.region}`} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-[#0B2545]">{r.region}</h4>
              <span className="text-xs text-slate-500">{r.implemented}/{r.eligible} terimplementasi</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {r.partners.map((p) => (
                <span key={p.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${p.implemented ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  {p.implemented ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                  {p.nama}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
