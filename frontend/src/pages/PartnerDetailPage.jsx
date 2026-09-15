import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import {
  ArrowLeft, Building2, MapPin, User, Mail, Phone, FileText, ClipboardList, ScrollText, Loader2, Hash, Tag,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function PartnerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/partners/${id}`).then((r) => setData(r.data)).catch(() => navigate("/partners"));
  }, [id, navigate]);

  if (!data) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" /></div>;
  const { partner: p, documents, implementations, audit } = data;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/partners")} data-testid="back-to-partners" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0B2545] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Master Mitra
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0B2545] to-[#1E3A8A] flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display font-extrabold text-2xl text-[#0B2545]" data-testid="partner-detail-name">{p.nama}</h2>
              <StatusBadge status={p.kategori} />
            </div>
            <p className="text-slate-500 text-sm mt-0.5">{p.jenis_perusahaan} · {p.sektor}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <InfoRow icon={MapPin} label="Region / Wilayah" value={p.region} />
          <InfoRow icon={Hash} label="NIB" value={p.nib} />
          <InfoRow icon={Tag} label="Sektor" value={p.sektor} />
          <InfoRow icon={User} label="PIC / Kontak" value={p.pic} />
          <InfoRow icon={Mail} label="Email" value={p.email} />
          <InfoRow icon={Phone} label="Telepon" value={p.telp} />
          <div className="sm:col-span-2 lg:col-span-3"><InfoRow icon={MapPin} label="Alamat" value={p.alamat} /></div>
        </div>
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents" data-testid="tab-partner-documents"><FileText className="w-4 h-4 mr-1.5" /> Dokumen ({documents.length})</TabsTrigger>
          <TabsTrigger value="implementations" data-testid="tab-partner-impl"><ClipboardList className="w-4 h-4 mr-1.5" /> Implementasi ({implementations.length})</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-partner-audit"><ScrollText className="w-4 h-4 mr-1.5" /> Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4 space-y-3">
          {documents.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">Belum ada dokumen.</p>}
          {documents.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800">{d.judul}</span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{d.jenis}</span>
                  <span className="text-xs text-slate-400">v{d.version}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{d.klasifikasi} · {d.tanggal_mulai || "—"} → {d.tanggal_berakhir || "tanpa expiry"}</p>
              </div>
              <StatusBadge status={d.status} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="implementations" className="mt-4 space-y-3">
          {implementations.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">Belum ada implementasi.</p>}
          {implementations.map((i) => (
            <div key={i.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="font-semibold text-slate-800">{i.judul}</span>
                <div className="flex gap-2">
                  <StatusBadge status={i.status_kegiatan} />
                  <StatusBadge status={i.status_approval} />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">{i.tahun} {i.triwulan} · {i.jenis_kegiatan} · {i.jumlah_dosen} dosen, {i.jumlah_mahasiswa} mahasiswa</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {audit.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">Belum ada riwayat.</p>}
            {audit.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[#0B2545] text-white shrink-0">{a.action}</span>
                <div className="min-w-0">
                  <p className="text-sm text-slate-700">{a.detail}</p>
                  <p className="text-xs text-slate-400">{a.user_name} · {new Date(a.timestamp).toLocaleString("id-ID")}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
