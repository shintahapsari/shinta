# Panduan Deploy di Luar Emergent (Vercel + Render + MongoDB Atlas)

> **Status saat ini (Sep 2026):**
> ✅ Langkah 1 (Atlas) selesai & terverifikasi · ✅ Langkah 2 (Gmail SMTP) selesai & email uji terkirim ·
> ✅ Login mahasiswa username/kata sandi siap · ⬜ Langkah 3–6 (GitHub, Render, Vercel) **Anda yang jalankan** mengikuti panduan ini.

Aplikasi ini = **Frontend React (CRA/craco)** + **Backend FastAPI** + **MongoDB**.

Vercel **tidak** cocok menjalankan FastAPI berat dalam satu project (batas ukuran serverless).
Susunan paling stabil & tetap gratis:

```
Frontend (React)   ->  Vercel (Hobby / gratis)     ->  https://namaapp.vercel.app
Backend  (FastAPI) ->  Render Free / Railway        ->  https://shinta-backend.onrender.com
Database (MongoDB) ->  MongoDB Atlas (M0 gratis)     ->  mongodb+srv://...
Email    (Gmail)   ->  Gmail SMTP + App Password     ->  smtp.gmail.com
```

> File deploy sudah disiapkan di repo:
> `backend/Procfile`, `backend/start.sh`, `backend/runtime.txt`,
> `backend/requirements.txt` (ramping), `render.yaml`, `frontend/vercel.json`.

---

## LANGKAH 1 — MongoDB Atlas (Database)

1. Buka https://www.mongodb.com/cloud/atlas/register → **Sign in with Google**.
2. **Build a Database** → pilih **M0 (FREE)** → provider & region terdekat (mis. Singapore) → **Create**.
3. **Database Access** → **Add New Database User**:
   - Authentication: **Password**
   - Username: `shinta` — Password: buat kuat & **catat**.
   - Privileges: **Read and write to any database** → **Add User**.
4. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) → **Confirm**.
5. **Database** → **Connect** → **Drivers** → salin connection string:
   ```
   mongodb+srv://shinta:<password>@cluster0.vdbfaw5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
   Ganti `<password>` (tanpa tanda `<` `>`). Nama database diatur lewat env `DB_NAME` — sudah dipakai: **`simetri_tip`** (berisi 5 akun staf hasil seed otomatis saat backend pertama kali start).
   > ✅ Sudah diverifikasi terhubung (Sep 2026): ping OK, seed OK, login admin OK.

---

## LANGKAH 2 — Gmail SMTP (Email)

Email dikirim langsung dari akun Gmail Anda (gratis, kuota ±500 email/hari). Tidak perlu daftar layanan lain.

1. Buka https://myaccount.google.com/security → aktifkan **Verifikasi 2 Langkah** (wajib).
2. Buka https://myaccount.google.com/apppasswords → nama aplikasi mis. `Kemitraan TIP` → **Create**.
3. Salin sandi 16 karakter yang muncul (spasi boleh ikut, akan dihapus otomatis). Ini nilai `SMTP_PASSWORD`.
4. `SMTP_USER` = alamat Gmail Anda.

> ✅ Sudah dilakukan: `SMTP_USER=shintasyafrina9801@gmail.com`, App Password `apihfmkpnrqyijcs` — email uji berhasil terkirim.
> Masukkan dua nilai yang sama ke Environment Variables Render (Langkah 4).

> Kode memakai `smtplib` bawaan Python (tanpa library tambahan). Bila `SMTP_USER`/`SMTP_PASSWORD` kosong,
> email otomatis di-skip (aplikasi tetap jalan, tidak crash). Email hanya dipakai untuk pengingat dokumen
> kedaluwarsa — login mahasiswa **tidak** lagi memakai email.

---

## LANGKAH 2b — Login Mahasiswa (Username & Kata Sandi)

Mahasiswa masuk dengan **username + kata sandi** yang disediakan admin (tanpa email, tanpa SSO).
Admin membuat akun di menu **Manajemen Pengguna**: *Tambah Pengguna* (peran Mahasiswa) atau
*Impor Mahasiswa* massal — satu baris per akun: `username,password,nama,nim`.
Admin juga dapat mengganti kata sandi dan menonaktifkan akun dari halaman yang sama.

> Integrasi SSO UNEJ (CAS) tetap tersedia di backend (`/api/auth/sso/login`) bila nanti ingin diaktifkan;
> env `BACKEND_PUBLIC_URL` hanya diperlukan untuk itu.

---

## LANGKAH 3 — Push Kode ke GitHub

Repo Anda: `https://github.com/shintahapsari/shinta` (branch `main`).
Untuk update terbaru, gunakan tombol **Save to Github** di kolom chat Emergent (pilih repo `shinta`, branch `main`).

