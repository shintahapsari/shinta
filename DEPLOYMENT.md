# Panduan Deploy di Luar Emergent (Vercel + MongoDB Atlas)

Aplikasi ini = **Frontend React (CRA/craco)** + **Backend FastAPI** + **MongoDB**.

Vercel **tidak** bisa menjalankan FastAPI berat di satu project (batas ukuran & serverless).
Karena itu susunan yang dipakai (paling stabil, tetap gratis):

```
Frontend (React)  ->  Vercel (Hobby / gratis)   ->  https://namaapp.vercel.app
Backend  (FastAPI) ->  Render (Free) / Railway   ->  https://shinta-backend.onrender.com
Database (MongoDB) ->  MongoDB Atlas (M0 gratis)  ->  mongodb+srv://...
```

> Kode sudah saya siapkan agar langsung bisa deploy: `backend/Procfile`, `backend/start.sh`,
> `backend/requirements.txt` (ramping), `render.yaml`, dan `frontend/vercel.json`.

---

## LANGKAH 1 — MongoDB Atlas (Database)

1. Buka https://www.mongodb.com/cloud/atlas/register → klik **Sign in with Google**.
2. Klik **Build a Database** → pilih **M0 (FREE)** → pilih provider & region terdekat (mis. Singapore) → **Create**.
3. **Database Access** (menu kiri) → **Add New Database User**:
   - Authentication: **Password**
   - Username: `shinta` — Password: buat yang kuat & **catat**.
   - Privileges: **Read and write to any database** → **Add User**.
4. **Network Access** (menu kiri) → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) → **Confirm**.
   (Render/Vercel pakai IP dinamis, jadi ini paling praktis.)
5. **Database** → tombol **Connect** → **Drivers** → salin connection string, contoh:
   ```
   mongodb+srv://shinta:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Ganti `<password>` dengan password user tadi. **Nama database** diatur terpisah lewat env `DB_NAME`
   (kode kita membaca `MONGO_URL` dan `DB_NAME` secara terpisah), contoh `DB_NAME=shinta`.

---

## LANGKAH 2 — Push Kode ke GitHub

Repo Anda sudah ada: `https://github.com/shintahapsari/shinta` (branch `main`).
Untuk update terbaru, gunakan tombol **Save to Github** di kolom chat Emergent (pilih repo `shinta`, branch `main`).

> Yang TIDAK ikut ter-push: `node_modules`, isi database, dan file `.env` (rahasia). Itu normal.

---

## LANGKAH 3 — Deploy Backend (FastAPI) ke Render

1. Buka https://render.com → **Sign in with GitHub**.
2. **New +** → **Web Service** → connect repo `shintahapsari/shinta`.
3. Isi konfigurasi:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free
4. **Environment Variables** (klik Advanced / Environment) — tambahkan:

   | Key | Value |
   |---|---|
   | `MONGO_URL` | connection string dari Atlas (Langkah 1.5) |
   | `DB_NAME` | `shinta` |
   | `JWT_SECRET` | `c3f7a1e9d84b2f6c05a7e1b93d6f8c24a9e0b7d1f3c584a6e2b9d0c7f1a3e5b8` |
   | `ADMIN_EMAIL` | `shintasyafrina9801@gmail.com` |
   | `ADMIN_PASSWORD` | `AdminUNEJ2026!` |
   | `FRONTEND_URL` | (isi setelah Vercel jadi, mis. `https://shinta.vercel.app`) |
   | `CORS_ORIGIN_REGEX` | `https://.*\.vercel\.app` |
   | `WEBHOOK_CRON_SECRET` | `8eab41845e60120b88617081504e49fefc1bc42f99587595cca30f0958b5d59d` |
   | `EMERGENT_EMAIL_KEY` | `ek_16a8aac7affcd8f8f23de1ea6889e48c` *(opsional, lihat catatan)* |
   | `EMAIL_FROM_NAME` | `Kemitraan TIP Universitas Jember` *(opsional)* |
   | `EMERGENT_LLM_KEY` | `sk-emergent-e9aD74aCb1cA2B3F77` *(opsional, untuk upload file)* |

5. **Create Web Service**. Tunggu build selesai → Anda dapat URL, mis. `https://shinta-backend.onrender.com`.
6. Uji: buka `https://shinta-backend.onrender.com/api/` → harus muncul `{"message":"SIMETRI-TIP UNEJ API"}`.

> Alternatif Railway: New Project → Deploy from GitHub → set **Root Directory** = `backend`,
> Start Command otomatis dari `Procfile`, dan isi env yang sama.
> **Catatan Render Free:** service "tidur" saat idle; request pertama bisa lambat ~30 detik.

---

## LANGKAH 4 — Deploy Frontend (React) ke Vercel

1. Buka https://vercel.com → **Sign in with GitHub**.
2. **Add New… → Project** → import repo `shintahapsari/shinta`.
3. Konfigurasi:
   - **Root Directory:** `frontend`  *(klik Edit, pilih folder `frontend`)*
   - **Framework Preset:** Create React App (terdeteksi otomatis; sudah ada `frontend/vercel.json`)
   - **Build Command:** `yarn build` — **Output Directory:** `build` (otomatis)
4. **Environment Variables** — tambahkan:

   | Key | Value |
   |---|---|
   | `REACT_APP_BACKEND_URL` | URL backend Render, **tanpa** garis miring di akhir, mis. `https://shinta-backend.onrender.com` |

5. **Deploy**. Setelah jadi Anda dapat URL, mis. `https://shinta.vercel.app`.

---

## LANGKAH 5 — Sambungkan (CORS) & Uji

1. Kembali ke **Render → Environment**, set `FRONTEND_URL` = URL Vercel (mis. `https://shinta.vercel.app`)
   lalu **Save** (backend akan redeploy). `CORS_ORIGIN_REGEX` sudah mengizinkan semua domain `*.vercel.app`
   (termasuk URL preview).
2. Buka website Vercel → login tab **Staf** dengan:
   - Email: `shintasyafrina9801@gmail.com`
   - Password: `AdminUNEJ2026!`
3. Cek data tersimpan di Atlas (menu **Browse Collections** di cluster).

---

## Catatan Penting (khusus aplikasi ini)

- **Upload file** (`backend/storage.py`) dan **Email pengingat** (`backend/email_service.py`) memakai layanan
  bawaan Emergent (`integrations.emergentagent.com`) via `EMERGENT_LLM_KEY` / `EMERGENT_EMAIL_KEY`.
  Di luar Emergent, layanan ini **mungkin tetap jalan selama key masih valid**, tetapi **tidak dijamin**.
  Kode sudah dibuat **tidak crash** bila key kosong (upload/email hanya di-skip).
  Jika nanti mau 100% mandiri, minta saya ganti ke **AWS S3 / Cloudflare R2** (file) dan **Resend/SendGrid** (email)
  dengan API key milik Anda sendiri.
- **Email pengingat otomatis (cron):** dulu pakai cron Emergent. Di luar Emergent gunakan **cron-job.org** gratis
  yang memanggil `POST https://<backend>/api/cron/expiry-reminder` dengan header
  `Authorization: Bearer <WEBHOOK_CRON_SECRET>`. Minta saya bantu set jika perlu.
- **Ganti rahasia untuk produksi:** sebaiknya buat `JWT_SECRET` & `ADMIN_PASSWORD` baru saat live.

---

## Ringkasan Biaya
- MongoDB Atlas M0: **Gratis**
- Vercel Hobby: **Gratis**
- Render Free: **Gratis** (idle sleep) — atau Railway ~$5 kredit/bulan
