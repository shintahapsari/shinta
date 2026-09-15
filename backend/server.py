from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, UploadFile, File, Query, Header
from starlette.responses import Response as StarletteResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

import auth as A
import email_service as ES
import storage as ST
import exporters as EX

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
UNEJ_EMAIL_RE = re.compile(r"^[a-z0-9._%+-]+@([a-z0-9-]+\.)*unej\.ac\.id$", re.I)

app = FastAPI(title="SIMETRI-TIP UNEJ")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

ROLES = ["mahasiswa", "admin", "tim_kerjasama", "tim_mbkm", "tim_manajemen"]
STAFF_ROLES = ["admin", "tim_kerjasama", "tim_mbkm", "tim_manajemen"]
WRITE_ROLES = ["admin", "tim_kerjasama", "tim_mbkm"]
APPROVE_ROLES = ["admin", "tim_kerjasama", "tim_mbkm"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------------- Models ----------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class MagicRequestIn(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class MagicVerifyIn(BaseModel):
    token: str


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    role: str
    password: Optional[str] = None
    jabatan: Optional[str] = None


class PartnerIn(BaseModel):
    nama: str
    jenis_perusahaan: Optional[str] = ""
    kategori: str = "Nasional"
    sektor: Optional[str] = ""
    region: Optional[str] = ""
    alamat: Optional[str] = ""
    nib: Optional[str] = ""
    pic: Optional[str] = ""
    email: Optional[str] = ""
    telp: Optional[str] = ""
    catatan: Optional[str] = ""


class DocumentIn(BaseModel):
    partner_id: str
    jenis: str = "PKS"
    klasifikasi: Optional[str] = "Tridharma"
    nomor: Optional[str] = ""
    judul: str
    tanggal_mulai: Optional[str] = None
    tanggal_berakhir: Optional[str] = None
    status: str = "Draft"
    changelog: Optional[str] = ""
    file_id: Optional[str] = None


class ImplementationIn(BaseModel):
    partner_id: str
    document_id: Optional[str] = None
    tahun: int
    triwulan: str = "Q1"
    jenis_kegiatan: str
    judul: str
    scope_mbkm: bool = False
    status_kegiatan: str = "On Process"
    link_output: Optional[str] = ""
    region: Optional[str] = ""
    jumlah_dosen: int = 0
    jumlah_mahasiswa: int = 0
    catatan: Optional[str] = ""


class ApprovalIn(BaseModel):
    status_approval: str
    catatan: Optional[str] = ""


# ---------------- Auth deps ----------------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        h = request.headers.get("Authorization", "")
        if h.startswith("Bearer "):
            token = h[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    try:
        payload = A.decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Tipe token tidak valid")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token kedaluwarsa atau tidak valid")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Pengguna tidak ditemukan")
    return user


def require_roles(*roles):
    async def dep(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Akses ditolak untuk peran Anda")
        return user
    return dep


def set_auth_cookies(response: Response, user: dict):
    access = A.create_access_token(user["id"], user["email"], user["role"])
    refresh = A.create_refresh_token(user["id"])
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=A.ACCESS_MINUTES * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=A.REFRESH_DAYS * 86400, path="/")


async def audit(user: dict, action: str, entity_type: str, entity_id: str, detail: str, request: Request = None):
    await db.audit_logs.insert_one({
        "id": new_id(),
        "timestamp": now_iso(),
        "user_id": user.get("id"),
        "user_name": user.get("name"),
        "role": user.get("role"),
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "detail": detail,
        "ip": (request.client.host if request and request.client else "-"),
    })


async def notify(role_targets: list, title: str, message: str, ntype: str = "info"):
    await db.notifications.insert_one({
        "id": new_id(),
        "role_targets": role_targets,
        "title": title,
        "message": message,
        "type": ntype,
        "read_by": [],
        "created_at": now_iso(),
    })


def public_user(u: dict) -> dict:
    return {k: v for k, v in u.items() if k not in ("password_hash", "_id")}


# ---------------- Auth routes ----------------
@api.post("/auth/login")
async def login(body: LoginIn, response: Response, request: Request):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not A.verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau kata sandi salah")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Akun dinonaktifkan")
    set_auth_cookies(response, user)
    await audit(user, "LOGIN", "auth", user["id"], "Login staf berhasil", request)
    return public_user(user)


@api.post("/auth/magic-link/request")
async def magic_request(body: MagicRequestIn, request: Request):
    email = body.email.lower()
    if not UNEJ_EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Gunakan email resmi @unej.ac.id")
    token = A.new_magic_token()
    await db.magic_links.insert_one({
        "id": new_id(),
        "token": token,
        "email": email,
        "name": body.name or email.split("@")[0],
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=A.MAGIC_LINK_MINUTES)).isoformat(),
        "used": False,
        "created_at": now_iso(),
    })
    link = f"{FRONTEND_URL}/verify?token={token}"
    email_id = await ES.send_email(
        to=email,
        subject="Tautan Masuk — Kemitraan TIP Universitas Jember",
        html=ES.magic_link_html(body.name or email.split("@")[0], link),
    )
    return {"message": "Tautan masuk telah dikirim ke email Anda", "email_sent": bool(email_id), "dev_magic_link": link}


