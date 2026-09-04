import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { Html5Qrcode } from "html5-qrcode";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Camera, Search, Leaf, Blocks, MapPin, Calendar, Download, Languages, Eye } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Fix leaflet default marker icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function greenIcon() {
  return L.divIcon({
    className: "custom-pin",
    html: `<div style="background:#2D8B55;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><div style="transform:rotate(45deg);color:white;font-size:14px;text-align:center;line-height:24px;">🌱</div></div>`,
    iconSize: [30, 30], iconAnchor: [15, 30],
  });
}
function redIcon() {
  return L.divIcon({
    className: "custom-pin",
    html: `<div style="background:#DC2626;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><div style="transform:rotate(45deg);color:white;font-size:14px;text-align:center;line-height:24px;">🏪</div></div>`,
    iconSize: [30, 30], iconAnchor: [15, 30],
  });
}

function stageIcon(color, emoji) {
  return L.divIcon({
    className: "custom-pin",
    html: `<div style="background:${color};width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);"><div style="transform:rotate(45deg);font-size:15px;text-align:center;line-height:28px;">${emoji}</div></div>`,
    iconSize: [34, 34], iconAnchor: [17, 34],
  });
}

function ProvenanceMap({ stops, lang }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  useEffect(() => {
    if (!stops || stops.length < 2 || !mapRef.current) return;
    if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
    const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng]));
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false }).fitBounds(bounds, { padding: [40, 40] });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 18 }).addTo(map);
    stops.forEach((s, i) => {
      const label = lang === "en" ? s.label_en : s.label_id;
      L.marker([s.lat, s.lng], { icon: stageIcon(s.color, s.emoji) }).addTo(map)
        .bindPopup(`<b>${i + 1}. ${label}</b><br/><span style="font-family:monospace;font-size:11px;">${s.batch_id}</span><br/>${s.city || ""}<br/><span style="color:#64748B;font-size:10px;">${s.actor_name || ""}</span>`);
    });
    L.polyline(stops.map((s) => [s.lat, s.lng]), { color: "#2D8B55", weight: 3, dashArray: "8,10", opacity: 0.85 }).addTo(map);
    mapInst.current = map;
    return () => { map.remove(); mapInst.current = null; };
  }, [stops, lang]);
  return <div ref={mapRef} className="w-full h-72 rounded-lg overflow-hidden border border-slate-200" data-testid="provenance-map" />;
}

