import {
  LayoutDashboard, Building2, FileText, ClipboardList, MapPin,
  ScrollText, BarChart3, Users, Bell,
} from "lucide-react";

export const ROLE_LABELS = {
  mahasiswa: "Mahasiswa",
  admin: "Admin Kerja Sama",
  tim_kerjasama: "Tim Kerja Sama",
  tim_mbkm: "Tim MBKM",
  tim_manajemen: "Tim Manajemen",
};

export const WRITE_ROLES = ["admin", "tim_kerjasama", "tim_mbkm"];
export const APPROVE_ROLES = ["admin", "tim_kerjasama", "tim_mbkm"];

export const INSTITUTION_FULL =
  "Sistem Terintegrasi Kemitraan Teknologi Industri Pertanian — Program Studi Teknologi Industri Pertanian, Fakultas Teknologi Pertanian, Universitas Jember";
export const INSTITUTION_SHORT = "Kemitraan TIP · Universitas Jember";

export const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["mahasiswa", "admin", "tim_kerjasama", "tim_mbkm", "tim_manajemen"] },
  { to: "/partners", label: "Master Mitra", icon: Building2, roles: ["mahasiswa", "admin", "tim_kerjasama", "tim_mbkm", "tim_manajemen"] },
  { to: "/documents", label: "Repository Dokumen", icon: FileText, roles: ["mahasiswa", "admin", "tim_kerjasama", "tim_mbkm", "tim_manajemen"] },
  { to: "/implementations", label: "Implementasi", icon: ClipboardList, roles: ["mahasiswa", "admin", "tim_kerjasama", "tim_mbkm", "tim_manajemen"] },
  { to: "/kampus-berdampak", label: "Kampus Berdampak", icon: MapPin, roles: ["admin", "tim_kerjasama", "tim_mbkm", "tim_manajemen"] },
  { to: "/reports", label: "Laporan & Ekspor", icon: BarChart3, roles: ["admin", "tim_kerjasama", "tim_mbkm", "tim_manajemen"] },
  { to: "/audit", label: "Audit Trail", icon: ScrollText, roles: ["admin", "tim_kerjasama", "tim_mbkm", "tim_manajemen"] },
  { to: "/users", label: "Manajemen Pengguna", icon: Users, roles: ["admin"] },
];

export const STATUS_STYLE = {
  Draft: "bg-slate-100 text-slate-600 border-slate-300",
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Expired: "bg-red-50 text-red-700 border-red-200",
  Superseded: "bg-amber-50 text-amber-700 border-amber-200",
  Prospektif: "bg-violet-50 text-violet-700 border-violet-200",
  "On Process": "bg-blue-50 text-blue-700 border-blue-200",
  "Dalam Proses": "bg-blue-50 text-blue-700 border-blue-200",
  Selesai: "bg-green-50 text-green-700 border-green-200",
  Tertunda: "bg-orange-50 text-orange-700 border-orange-200",
  Pending: "bg-orange-50 text-orange-700 border-orange-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
  Revision: "bg-amber-50 text-amber-700 border-amber-200",
  Nasional: "bg-sky-50 text-sky-700 border-sky-200",
  Internasional: "bg-indigo-50 text-indigo-700 border-indigo-200",
};
