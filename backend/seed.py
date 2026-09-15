"""Idempotent seed of demo staff, partners, documents, implementations, notifications."""
import os
import uuid
from datetime import datetime, timezone, timedelta
import auth as A

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@unej.ac.id").lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")


def _id():
    return str(uuid.uuid4())


def iso(dt):
    return dt.isoformat()


STAFF = [
    (ADMIN_EMAIL, "Shinta Syafrina", "admin", "Admin Kerja Sama"),
    ("kerma1@unej.ac.id", "Budi Santoso", "tim_kerjasama", "Tim Kerja Sama"),
    ("kerma2@unej.ac.id", "Dewi Lestari", "tim_kerjasama", "Tim Kerja Sama"),
    ("mbkm@unej.ac.id", "Rina Wulandari", "tim_mbkm", "Tim MBKM"),
    ("manajemen@unej.ac.id", "Prof. Ahmad Fauzi", "tim_manajemen", "Tim Manajemen"),
]

PARTNERS = [
    ("PT Perkebunan Nusantara XII", "BUMN", "Nasional", "Perkebunan", "Jember", "Ir. Sugianto", "kerma@ptpn12.co.id", "0331-441234", "8120001112223"),
    ("PT Nestlé Indonesia", "PMA", "Internasional", "Pangan Olahan", "Jawa Timur", "Tim Kerma", "", "021-5551234", "8120009998887"),
    ("PT Great Giant Pineapple", "Swasta Nasional", "Nasional", "Agroindustri Buah", "Lampung", "Andi Prasetyo", "partnership@ggp.co.id", "0721-334455", "8120003334445"),
    ("CV Agro Mandiri Sejahtera", "UMKM", "Nasional", "Pupuk Organik", "Jember", "Tim Kerma", "", "", "8120005556667"),
    ("PT Indofood Sukses Makmur Tbk", "Swasta Nasional", "Nasional", "Pangan Olahan", "Jakarta", "Siti Nurhaliza", "csr@indofood.co.id", "021-7770001", "8120007778889"),
    ("Kyushu University", "Perguruan Tinggi", "Internasional", "Riset Pertanian", "Fukuoka, Jepang", "Prof. Tanaka", "intl@kyushu-u.ac.jp", "", ""),
    ("PT Sinar Mas Agro Resources", "Swasta Nasional", "Nasional", "Kelapa Sawit", "Riau", "Tim Kerma", "", "0761-889900", "8120002223334"),
    ("Dinas Pertanian Kabupaten Jember", "Pemerintah", "Nasional", "Penyuluhan Pertanian", "Jember", "Drs. Hartono", "distan@jemberkab.go.id", "0331-482100", ""),
]

# jenis, klasifikasi, judul, status, start_offset_days, end_offset_days (None => no expiry)
DOCS = [
    (0, "MoU", "Tridharma", "MoU Kerja Sama Tridharma PTPN XII - TIP UNEJ", "Active", -400, 330),
    (0, "PKS", "Magang", "PKS Program Magang Mahasiswa TIP di PTPN XII", "Active", -200, 165),
    (1, "PKS", "Penelitian", "PKS Riset Pengembangan Produk Pangan Nestlé", "Active", -150, 45),
    (2, "PKS", "Magang", "PKS Magang Bersertifikat Great Giant Pineapple", "Active", -120, None),
    (3, "Prospektif", "Tridharma", "Rencana Kerja Sama Pupuk Organik CV Agro Mandiri", "Draft", None, None),
    (4, "MoU", "Tridharma", "MoU Payung Indofood - Fakultas Teknologi Pertanian", "Active", -600, -30),
    (5, "IA", "Penelitian", "Implementation Arrangement Joint Research Kyushu University", "Active", -90, 640),
    (6, "Prospektif", "Magang", "Prospektif Kerja Sama Magang Sinar Mas Agro", "Draft", None, None),
    (7, "PKS", "Tridharma", "PKS Penyuluhan & Pengabdian Dinas Pertanian Jember", "Active", -250, 100),
]

# partner_idx, doc_idx(optional), tahun, triwulan, jenis_kegiatan, judul, scope_mbkm, status_kegiatan, status_approval, dosen, mhs, region
IMPLS = [
    (0, 1, 2025, "Q1", "Magang Mahasiswa", "Magang 20 Mahasiswa TIP di Pabrik Gula PTPN XII", True, "Selesai", "Approved", 2, 20, "Jember"),
    (0, 0, 2025, "Q2", "Penelitian Bersama", "Riset Efisiensi Produksi Gula Kristal Putih", False, "On Process", "Approved", 3, 4, "Jember"),
    (1, 2, 2025, "Q2", "Penelitian Bersama", "Pengembangan Formulasi Pangan Fungsional", False, "On Process", "Pending", 4, 6, "Jawa Timur"),
    (2, 3, 2025, "Q1", "Magang Mahasiswa", "MSIB Batch 6 Great Giant Pineapple", True, "Selesai", "Approved", 2, 15, "Lampung"),
    (4, 5, 2024, "Q4", "Kuliah Tamu", "Kuliah Tamu Industri Pangan oleh Indofood", False, "Selesai", "Approved", 1, 120, "Jakarta"),
    (5, 6, 2025, "Q2", "Riset Internasional", "Joint Research Post-Harvest Technology", False, "On Process", "Pending", 5, 3, "Fukuoka, Jepang"),
    (7, 8, 2025, "Q1", "Pengabdian Masyarakat", "Penyuluhan Teknologi Pascapanen Petani Jember", False, "Selesai", "Approved", 4, 30, "Jember"),
    (2, 3, 2025, "Q2", "Magang Mahasiswa", "Magang Lanjutan Quality Control GGP", True, "On Process", "Revision", 1, 8, "Lampung"),
]