export default function ConsumerPortal() {
  const { productId: paramId } = useParams();
  const nav = useNavigate();
  const { t, lang, toggle } = useLang();
  const [pid, setPid] = useState(paramId || "");
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);

  const verify = async (id) => {
    try {
      const { data } = await axios.get(`${API}/public/verify/${id}`);
      setResult(data);
      nav(`/verify/${id}`, { replace: true });
    } catch (err) {
      setResult({ authentic: false, error: err.response?.data?.detail || t("product_not_found") });
    }
  };

  useEffect(() => { if (paramId) verify(paramId); }, [paramId]);

  const startScan = async () => {
    setScanning(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 240 }, (text) => {
          const m = text.match(/verify\/([A-Z0-9-]+)/i);
          const id = m ? m[1] : text;
          setPid(id);
          scanner.stop().then(() => setScanning(false));
          verify(id);
        }, () => {});
      } catch (e) { toast.error(t("camera_unavailable")); setScanning(false); }
    }, 100);
  };
  const stopScan = async () => { try { await scannerRef.current?.stop(); } catch {} setScanning(false); };

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFillColor(45, 139, 85); doc.rect(0, 0, 220, 40, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text(t("authentic"), 20, 25);
    doc.setTextColor(30, 30, 30); doc.setFontSize(11);
    let y = 55;
    const labels = [
      ["Product ID", result.product_id],
      [t("variety"), result.variety],
      [t("cultivation"), result.cultivation_area],
      [t("harvest_date"), result.harvest_date],
      [t("grade"), result.quality_grade],
      ["Retail Date", result.retail_date],
      ["Blockchain", result.blockchain_verified ? "VERIFIED" : "-"],
      ["Total Blocks", String(result.block_count)],
      [t("scanned_count"), `${result.scan_count} ${t("times")}`],
    ];
    labels.forEach(([k, v]) => { doc.setFont(undefined, "bold"); doc.text(`${k}:`, 20, y); doc.setFont(undefined, "normal"); doc.text(String(v || "-"), 80, y); y += 8; });
    doc.save(`certificate-${result.product_id}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="tobacco-leaf-hero py-16 px-4 text-center border-b border-emerald-200 relative">
        <button data-testid="lang-toggle-button" onClick={toggle} className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 border border-white/50 hover:bg-white text-xs font-mono uppercase tracking-wider text-slate-700 shadow-md">
          <Languages className="w-3.5 h-3.5" /> {lang === "id" ? "EN" : "ID"}
        </button>
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/25 border border-white/40 backdrop-blur-md text-white text-xs font-mono uppercase tracking-widest mb-4">
            <Leaf className="w-3.5 h-3.5"/> Sintesa Tembakau Nusantara
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">{t("verify_heading")}</h1>
          <p className="text-emerald-50/95 text-base mt-3">{t("verify_sub")}</p>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8 -mt-8 relative z-10">
        {!scanning && (
          <Card className="glass-card mb-4"><CardContent className="p-5">
            <div className="flex gap-2">
              <Input data-testid="consumer-pid-input" value={pid} onChange={(e) => setPid(e.target.value.toUpperCase())} placeholder="PRD-XXXXXXXX" className="bg-white border-slate-200 font-mono flex-1" />
              <Button data-testid="consumer-verify-button" onClick={() => verify(pid)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Search className="w-4 h-4 mr-1"/>{t("verify_btn")}</Button>
              <Button data-testid="consumer-scan-button" onClick={startScan} variant="outline" className="border-slate-300"><Camera className="w-4 h-4"/></Button>
            </div>
          </CardContent></Card>
        )}
        {scanning && (
          <Card className="glass-card mb-4"><CardContent className="p-5">
            <div id="qr-reader" className="rounded-lg overflow-hidden" />
            <Button onClick={stopScan} variant="outline" className="w-full mt-3">{t("cancel")}</Button>
          </CardContent></Card>
        )}

        {result?.authentic === false && (
          <Card className="border-rose-300 bg-rose-50"><CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-rose-700">{t("not_authentic")}</div>
            <p className="text-sm text-slate-600 mt-2">{result.error}</p>
          </CardContent></Card>
        )}

        {result?.authentic && (
          <div className="space-y-4">
            <Card className="border-emerald-300 bg-gradient-to-b from-emerald-50 to-white shadow-lg" data-testid="consumer-authentic-badge">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center mb-4 chain-node-active">
                  <ShieldCheck className="w-10 h-10 text-emerald-600" />
                </div>
                <div className="text-3xl font-bold text-emerald-700">{t("authentic")}</div>
                <div className="text-sm text-emerald-600 mt-1 font-mono uppercase tracking-widest">{t("authentic_sub")}</div>
                <div className="mt-4 font-mono text-lg text-slate-900">{result.product_id}</div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-xs text-emerald-800 font-mono" data-testid="scan-counter">
                  <Eye className="w-3 h-3"/> {t("scanned_count")} {result.scan_count} {t("times")}
                </div>
              </CardContent>
            </Card>

            {result.journey_coords && result.journey_coords.length >= 2 && (
              <Card className="glass-card"><CardContent className="p-5">
                <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-mono mb-3 flex items-center gap-2"><MapPin className="w-3.5 h-3.5"/>{t("map_title")}</div>
                <ProvenanceMap stops={result.journey_coords} lang={lang} />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs">
                  {result.journey_coords.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }}/>
                      <span className="text-slate-700 truncate"><strong>{i + 1}. {lang === "en" ? s.label_en : s.label_id}</strong> — {s.city}</span>
                    </div>
                  ))}
                </div>
              </CardContent></Card>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Card className="glass-card"><CardContent className="p-4">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-1 flex items-center gap-1"><Leaf className="w-3 h-3"/>{t("variety")}</div>
                <div className="font-semibold text-slate-900">{result.variety}</div>
              </CardContent></Card>
              <Card className="glass-card"><CardContent className="p-4">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/>{t("cultivation")}</div>
                <div className="font-semibold text-sm text-slate-900">{result.cultivation_area}</div>
              </CardContent></Card>
              <Card className="glass-card"><CardContent className="p-4">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/>{t("harvest_date")}</div>
                <div className="font-semibold text-slate-900">{result.harvest_date}</div>
              </CardContent></Card>
              <Card className="glass-card"><CardContent className="p-4">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-1">{t("grade")}</div>
                <Badge className="bg-emerald-100 border border-emerald-300 text-emerald-800">{result.quality_grade}</Badge>
              </CardContent></Card>
            </div>

            <Card className="glass-card"><CardContent className="p-5">
              <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-mono mb-3 flex items-center gap-2"><Blocks className="w-3.5 h-3.5"/>{t("chain_journey")}</div>
              <div className="space-y-2">
                {result.journey.map((j, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[10px] font-mono text-emerald-700">{i + 1}</div>
                    <div className="flex-1"><div className="font-mono text-emerald-700 text-xs">{j.batch_id}</div><div className="text-xs text-slate-500">{j.date?.slice(0, 10)}</div></div>
                  </div>
                ))}
              </div>
            </CardContent></Card>

            <Button data-testid="download-cert-button" onClick={downloadPdf} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"><Download className="w-4 h-4 mr-2"/>{t("download_cert")}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
