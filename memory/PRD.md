# PRD — SIMETRI-TIP UNEJ

## Problem Statement
Sistem Terintegrasi Kemitraan Teknologi Industri Pertanian — Program Studi Teknologi Industri Pertanian, Fakultas Teknologi Pertanian, Universitas Jember. Web app untuk mengelola siklus kerja sama: master mitra, dokumen (PKS/IA/MoU/Prospektif) berversi, implementasi kegiatan (dual status), Kampus Berdampak, audit trail, notifikasi, dashboard KPI, dan laporan (PDF/Excel).

## Architecture
- Frontend: React (JSX) + Tailwind + shadcn/ui + Recharts + framer-motion, react-router, sonner toasts.
- Backend: FastAPI (server.py + auth.py, email_service.py, storage.py, exporters.py, seed.py). All routes /api.
- DB: MongoDB (uuid string ids, ISO datetimes). Collections: users, magic_links, partners, documents (versioned/immutable), implementations, audit_logs, notifications, files, meta.
- Auth: JWT (bcrypt) httpOnly cookies for staff; passwordless magic-link (Resend) for students @*.unej.ac.id. Prepared for UNEJ SSO later.
- Integrations: Resend (Emergent-managed) magic-link email; Emergent Object Storage (file uploads); server-side PDF (reportlab) & Excel (openpyxl) export.

## Roles (RBAC)
- mahasiswa: magic-link login; own implementations only; read partners/docs.
- admin (Shinta Syafrina): full access + user management.
- tim_kerjasama (Alif Rizki): manage partners (incl. edit & delete), documents, implementations, verify approvals.
- tim_mbkm (Arga Hita, Winda Amilia): manage cooperation/implementation incl. Kampus Berdampak/MBKM + verify.
- tim_manajemen: read-only + export.

## Implemented (2026-06)
- Auth: staff login, student magic-link (dev_magic_link returned for testing), /me, refresh, logout, RBAC per endpoint.
- Master Partner DB: list/search/filter, create/edit/delete, diacritic-insensitive duplicate detection, Partner 360 (docs/impl/audit tabs).
- Document Repository: create + immutable revise (versioning, supersede), version history, status Draft/Active/Expired/Superseded, tanggal mulai/berakhir, expiry-soon warning sign (≤90 days) + banner.
- Implementation module: create/edit, dual status (status_kegiatan Dalam Proses/Selesai vs status_approval), approval flow (Approved/Rejected/Revision), Kampus Berdampak dropdown + MBKM checkbox. Only Approved counts in metrics. Kampus Berdampak activity status editable only by Tim Kerja Sama & Tim Kampus Berdampak/MBKM (not students).
- Per-activity dosen & mahasiswa NAMES (auto-counts), not just aggregates.
- Email reminder: platform cron (.emergent/crons.yml, Mon 08:00 Asia/Jakarta) → POST /api/cron/expiry-reminder (Bearer WEBHOOK_CRON_SECRET) emails Tim Kerja Sama + admin about documents nearing expiry (Resend) + in-app notification.
- Kampus Berdampak: Eligible (active PKS) vs Implemented (approved kampus_berdampak impl), coverage %, region breakdown, chart.
- Audit trail immutable; in-app notifications (bell + panel); Dashboard KPI + charts; Reports (5 types) with PDF & Excel export.
- Demo cooperation/implementation data cleared (one-time, seed version clean-1) so the institution enters real data; only 5 staff accounts seeded. Login page no longer shows the demo admin email hint.

## Verified
- Backend 36/37 automated tests + manual curl. Duplicate detection fixed (unicode NFKD). tim_kerjasama edit/delete partners 200; impl edit + kampus_berdampak + approve 200; document expiry flags correct.

## Backlog (P1/P2)
- P1: Email notifications (currently in-app only); file upload UI wired into document/implementation forms (backend ready).
- P1: Per-activity dosen/mahasiswa detail (currently aggregate).
- P2: UNEJ SSO integration; Excel template import for migration (Partner/Dokumen/Implementasi); Fase 3 satisfaction survey (data model reserved).
- P2: Brute-force lockout on login.
