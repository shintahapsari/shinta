import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, UserPlus, Trash2 } from "lucide-react";

const ROLES = ["farmer", "collector", "manufacturer", "distributor", "retailer"];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "farmer", company: "", position: "", contact: "" });
  const set = (k, v) => setForm({ ...form, [k]: v });

  const load = () => api.get("/users").then(({ data }) => setUsers(data));
  useEffect(() => { load(); }, []);

  const invite = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users/invite", form);
      toast.success("Undangan terkirim & akun dibuat");
      setOpen(false); setForm({ email: "", password: "", name: "", role: "farmer", company: "", position: "", contact: "" }); load();
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal"); }
  };

  const del = async (id) => {
    if (!confirm("Hapus user ini?")) return;
    await api.delete(`/users/${id}`); load();
  };

  const roleClr = { farmer: "text-emerald-700 bg-emerald-100 border-emerald-300", collector: "text-amber-700 bg-amber-100 border-amber-300", manufacturer: "text-blue-700 bg-blue-100 border-blue-300", distributor: "text-purple-700 bg-purple-100 border-purple-300", retailer: "text-cyan-700 bg-cyan-950/60 border-cyan-300", admin: "text-rose-700 bg-rose-100 border-rose-300" };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-2">Admin Only</div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Users className="w-8 h-8"/>Manajemen Pengguna</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="invite-user-button" className="bg-emerald-600 hover:bg-emerald-700"><UserPlus className="w-4 h-4 mr-2"/>Undang Pengguna</Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-slate-200 max-w-xl">
            <DialogHeader><DialogTitle>Undang Pengguna Baru</DialogTitle></DialogHeader>
            <form onSubmit={invite} className="grid grid-cols-2 gap-3">
              <div><Label>Nama</Label><Input data-testid="invite-name-input" value={form.name} onChange={(e) => set("name", e.target.value)} required className="bg-white border-slate-200 mt-1" /></div>
              <div><Label>Email</Label><Input data-testid="invite-email-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required className="bg-white border-slate-200 mt-1" /></div>
              <div><Label>Password Awal</Label><Input data-testid="invite-password-input" value={form.password} onChange={(e) => set("password", e.target.value)} required className="bg-white border-slate-200 mt-1" /></div>
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => set("role", v)}>
                  <SelectTrigger data-testid="invite-role-select" className="bg-white border-slate-200 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Perusahaan</Label><Input data-testid="invite-company-input" value={form.company} onChange={(e) => set("company", e.target.value)} className="bg-white border-slate-200 mt-1" /></div>
              <div><Label>Jabatan</Label><Input data-testid="invite-position-input" value={form.position} onChange={(e) => set("position", e.target.value)} className="bg-white border-slate-200 mt-1" /></div>
              <div className="col-span-2"><Label>Kontak</Label><Input data-testid="invite-contact-input" value={form.contact} onChange={(e) => set("contact", e.target.value)} className="bg-white border-slate-200 mt-1" /></div>
              <Button data-testid="invite-submit-button" type="submit" className="col-span-2 bg-emerald-600 hover:bg-emerald-700">Buat Akun</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card border-slate-200"><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-widest text-slate-500 font-mono">
            <tr><th className="text-left p-4">Nama</th><th className="text-left p-4">Email</th><th className="text-left p-4">Role</th><th className="text-left p-4">Perusahaan</th><th className="text-left p-4">Jabatan</th><th className="p-4"></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="p-4 font-medium">{u.name}</td>
                <td className="p-4 text-slate-600">{u.email}</td>
                <td className="p-4"><Badge className={`${roleClr[u.role]} border text-[10px] uppercase`}>{u.role}</Badge></td>
                <td className="p-4 text-slate-600">{u.company || "-"}</td>
                <td className="p-4 text-slate-600">{u.position || "-"}</td>
                <td className="p-4 text-right">{u.role !== "admin" && <Button data-testid={`delete-user-${u._id}`} onClick={() => del(u._id)} size="sm" variant="ghost" className="text-rose-700 hover:bg-rose-50"><Trash2 className="w-4 h-4"/></Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
