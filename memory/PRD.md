# Sintesa Tembakau Nusantara — Blockchain Traceability MVP

## Original Problem Statement
Aplikasi Web responsive untuk mensimulasikan ekosistem traceability rantai pasok tembakau Indonesia berbasis blockchain (hash-chain di MongoDB), dengan smart contract engine, IoT + AI quality inspection (Proposed Integration / mocked), dan Consumer QR Portal publik. Bilingual → user memilih **Bahasa Indonesia saja**.

## Roles
- Farmer, Collector, Manufacturer, Distributor, Retailer (invite-only)
- Admin (management + user invite + audit override)
- Consumer (public, no login)

## Architecture
- FastAPI + MongoDB + JWT httpOnly cookies (bcrypt)
- React + Tailwind + shadcn/ui + Plus Jakarta Sans / JetBrains Mono
- Hash-chain ledger (SHA-256, previous_hash → current_hash)
- Smart contracts SC-001 (Harvest Provenance), SC-002 (Farmer Payment / IoT Threshold), SC-003 (Excise Tax)
- Recharts for analytics · html5-qrcode for scanner · qrcode.js for generator · jsPDF + autotable for exports

## Features Implemented (Feb 2026)
- Auth (JWT + cookie) with 6 seeded users + admin (shintasyafrina9801@gmail.com / Admin@123)
- Role-based sidebar navigation & protected routes
- Batch models: HB → CB → PB → SB → RB with auto reference validation
- Ledger with block index, previous_hash, current_hash + integrity verification endpoint
- Smart Contract Engine + live console log auto-refreshing
- Quality/IoT mocked live sensor stream + AI inspection card (labeled "Proposed Integration")
- Exception detection (quantity mismatch, input>source, IoT threshold breach) + admin resolve
- Consumer QR Portal (public /verify/:productId) with QR scan (html5-qrcode) + manual input + PDF certificate
- Retailer QR Generation (qrcode.js) with downloadable QR
- Blockchain Explorer with block detail dialog + integrity verify
- Analytics dashboard (variety/region/grade/trend) with CSV + PDF export
- Audit Log for admin corrections (immutable ledger correction transactions)
- Admin User Management (invite/delete)

## Seed Data
- 1 admin (Shinta Syafrina, shintasyafrina9801@gmail.com)
- 5 role demo users (password `Password@123`)
- 1 complete chain HB-0001 (Srintil Temanggung) → CB-0001 → PB-0001 → SB-0001 → RB-0001 with generated `product_id`

## Backlog / Next Phase
- P1: WebSocket-based IoT streaming (currently polling every 5s)
- P1: Password reset flow (endpoints present in playbook, UI not wired)
- P2: Real photo upload for harvest (currently URL string)
- P2: Map visualization for shipment GPS live tracker
- P2: Multi-language toggle (currently ID only per user choice)
