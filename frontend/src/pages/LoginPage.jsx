import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { INSTITUTION_FULL } from "@/lib/constants";
import { Sprout, Mail, Lock, Loader2, ArrowRight, GraduationCap, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [sPassword, setSPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (payload) => {
    setError(""); setLoading(true);
    try {
      const u = await login(payload);
      toast.success(`Selamat datang, ${u.name}`);
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  const handleStaff = (e) => { e.preventDefault(); submit({ email: email.trim().toLowerCase(), password }); };
  const handleStudent = (e) => { e.preventDefault(); submit({ username: username.trim().toLowerCase(), password: sPassword }); };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 sidebar-gradient relative overflow-hidden flex-col justify-between p-12">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: "url(/agro-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B2545]/70 via-[#0B2545]/65 to-[#061528]/95" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F5A623] to-[#FFC72C] flex items-center justify-center shadow-xl">
              <Sprout className="w-7 h-7 text-[#0B2545]" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-extrabold text-white text-lg">Kemitraan TIP</div>
              <div className="text-xs text-slate-300">Universitas Jember</div>
            </div>
          </div>
        </div>
        <div className="relative">
          <img src="/tip-logo.png" alt="Logo Teknologi Industri Pertanian" data-testid="tip-logo" className="h-28 w-auto mb-8 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]" />
          <h2 className="font-display font-extrabold text-white text-3xl xl:text-4xl leading-tight">
            Sistem Informasi<br />Kerjasama Terintegrasi
          </h2>
          <p className="text-slate-300 mt-4 max-w-md leading-relaxed">
            Kelola siklus kerja sama, dokumen PKS/IA/MoU, implementasi kegiatan, dan program
            Kampus Berdampak dalam satu sistem terintegrasi.
          </p>
          <div className="flex gap-8 mt-8">
            {[["Mitra Industri", "Terpusat"], ["Governance", "Immutable"], ["Kampus", "Berdampak"]].map(([a, b]) => (
              <div key={a}>
                <div className="text-[#FFC72C] font-display font-bold text-lg">{b}</div>
                <div className="text-slate-400 text-xs">{a}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-[11px] text-slate-400 max-w-md">{INSTITUTION_FULL}</div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#F5A623] to-[#FFC72C] flex items-center justify-center">
              <Sprout className="w-6 h-6 text-[#0B2545]" strokeWidth={2.5} />
            </div>
            <div className="font-display font-extrabold text-[#0B2545]">Kemitraan TIP UNEJ</div>
          </div>

          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0B2545]">Masuk ke Sistem</h1>
          <p className="text-slate-500 text-sm mt-1 mb-6">Pilih metode sesuai peran Anda.</p>

          <Tabs defaultValue="staff" className="w-full" onValueChange={() => setError("")}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="staff" data-testid="tab-staff"><ShieldCheck className="w-4 h-4 mr-1.5" /> Staf</TabsTrigger>
              <TabsTrigger value="mahasiswa" data-testid="tab-mahasiswa"><GraduationCap className="w-4 h-4 mr-1.5" /> Mahasiswa</TabsTrigger>
            </TabsList>

            {error && (
              <div data-testid="login-error" className="mb-4 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <TabsContent value="staff">
              <form onSubmit={handleStaff} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Staf</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input id="email" data-testid="staff-email-input" type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)} placeholder="nama@unej.ac.id" className="pl-10" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="password">Kata Sandi</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input id="password" data-testid="staff-password-input" type="password" required value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10" />
                  </div>
                </div>
                <Button type="submit" data-testid="staff-login-button" disabled={loading}
                  className="w-full bg-[#0B2545] hover:bg-[#061528] text-white active:scale-95 transition-transform">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Masuk <ArrowRight className="w-4 h-4 ml-1.5" /></>}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="mahasiswa">
              <form onSubmit={handleStudent} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username Mahasiswa</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input id="username" data-testid="student-username-input" required value={username} autoCapitalize="none"
                      onChange={(e) => setUsername(e.target.value)} placeholder="username dari prodi" className="pl-10" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="spassword">Kata Sandi</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input id="spassword" data-testid="student-password-input" type="password" required value={sPassword}
                      onChange={(e) => setSPassword(e.target.value)} placeholder="••••••••" className="pl-10" />
                  </div>
                </div>
                <Button type="submit" data-testid="student-login-button" disabled={loading}
                  className="w-full bg-[#F5A623] hover:bg-[#e0951a] text-[#0B2545] font-semibold active:scale-95 transition-transform">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Masuk <ArrowRight className="w-4 h-4 ml-1.5" /></>}
                </Button>
                <p className="text-xs text-slate-400 text-center">Username &amp; kata sandi diberikan oleh Tim Kerja Sama / Admin prodi.</p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
