import { useEffect, useState, useCallback } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { WRITE_ROLES } from "@/lib/constants";
import StatusBadge from "@/components/StatusBadge";
import { FileText, Plus, Loader2, History, GitBranch, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const JENIS = ["PKS", "IA", "MoU", "Prospektif"];
const KLAS = ["Tridharma", "Magang", "Penelitian"];
const STATUSES = ["Draft", "Active", "Expired", "Superseded"];

export default function DocumentsPage() {
  const { user } = useAuth();
  const canWrite = WRITE_ROLES.includes(user.role);
  const [docs, setDocs] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fJenis, setFJenis] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [versionsOf, setVersionsOf] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (fJenis !== "all") params.jenis = fJenis;
      if (fStatus !== "all") params.status = fStatus;
      const { data } = await api.get("/documents", { params });
      setDocs(data);
    } catch { /* */ } finally { setLoading(false); }
  }, [fJenis, fStatus]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/partners").then((r) => setPartners(r.data)).catch(() => {}); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ partner_id: "", jenis: "PKS", klasifikasi: "Tridharma", nomor: "", judul: "", tanggal_mulai: "", tanggal_berakhir: "", status: "Draft", changelog: "" });
    setOpen(true);
  };
  const openEdit = (d) => {
    setEditing(d);
    setForm({ ...d, tanggal_mulai: d.tanggal_mulai || "", tanggal_berakhir: d.tanggal_berakhir || "", changelog: "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.partner_id || !form.judul.trim()) { toast.error("Mitra dan judul wajib diisi"); return; }
    setSaving(true);
    const payload = { ...form, tanggal_mulai: form.tanggal_mulai || null, tanggal_berakhir: form.tanggal_berakhir || null };
    try {
      if (editing) {
        await api.put(`/documents/${editing.id}`, payload);
        toast.success("Revisi dokumen dibuat (versi baru)");
      } else {
        await api.post("/documents", payload);
        toast.success("Dokumen berhasil dibuat");
      }
      setOpen(false); load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally { setSaving(false); }
  };

  const showVersions = async (d) => {
    const { data } = await api.get(`/documents/${d.id}`);
    setVersionsOf(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0B2545] flex items-center gap-2">
            <FileText className="w-7 h-7 text-[#F5A623]" /> Repository Dokumen
          </h2>
          <p className="text-slate-500 text-sm mt-1">PKS / IA / MoU / Prospektif dengan riwayat versi immutable.</p>
        </div>
        {canWrite && (
          <Button data-testid="add-document-button" onClick={openCreate} className="bg-[#0B2545] hover:bg-[#061528] text-white active:scale-95 transition-transform">
            <Plus className="w-4 h-4 mr-1.5" /> Buat Dokumen
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={fJenis} onValueChange={setFJenis}>
          <SelectTrigger data-testid="doc-jenis-filter" className="w-[160px] bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            {JENIS.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger data-testid="doc-status-filter" className="w-[160px] bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {docs.some((d) => d.expiring_soon) && (
        <div data-testid="expiry-warning-banner" className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">{docs.filter((d) => d.expiring_soon).length} dokumen kerja sama mendekati masa berakhir.</span>
            {" "}Segera lakukan pembaruan (revisi) dokumen agar status kerja sama tetap aktif.
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Dokumen</th>
                <th className="px-4 py-3 font-semibold">Jenis</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Mitra</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Periode</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#0B2545] mx-auto" /></td></tr>}
              {!loading && docs.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-400">Tidak ada dokumen.</td></tr>}
              {!loading && docs.map((d, idx) => (
                <tr key={d.id} data-testid={`document-row-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{d.judul}</div>
                    <div className="text-xs text-slate-400 font-mono">{d.nomor} · v{d.version}</div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={d.jenis === "Prospektif" ? "Prospektif" : d.jenis} /></td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-600">{d.partner_nama}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">{d.tanggal_mulai || "—"} → {d.tanggal_berakhir || "tanpa expiry"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} testid={`document-status-${idx}`} />
                    {d.expiring_soon && (
                      <div data-testid={`doc-expiring-${idx}`} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        <AlertTriangle className="w-3 h-3" /> Perlu pembaruan · {d.days_to_expiry}h lagi
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" data-testid={`doc-versions-${idx}`} onClick={() => showVersions(d)} className="text-slate-600">
                      <History className="w-4 h-4" />
                    </Button>
                    {canWrite && (
                      <Button size="sm" variant="ghost" data-testid={`doc-revise-${idx}`} onClick={() => openEdit(d)} className="text-[#0B2545]">
                        <GitBranch className="w-4 h-4 mr-1" /> Revisi
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Revise dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
          <DialogHeader><DialogTitle className="font-display text-[#0B2545]">{editing ? `Revisi Dokumen (v${editing.version} → v${editing.version + 1})` : "Buat Dokumen Baru"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Mitra *</Label>
                <Select value={form.partner_id} onValueChange={(v) => setForm({ ...form, partner_id: v })}>
                  <SelectTrigger data-testid="doc-partner-select" className="mt-1.5"><SelectValue placeholder="Pilih mitra" /></SelectTrigger>
                  <SelectContent>{partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Judul *</Label><Input data-testid="doc-judul-input" value={form.judul} className="mt-1.5" onChange={(e) => setForm({ ...form, judul: e.target.value })} /></div>
              <div><Label>Nomor Dokumen</Label><Input value={form.nomor} className="mt-1.5" onChange={(e) => setForm({ ...form, nomor: e.target.value })} /></div>
              <div>
                <Label>Jenis</Label>
                <Select value={form.jenis} onValueChange={(v) => setForm({ ...form, jenis: v })}>
                  <SelectTrigger data-testid="doc-jenis-select" className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{JENIS.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Klasifikasi</Label>
                <Select value={form.klasifikasi} onValueChange={(v) => setForm({ ...form, klasifikasi: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{KLAS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="doc-status-select" className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Tanggal Mulai</Label><Input type="date" value={form.tanggal_mulai} className="mt-1.5" onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} /></div>
              <div><Label>Tanggal Berakhir</Label><Input type="date" value={form.tanggal_berakhir} className="mt-1.5" onChange={(e) => setForm({ ...form, tanggal_berakhir: e.target.value })} /><p className="text-[11px] text-slate-400 mt-1">Kosongkan → aktif tanpa expiry sementara.</p></div>
              <div className="sm:col-span-2"><Label>Catatan Perubahan (changelog)</Label><Textarea value={form.changelog} className="mt-1.5" onChange={(e) => setForm({ ...form, changelog: e.target.value })} placeholder="Deskripsi versi ini" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button data-testid="save-document-button" onClick={save} disabled={saving} className="bg-[#0B2545] text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? "Simpan Revisi" : "Simpan Dokumen")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versions dialog */}
      <Dialog open={!!versionsOf} onOpenChange={(o) => !o && setVersionsOf(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-[#0B2545]">Riwayat Versi Dokumen</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto scroll-thin" data-testid="version-history">
            {versionsOf?.versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
                <div>
                  <div className="flex items-center gap-2"><span className="font-semibold text-slate-800">v{v.version}</span>{v.is_latest && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">TERKINI</span>}</div>
                  <p className="text-xs text-slate-500">{v.changelog || "—"}</p>
                  <p className="text-[11px] text-slate-400">{v.created_by_name} · {new Date(v.created_at).toLocaleDateString("id-ID")}</p>
                </div>
                <StatusBadge status={v.status} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
