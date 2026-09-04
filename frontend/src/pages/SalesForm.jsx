import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import QRCode from "qrcode";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, QrCode, Download } from "lucide-react";

export default function SalesForm() {
  const { t } = useLang();
  const [form, setForm] = useState({ source_shipment_id: "", received_units: "", display_date: "", store_location: "" });
  const [sources, setSources] = useState([]);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);
  const [qrUrl, setQrUrl] = useState("");
  const set = (k, v) => setForm({ ...form, [k]: v });

  useEffect(() => { api.get("/batches?prefix=SB").then(({ data }) => setSources(data)); }, [last]);

  useEffect(() => {
    if (last?.batch?.product_id) {
      const verifyUrl = `${window.location.origin}/verify/${last.batch.product_id}`;
      QRCode.toDataURL(verifyUrl, { width: 320, color: { dark: "#0A0E17", light: "#FFFFFF" } }).then(setQrUrl);
    }
  }, [last]);

  const submit = async (e) => {
    e.preventDefault();
    const missing = [];
    if (!form.source_shipment_id) missing.push(t("source_shipment"));
    if (!form.received_units || parseInt(form.received_units) <= 0) missing.push(t("units_received"));
    if (!form.display_date) missing.push(t("display_date"));
    if (!form.store_location) missing.push(t("store_loc"));
    if (missing.length) { toast.error(`${t("required_fields")}: ${missing.join(", ")}`); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/retail", { ...form, received_units: parseInt(form.received_units) });
      toast.success(`${data.batch.batch_id} · ${data.batch.product_id}`);
      setLast(data);
    } catch (err) { toast.error(err.response?.data?.detail || t("save_fail")); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-cyan-700 mb-2">{t("retailer_module")}</div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900"><Store className="w-8 h-8 text-cyan-600"/>{t("sales_qr")}</h1>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-2"><CardContent className="p-6">
          <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>{t("source_shipment")}</Label>
              <Select value={form.source_shipment_id} onValueChange={(v) => set("source_shipment_id", v)}>
                <SelectTrigger data-testid="sales-source-select" className="bg-white border-slate-200 mt-1.5"><SelectValue placeholder={t("pick_sb")} /></SelectTrigger>
                <SelectContent>{sources.map((h) => <SelectItem key={h.batch_id} value={h.batch_id}>{h.batch_id} — {h.quantity_units} → {h.destination}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t("units_received")}</Label><Input data-testid="sales-units-input" type="number" value={form.received_units} onChange={(e) => set("received_units", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
            <div><Label>{t("display_date")}</Label><Input data-testid="sales-date-input" type="date" value={form.display_date} onChange={(e) => set("display_date", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
            <div className="md:col-span-2"><Label>{t("store_loc")}</Label><Input data-testid="sales-location-input" value={form.store_location} onChange={(e) => set("store_location", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
            <div className="md:col-span-2"><Button data-testid="sales-submit-button" disabled={busy} type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-11">{busy ? "..." : t("submit_sales")}</Button></div>
          </form>
        </CardContent></Card>

        <Card className="glass-card"><CardContent className="p-6 space-y-4">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-700">{t("qr_auth")}</div>
          {last?.batch?.product_id ? (
            <div className="space-y-3">
              {qrUrl && <img src={qrUrl} alt="QR" className="w-full rounded-lg bg-white p-3 border border-slate-200" />}
              <div className="text-center font-mono text-sm text-emerald-700" data-testid="sales-product-id">{last.batch.product_id}</div>
              <a href={qrUrl} download={`qr-${last.batch.product_id}.png`} className="w-full inline-flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-emerald-400 hover:text-emerald-700 transition">
                <Download className="w-3.5 h-3.5"/> {t("download_qr")}
              </a>
              <div className="text-[10px] text-slate-500 text-center break-all">/verify/{last.batch.product_id}</div>
            </div>
          ) : (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">{t("qr_hint")}</p>
            </div>
          )}
        </CardContent></Card>
      </div>
    </div>
  );
}