@api.post("/auth/magic-link/verify")
async def magic_verify(body: MagicVerifyIn, response: Response, request: Request):
    rec = await db.magic_links.find_one({"token": body.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Tautan tidak valid atau sudah digunakan")
    if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Tautan sudah kedaluwarsa")
    await db.magic_links.update_one({"token": body.token}, {"$set": {"used": True}})
    email = rec["email"]
    user = await db.users.find_one({"email": email})
    if not user:
        nim_match = re.match(r"^(\d+)@", email)
        user = {
            "id": new_id(), "email": email, "name": rec.get("name", email.split("@")[0]).replace(".", " ").title(),
            "role": "mahasiswa", "nim": nim_match.group(1) if nim_match else "", "is_active": True,
            "created_at": now_iso(),
        }
        await db.users.insert_one(dict(user))
    set_auth_cookies(response, user)
    await audit(user, "LOGIN", "auth", user["id"], "Login mahasiswa via magic-link", request)
    return public_user(user)


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Berhasil keluar"}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return public_user(user)


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Tidak ada refresh token")
    try:
        payload = A.decode_token(token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token tidak valid")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token tidak valid")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Pengguna tidak ditemukan")
    set_auth_cookies(response, user)
    return public_user(user)


# ---------------- Users (admin) ----------------
@api.get("/users")
async def list_users(user=Depends(require_roles("admin"))):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)


@api.post("/users")
async def create_user(body: UserCreate, request: Request, user=Depends(require_roles("admin"))):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="Peran tidak valid")
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    doc = {
        "id": new_id(), "email": body.email.lower(), "name": body.name, "role": body.role,
        "jabatan": body.jabatan or "", "is_active": True, "created_at": now_iso(),
    }
    if body.role in STAFF_ROLES:
        if not body.password:
            raise HTTPException(status_code=400, detail="Kata sandi wajib untuk akun staf")
        doc["password_hash"] = A.hash_password(body.password)
    await db.users.insert_one(dict(doc))
    await audit(user, "CREATE", "user", doc["id"], f"Membuat pengguna {body.email} ({body.role})", request)
    return public_user(doc)


@api.put("/users/{uid}")
async def update_user(uid: str, body: dict, request: Request, user=Depends(require_roles("admin"))):
    upd = {}
    for f in ("name", "role", "jabatan", "is_active"):
        if f in body:
            upd[f] = body[f]
    if body.get("password"):
        upd["password_hash"] = A.hash_password(body["password"])
    if not upd:
        raise HTTPException(status_code=400, detail="Tidak ada perubahan")
    await db.users.update_one({"id": uid}, {"$set": upd})
    await audit(user, "UPDATE", "user", uid, "Memperbarui pengguna", request)
    return {"message": "Diperbarui"}


# ---------------- Partners ----------------
def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


@api.get("/partners")
async def list_partners(user=Depends(get_current_user), q: str = "", kategori: str = "",
                        sektor: str = "", region: str = ""):
    query = {}
    if kategori:
        query["kategori"] = kategori
    if sektor:
        query["sektor"] = sektor
    if region:
        query["region"] = region
    if q:
        query["$or"] = [{"nama": {"$regex": re.escape(q), "$options": "i"}},
                        {"pic": {"$regex": re.escape(q), "$options": "i"}},
                        {"sektor": {"$regex": re.escape(q), "$options": "i"}}]
    partners = await db.partners.find(query, {"_id": 0}).sort("nama", 1).to_list(1000)
    for p in partners:
        p["active_docs"] = await db.documents.count_documents({"partner_id": p["id"], "status": "Active", "is_latest": True})
        p["impl_count"] = await db.implementations.count_documents({"partner_id": p["id"]})
    return partners


