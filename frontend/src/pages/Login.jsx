import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Leaf, Blocks, ShieldCheck, Languages } from "lucide-react";

const DEMO = [
  { email: "shintasyafrina9801@gmail.com", pw: "Admin@123", label: "Admin" },
  { email: "farmer@tembakau.id", pw: "Password@123", label: "Petani" },
  { email: "collector@tembakau.id", pw: "Password@123", label: "Pengepul" },
  { email: "manufacturer@tembakau.id", pw: "Password@123", label: "Pabrik" },
  { email: "distributor@tembakau.id", pw: "Password@123", label: "Distributor" },
  { email: "retailer@tembakau.id", pw: "Password@123", label: "Ritel" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { login, formatErr } = useAuth();
  const { t, lang, toggle } = useLang();
  const nav = useNavigate();

  const submit = async (e) => {
    e?.preventDefault(); setBusy(true);
    try { await login(email, password); toast.success(lang === "id" ? "Berhasil masuk" : "Signed in successfully"); nav("/"); }
    catch (err) { toast.error(formatErr(err.response?.data?.detail) || err.message); }
    finally { setBusy(false); }
  };
  const quick = (d) => { setEmail(d.email); setPassword(d.pw); };

  return (
    <div className="min-h-screen flex items-stretch">
      <div className="hidden lg:flex tobacco-hero flex-1 relative p-12 flex-col justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-emerald-100">Sintesa Tembakau Nusantara</div>
            <div className="text-2xl font-bold">{t("tagline")}</div>
          </div>
        </div>
        <div className="space-y-5 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 backdrop-blur-md text-white text-xs font-mono uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 chain-node-active"/> {t("live_network")} · {t("validators")}
          </div>
          <h1 className="text-5xl font-bold tracking-tight leading-[1.05]">
            Tobacco Smart Blockchain:
          </h1>
          <p className="text-3xl font-semibold text-emerald-100 tracking-tight leading-tight">from Farm to Fork with the Authenticity</p>
          <p className="text-emerald-50/95 text-base leading-relaxed max-w-md">{t("hero_body")}</p>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-md flex items-center gap-2"><Blocks className="w-3 h-3 text-emerald-300"/>Hash Chain</span>
            <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-md flex items-center gap-2"><ShieldCheck className="w-3 h-3 text-cyan-300"/>SC-001 · SC-002 · SC-003</span>
          </div>
        </div>
        <div className="text-[10px] text-white/70 font-mono uppercase tracking-widest">© 2026 · Sintesa Tembakau Nusantara</div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8 tick-bg relative">
        <button data-testid="lang-toggle-button" onClick={toggle} className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-emerald-500/50 text-xs font-mono uppercase tracking-wider text-slate-600 hover:text-emerald-700 transition-all shadow-sm">
          <Languages className="w-3.5 h-3.5" /> {lang === "id" ? "EN" : "ID"}
        </button>
        <div className="w-full max-w-md">
          <Card className="glass-card shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-emerald-700 mb-2">Masuk ke Ledger</div>
                <h2 className="text-2xl font-semibold text-slate-900">{t("login_heading")}</h2>
                <p className="text-sm text-slate-600 mt-1">{t("login_sub")}</p>
              </div>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label className="text-slate-700">{t("email")}</Label>
                  <Input data-testid="login-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white border-slate-200 mt-1.5" />
                </div>
                <div>
                  <Label className="text-slate-700">{t("password")}</Label>
                  <Input data-testid="login-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-white border-slate-200 mt-1.5" />
                </div>
                <Button data-testid="login-submit-button" type="submit" disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11">
                  {busy ? t("verifying") : t("sign_in")}
                </Button>
              </form>
              <div className="pt-4 border-t border-slate-200">
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-mono">{t("quick_fill")}</div>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO.map((d) => (
                    <button key={d.email} data-testid={`demo-${d.label.toLowerCase()}-button`} onClick={() => quick(d)} type="button" className="text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition-all">
                      {d.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Link to="/verify" data-testid="public-verify-link" className="text-xs text-emerald-700 hover:text-emerald-600 font-mono">{t("public_verify")}</Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
