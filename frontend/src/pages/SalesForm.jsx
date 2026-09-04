import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, QrCode, Download } from "lucide-react";

export default function SalesForm() {
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
      QRCode.toDataURL(verifyUrl, { width: 320, color: { dark: "#0A0E17", light: "#F8FAFC" } }).then(setQrUrl);
    }
  }, [last]);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = await api.post("/retail", { ...form, received_units: parseInt(form.received_units) });
      toast.success(`Ritel ${data.batch.batch_id} · Product ID ${data.batch.product_id}`);
      setLast(data);
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-cyan-700 mb-2">Modul Ritel</div>
        <h1 className="text-3xl font-bold flex items-center gap-3"><Store className="w-8 h-8 text-cyan-700"/>Penjualan & QR Generation</h1>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass-card border-slate-200 lg:col-span-2"><CardContent className="p-6">
          <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Batch Pengiriman Sumber</Label>
              <Select value={form.source_shipment_id} onValueChange={(v) => set("source_shipment_id", v)}>
                <SelectTrigger data-testid="sales-source-select" className="bg-white border-slate-200 mt-1.5"><SelectValue placeholder="Pilih SB..." /></SelectTrigger>
                <SelectContent>{sources.map((h) => <SelectItem key={h.batch_id} value={h.batch_id}>{h.batch_id} — {h.quantity_units} unit → {h.destination}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Unit Diterima</Label><Input data-testid="sales-units-input" type="number" value={form.received_units} onChange={(e) => set("received_units", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
            <div><Label>Tanggal Dipajang</Label><Input data-testid="sales-date-input" type="date" value={form.display_date} onChange={(e) => set("display_date", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
            <div className="md:col-span-2"><Label>Lokasi Toko</Label><Input data-testid="sales-location-input" value={form.store_location} onChange={(e) => set("store_location", e.target.value)} required className="bg-white border-slate-200 mt-1.5" /></div>
            <div className="md:col-span-2"><Button data-testid="sales-submit-button" disabled={busy} type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 h-11">{busy ? "..." : "Finalisasi Chain & Generate QR"}</Button></div>
          </form>
        </CardContent></Card>

        <Card className="glass-card border-slate-200"><CardContent className="p-6 space-y-4">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-700">QR Otentikasi Produk</div>
          {last?.batch?.product_id ? (
            <div className="space-y-3">
              {qrUrl && <img src={qrUrl} alt="QR" className="w-full rounded-lg bg-white p-3" />}
              <div className="text-center font-mono text-sm text-emerald-700" data-testid="sales-product-id">{last.batch.product_id}</div>
              <a href={qrUrl} download={`qr-${last.batch.product_id}.png`} className="w-full inline-flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 transition">
                <Download className="w-3.5 h-3.5"/> Unduh QR
              </a>
              <div className="text-[10px] text-slate-500 text-center break-all">/verify/{last.batch.product_id}</div>
            </div>
          ) : (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">QR akan otomatis dibuat setelah submit</p>
            </div>
          )}
        </CardContent></Card>
      </div>
    </div>
  );
}