@api.post("/partners/check-duplicate")
async def check_duplicate(body: dict, user=Depends(get_current_user)):
    n = norm(body.get("nama", ""))
    nib = (body.get("nib") or "").strip()
    all_p = await db.partners.find({}, {"_id": 0}).to_list(2000)
    matches = []
    for p in all_p:
        score = 0
        pn = norm(p["nama"])
        if pn and pn == n:
            score = 100
        elif n and pn and (n in pn or pn in n):
            score = 80
        if nib and p.get("nib") and p["nib"].strip() == nib:
            score = max(score, 95)
        if score >= 70:
            matches.append({"id": p["id"], "nama": p["nama"], "nib": p.get("nib", ""), "score": score})
    matches.sort(key=lambda x: -x["score"])
    return {"duplicates": matches}


@api.post("/partners")
async def create_partner(body: PartnerIn, request: Request, user=Depends(require_roles(*WRITE_ROLES))):
    doc = body.model_dump()
    doc.update({"id": new_id(), "created_by": user["id"], "created_by_name": user["name"], "created_at": now_iso()})
    await db.partners.insert_one(dict(doc))
    await audit(user, "CREATE", "partner", doc["id"], f"Menambah mitra: {body.nama}", request)
    await notify(STAFF_ROLES, "Mitra Baru", f"Mitra '{body.nama}' ditambahkan oleh {user['name']}", "info")
    doc.pop("_id", None)
    return doc