NOTIFS = [
    (["admin", "tim_kerjasama", "tim_mbkm"], "Dokumen Akan Berakhir", "PKS Riset Nestlé akan berakhir dalam 45 hari.", "warning"),
    (["admin", "tim_kerjasama", "tim_mbkm"], "Verifikasi Diperlukan", "2 implementasi menunggu persetujuan.", "approval"),
    (["mahasiswa"], "Selamat Datang", "Ajukan laporan implementasi kegiatan kerja sama Anda.", "info"),
]


async def seed_all(db):
    # staff (idempotent, keep admin password in sync)
    for email, name, role, jabatan in STAFF:
        existing = await db.users.find_one({"email": email})
        if existing is None:
            await db.users.insert_one({
                "id": _id(), "email": email, "name": name, "role": role, "jabatan": jabatan,
                "password_hash": A.hash_password(ADMIN_PASSWORD if role == "admin" else "Staff2026!"),
                "is_active": True, "created_at": iso(datetime.now(timezone.utc)),
            })
        elif role == "admin" and not A.verify_password(ADMIN_PASSWORD, existing.get("password_hash", "")):
            await db.users.update_one({"email": email}, {"$set": {"password_hash": A.hash_password(ADMIN_PASSWORD)}})

    if await db.partners.count_documents({}) > 0:
        return  # data already seeded

    now = datetime.now(timezone.utc)
    admin = await db.users.find_one({"email": ADMIN_EMAIL})
    admin_id = admin["id"] if admin else _id()

    partner_ids = []
    for idx, (nama, jenis, kategori, sektor, region, pic, pemail, telp, nib) in enumerate(PARTNERS):
        pid = _id()
        partner_ids.append(pid)
        created = now - timedelta(days=800 - idx * 90)
        await db.partners.insert_one({
            "id": pid, "nama": nama, "jenis_perusahaan": jenis, "kategori": kategori,
            "sektor": sektor, "region": region, "alamat": region, "nib": nib,
            "pic": pic, "email": pemail, "telp": telp, "catatan": "",
            "created_by": admin_id, "created_by_name": "Shinta Syafrina", "created_at": iso(created),
        })

    doc_ids = []
    for (pidx, jenis, klas, judul, status, so, eo) in DOCS:
        did = _id()
        doc_ids.append(did)
        tanggal_mulai = iso((now + timedelta(days=so)))[:10] if so is not None else None
        tanggal_berakhir = iso((now + timedelta(days=eo)))[:10] if eo is not None else None
        actual_status = status
        if eo is not None and eo < 0 and status == "Active":
            actual_status = "Expired"
        await db.documents.insert_one({
            "id": did, "root_id": did, "version": 1, "is_latest": True,
            "partner_id": partner_ids[pidx], "jenis": jenis, "klasifikasi": klas, "nomor": f"{jenis}/{2024 + pidx % 2}/{100 + len(doc_ids)}",
            "judul": judul, "tanggal_mulai": tanggal_mulai, "tanggal_berakhir": tanggal_berakhir,
            "status": actual_status, "changelog": "Entri awal migrasi data", "file_id": None,
            "created_by": admin_id, "created_by_name": "Shinta Syafrina", "created_at": iso(now - timedelta(days=300 - len(doc_ids) * 10)),
        })

    for (pidx, didx, tahun, tri, jk, judul, mbkm, sk, sa, dosen, mhs, region) in IMPLS:
        await db.implementations.insert_one({
            "id": _id(), "partner_id": partner_ids[pidx], "document_id": doc_ids[didx] if didx is not None else None,
            "tahun": tahun, "triwulan": tri, "jenis_kegiatan": jk, "judul": judul, "scope_mbkm": mbkm,
            "status_kegiatan": sk, "status_approval": sa, "catatan_approval": "Bukti lengkap, disetujui." if sa == "Approved" else ("Mohon lengkapi tautan output." if sa == "Revision" else ""),
            "link_output": "https://drive.google.com/contoh-bukti-output", "region": region,
            "jumlah_dosen": dosen, "jumlah_mahasiswa": mhs, "catatan": "",
            "approved_by": "Budi Santoso" if sa in ("Approved", "Revision") else None,
            "approved_at": iso(now) if sa in ("Approved", "Revision") else None,
            "created_by": admin_id, "created_by_name": "Shinta Syafrina", "created_at": iso(now - timedelta(days=len(judul))),
        })

    for targets, title, msg, ntype in NOTIFS:
        await db.notifications.insert_one({
            "id": _id(), "role_targets": targets, "title": title, "message": msg,
            "type": ntype, "read_by": [], "created_at": iso(now),
        })
