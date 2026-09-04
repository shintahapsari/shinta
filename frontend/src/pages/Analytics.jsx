import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from "recharts";
import { BarChart3, Download, FileText } from "lucide-react";

const COLORS = ["#4ADE80", "#06B6D4", "#F59E0B", "#8B5CF6", "#EC4899"];

export default function Analytics() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/stats/analytics").then(({ data }) => setData(data)); }, []);

  const exportCsv = () => {
    if (!data) return;
    const rows = [["Section", "Key", "Value"]];
    data.varieties.forEach((v) => rows.push(["Variety", v.name, v.kg]));
    data.regions.forEach((r) => rows.push(["Region", r.name, r.kg]));
    data.grades.forEach((g) => rows.push(["Grade", g.grade, g.count]));
    data.trend.forEach((t) => rows.push(["Trend", t.date, t.batches]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "analytics.csv"; link.click();
    toast.success(t("csv_downloaded"));
  };

  const exportPdf = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Laporan Analitik — Sintesa Tembakau Nusantara", 14, 20);
    doc.setFontSize(10); doc.setTextColor(120); doc.text(`Digenerate: ${new Date().toLocaleString("id-ID")}`, 14, 27);
    autoTable(doc, { startY: 35, head: [["Varietas", "Berat (kg)"]], body: data.varieties.map((v) => [v.name, v.kg]) });
    autoTable(doc, { head: [["Region", "Berat (kg)"]], body: data.regions.map((r) => [r.name, r.kg]) });
    autoTable(doc, { head: [["Grade", "Jumlah"]], body: data.grades.map((g) => [g.grade, g.count]) });
    autoTable(doc, { head: [["Tanggal", "Jumlah Batch"]], body: data.trend.map((t) => [t.date, t.batches]) });
    doc.save("analytics.pdf");
    toast.success("PDF diunduh");
  };

  if (!data) return <div className="text-slate-600">Memuat analitik...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-2">Management Dashboard</div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><BarChart3 className="w-8 h-8"/>Analitik Rantai Pasok</h1>
        </div>
        <div className="flex gap-2">
          <Button data-testid="export-csv-button" onClick={exportCsv} variant="outline" className="border-slate-700"><Download className="w-4 h-4 mr-2"/>CSV</Button>
          <Button data-testid="export-pdf-button" onClick={exportPdf} className="bg-emerald-600 hover:bg-emerald-700"><FileText className="w-4 h-4 mr-2"/>PDF</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card border-slate-200"><CardContent className="p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-4">Volume Panen per Varietas (kg)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.varieties}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#64748B" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#0A0E17", border: "1px solid #1E293B", borderRadius: 8 }} />
              <Bar dataKey="kg" fill="#4ADE80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card className="glass-card border-slate-200"><CardContent className="p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-cyan-700 mb-4">Distribusi per Wilayah</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.regions} dataKey="kg" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {data.regions.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0A0E17", border: "1px solid #1E293B", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card className="glass-card border-slate-200"><CardContent className="p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-amber-700 mb-4">Grade Produksi</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.grades}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
              <XAxis dataKey="grade" stroke="#64748B" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#0A0E17", border: "1px solid #1E293B", borderRadius: 8 }} />
              <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card className="glass-card border-slate-200"><CardContent className="p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-purple-700 mb-4">Trend Batch 7 Hari</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.trend}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#0A0E17", border: "1px solid #1E293B", borderRadius: 8 }} />
              <Line type="monotone" dataKey="batches" stroke="#8B5CF6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent></Card>
      </div>
    </div>
  );
}