@api.get("/partners/{pid}")
async def partner_360(pid: str, user=Depends(get_current_user)):
    p = await db.partners.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Mitra tidak ditemukan")
    docs = await db.documents.find({"partner_id": pid}, {"_id": 0}).sort("created_at", -1).to_list(500)
    impls = await db.implementations.find({"partner_id": pid}, {"_id": 0}).sort("created_at", -1).to_list(500)
    logs = await db.audit_logs.find({"entity_id": pid}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return {"partner": p, "documents": docs, "implementations": impls, "audit": logs}


@api.put("/partners/{pid}")
async def update_partner(pid: str, body: PartnerIn, request: Request, user=Depends(require_roles(*WRITE_ROLES))):
    if not await db.partners.find_one({"id": pid}):
        raise HTTPException(status_code=404, detail="Mitra tidak ditemukan")
    await db.partners.update_one({"id": pid}, {"$set": body.model_dump()})
    await audit(user, "UPDATE", "partner", pid, f"Memperbarui mitra: {body.nama}", request)
    return await db.partners.find_one({"id": pid}, {"_id": 0})


@api.delete("/partners/{pid}")
async def delete_partner(pid: str, request: Request, user=Depends(require_roles("admin"))):
    await db.partners.delete_one({"id": pid})
    await audit(user, "DELETE", "partner", pid, "Menghapus mitra", request)
    return {"message": "Dihapus"}


# ---------------- Documents (versioned, immutable) ----------------
@api.get("/documents")
async def list_documents(user=Depends(get_current_user), partner_id: str = "", jenis: str = "",
                         status: str = "", latest_only: str = "true"):
    query = {}
    if partner_id:
        query["partner_id"] = partner_id
    if jenis:
        query["jenis"] = jenis
    if status:
        query["status"] = status
    if latest_only == "true":
        query["is_latest"] = True
    docs = await db.documents.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    pmap = {p["id"]: p["nama"] for p in await db.partners.find({}, {"_id": 0, "id": 1, "nama": 1}).to_list(2000)}
    for d in docs:
        d["partner_nama"] = pmap.get(d["partner_id"], "-")
    return docs


@api.post("/documents")
async def create_document(body: DocumentIn, request: Request, user=Depends(require_roles(*WRITE_ROLES))):
    doc = body.model_dump()
    did = new_id()
    doc.update({
        "id": did, "root_id": did, "version": 1, "is_latest": True,
        "created_by": user["id"], "created_by_name": user["name"], "created_at": now_iso(),
    })
    await db.documents.insert_one(dict(doc))
    await audit(user, "CREATE", "document", doc["id"], f"Membuat dokumen {body.jenis}: {body.judul}", request)
    await notify(STAFF_ROLES, "Dokumen Baru", f"Dokumen {body.jenis} '{body.judul}' dibuat", "info")
    doc.pop("_id", None)
    return doc


@api.get("/documents/{did}")
async def document_detail(did: str, user=Depends(get_current_user)):
    d = await db.documents.find_one({"id": did}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")
    versions = await db.documents.find({"root_id": d["root_id"]}, {"_id": 0}).sort("version", -1).to_list(100)
    return {"document": d, "versions": versions}


@api.put("/documents/{did}")
async def revise_document(did: str, body: DocumentIn, request: Request, user=Depends(require_roles(*WRITE_ROLES))):
    old = await db.documents.find_one({"id": did}, {"_id": 0})
    if not old:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")
    await db.documents.update_one({"id": did}, {"$set": {"is_latest": False, "status": "Superseded"}})
    new_doc = body.model_dump()
    new_doc.update({
        "id": new_id(), "root_id": old["root_id"], "version": old.get("version", 1) + 1, "is_latest": True,
        "created_by": user["id"], "created_by_name": user["name"], "created_at": now_iso(),
    })
    await db.documents.insert_one(dict(new_doc))
    await audit(user, "REVISE", "document", new_doc["id"], f"Revisi dokumen v{new_doc['version']}: {body.judul}", request)
    new_doc.pop("_id", None)
    return new_doc


# ---------------- Implementations (dual status) ----------------
@api.get("/implementations")
async def list_implementations(user=Depends(get_current_user), partner_id: str = "", tahun: str = "",
                               status_approval: str = "", scope_mbkm: str = ""):
    query = {}
    if user["role"] == "mahasiswa":
        query["created_by"] = user["id"]
    if partner_id:
        query["partner_id"] = partner_id
    if tahun:
        query["tahun"] = int(tahun)
    if status_approval:
        query["status_approval"] = status_approval
    if scope_mbkm == "true":
        query["scope_mbkm"] = True
    impls = await db.implementations.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    pmap = {p["id"]: p["nama"] for p in await db.partners.find({}, {"_id": 0, "id": 1, "nama": 1}).to_list(2000)}
    for i in impls:
        i["partner_nama"] = pmap.get(i["partner_id"], "-")
    return impls


@api.post("/implementations")
async def create_implementation(body: ImplementationIn, request: Request, user=Depends(get_current_user)):
    if user["role"] == "tim_manajemen":
        raise HTTPException(status_code=403, detail="Tim Manajemen bersifat read-only")
    doc = body.model_dump()
    doc.update({
        "id": new_id(), "status_approval": "Pending", "catatan_approval": "",
        "created_by": user["id"], "created_by_name": user["name"], "created_at": now_iso(),
    })
    await db.implementations.insert_one(dict(doc))
    await audit(user, "CREATE", "implementation", doc["id"], f"Membuat implementasi: {body.judul}", request)
    await notify(APPROVE_ROLES, "Verifikasi Diperlukan", f"Implementasi '{body.judul}' menunggu persetujuan", "approval")
    doc.pop("_id", None)
    return doc


@api.get("/implementations/{iid}")
async def implementation_detail(iid: str, user=Depends(get_current_user)):
    i = await db.implementations.find_one({"id": iid}, {"_id": 0})
    if not i:
        raise HTTPException(status_code=404, detail="Implementasi tidak ditemukan")
    if user["role"] == "mahasiswa" and i["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    return i


@api.put("/implementations/{iid}")
async def update_implementation(iid: str, body: ImplementationIn, request: Request, user=Depends(get_current_user)):
    i = await db.implementations.find_one({"id": iid}, {"_id": 0})
    if not i:
        raise HTTPException(status_code=404, detail="Implementasi tidak ditemukan")
    if user["role"] == "mahasiswa" and i["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    if user["role"] == "tim_manajemen":
        raise HTTPException(status_code=403, detail="Read-only")
    await db.implementations.update_one({"id": iid}, {"$set": body.model_dump()})
    await audit(user, "UPDATE", "implementation", iid, f"Memperbarui implementasi: {body.judul}", request)
    return await db.implementations.find_one({"id": iid}, {"_id": 0})


@api.post("/implementations/{iid}/approval")
async def set_approval(iid: str, body: ApprovalIn, request: Request, user=Depends(require_roles(*APPROVE_ROLES))):
    if body.status_approval not in ("Approved", "Rejected", "Revision", "Pending"):
        raise HTTPException(status_code=400, detail="Status approval tidak valid")
    i = await db.implementations.find_one({"id": iid}, {"_id": 0})
    if not i:
        raise HTTPException(status_code=404, detail="Tidak ditemukan")
    await db.implementations.update_one({"id": iid}, {"$set": {
        "status_approval": body.status_approval, "catatan_approval": body.catatan,
        "approved_by": user["name"], "approved_at": now_iso(),
    }})
    await audit(user, "APPROVAL", "implementation", iid, f"Set approval: {body.status_approval}. {body.catatan}", request)
    await notify(["mahasiswa"], "Status Verifikasi Diperbarui", f"Implementasi '{i['judul']}': {body.status_approval}", "approval")
    return {"message": "Status approval diperbarui"}


# ---------------- Kampus Berdampak ----------------
async def compute_kampus_berdampak():
    partners = await db.partners.find({}, {"_id": 0}).to_list(2000)
    active_docs = await db.documents.find({"status": "Active", "jenis": {"$in": ["PKS", "IA", "MoU"]}, "is_latest": True}, {"_id": 0}).to_list(2000)
    approved_impls = await db.implementations.find({"status_approval": "Approved"}, {"_id": 0}).to_list(2000)
    active_partner_ids = {d["partner_id"] for d in active_docs}
    impl_partner_ids = {i["partner_id"] for i in approved_impls}
    pmap = {p["id"]: p for p in partners}
    regions = {}
    for pid in active_partner_ids:
        p = pmap.get(pid)
        if not p:
            continue
        r = p.get("region") or "Tidak Diketahui"
        regions.setdefault(r, {"region": r, "eligible": 0, "implemented": 0, "partners": []})
        regions[r]["eligible"] += 1
        regions[r]["partners"].append({"id": pid, "nama": p["nama"], "implemented": pid in impl_partner_ids})
        if pid in impl_partner_ids:
            regions[r]["implemented"] += 1
    rows = sorted(regions.values(), key=lambda x: -x["eligible"])
    total_eligible = len(active_partner_ids)
    total_implemented = len(active_partner_ids & impl_partner_ids)
    return {
        "summary": {"total_eligible": total_eligible, "total_implemented": total_implemented,
                    "coverage_pct": round(100 * total_implemented / total_eligible, 1) if total_eligible else 0},
        "regions": rows,
    }


@api.get("/kampus-berdampak")
async def kampus_berdampak(user=Depends(get_current_user)):
    return await compute_kampus_berdampak()


# ---------------- Dashboard KPI ----------------
@api.get("/dashboard/kpi")
async def dashboard_kpi(user=Depends(get_current_user)):
    total_partners = await db.partners.count_documents({})
    active_docs = await db.documents.count_documents({"status": "Active", "is_latest": True})
    prospektif = await db.documents.count_documents({"jenis": "Prospektif", "is_latest": True})
    approved_impls = await db.implementations.count_documents({"status_approval": "Approved"})
    pending_impls = await db.implementations.count_documents({"status_approval": "Pending"})
    total_impls = await db.implementations.count_documents({})

    now = datetime.now(timezone.utc)
    expiring = []
    for d in await db.documents.find({"status": "Active", "is_latest": True}, {"_id": 0}).to_list(2000):
        if not d.get("tanggal_berakhir"):
            continue
        try:
            end = datetime.fromisoformat(str(d["tanggal_berakhir"])[:10]).replace(tzinfo=timezone.utc)
            days = (end - now).days
            if -3650 <= days <= 90:
                expiring.append({"id": d["id"], "judul": d["judul"], "days": days, "tanggal_berakhir": d["tanggal_berakhir"]})
        except Exception:
            pass
    expiring.sort(key=lambda x: x["days"])

    growth = {}
    for p in await db.partners.find({}, {"_id": 0, "created_at": 1}).to_list(3000):
        y = str(p.get("created_at", ""))[:4] or "?"
        growth[y] = growth.get(y, 0) + 1
    growth_series = [{"year": y, "count": c} for y, c in sorted(growth.items()) if y and y != "?"]
    cum = 0
    for g in growth_series:
        cum += g["count"]
        g["cumulative"] = cum

    status_dist = {}
    for d in await db.documents.find({"is_latest": True}, {"_id": 0, "status": 1}).to_list(3000):
        status_dist[d["status"]] = status_dist.get(d["status"], 0) + 1
    status_series = [{"name": k, "value": v} for k, v in status_dist.items()]

    trend = {}
    dosen_total = 0
    mhs_total = 0
    for i in await db.implementations.find({"status_approval": "Approved"}, {"_id": 0}).to_list(5000):
        key = f"{i.get('tahun','?')} {i.get('triwulan','')}"
        trend[key] = trend.get(key, 0) + 1
        dosen_total += i.get("jumlah_dosen", 0) or 0
        mhs_total += i.get("jumlah_mahasiswa", 0) or 0
    trend_series = [{"period": k, "count": v} for k, v in sorted(trend.items())]

    kat = {}
    for p in await db.partners.find({}, {"_id": 0, "kategori": 1}).to_list(3000):
        kat[p.get("kategori", "?")] = kat.get(p.get("kategori", "?"), 0) + 1
    kategori_series = [{"name": k, "value": v} for k, v in kat.items()]

    kb = await compute_kampus_berdampak()

    return {
        "cards": {
            "total_partners": total_partners,
            "active_docs": active_docs,
            "prospektif": prospektif,
            "approved_impls": approved_impls,
            "pending_impls": pending_impls,
            "total_impls": total_impls,
            "coverage_pct": kb["summary"]["coverage_pct"],
            "dosen_total": dosen_total,
            "mahasiswa_total": mhs_total,
        },
        "partner_growth": growth_series,
        "doc_status": status_series,
        "impl_trend": trend_series,
        "kategori": kategori_series,
        "expiring": expiring[:8],
    }


# ---------------- Notifications ----------------
@api.get("/notifications")
async def list_notifications(user=Depends(get_current_user)):
    items = await db.notifications.find({"role_targets": user["role"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for n in items:
        n["is_read"] = user["id"] in n.get("read_by", [])
    unread = sum(1 for n in items if not n["is_read"])
    return {"items": items, "unread": unread}


@api.post("/notifications/{nid}/read")
async def read_notification(nid: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": nid}, {"$addToSet": {"read_by": user["id"]}})
    return {"message": "ok"}


@api.post("/notifications/read-all")
async def read_all(user=Depends(get_current_user)):
    await db.notifications.update_many({"role_targets": user["role"]}, {"$addToSet": {"read_by": user["id"]}})
    return {"message": "ok"}


# ---------------- Audit ----------------
@api.get("/audit-logs")
async def list_audit(user=Depends(require_roles("admin", "tim_manajemen", "tim_kerjasama", "tim_mbkm")),
                     entity_type: str = "", q: str = ""):
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if q:
        query["$or"] = [{"user_name": {"$regex": re.escape(q), "$options": "i"}},
                        {"action": {"$regex": re.escape(q), "$options": "i"}},
                        {"detail": {"$regex": re.escape(q), "$options": "i"}}]
    return await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(500)


# ---------------- Files ----------------
@api.post("/files/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    if ext not in set(ST.MIME_TYPES.keys()):
        raise HTTPException(status_code=400, detail=f"Tipe file tidak diizinkan (.{ext})")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Ukuran file maksimal 10MB")
    fid = new_id()
    path = f"{ST.APP_NAME}/uploads/{user['id']}/{fid}.{ext}"
    ct = ST.MIME_TYPES.get(ext, file.content_type or "application/octet-stream")
    try:
        result = ST.put_object(path, data, ct)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=502, detail="Gagal mengunggah file")
    await db.files.insert_one({
        "id": fid, "storage_path": result["path"], "original_filename": file.filename,
        "content_type": ct, "size": result.get("size", len(data)), "is_deleted": False,
        "uploaded_by": user["id"], "created_at": now_iso(),
    })
    return {"id": fid, "filename": file.filename, "content_type": ct, "size": result.get("size", len(data))}


@api.get("/files/{fid}/download")
async def download_file(fid: str, request: Request, authorization: str = Header(None), auth: str = Query(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif auth:
        token = auth
    else:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    try:
        A.decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token tidak valid")
    rec = await db.files.find_one({"id": fid, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    data, ct = ST.get_object(rec["storage_path"])
    return StarletteResponse(content=data, media_type=rec.get("content_type", ct),
                             headers={"Content-Disposition": f'inline; filename="{rec["original_filename"]}"'})


# ---------------- Reports / Export ----------------
async def build_report(rtype: str):
    pmap = {p["id"]: p["nama"] for p in await db.partners.find({}, {"_id": 0}).to_list(3000)}
    if rtype == "implementasi":
        rows_raw = await db.implementations.find({}, {"_id": 0}).sort("created_at", -1).to_list(3000)
        headers = ["Judul", "Mitra", "Tahun", "Triwulan", "Jenis", "Status Kegiatan", "Status Approval", "Dosen", "Mhs"]
        rows = [[r["judul"], pmap.get(r["partner_id"], "-"), r.get("tahun"), r.get("triwulan"),
                 r.get("jenis_kegiatan"), r.get("status_kegiatan"), r.get("status_approval"),
                 r.get("jumlah_dosen", 0), r.get("jumlah_mahasiswa", 0)] for r in rows_raw]
        return "Laporan Implementasi Kegiatan", headers, rows
    if rtype == "partner":
        raw = await db.partners.find({}, {"_id": 0}).sort("nama", 1).to_list(3000)
        headers = ["Nama Mitra", "Kategori", "Sektor", "Region", "PIC", "Email", "Telp"]
        rows = [[r["nama"], r.get("kategori"), r.get("sektor"), r.get("region"), r.get("pic"),
                 r.get("email"), r.get("telp")] for r in raw]
        return "Laporan Per Partner", headers, rows
    if rtype == "tahunan":
        raw = await db.implementations.find({"status_approval": "Approved"}, {"_id": 0}).to_list(5000)
        agg = {}
        for r in raw:
            y = r.get("tahun", "?")
            agg.setdefault(y, {"impl": 0, "dosen": 0, "mhs": 0})
            agg[y]["impl"] += 1
            agg[y]["dosen"] += r.get("jumlah_dosen", 0) or 0
            agg[y]["mhs"] += r.get("jumlah_mahasiswa", 0) or 0
        headers = ["Tahun", "Implementasi Disetujui", "Total Dosen", "Total Mahasiswa"]
        rows = [[y, v["impl"], v["dosen"], v["mhs"]] for y, v in sorted(agg.items())]
        return "Laporan Tahunan", headers, rows
    if rtype == "kampus-berdampak":
        kb = await compute_kampus_berdampak()
        headers = ["Region", "Eligible", "Implemented", "Coverage %"]
        rows = [[r["region"], r["eligible"], r["implemented"],
                 round(100 * r["implemented"] / r["eligible"], 1) if r["eligible"] else 0] for r in kb["regions"]]
        return "Laporan Kampus Berdampak", headers, rows
    if rtype == "mbkm":
        raw = await db.implementations.find({"scope_mbkm": True}, {"_id": 0}).to_list(3000)
        headers = ["Judul", "Mitra", "Tahun", "Status Approval", "Dosen", "Mahasiswa"]
        rows = [[r["judul"], pmap.get(r["partner_id"], "-"), r.get("tahun"), r.get("status_approval"),
                 r.get("jumlah_dosen", 0), r.get("jumlah_mahasiswa", 0)] for r in raw]
        return "Laporan MBKM", headers, rows
    raise HTTPException(status_code=404, detail="Jenis laporan tidak dikenal")


@api.get("/reports/{rtype}")
async def preview_report(rtype: str, user=Depends(get_current_user)):
    title, headers, rows = await build_report(rtype)
    return {"title": title, "headers": headers, "rows": rows}


@api.get("/reports/{rtype}/export")
async def export_report(rtype: str, request: Request, format: str = "pdf", auth: str = Query(None),
                        authorization: str = Header(None)):
    token = auth or (authorization[7:] if authorization and authorization.startswith("Bearer ") else None) or request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    try:
        A.decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token tidak valid")
    title, headers, rows = await build_report(rtype)
    if format == "excel":
        data = EX.to_excel(title, headers, rows)
        return StarletteResponse(content=data,
                                 media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                 headers={"Content-Disposition": f'attachment; filename="{rtype}.xlsx"'})
    data = EX.to_pdf(title, headers, rows)
    return StarletteResponse(content=data, media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{rtype}.pdf"'})


@api.get("/")
async def root():
    return {"message": "SIMETRI-TIP UNEJ API"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.magic_links.create_index("token")
    try:
        ST.init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    from seed import seed_all
    await seed_all(db)


@app.on_event("shutdown")
async def shutdown():
    client.close()
