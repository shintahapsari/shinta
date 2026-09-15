import { useEffect, useState, useCallback } from "react";
import api, { API } from "@/lib/api";
import { BarChart3, FileDown, FileSpreadsheet, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const REPORTS = [
  { key: "implementasi", label: "Implementasi" },
  { key: "partner", label: "Per Partner" },
  { key: "tahunan", label: "Tahunan" },
  { key: "kampus-berdampak", label: "Kampus Berdampak" },
  { key: "mbkm", label: "MBKM" },
];

export default function ReportsPage() {
  const [active, setActive] = useState("implementasi");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/${active}`);
      setData(res.data);
    } catch { /* */ } finally { setLoading(false); }
  }, [active]);

  useEffect(() => { load(); }, [load]);

  const doExport = async (format) => {
    setExporting(format);
    try {
      const res = await api.get(`/reports/${active}/export`, { params: { format }, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${active}.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Laporan ${format === "excel" ? "Excel" : "PDF"} berhasil diunduh`);
    } catch {
      toast.error("Gagal mengekspor laporan");
    } finally { setExporting(""); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0B2545] flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-[#F5A623]" /> Laporan &amp; Ekspor
          </h2>
          <p className="text-slate-500 text-sm mt-1">Pratinjau dan ekspor laporan ke PDF atau Excel.</p>
        </div>
        <div className="flex gap-2">
          <Button data-testid="export-pdf-button" onClick={() => doExport("pdf")} disabled={!!exporting} variant="outline" className="border-red-200 text-red-700">
            {exporting === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileDown className="w-4 h-4 mr-1.5" /> PDF</>}
          </Button>
          <Button data-testid="export-excel-button" onClick={() => doExport("excel")} disabled={!!exporting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {exporting === "excel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileSpreadsheet className="w-4 h-4 mr-1.5" /> Excel</>}
          </Button>
        </div>
      </div>

      <Tabs value={active} onValueChange={setActive}>
        <TabsList className="flex-wrap h-auto">
          {REPORTS.map((r) => <TabsTrigger key={r.key} value={r.key} data-testid={`report-tab-${r.key}`}>{r.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Eye className="w-4 h-4 text-slate-400" />
          <span className="font-display font-semibold text-[#0B2545]">{data?.title || "Memuat…"}</span>
          {data && <span className="text-xs text-slate-400">({data.rows.length} baris)</span>}
        </div>
        <div className="overflow-x-auto scroll-thin">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#0B2545]" /></div>
          ) : (
            <table className="w-full text-sm" data-testid="report-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                  {data?.headers.map((h) => <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data?.rows.length === 0 && <tr><td colSpan={data.headers.length} className="text-center py-12 text-slate-400">Tidak ada data.</td></tr>}
                {data?.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    {row.map((cell, j) => <td key={j} className="px-4 py-3 text-slate-600">{String(cell ?? "—")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
