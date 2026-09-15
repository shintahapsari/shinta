import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { WRITE_ROLES } from "@/lib/constants";
import StatusBadge from "@/components/StatusBadge";
import { Building2, Search, Plus, Eye, Loader2, AlertTriangle, Mail, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const EMPTY = { nama: "", jenis_perusahaan: "", kategori: "Nasional", sektor: "", region: "", alamat: "", nib: "", pic: "", email: "", telp: "", catatan: "" };

export default function PartnersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canWrite = WRITE_ROLES.includes(user.role);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [kategori, setKategori] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [dupes, setDupes] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (kategori !== "all") params.kategori = kategori;
      const { data } = await api.get("/partners", { params });
      setPartners(data);
    } catch { /* */ } finally { setLoading(false); }
  }, [q, kategori]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const checkDup = async (nama, nib) => {
    if (!nama || nama.length < 3) { setDupes([]); return; }
    try {
      const { data } = await api.post("/partners/check-duplicate", { nama, nib });
      setDupes(data.duplicates);
    } catch { /* */ }
  };

  const save = async () => {
    if (!form.nama.trim()) { toast.error("Nama mitra wajib diisi"); return; }
    setSaving(true);
    try {
      await api.post("/partners", form);
      toast.success("Mitra berhasil ditambahkan");
      setOpen(false); setForm(EMPTY); setDupes([]);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0B2545] flex items-center gap-2">
            <Building2 className="w-7 h-7 text-[#F5A623]" /> Master Mitra
          </h2>
          <p className="text-slate-500 text-sm mt-1">Single source of truth database mitra industri.</p>
        </div>
        {canWrite && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(EMPTY); setDupes([]); } }}>
            <DialogTrigger asChild>
              <Button data-testid="add-partner-button" className="bg-[#0B2545] hover:bg-[#061528] text-white active:scale-95 transition-transform">
                <Plus className="w-4 h-4 mr-1.5" /> Tambah Mitra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
              <DialogHeader><DialogTitle className="font-display text-[#0B2545]">Tambah Mitra Baru</DialogTitle></DialogHeader>
              {dupes.length > 0 && (
                <div data-testid="duplicate-alert" className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold">Kemungkinan duplikat terdeteksi:</span>
                    <ul className="mt-1 space-y-0.5">
                      {dupes.map((d) => <li key={d.id}>• {d.nama} <span className="text-amber-600">({d.score}% mirip)</span></li>)}
                    </ul>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Nama Mitra *</Label>
                  <Input data-testid="partner-nama-input" value={form.nama} className="mt-1.5"
                    onChange={(e) => { setForm({ ...form, nama: e.target.value }); checkDup(e.target.value, form.nib); }} />
                </div>
                <div>
                  <Label>Jenis Perusahaan</Label>
                  <Input value={form.jenis_perusahaan} className="mt-1.5" onChange={(e) => setForm({ ...form, jenis_perusahaan: e.target.value })} placeholder="BUMN / Swasta / UMKM" />
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Select value={form.kategori} onValueChange={(v) => setForm({ ...form, kategori: v })}>
                    <SelectTrigger data-testid="partner-kategori-select" className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nasional">Nasional</SelectItem>
                      <SelectItem value="Internasional">Internasional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Sektor</Label><Input value={form.sektor} className="mt-1.5" onChange={(e) => setForm({ ...form, sektor: e.target.value })} /></div>
                <div><Label>Region / Wilayah</Label><Input value={form.region} className="mt-1.5" onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
                <div><Label>NIB</Label><Input value={form.nib} className="mt-1.5" onChange={(e) => { setForm({ ...form, nib: e.target.value }); checkDup(form.nama, e.target.value); }} /></div>
                <div><Label>PIC / Kontak</Label><Input value={form.pic} className="mt-1.5" onChange={(e) => setForm({ ...form, pic: e.target.value })} placeholder="Tim Kerma (boleh kosong)" /></div>
                <div><Label>Email</Label><Input value={form.email} className="mt-1.5" onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="opsional" /></div>
                <div><Label>Telepon</Label><Input value={form.telp} className="mt-1.5" onChange={(e) => setForm({ ...form, telp: e.target.value })} placeholder="opsional" /></div>
                <div className="sm:col-span-2"><Label>Alamat</Label><Textarea value={form.alamat} className="mt-1.5" onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                <Button data-testid="save-partner-button" onClick={save} disabled={saving} className="bg-[#0B2545] text-white">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Mitra"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input data-testid="partner-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, PIC, sektor…" className="pl-10 bg-white" />
        </div>
        <Select value={kategori} onValueChange={setKategori}>
          <SelectTrigger data-testid="partner-kategori-filter" className="w-[180px] bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            <SelectItem value="Nasional">Nasional</SelectItem>
            <SelectItem value="Internasional">Internasional</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Mitra</th>
                <th className="px-4 py-3 font-semibold">Kategori</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Sektor</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Kontak</th>
                <th className="px-4 py-3 font-semibold text-center">Dok. Aktif</th>
                <th className="px-4 py-3 font-semibold text-center">Kegiatan</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#0B2545] mx-auto" /></td></tr>}
              {!loading && partners.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-slate-400">Tidak ada mitra ditemukan.</td></tr>}
              {!loading && partners.map((p, idx) => (
                <tr key={p.id} data-testid={`partner-row-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{p.nama}</div>
                    <div className="text-xs text-slate-400">{p.region || "—"}</div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.kategori} /></td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-600">{p.sektor || "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-600">
                    <div className="flex items-center gap-1 text-xs"><User className="w-3 h-3" />{p.pic || "—"}</div>
                    {p.email && <div className="flex items-center gap-1 text-xs text-slate-400"><Mail className="w-3 h-3" />{p.email}</div>}
                    {p.telp && <div className="flex items-center gap-1 text-xs text-slate-400"><Phone className="w-3 h-3" />{p.telp}</div>}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-emerald-600">{p.active_docs}</td>
                  <td className="px-4 py-3 text-center font-semibold text-blue-600">{p.impl_count}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" data-testid={`view-partner-${idx}`} onClick={() => navigate(`/partners/${p.id}`)} className="text-[#0B2545]">
                      <Eye className="w-4 h-4 mr-1" /> 360°
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
