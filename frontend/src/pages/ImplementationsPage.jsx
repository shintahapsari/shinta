import { useEffect, useState, useCallback } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { APPROVE_ROLES } from "@/lib/constants";
import StatusBadge from "@/components/StatusBadge";
import { ClipboardList, Plus, Loader2, CheckCircle2, ExternalLink, ShieldCheck, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const KEGIATAN = ["Belum Dimulai", "Dalam Proses", "Selesai", "Tertunda"];
const TRIWULAN = ["Q1", "Q2", "Q3", "Q4"];

export default function ImplementationsPage() {
  const { user } = useAuth();
  const isStudent = user.role === "mahasiswa";
  const canApprove = APPROVE_ROLES.includes(user.role);
  const canCreate = user.role !== "tim_manajemen";
  const [items, setItems] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fApproval, setFApproval] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [appr, setAppr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (fApproval !== "all") params.status_approval = fApproval;
      const { data } = await api.get("/implementations", { params });
      setItems(data);
    } catch { /* */ } finally { setLoading(false); }
  }, [fApproval]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/partners").then((r) => setPartners(r.data)).catch(() => {}); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ partner_id: "", document_id: null, tahun: new Date().getFullYear(), triwulan: "Q1", jenis_kegiatan: "", judul: "", scope_mbkm: false, kampus_berdampak: false, status_kegiatan: "Dalam Proses", link_output: "", region: "", jumlah_dosen: 0, jumlah_mahasiswa: 0, dosen_list: [], mahasiswa_list: [], catatan: "" });
    setOpen(true);
  };
  const openEdit = (i) => {
    setEditing(i);
    setForm({ ...i });
    setOpen(true);
  };

  const save = async () => {
    if (!form.partner_id || !form.judul.trim() || !form.jenis_kegiatan.trim()) { toast.error("Mitra, judul, dan jenis kegiatan wajib diisi"); return; }
    setSaving(true);
    const payload = { ...form, tahun: Number(form.tahun), jumlah_dosen: Number(form.jumlah_dosen), jumlah_mahasiswa: Number(form.jumlah_mahasiswa) };
    try {
      if (editing) {
        await api.put(`/implementations/${editing.id}`, payload);
        toast.success("Implementasi diperbarui");
      } else {
        await api.post("/implementations", payload);
        toast.success("Implementasi diajukan (menunggu verifikasi)");
      }
      setOpen(false); load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally { setSaving(false); }
  };

  const submitApproval = async (status) => {
    try {
      await api.post(`/implementations/${appr.id}/approval`, { status_approval: status, catatan: appr.catatan || "" });
      toast.success(`Status diperbarui: ${status}`);
      setAppr(null); load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0B2545] flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-[#F5A623]" /> {isStudent ? "Laporan Implementasi Saya" : "Modul Implementasi"}
          </h2>
          <p className="text-slate-500 text-sm mt-1">Status Kegiatan &amp; Status Approval dipisah — hanya <b>Approved</b> masuk metrik.</p>
        </div>
        {canCreate && (
          <Button data-testid="add-impl-button" onClick={openCreate} className="bg-[#0B2545] hover:bg-[#061528] text-white active:scale-95 transition-transform">
            <Plus className="w-4 h-4 mr-1.5" /> {isStudent ? "Ajukan Kegiatan" : "Tambah Implementasi"}
          </Button>
        )}
      </div>

      <Select value={fApproval} onValueChange={setFApproval}>
        <SelectTrigger data-testid="impl-approval-filter" className="w-[220px] bg-white"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Status Approval</SelectItem>
          {["Pending", "Approved", "Rejected", "Revision"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-1 gap-3">
        {loading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#0B2545]" /></div>}
        {!loading && items.length === 0 && <p className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">Belum ada implementasi.</p>}
        {!loading && items.map((i, idx) => (
          <div key={i.id} data-testid={`impl-row-${idx}`} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-semibold text-[#0B2545]">{i.judul}</h3>
                  {i.scope_mbkm && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-semibold">MBKM</span>}
                  {i.kampus_berdampak && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">Kampus Berdampak</span>}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{i.partner_nama} · {i.jenis_kegiatan}</p>
                <p className="text-xs text-slate-400 mt-1">{i.tahun} {i.triwulan} · {i.region || "—"} · {i.jumlah_dosen} dosen, {i.jumlah_mahasiswa} mahasiswa</p>
                {(i.dosen_list?.length > 0 || i.mahasiswa_list?.length > 0) && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {i.dosen_list?.length > 0 && <span>Dosen: {i.dosen_list.join(", ")}. </span>}
                    {i.mahasiswa_list?.length > 0 && <span>Mahasiswa: {i.mahasiswa_list.join(", ")}.</span>}
                  </p>
                )}
                {i.catatan_approval && <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 px-2 py-1 rounded">Catatan: {i.catatan_approval}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <StatusBadge status={i.status_kegiatan} testid={`impl-kegiatan-${idx}`} />
                  <StatusBadge status={i.status_approval} testid={`impl-approval-${idx}`} />
                </div>
                <div className="flex gap-2">
                  {i.link_output && (
                    <a href={i.link_output} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                      <ExternalLink className="w-3 h-3" /> Bukti
                    </a>
                  )}
                  {canCreate && !(user.role === "mahasiswa" && i.kampus_berdampak) && (
                    <Button size="sm" variant="ghost" data-testid={`impl-edit-${idx}`} onClick={() => openEdit(i)} className="text-[#0B2545]">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  {canApprove && (
                    <Button size="sm" variant="outline" data-testid={`impl-verify-${idx}`} onClick={() => setAppr({ id: i.id, judul: i.judul, catatan: "" })}>
                      <ShieldCheck className="w-4 h-4 mr-1" /> Verifikasi
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
          <DialogHeader><DialogTitle className="font-display text-[#0B2545]">{editing ? "Edit Implementasi Kegiatan" : "Ajukan Implementasi Kegiatan"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Mitra *</Label>
                <Select value={form.partner_id} onValueChange={(v) => setForm({ ...form, partner_id: v })}>
                  <SelectTrigger data-testid="impl-partner-select" className="mt-1.5"><SelectValue placeholder="Pilih mitra" /></SelectTrigger>
                  <SelectContent>{partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Judul Kegiatan *</Label><Input data-testid="impl-judul-input" value={form.judul} className="mt-1.5" onChange={(e) => setForm({ ...form, judul: e.target.value })} /></div>
              <div><Label>Jenis Kegiatan *</Label><Input data-testid="impl-jenis-input" value={form.jenis_kegiatan} className="mt-1.5" onChange={(e) => setForm({ ...form, jenis_kegiatan: e.target.value })} placeholder="Magang / Penelitian / Pengabdian" /></div>
              <div><Label>Region</Label><Input value={form.region} className="mt-1.5" onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
              <div><Label>Tahun</Label><Input type="number" value={form.tahun} className="mt-1.5" onChange={(e) => setForm({ ...form, tahun: e.target.value })} /></div>
              <div>
                <Label>Triwulan</Label>
                <Select value={form.triwulan} onValueChange={(v) => setForm({ ...form, triwulan: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIWULAN.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status Kegiatan</Label>
                <Select value={form.status_kegiatan} onValueChange={(v) => setForm({ ...form, status_kegiatan: v })}>
                  <SelectTrigger data-testid="impl-kegiatan-select" className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{KEGIATAN.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Nama Dosen Terlibat</Label><Textarea data-testid="impl-dosen-input" value={(form.dosen_list || []).join("\n")} className="mt-1.5" rows={3} onChange={(e) => setForm({ ...form, dosen_list: e.target.value.split("\n") })} placeholder="Satu nama per baris" /><p className="text-[11px] text-slate-400 mt-1">Jumlah dosen dihitung otomatis dari daftar nama.</p></div>
              <div className="sm:col-span-2"><Label>Nama Mahasiswa Terlibat</Label><Textarea data-testid="impl-mahasiswa-input" value={(form.mahasiswa_list || []).join("\n")} className="mt-1.5" rows={4} onChange={(e) => setForm({ ...form, mahasiswa_list: e.target.value.split("\n") })} placeholder="Satu nama per baris" /><p className="text-[11px] text-slate-400 mt-1">Jumlah mahasiswa dihitung otomatis dari daftar nama.</p></div>
              <div className="sm:col-span-2"><Label>Link Output / Bukti</Label><Input data-testid="impl-link-input" value={form.link_output} className="mt-1.5" onChange={(e) => setForm({ ...form, link_output: e.target.value })} placeholder="https://…" /></div>
              <div className="sm:col-span-2">
                <Label>Kategori Kampus Berdampak</Label>
                <Select value={form.kampus_berdampak ? "ya" : "tidak"} onValueChange={(v) => setForm({ ...form, kampus_berdampak: v === "ya" })}>
                  <SelectTrigger data-testid="impl-kb-select" className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ya">Kampus Berdampak</SelectItem>
                    <SelectItem value="tidak">Bukan Kampus Berdampak</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400 mt-1">Kegiatan Kampus Berdampak otomatis masuk dashboard Kampus Berdampak setelah diverifikasi (Approved) oleh Tim Kerja Sama.</p>
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <Checkbox id="mbkm" data-testid="impl-mbkm-checkbox" checked={form.scope_mbkm} onCheckedChange={(v) => setForm({ ...form, scope_mbkm: !!v })} />
                <Label htmlFor="mbkm" className="cursor-pointer">Termasuk lingkup MBKM</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button data-testid="save-impl-button" onClick={save} disabled={saving} className="bg-[#0B2545] text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? "Simpan Perubahan" : "Ajukan")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval dialog */}
      <Dialog open={!!appr} onOpenChange={(o) => !o && setAppr(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display text-[#0B2545]">Verifikasi Implementasi</DialogTitle></DialogHeader>
          {appr && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">{appr.judul}</p>
              <div>
                <Label>Catatan Verifikasi</Label>
                <Textarea data-testid="approval-note-input" className="mt-1.5" value={appr.catatan} onChange={(e) => setAppr({ ...appr, catatan: e.target.value })} placeholder="Opsional untuk Approved, wajib jelas untuk Revision/Rejected" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button data-testid="approve-button" onClick={() => submitApproval("Approved")} className="bg-emerald-600 hover:bg-emerald-700 text-white"><CheckCircle2 className="w-4 h-4 mr-1" /> Setujui</Button>
                <Button data-testid="revision-button" onClick={() => submitApproval("Revision")} variant="outline" className="border-amber-300 text-amber-700">Revisi</Button>
                <Button data-testid="reject-button" onClick={() => submitApproval("Rejected")} variant="outline" className="border-red-300 text-red-700">Tolak</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
