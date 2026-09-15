import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { Loader2, CheckCircle2, XCircle, Sprout } from "lucide-react";

export default function VerifyPage() {
  const [params] = useSearchParams();
  const { magicVerify } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const done = useRef(false);

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setStatus("error"); setError("Token tidak ditemukan"); return; }
    if (done.current) return;
    done.current = true;
    (async () => {
      try {
        const u = await magicVerify(token);
        setStatus("success");
        setTimeout(() => navigate("/dashboard"), 1200);
        void u;
      } catch (err) {
        setStatus("error");
        setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
      }
    })();
  }, [params, magicVerify, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center animate-fade-up">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F5A623] to-[#FFC72C] flex items-center justify-center mx-auto mb-6">
          <Sprout className="w-7 h-7 text-[#0B2545]" strokeWidth={2.5} />
        </div>
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-[#0B2545] mx-auto mb-4" />
            <p className="text-slate-600" data-testid="verify-loading">Memverifikasi tautan masuk…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <p className="font-display font-bold text-lg text-[#0B2545]" data-testid="verify-success">Berhasil masuk!</p>
            <p className="text-slate-500 text-sm mt-1">Mengalihkan ke dashboard…</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="font-display font-bold text-lg text-[#0B2545]" data-testid="verify-error">Verifikasi gagal</p>
            <p className="text-slate-500 text-sm mt-1">{error}</p>
            <Link to="/login" className="inline-block mt-6 px-4 py-2 rounded-lg bg-[#0B2545] text-white text-sm font-medium">
              Kembali ke Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