> Yang TIDAK ikut ter-push: `node_modules`, isi database, dan file `.env` (rahasia). Itu normal —
> nilai rahasia dimasukkan sebagai Environment Variables di Render & Vercel (Langkah 4 & 5).

---

## LANGKAH 4 — Deploy Backend (FastAPI) ke Render

1. Buka https://render.com → **Sign in with GitHub**.
2. **New +** → **Web Service** → pilih repo `shintahapsari/shinta`.
3. Konfigurasi:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free
4. **Environment Variables** — tambahkan:

   | Key | Value |
   |---|---|
   | `MONGO_URL` | connection string Atlas (Langkah 1.5) |
   | `DB_NAME` | `simetri_tip` |
   | `JWT_SECRET` | `c3f7a1e9d84b2f6c05a7e1b93d6f8c24a9e0b7d1f3c584a6e2b9d0c7f1a3e5b8` |
   | `ADMIN_EMAIL` | `shintasyafrina9801@gmail.com` |
   | `ADMIN_PASSWORD` | `AdminUNEJ2026!` |
   | `FRONTEND_URL` | (isi setelah Vercel jadi, mis. `https://shinta.vercel.app`) |
   | `BACKEND_PUBLIC_URL` | *(opsional, hanya jika SSO UNEJ diaktifkan)* URL backend Render ini |
   | `CORS_ORIGIN_REGEX` | `https://.*\.vercel\.app` |
   | `SMTP_USER` | `shintasyafrina9801@gmail.com` |
   | `SMTP_PASSWORD` | `apihfmkpnrqyijcs` |
   | `EMAIL_FROM_NAME` | `Kemitraan TIP Universitas Jember` |
   | `WEBHOOK_CRON_SECRET` | `8eab41845e60120b88617081504e49fefc1bc42f99587595cca30f0958b5d59d` |
   | `EMERGENT_LLM_KEY` | `sk-emergent-e9aD74aCb1cA2B3F77` *(opsional, hanya untuk fitur upload berkas — lihat catatan)* |

5. **Create Web Service** → tunggu build → dapat URL, mis. `https://shinta-backend.onrender.com`.
6. Uji: buka `https://shinta-backend.onrender.com/api/` → muncul `{"message":"SIMETRI-TIP UNEJ API"}`.

> Alternatif **Railway**: New Project → Deploy from GitHub → **Root Directory** = `backend`
> (Start Command otomatis dari `Procfile`), isi env yang sama.
> **Catatan Render Free:** service "tidur" saat idle; request pertama bisa lambat ~30 detik.

---

## LANGKAH 5 — Deploy Frontend (React) ke Vercel

1. Buka https://vercel.com → **Sign in with GitHub**.
2. **Add New… → Project** → import repo `shintahapsari/shinta`.
3. Konfigurasi:
   - **Root Directory:** `frontend` (klik Edit → pilih folder `frontend`)
   - **Framework Preset:** Create React App (otomatis; sudah ada `frontend/vercel.json`)
   - **Build Command:** `yarn build` — **Output Directory:** `build`
4. **Environment Variables:**

   | Key | Value |
   |---|---|
   | `REACT_APP_BACKEND_URL` | URL backend Render **tanpa** garis miring akhir, mis. `https://shinta-backend.onrender.com` |

5. **Deploy** → dapat URL, mis. `https://shinta.vercel.app`.

---

## LANGKAH 6 — Sambungkan (CORS) & Uji

1. Kembali ke **Render → Environment** → set `FRONTEND_URL` = URL Vercel → **Save** (backend redeploy).
   `CORS_ORIGIN_REGEX` sudah mengizinkan semua domain `*.vercel.app` (termasuk URL preview).
2. Buka website Vercel → login tab **Staf**:
   - Email: `shintasyafrina9801@gmail.com`
   - Password: `AdminUNEJ2026!`
3. Buat akun mahasiswa: menu **Manajemen Pengguna → Tambah Pengguna** (peran Mahasiswa) atau **Impor Mahasiswa**.
   Lalu keluar dan uji login tab **Mahasiswa** dengan username & kata sandi tersebut.
