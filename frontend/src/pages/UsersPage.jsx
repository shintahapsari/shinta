import { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/constants";
import { Users, Plus, Loader2, Power, KeyRound, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ROLE_BADGE = {
  admin: "bg-[#0B2545] text-white",
  tim_kerjasama: "bg-sky-100 text-sky-700",
  tim_mbkm: "bg-violet-100 text-violet-700",
  tim_manajemen: "bg-slate-100 text-slate-600",
  mahasiswa: "bg-emerald-100 text-emerald-700",
};
const EMPTY = { email: "", username: "", nim: "", name: "", role: "mahasiswa", password: "", jabatan: "" };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [newPass, setNewPass] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get("/users"); setUsers(data); } catch { /* */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const isStudent = form.role === "mahasiswa";

  const save = async () => {
    if (!form.name || !form.password) { toast.error("Nama dan kata sandi wajib diisi"); return; }
    if (isStudent && !form.username) { toast.error("Username wajib untuk mahasiswa"); return; }
    if (!isStudent && !form.email) { toast.error("Email wajib untuk staf"); return; }
    setSaving(true);
    try {
      const payload = { ...form, email: form.email || null, username: form.username || null };
      await api.post("/users", payload);
      toast.success("Pengguna berhasil dibuat");
      setOpen(false); setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally { setSaving(false); }
  };

  const bulkSave = async () => {
    if (!bulkText.trim()) { toast.error("Isi daftar akun terlebih dahulu"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/users/bulk-mahasiswa", { lines: bulkText });
      setBulkResult(data);
      if (data.created) toast.success(`${data.created} akun mahasiswa dibuat`);
      if (data.errors.length) toast.warning(`${data.errors.length} baris gagal`);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally { setSaving(false); }
  };

  const doReset = async () => {
    if (!newPass || newPass.length < 6) { toast.error("Kata sandi minimal 6 karakter"); return; }
    setSaving(true);
    try {
      await api.put(`/users/${resetUser.id}`, { password: newPass });
      toast.success(`Kata sandi ${resetUser.username || resetUser.email} diperbarui`);
      setResetUser(null); setNewPass("");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    await api.put(`/users/${u.id}`, { is_active: !u.is_active });
    toast.success(u.is_active ? "Akun dinonaktifkan" : "Akun diaktifkan");
    load();
  };

  const shown = users.filter((u) => filter === "all" ? true : filter === "mahasiswa" ? u.role === "mahasiswa" : u.role !== "mahasiswa");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0B2545] flex items-center gap-2">
            <Users className="w-7 h-7 text-[#F5A623]" /> Manajemen Pengguna
          </h2>
          <p className="text-slate-500 text-sm mt-1">Kelola akun staf, akun mahasiswa (username &amp; kata sandi), dan peran.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={bulkOpen} onOpenChange={(v) => { setBulkOpen(v); if (!v) { setBulkResult(null); } }}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="bulk-students-button" className="border-[#0B2545] text-[#0B2545]">
                <Upload className="w-4 h-4 mr-1.5" /> Impor Mahasiswa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-[#0B2545]">Impor Akun Mahasiswa Massal</DialogTitle>
                <DialogDescription>Satu akun per baris, format: <code className="font-mono text-xs">username,password,nama,nim</code> (NIM opsional).</DialogDescription>
              </DialogHeader>
              <Textarea data-testid="bulk-students-textarea" rows={8} value={bulkText} onChange={(e) => setBulkText(e.target.value)}
                placeholder={"budi.santoso,Rahasia123,Budi Santoso,231710101001\nsiti.aminah,Rahasia456,Siti Aminah,231710101002"} className="font-mono text-xs" />
              {bulkResult && (
                <div data-testid="bulk-result" className="text-xs space-y-1 max-h-32 overflow-auto rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <div className="text-emerald-700 font-semibold">{bulkResult.created} akun dibuat</div>
                  {bulkResult.errors.map((e, i) => <div key={i} className="text-red-600">{e}</div>)}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkOpen(false)}>Tutup</Button>
                <Button data-testid="bulk-students-save" onClick={bulkSave} disabled={saving} className="bg-[#0B2545] text-white">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Impor"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-user-button" className="bg-[#0B2545] hover:bg-[#061528] text-white active:scale-95 transition-transform">
                <Plus className="w-4 h-4 mr-1.5" /> Tambah Pengguna
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="font-display text-[#0B2545]">Tambah Pengguna</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Peran</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger data-testid="user-role-select" className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["mahasiswa", "admin", "tim_kerjasama", "tim_mbkm", "tim_manajemen"].map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Nama</Label><Input data-testid="user-name-input" value={form.name} className="mt-1.5" onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                {isStudent ? (
                  <>
                    <div><Label>Username</Label><Input data-testid="user-username-input" value={form.username} className="mt-1.5" placeholder="mis. budi.santoso" onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
                    <div><Label>NIM (opsional)</Label><Input data-testid="user-nim-input" value={form.nim} className="mt-1.5" onChange={(e) => setForm({ ...form, nim: e.target.value })} /></div>
                  </>
                ) : (
                  <>
                    <div><Label>Email</Label><Input data-testid="user-email-input" value={form.email} className="mt-1.5" onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                    <div><Label>Jabatan</Label><Input value={form.jabatan} className="mt-1.5" onChange={(e) => setForm({ ...form, jabatan: e.target.value })} /></div>
                  </>
                )}
                <div><Label>Kata Sandi</Label><Input data-testid="user-password-input" type="password" value={form.password} className="mt-1.5" onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                <Button data-testid="save-user-button" onClick={save} disabled={saving} className="bg-[#0B2545] text-white">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2">
        {[["all", "Semua"], ["staf", "Staf"], ["mahasiswa", "Mahasiswa"]].map(([k, l]) => (
          <button key={k} data-testid={`filter-${k}`} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === k ? "bg-[#0B2545] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Username / Email</th>
                <th className="px-4 py-3 font-semibold">Peran</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#0B2545] mx-auto" /></td></tr>}
              {!loading && shown.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Belum ada pengguna.</td></tr>}
              {!loading && shown.map((u, idx) => (
                <tr key={u.id} data-testid={`user-row-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800">{u.name}<div className="text-xs text-slate-400 font-normal">{u.role === "mahasiswa" ? (u.nim ? `NIM ${u.nim}` : "") : u.jabatan}</div></td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.username && <div className="font-mono text-xs text-[#0B2545] font-semibold">{u.username}</div>}
                    {u.email && <div className="text-xs">{u.email}</div>}
                  </td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded ${ROLE_BADGE[u.role]}`}>{ROLE_LABELS[u.role]}</span></td>
                  <td className="px-4 py-3">{u.is_active ? <span className="text-emerald-600 text-xs font-medium">Aktif</span> : <span className="text-red-500 text-xs font-medium">Nonaktif</span>}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" data-testid={`reset-pass-${idx}`} title="Ganti kata sandi" onClick={() => { setResetUser(u); setNewPass(""); }} className="text-slate-600">
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" data-testid={`toggle-user-${idx}`} title={u.is_active ? "Nonaktifkan" : "Aktifkan"} onClick={() => toggleActive(u)} className="text-slate-600">
                      <Power className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!resetUser} onOpenChange={(v) => { if (!v) setResetUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-[#0B2545]">Ganti Kata Sandi</DialogTitle>
            <DialogDescription>{resetUser?.name} — <span className="font-mono text-xs">{resetUser?.username || resetUser?.email}</span></DialogDescription>
          </DialogHeader>
          <div><Label>Kata Sandi Baru</Label><Input data-testid="reset-password-input" type="text" value={newPass} className="mt-1.5 font-mono" onChange={(e) => setNewPass(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUser(null)}>Batal</Button>
            <Button data-testid="reset-password-save" onClick={doReset} disabled={saving} className="bg-[#0B2545] text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
