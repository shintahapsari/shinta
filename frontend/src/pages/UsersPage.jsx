import { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/constants";
import { Users, Plus, Loader2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
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

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "tim_kerjasama", password: "", jabatan: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get("/users"); setUsers(data); } catch { /* */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.email || !form.name) { toast.error("Email dan nama wajib diisi"); return; }
    setSaving(true);
    try {
      await api.post("/users", form);
      toast.success("Pengguna berhasil dibuat");
      setOpen(false); setForm({ email: "", name: "", role: "tim_kerjasama", password: "", jabatan: "" });
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    await api.put(`/users/${u.id}`, { is_active: !u.is_active });
    toast.success(u.is_active ? "Akun dinonaktifkan" : "Akun diaktifkan");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0B2545] flex items-center gap-2">
            <Users className="w-7 h-7 text-[#F5A623]" /> Manajemen Pengguna
          </h2>
          <p className="text-slate-500 text-sm mt-1">Kelola akun staf dan peran (RBAC).</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-user-button" className="bg-[#0B2545] hover:bg-[#061528] text-white active:scale-95 transition-transform">
              <Plus className="w-4 h-4 mr-1.5" /> Tambah Pengguna
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display text-[#0B2545]">Tambah Pengguna Staf</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nama</Label><Input data-testid="user-name-input" value={form.name} className="mt-1.5" onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input data-testid="user-email-input" value={form.email} className="mt-1.5" onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div>
                <Label>Peran</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger data-testid="user-role-select" className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["admin", "tim_kerjasama", "tim_mbkm", "tim_manajemen"].map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Jabatan</Label><Input value={form.jabatan} className="mt-1.5" onChange={(e) => setForm({ ...form, jabatan: e.target.value })} /></div>
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

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Peran</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#0B2545] mx-auto" /></td></tr>}
              {!loading && users.map((u, idx) => (
                <tr key={u.id} data-testid={`user-row-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800">{u.name}<div className="text-xs text-slate-400 font-normal">{u.jabatan}</div></td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded ${ROLE_BADGE[u.role]}`}>{ROLE_LABELS[u.role]}</span></td>
                  <td className="px-4 py-3">{u.is_active ? <span className="text-emerald-600 text-xs font-medium">Aktif</span> : <span className="text-red-500 text-xs font-medium">Nonaktif</span>}</td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== "mahasiswa" && (
                      <Button size="sm" variant="ghost" data-testid={`toggle-user-${idx}`} onClick={() => toggleActive(u)} className="text-slate-600">
                        <Power className="w-4 h-4" />
                      </Button>
                    )}
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
