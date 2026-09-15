import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import StatusBadge from "@/components/StatusBadge";
import {
  Building2, FileCheck2, ClipboardCheck, MapPinned, Users2, TrendingUp, Clock, Loader2, Target,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const PIE_COLORS = ["#0B2545", "#F5A623", "#10B981", "#1E3A8A", "#B45309", "#EF4444"];

function KpiCard({ icon: Icon, label, value, sub, accent, testid }) {
  return (
    <div data-testid={testid} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="font-display font-extrabold text-3xl text-[#0B2545] mt-2">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, testid }) {
  return (
    <div data-testid={testid} className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="font-display font-semibold text-[#0B2545] mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/kpi").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" /></div>;
  const c = data.cards;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0B2545]">Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Ringkasan KPI kemitraan — Selamat datang, {user.name}.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard testid="kpi-partners" icon={Building2} label="Total Mitra" value={c.total_partners} sub={`${c.prospektif} prospektif/target`} accent="bg-sky-50 text-sky-600" />
        <KpiCard testid="kpi-docs" icon={FileCheck2} label="Dokumen Aktif" value={c.active_docs} sub="PKS / IA / MoU aktif" accent="bg-emerald-50 text-emerald-600" />
        <KpiCard testid="kpi-impl" icon={ClipboardCheck} label="Implementasi Disetujui" value={c.approved_impls} sub={`${c.pending_impls} menunggu verifikasi`} accent="bg-amber-50 text-amber-600" />
        <KpiCard testid="kpi-coverage" icon={MapPinned} label="Coverage Berdampak" value={`${c.coverage_pct}%`} sub="Implemented / Eligible" accent="bg-violet-50 text-violet-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard testid="kpi-total-impl" icon={Target} label="Total Kegiatan" value={c.total_impls} sub="semua status" accent="bg-blue-50 text-blue-600" />
        <KpiCard testid="kpi-dosen" icon={Users2} label="Keterlibatan Dosen" value={c.dosen_total} sub="dari kegiatan disetujui" accent="bg-indigo-50 text-indigo-600" />
        <KpiCard testid="kpi-mahasiswa" icon={Users2} label="Keterlibatan Mahasiswa" value={c.mahasiswa_total} sub="dari kegiatan disetujui" accent="bg-teal-50 text-teal-600" />
        <KpiCard testid="kpi-pending" icon={Clock} label="Menunggu Verifikasi" value={c.pending_impls} sub="perlu tindakan" accent="bg-orange-50 text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Tren Pertumbuhan Mitra" testid="chart-partner-growth" >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.partner_growth}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F5A623" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="cumulative" name="Kumulatif" stroke="#0B2545" fill="url(#g1)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribusi Status Dokumen" testid="chart-doc-status">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.doc_status} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {data.doc_status.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribusi Kategori Mitra" testid="chart-kategori">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.kategori} dataKey="value" nameKey="name" outerRadius={85}>
                {data.kategori.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard title="Tren Implementasi Kegiatan (Disetujui)" testid="chart-impl-trend">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.impl_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Kegiatan" fill="#0B2545" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5" data-testid="expiring-panel">
          <h3 className="font-display font-semibold text-[#0B2545] mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Dokumen Perlu Perhatian
          </h3>
          <div className="space-y-3">
            {data.expiring.length === 0 && <p className="text-sm text-slate-400">Tidak ada dokumen mendekati kedaluwarsa.</p>}
            {data.expiring.map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{d.judul}</p>
                  <p className="text-xs text-slate-400">Berakhir: {d.tanggal_berakhir}</p>
                </div>
                <StatusBadge status={d.days < 0 ? "Expired" : "Active"} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