4. Uji email pengingat (dari terminal/Postman):
   ```
   curl -X POST https://shinta-backend.onrender.com/api/cron/expiry-reminder \
        -H "Authorization: Bearer 8eab41845e60120b88617081504e49fefc1bc42f99587595cca30f0958b5d59d"
   ```
   → balasan `{"status":"accepted"}`; email masuk ke Tim Kerja Sama & admin bila ada dokumen ≤90 hari kedaluwarsa.
5. Cek data di Atlas (**Browse Collections**, database `simetri_tip`).

---

## LANGKAH 7 — Pengingat Mingguan Otomatis (cron-job.org)

Cron bawaan Emergent tidak berlaku di luar platform. Gunakan **cron-job.org** (gratis):

1. Daftar di https://cron-job.org → **Create cronjob**.
2. **URL:** `https://shinta-backend.onrender.com/api/cron/expiry-reminder`
3. **Schedule:** setiap **Senin 08:00**, zona waktu **Asia/Jakarta**.
4. **Advanced → Request method:** `POST`; **Headers:** tambah
   `Authorization` = `Bearer 8eab41845e60120b88617081504e49fefc1bc42f99587595cca30f0958b5d59d`
5. Simpan → klik **Run now** untuk uji; status harus `200`.

> Bonus: cronjob ini juga "membangunkan" Render Free yang sedang tidur.

---

## Ringkasan Variabel Environment

**Backend (Render/Railway):**
```
MONGO_URL=mongodb+srv://shinta:<password>@cluster0.vdbfaw5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=simetri_tip
JWT_SECRET=c3f7a1e9d84b2f6c05a7e1b93d6f8c24a9e0b7d1f3c584a6e2b9d0c7f1a3e5b8
ADMIN_EMAIL=shintasyafrina9801@gmail.com
ADMIN_PASSWORD=AdminUNEJ2026!
FRONTEND_URL=https://shinta.vercel.app
CORS_ORIGIN_REGEX=https://.*\.vercel\.app
SMTP_USER=shintasyafrina9801@gmail.com
SMTP_PASSWORD=apihfmkpnrqyijcs
EMAIL_FROM_NAME=Kemitraan TIP Universitas Jember
WEBHOOK_CRON_SECRET=8eab41845e60120b88617081504e49fefc1bc42f99587595cca30f0958b5d59d
EMERGENT_LLM_KEY=sk-emergent-e9aD74aCb1cA2B3F77
```

**Frontend (Vercel):**
```
REACT_APP_BACKEND_URL=https://shinta-backend.onrender.com
```

---

## Catatan Penting

- **Email:** sudah **mandiri via Gmail SMTP** (tidak butuh Emergent/Resend). Pastikan `SMTP_USER` dan `SMTP_PASSWORD` diisi.
- **Upload berkas** (`backend/storage.py`) MASIH memakai object storage bawaan Emergent via `EMERGENT_LLM_KEY`.
  Di luar Emergent ini mungkin tetap jalan selama key valid, tapi TIDAK DIJAMIN. Kode tidak crash bila gagal.
  Untuk 100% mandiri, minta saya pindahkan ke **Cloudflare R2 / AWS S3** dengan kredensial Anda.
- **Cron pengingat mingguan:** lihat Langkah 7 (cron-job.org).
- **Login:** Staf memakai email + kata sandi; Mahasiswa memakai username + kata sandi buatan admin.
  Tidak ada lagi ketergantungan email/Resend/SSO untuk login.
- **Keamanan produksi:** sebaiknya ganti `JWT_SECRET`, `ADMIN_PASSWORD`, dan `WEBHOOK_CRON_SECRET` dengan nilai baru saat live
  (buat dengan `python -c "import secrets; print(secrets.token_hex(32))"`). Kata sandi staf default `Staff2026!` segera diganti dari menu Manajemen Pengguna.
- **Akun awal (seed otomatis):** admin `shintasyafrina9801@gmail.com`; staf `alif.rizki@unej.ac.id`, `arga.hita@unej.ac.id`,
  `winda.amilia@unej.ac.id`, `manajemen@unej.ac.id` (sandi `Staff2026!`).

---

## Ringkasan Biaya
- MongoDB Atlas M0: **Gratis**
- Vercel Hobby: **Gratis**
- Render Free: **Gratis** (idle sleep) atau Railway ~$5 kredit/bulan
- Gmail SMTP: **Gratis** ±500 email/hari
- cron-job.org: **Gratis**
