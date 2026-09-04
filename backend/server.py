from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import hashlib
import logging
import random
import secrets
import asyncio
import hmac
from datetime import datetime, timezone, timedelta
from html import escape
from typing import Optional, List, Any

import bcrypt
import httpx
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query, BackgroundTasks, Header
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# ============ Setup ============
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Sintesa Tembakau Nusantara")
WEBHOOK_CRON_SECRET = os.environ.get("WEBHOOK_CRON_SECRET", "")

app = FastAPI(title="Sintesa Tembakau Nusantara API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

ROLES = ["farmer", "collector", "manufacturer", "distributor", "retailer", "admin"]

CITY_COORDS = {
    "jakarta": (-6.2088, 106.8456),
    "surabaya": (-7.2575, 112.7521),
    "bandung": (-6.9175, 107.6191),
    "semarang": (-6.9667, 110.4167),
    "yogyakarta": (-7.7956, 110.3695),
    "medan": (3.5952, 98.6722),
    "makassar": (-5.1477, 119.4327),
    "denpasar": (-8.6705, 115.2126),
    "temanggung": (-7.3167, 110.1833),
    "jember": (-8.1729, 113.7003),
    "kediri": (-7.8167, 112.0167),
    "malang": (-7.9797, 112.6304),
    "solo": (-7.5755, 110.8243),
    "madura": (-7.0000, 113.5000),
    "lombok": (-8.6500, 116.3242),
}

def match_city_coords(text: str):
    if not text: return None
    low = text.lower()
    for city, coords in CITY_COORDS.items():
        if city in low:
            return {"lat": coords[0], "lng": coords[1], "city": city.title()}
    return None

def parse_gps(gps: str):
    if not gps: return None
    try:
        parts = gps.split(",")
        return {"lat": float(parts[0].strip()), "lng": float(parts[1].strip())}
    except Exception:
        return None

# ============ Auth Helpers ============
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(uid: str, email: str, role: str) -> str:
    return jwt.encode({
        "sub": uid, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Belum masuk / Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Pengguna tidak ditemukan")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kadaluarsa")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")

def require_roles(*roles):
    async def _dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles and user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Akses ditolak untuk role ini")
        return user
    return _dep

def set_auth_cookies(resp: Response, token: str):
    resp.set_cookie("access_token", token, httponly=True, secure=True,
                    samesite="none", max_age=43200, path="/")

# ============ Ledger (Hash Chain) ============
def compute_hash(prev_hash: str, timestamp: str, actor: str, batch_id: str, data_type: str, payload: dict) -> str:
    import json
    raw = f"{prev_hash}|{timestamp}|{actor}|{batch_id}|{data_type}|{json.dumps(payload, sort_keys=True, default=str)}"
    return hashlib.sha256(raw.encode()).hexdigest()

async def append_block(actor: str, actor_name: str, batch_id: str, data_type: str, payload: dict, status: str = "verified") -> dict:
    last = await db.ledger.find_one(sort=[("block_index", -1)])
    prev_hash = last["current_hash"] if last else "0" * 64
    block_index = (last["block_index"] + 1) if last else 0
    ts = datetime.now(timezone.utc).isoformat()
    curr = compute_hash(prev_hash, ts, actor, batch_id, data_type, payload)
    block = {
        "block_index": block_index,
        "previous_hash": prev_hash,
        "current_hash": curr,
        "timestamp": ts,
        "actor_id": actor,
        "actor_name": actor_name,
        "batch_id": batch_id,
        "data_type": data_type,
        "status": status,
        "payload": payload,
    }
    await db.ledger.insert_one(block)
    block.pop("_id", None)
    return block

async def run_smart_contracts(block: dict):
    """Fire SC-001 (Harvest Provenance), SC-002 (Farmer Payment/Shipment Verification), SC-003 (Excise Tax)."""
    log_entries = []
    dt = block["data_type"]
    payload = block["payload"]
    batch_id = block["batch_id"]

    if dt == "harvest":
        moisture = payload.get("moisture_pct", 0)
        ok = 8 <= moisture <= 18 and payload.get("weight_kg", 0) > 0
        log_entries.append({
            "contract_id": "SC-001", "name": "Harvest & Provenance Verifier",
            "batch_id": batch_id, "actor": block["actor_name"],
            "result": "PASSED" if ok else "FAILED",
            "detail": f"Kadar air {moisture}% (rentang 8–18%), berat {payload.get('weight_kg')} kg",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    if dt == "collection":
        # SC-002 farmer payment
        source_hb = payload.get("source_harvest_id")
        hb = await db.batches.find_one({"batch_id": source_hb})
        exception = False
        if hb:
            recv = payload.get("received_kg", 0)
            src = hb.get("weight_kg", 0)
            diff = abs(recv - src) / src * 100 if src else 100
            if diff > 5:
                exception = True
                await db.exceptions.insert_one({
                    "type": "quantity_mismatch",
                    "batch_id": batch_id,
                    "reference_batch": source_hb,
                    "message": f"Selisih berat {diff:.1f}% antara panen ({src} kg) dan pengumpulan ({recv} kg)",
                    "severity": "high", "status": "open",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
        log_entries.append({
            "contract_id": "SC-002", "name": "Farmer Payment Authorizer",
            "batch_id": batch_id, "actor": block["actor_name"],
            "result": "AUTHORIZED" if not exception else "HOLD",
            "detail": f"Otorisasi pembayaran petani untuk batch {source_hb}" if not exception else "Ditahan karena selisih kuantitas",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    if dt == "production":
        source_cb = payload.get("source_collection_id")
        cb = await db.batches.find_one({"batch_id": source_cb})
        if cb:
            used = payload.get("input_kg", 0)
            avail = cb.get("received_kg", 0)
            if used > avail:
                await db.exceptions.insert_one({
                    "type": "input_exceeds_source",
                    "batch_id": batch_id,
                    "reference_batch": source_cb,
                    "message": f"Input produksi ({used} kg) melebihi bahan baku diterima ({avail} kg)",
                    "severity": "critical", "status": "open",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
        log_entries.append({
            "contract_id": "SC-003", "name": "Excise Tax & Serialization Guard",
            "batch_id": batch_id, "actor": block["actor_name"],
            "result": "PASSED" if payload.get("excise_number") else "WARNING",
            "detail": f"No. Pita Cukai: {payload.get('excise_number', 'BELUM DIISI')}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    if dt == "shipment":
        temp = payload.get("temperature_c", 25)
        hum = payload.get("humidity_pct", 60)
        ok = temp <= 35 and hum <= 75
        if not ok:
            await db.exceptions.insert_one({
                "type": "iot_threshold_breach",
                "batch_id": batch_id,
                "message": f"Suhu {temp}°C / Kelembaban {hum}% melewati ambang aman",
                "severity": "medium", "status": "open",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        log_entries.append({
            "contract_id": "SC-002", "name": "IoT Temperature Threshold Enforcer",
            "batch_id": batch_id, "actor": block["actor_name"],
            "result": "PASSED" if ok else "BREACH",
            "detail": f"Suhu {temp}°C, Kelembaban {hum}%",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    if log_entries:
        await db.smart_contract_logs.insert_many(log_entries)

# ============ Models ============
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    company: str = ""
    position: str = ""
    contact: str = ""

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class HarvestIn(BaseModel):
    variety: str
    location: str
    gps: str = ""
    harvest_date: str
    weight_kg: float
    plant_age_days: int = 90
    moisture_pct: float = 12.0
    initial_grade: str = "A"
    photo_url: str = ""

class CollectionIn(BaseModel):
    source_harvest_id: str
    received_kg: float
    grade: str
    drying_method: str = "Sun-cured"
    notes: str = ""

class ProductionIn(BaseModel):
    source_collection_id: str
    input_kg: float
    output_units: int
    blend_notes: str = ""
    packaging: str = "Kemasan Karton"
    excise_number: str = ""
    quality_grade: str = "A"

class ShipmentIn(BaseModel):
    source_production_id: str
    destination: str
    ship_date: str
    eta_date: str
    quantity_units: int
    temperature_c: float = 24.0
    humidity_pct: float = 60.0

class RetailIn(BaseModel):
    source_shipment_id: str
    received_units: int
    display_date: str
    store_location: str

class ExceptionResolveIn(BaseModel):
    resolution: str

class CorrectionIn(BaseModel):
    batch_id: str
    reason: str
    changes: dict

# ============ Auth Routes ============
@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau kata sandi salah")
    token = create_access_token(str(user["_id"]), email, user["role"])
    set_auth_cookies(response, token)
    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    return {"user": user, "access_token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

# ============ User Management (Admin) ============
@api.post("/users/invite")
async def invite_user(body: RegisterIn, admin: dict = Depends(require_roles("admin"))):
    if body.role not in ROLES or body.role == "admin":
        raise HTTPException(400, "Role tidak valid untuk undangan")
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email sudah terdaftar")
    doc = {
        "email": email, "password_hash": hash_password(body.password),
        "name": body.name, "role": body.role,
        "company": body.company, "position": body.position, "contact": body.contact,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    doc.pop("password_hash", None)
    return doc

@api.get("/users")
async def list_users(admin: dict = Depends(require_roles("admin"))):
    users = await db.users.find({}, {"password_hash": 0}).sort("created_at", -1).to_list(500)
    for u in users:
        u["_id"] = str(u["_id"])
    return users

@api.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_roles("admin"))):
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"ok": True}

# ============ Batch Helpers ============
async def next_batch_id(prefix: str) -> str:
    count = await db.batches.count_documents({"prefix": prefix})
    return f"{prefix}-{count + 1:04d}"

async def create_batch(prefix: str, actor: dict, data_type: str, payload: dict, extra: dict = None) -> dict:
    batch_id = await next_batch_id(prefix)
    doc = {
        "batch_id": batch_id,
        "prefix": prefix,
        "actor_id": actor["_id"],
        "actor_name": actor["name"],
        "actor_role": actor["role"],
        "actor_city": actor.get("city", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "verified",
        **payload,
    }
    if extra:
        doc.update(extra)
    await db.batches.insert_one(doc)
    block = await append_block(actor["_id"], actor["name"], batch_id, data_type, payload)
    await run_smart_contracts(block)
    doc.pop("_id", None)
    return {"batch": doc, "block": block}

# ============ Batch Creation Routes ============
@api.post("/harvest")
async def create_harvest(body: HarvestIn, user: dict = Depends(require_roles("farmer"))):
    return await create_batch("HB", user, "harvest", body.model_dump())

@api.post("/collection")
async def create_collection(body: CollectionIn, user: dict = Depends(require_roles("collector"))):
    if not await db.batches.find_one({"batch_id": body.source_harvest_id, "prefix": "HB"}):
        raise HTTPException(400, "Batch panen sumber tidak ditemukan")
    return await create_batch("CB", user, "collection", body.model_dump())

@api.post("/production")
async def create_production(body: ProductionIn, user: dict = Depends(require_roles("manufacturer"))):
    if not await db.batches.find_one({"batch_id": body.source_collection_id, "prefix": "CB"}):
        raise HTTPException(400, "Batch pengumpulan sumber tidak ditemukan")
    return await create_batch("PB", user, "production", body.model_dump())

@api.post("/shipment")
async def create_shipment(body: ShipmentIn, user: dict = Depends(require_roles("distributor"))):
    if not await db.batches.find_one({"batch_id": body.source_production_id, "prefix": "PB"}):
        raise HTTPException(400, "Batch produksi sumber tidak ditemukan")
    return await create_batch("SB", user, "shipment", body.model_dump())

@api.post("/retail")
async def create_retail(body: RetailIn, user: dict = Depends(require_roles("retailer"))):
    if not await db.batches.find_one({"batch_id": body.source_shipment_id, "prefix": "SB"}):
        raise HTTPException(400, "Batch pengiriman sumber tidak ditemukan")
    product_id = f"PRD-{secrets.token_hex(4).upper()}"
    return await create_batch("RB", user, "retail", body.model_dump(), extra={"product_id": product_id})

# ============ Batch Listing / Detail ============
@api.get("/batches")
async def list_batches(prefix: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if prefix:
        q["prefix"] = prefix
    batches = await db.batches.find(q).sort("created_at", -1).to_list(500)
    for b in batches:
        b["_id"] = str(b["_id"])
    return batches

@api.get("/batches/{batch_id}")
async def get_batch(batch_id: str, user: dict = Depends(get_current_user)):
    b = await db.batches.find_one({"batch_id": batch_id})
    if not b:
        raise HTTPException(404, "Batch tidak ditemukan")
    b["_id"] = str(b["_id"])
    return b

@api.get("/trace/{query}")
async def trace(query: str, user: dict = Depends(get_current_user)):
    """Traceability: return the entire chain by batch_id or product_id."""
    batch = await db.batches.find_one({"$or": [{"batch_id": query}, {"product_id": query}]})
    if not batch:
        raise HTTPException(404, "Data tidak ditemukan")
    chain = []
    current = batch
    # walk back through references
    while current:
        current["_id"] = str(current["_id"])
        chain.insert(0, current)
        ref = None
        for key in ["source_shipment_id", "source_production_id", "source_collection_id", "source_harvest_id"]:
            if current.get(key):
                ref = current[key]
                break
        if not ref:
            break
        current = await db.batches.find_one({"batch_id": ref})
    # walk forward
    forward = batch
    while forward:
        nexts = await db.batches.find({
            "$or": [
                {"source_harvest_id": forward.get("batch_id")},
                {"source_collection_id": forward.get("batch_id")},
                {"source_production_id": forward.get("batch_id")},
                {"source_shipment_id": forward.get("batch_id")},
            ]
        }).to_list(5)
        if not nexts:
            break
        forward = nexts[0]
        forward["_id"] = str(forward["_id"])
        if forward["batch_id"] not in [c["batch_id"] for c in chain]:
            chain.append(forward)
    blocks = await db.ledger.find({"batch_id": {"$in": [c["batch_id"] for c in chain]}}, {"_id": 0}).sort("block_index", 1).to_list(200)
    return {"chain": chain, "blocks": blocks}

# ============ Public Consumer Portal ============
@api.get("/public/verify/{product_id}")
async def public_verify(product_id: str):
    retail = await db.batches.find_one({"product_id": product_id})
    if not retail:
        raise HTTPException(404, "Produk tidak ditemukan")
    chain = []
    current = retail
    while current:
        current["_id"] = str(current["_id"])
        chain.insert(0, current)
        ref = None
        for key in ["source_shipment_id", "source_production_id", "source_collection_id", "source_harvest_id"]:
            if current.get(key):
                ref = current[key]; break
        if not ref: break
        current = await db.batches.find_one({"batch_id": ref})

    hb = next((c for c in chain if c["prefix"] == "HB"), None)
    pb = next((c for c in chain if c["prefix"] == "PB"), None)
    sb = next((c for c in chain if c["prefix"] == "SB"), None)
    rb = retail

    harvest_coords = parse_gps(hb.get("gps")) if hb else None
    if not harvest_coords and hb:
        harvest_coords = match_city_coords(hb.get("location"))
    retail_coords = match_city_coords(rb.get("store_location")) or match_city_coords(sb.get("destination") if sb else "")

    # Build multi-stop journey coordinates for every stage in the chain
    stage_meta = {
        "HB": {"label_id": "Petani", "label_en": "Farmer", "emoji": "🌱", "color": "#059669"},
        "CB": {"label_id": "Pengepul", "label_en": "Collector", "emoji": "📦", "color": "#D97706"},
        "PB": {"label_id": "Pabrik", "label_en": "Manufacturer", "emoji": "🏭", "color": "#2563EB"},
        "SB": {"label_id": "Distributor", "label_en": "Distributor", "emoji": "🚚", "color": "#7C3AED"},
        "RB": {"label_id": "Ritel", "label_en": "Retailer", "emoji": "🏪", "color": "#DC2626"},
    }
    journey_coords = []
    for c in chain:
        pref = c["prefix"]
        coords = None
        if pref == "HB":
            coords = parse_gps(c.get("gps")) or match_city_coords(c.get("location"))
        elif pref == "SB":
            coords = match_city_coords(c.get("destination"))
        elif pref == "RB":
            coords = match_city_coords(c.get("store_location"))
        if not coords:
            coords = match_city_coords(c.get("actor_city", ""))
        if coords:
            meta = stage_meta.get(pref, {})
            journey_coords.append({
                "stage": pref,
                "batch_id": c["batch_id"],
                "actor_name": c.get("actor_name"),
                "date": c.get("created_at"),
                "lat": coords["lat"],
                "lng": coords["lng"],
                "city": coords.get("city", c.get("actor_city", "")),
                "label_id": meta.get("label_id"),
                "label_en": meta.get("label_en"),
                "emoji": meta.get("emoji"),
                "color": meta.get("color"),
            })

    # Increment scan counter
    await db.verify_counts.update_one(
        {"product_id": product_id},
        {"$inc": {"count": 1}, "$set": {"last_scan": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    counter = await db.verify_counts.find_one({"product_id": product_id})
    scan_count = counter["count"] if counter else 1

    # Public info only — hide commercial details
    return {
        "authentic": True,
        "product_id": product_id,
        "variety": hb.get("variety") if hb else "-",
        "cultivation_area": hb.get("location") if hb else "-",
        "harvest_date": hb.get("harvest_date") if hb else "-",
        "quality_grade": pb.get("quality_grade") if pb else "-",
        "retail_date": retail.get("display_date"),
        "blockchain_verified": True,
        "block_count": len(chain),
        "scan_count": scan_count,
        "harvest_coords": harvest_coords,
        "retail_coords": retail_coords,
        "journey_coords": journey_coords,
        "journey": [
            {"stage": c["prefix"], "batch_id": c["batch_id"], "date": c["created_at"]}
            for c in chain
        ],
    }

# ============ Blockchain Explorer ============
@api.get("/ledger")
async def get_ledger(limit: int = 50, user: dict = Depends(get_current_user)):
    blocks = await db.ledger.find({}, {"_id": 0}).sort("block_index", -1).to_list(limit)
    return blocks

@api.get("/ledger/verify")
async def verify_ledger(user: dict = Depends(get_current_user)):
    blocks = await db.ledger.find({}, {"_id": 0}).sort("block_index", 1).to_list(10000)
    valid = True
    broken_at = None
    prev = "0" * 64
    for b in blocks:
        expected = compute_hash(prev, b["timestamp"], b["actor_id"], b["batch_id"], b["data_type"], b["payload"])
        if b["previous_hash"] != prev or b["current_hash"] != expected:
            valid = False; broken_at = b["block_index"]; break
        prev = b["current_hash"]
    return {"valid": valid, "broken_at": broken_at, "total_blocks": len(blocks)}

@api.get("/ledger/stats")
async def ledger_stats(user: dict = Depends(get_current_user)):
    total = await db.ledger.count_documents({})
    last = await db.ledger.find_one(sort=[("block_index", -1)])
    return {
        "block_height": total,
        "last_hash": last["current_hash"] if last else None,
        "avg_block_time_ms": 14,
        "active_validators": 3,
        "network_status": "healthy",
    }

# ============ Smart Contracts ============
@api.get("/contracts")
async def contracts(user: dict = Depends(get_current_user)):
    return [
        {"id": "SC-001", "name": "Harvest & Provenance Verifier", "status": "Deployed & Active",
         "description": "Memvalidasi kadar air, berat, dan lokasi kebun saat panen didaftarkan."},
        {"id": "SC-002", "name": "Farmer Payment & Shipment Verifier", "status": "Deployed & Active",
         "description": "Mengotorisasi pembayaran petani setelah bahan baku diverifikasi diterima; memantau IoT saat pengiriman."},
        {"id": "SC-003", "name": "Excise Tax & Serialization Guard", "status": "Deployed & Active",
         "description": "Mengecek nomor Pita Cukai dan serialisasi kemasan sebelum di-commit ke blockchain."},
    ]

@api.get("/contracts/logs")
async def contract_logs(limit: int = 50, user: dict = Depends(get_current_user)):
    logs = await db.smart_contract_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return logs

# ============ Exceptions ============
@api.get("/exceptions")
async def list_exceptions(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"status": status} if status else {}
    docs = await db.exceptions.find(q).sort("created_at", -1).to_list(500)
    for d in docs:
        d["_id"] = str(d["_id"])
    return docs

@api.post("/exceptions/{exc_id}/resolve")
async def resolve_exception(exc_id: str, body: ExceptionResolveIn, admin: dict = Depends(require_roles("admin"))):
    await db.exceptions.update_one(
        {"_id": ObjectId(exc_id)},
        {"$set": {"status": "resolved", "resolution": body.resolution,
                  "resolved_by": admin["name"], "resolved_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"ok": True}

# ============ IoT Mock ============
@api.get("/iot/live")
async def iot_live(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    readings = []
    for i in range(20):
        readings.append({
            "timestamp": (now - timedelta(minutes=i * 5)).isoformat(),
            "temperature_c": round(24 + random.uniform(-2, 4), 1),
            "humidity_pct": round(62 + random.uniform(-8, 10), 1),
            "moisture_pct": round(12 + random.uniform(-2, 3), 1),
        })
    return {
        "current": {
            "temperature_c": readings[0]["temperature_c"],
            "humidity_pct": readings[0]["humidity_pct"],
            "moisture_pct": readings[0]["moisture_pct"],
            "leaf_grade": random.choice(["A Super", "A", "B"]),
            "foreign_material_pct": round(random.uniform(0.1, 1.8), 2),
        },
        "history": list(reversed(readings)),
        "ai_inspection": {
            "grade": "A Super", "disease_detected": False,
            "foreign_material_score": round(random.uniform(0.5, 1.5), 2),
            "confidence_pct": round(random.uniform(92, 99), 1),
            "recommendation": "Lolos QC — lanjutkan ke jalur produksi utama.",
        },
    }

# ============ Audit / Corrections ============
@api.get("/audit")
async def audit(user: dict = Depends(get_current_user)):
    docs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(500)
    return docs

@api.post("/corrections")
async def correction(body: CorrectionIn, admin: dict = Depends(require_roles("admin"))):
    original = await db.batches.find_one({"batch_id": body.batch_id})
    if not original:
        raise HTTPException(404, "Batch tidak ditemukan")
    before = {k: original.get(k) for k in body.changes}
    await db.batches.update_one({"batch_id": body.batch_id}, {"$set": body.changes})
    block = await append_block(admin["_id"], admin["name"], body.batch_id, "correction",
                               {"before": before, "after": body.changes, "reason": body.reason}, status="corrected")
    await db.audit_logs.insert_one({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "admin": admin["name"], "batch_id": body.batch_id,
        "before": before, "after": body.changes, "reason": body.reason,
        "block_hash": block["current_hash"],
    })
    return {"ok": True, "block": block}

# ============ Dashboard Stats ============
@api.get("/stats/dashboard")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    def c(prefix): return db.batches.count_documents({"prefix": prefix})
    farmers = await db.users.count_documents({"role": "farmer"})
    hb = await c("HB"); cb = await c("CB"); pb = await c("PB"); sb = await c("SB"); rb = await c("RB")
    exc_open = await db.exceptions.count_documents({"status": "open"})
    total_blocks = await db.ledger.count_documents({})
    contracts_ok = await db.smart_contract_logs.count_documents({"result": {"$in": ["PASSED", "AUTHORIZED"]}})
    contracts_total = await db.smart_contract_logs.count_documents({})
    compliance = round((contracts_ok / contracts_total) * 100, 1) if contracts_total else 100.0
    return {
        "active_harvests": hb, "registered_farmers": farmers,
        "collections": cb, "production_batches": pb,
        "shipments": sb, "retail_batches": rb,
        "traceability_records": total_blocks,
        "quality_compliance_pct": compliance,
        "open_exceptions": exc_open,
        "supply_chain_stages": [
            {"stage": "Petani", "count": hb, "status": "verified"},
            {"stage": "Pengepul", "count": cb, "status": "verified"},
            {"stage": "Pabrik", "count": pb, "status": "verified" if exc_open == 0 else "exception"},
            {"stage": "Distributor", "count": sb, "status": "verified"},
            {"stage": "Ritel", "count": rb, "status": "verified"},
        ],
    }

@api.get("/stats/analytics")
async def analytics(user: dict = Depends(get_current_user)):
    # Aggregate by variety, region, quality
    varieties = {}
    regions = {}
    async for b in db.batches.find({"prefix": "HB"}):
        v = b.get("variety", "Lain")
        varieties[v] = varieties.get(v, 0) + b.get("weight_kg", 0)
        r = (b.get("location", "Lain").split(",")[0]).strip()
        regions[r] = regions.get(r, 0) + b.get("weight_kg", 0)
    grades = {}
    async for b in db.batches.find({"prefix": "PB"}):
        g = b.get("quality_grade", "?")
        grades[g] = grades.get(g, 0) + 1
    # Trend last 7 days
    trend = []
    now = datetime.now(timezone.utc)
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date().isoformat()
        count = await db.batches.count_documents({"created_at": {"$regex": f"^{day}"}})
        trend.append({"date": day, "batches": count})
    return {
        "varieties": [{"name": k, "kg": v} for k, v in varieties.items()],
        "regions": [{"name": k, "kg": v} for k, v in regions.items()],
        "grades": [{"grade": k, "count": v} for k, v in grades.items()],
        "trend": trend,
    }

# ============ Seed ============
async def seed_db():
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    existing_admin = await db.users.find_one({"email": admin_email})
    admin_pw_hash = hash_password(os.environ["ADMIN_PASSWORD"])
    if not existing_admin:
        await db.users.insert_one({
            "email": admin_email, "password_hash": admin_pw_hash,
            "name": "Shinta Syafrina", "role": "admin",
            "company": "Sintesa Tembakau Nusantara", "position": "Chief Operations",
            "contact": "+62 812-0000-0001",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    else:
        if not verify_password(os.environ["ADMIN_PASSWORD"], existing_admin["password_hash"]):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": admin_pw_hash}})

    # Seed roles
    seed_users = [
        ("farmer@tembakau.id", "Pak Supardi", "farmer", "Kelompok Tani Temanggung", "Ketua Kelompok", "+62 813-1000-0001", "Temanggung"),
        ("collector@tembakau.id", "Bu Ratna", "collector", "UD Pengumpul Jaya", "Manajer Gudang", "+62 813-2000-0002", "Temanggung"),
        ("manufacturer@tembakau.id", "Bapak Hendra", "manufacturer", "PT Sampoerna Simulasi", "Kepala Produksi", "+62 813-3000-0003", "Surabaya"),
        ("distributor@tembakau.id", "Ibu Lestari", "distributor", "PT Logistik Nusantara", "Kepala Armada", "+62 813-4000-0004", "Semarang"),
        ("retailer@tembakau.id", "Pak Yanto", "retailer", "Toko Rokok Sentosa", "Pemilik", "+62 813-5000-0005", "Jakarta"),
    ]
    for email, name, role, company, position, contact, city in seed_users:
        if not await db.users.find_one({"email": email}):
            await db.users.insert_one({
                "email": email, "password_hash": hash_password("Password@123"),
                "name": name, "role": role, "company": company, "position": position, "contact": contact, "city": city,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

    # Seed demo batches only if empty
    if await db.batches.count_documents({}) == 0:
        farmer = await db.users.find_one({"role": "farmer"})
        collector = await db.users.find_one({"role": "collector"})
        manuf = await db.users.find_one({"role": "manufacturer"})
        dist = await db.users.find_one({"role": "distributor"})
        retail = await db.users.find_one({"role": "retailer"})

        def a(u): return {"_id": str(u["_id"]), "name": u["name"], "role": u["role"], "city": u.get("city", "")}

        h = await create_batch("HB", a(farmer), "harvest", {
            "variety": "Srintil", "location": "Temanggung, Jawa Tengah",
            "gps": "-7.3167,110.1833", "harvest_date": "2026-01-15",
            "weight_kg": 500.0, "plant_age_days": 100, "moisture_pct": 12.5,
            "initial_grade": "A", "photo_url": ""
        })
        c = await create_batch("CB", a(collector), "collection", {
            "source_harvest_id": h["batch"]["batch_id"], "received_kg": 490.0,
            "grade": "A", "drying_method": "Sun-cured", "notes": "Kualitas prima"
        })
        p = await create_batch("PB", a(manuf), "production", {
            "source_collection_id": c["batch"]["batch_id"], "input_kg": 480.0,
            "output_units": 4800, "blend_notes": "Blend Srintil premium",
            "packaging": "Karton 20 slop", "excise_number": "CHT-2026-000001",
            "quality_grade": "A"
        })
        s = await create_batch("SB", a(dist), "shipment", {
            "source_production_id": p["batch"]["batch_id"],
            "destination": "Jakarta Pusat", "ship_date": "2026-01-25",
            "eta_date": "2026-01-27", "quantity_units": 4800,
            "temperature_c": 26.5, "humidity_pct": 62.0
        })
        await create_batch("RB", a(retail), "retail", {
            "source_shipment_id": s["batch"]["batch_id"],
            "received_units": 4800, "display_date": "2026-01-28",
            "store_location": "Jl. Sudirman No. 21, Jakarta"
        }, extra={"product_id": "PRD-DEMO0001"})

async def create_batch_seed_wrap():
    pass

# Route registration
app.include_router(api)

# ============ CORS ============
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ Email Helper ============
async def send_email(*, to: str, subject: str, html: str) -> Optional[str]:
    if not EMAIL_KEY:
        logger.warning("EMERGENT_EMAIL_KEY not configured; skipping email send")
        return None
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                     headers={"X-Email-Key": EMAIL_KEY}, json=payload)
        resp.raise_for_status()
        return resp.json().get("id")
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return None

async def build_and_send_digest():
    """Background task: collect open exceptions and email admin."""
    open_ex = await db.exceptions.find({"status": "open"}).sort("created_at", -1).to_list(500)
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip()
    if not admin_email:
        return
    count = len(open_ex)
    today = datetime.now(timezone.utc).strftime("%d %B %Y")
    if count == 0:
        rows = '<tr><td colspan="4" style="padding:16px;color:#059669;text-align:center;">Tidak ada anomali terbuka hari ini. Semua rantai pasok sehat.</td></tr>'
    else:
        rows = ""
        for e in open_ex[:50]:
            sev = escape((e.get("severity") or "medium").upper())
            sev_color = {"CRITICAL": "#DC2626", "HIGH": "#DC2626", "MEDIUM": "#D97706", "LOW": "#D97706"}.get(sev, "#64748B")
            exc_id = str(e.get("_id", ""))
            resolve_url = f"{FRONTEND_URL}/exceptions?focus={exc_id}"
            rows += (
                f'<tr>'
                f'<td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-family:monospace;font-size:12px;color:#0F172A;">{escape(str(e.get("batch_id", "-")))}</td>'
                f'<td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;"><span style="display:inline-block;padding:2px 8px;border-radius:12px;background:{sev_color}20;color:{sev_color};font-size:11px;font-weight:600;">{sev}</span></td>'
                f'<td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#334155;">{escape(str(e.get("message", "")))}</td>'
                f'<td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right;"><a href="{escape(resolve_url)}" style="display:inline-block;padding:6px 12px;background:#059669;color:#FFFFFF;font-size:12px;font-weight:600;text-decoration:none;border-radius:6px;">Resolve →</a></td>'
                f'</tr>'
            )
    html = (
        f'<table role="presentation" width="100%" style="background:#F8FAFC;padding:24px 0;font-family:Arial,sans-serif;">'
        f'<tr><td align="center">'
        f'<table role="presentation" width="640" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">'
        f'<tr><td style="background:#0F5132;padding:24px 32px;">'
        f'<div style="color:#4ADE80;font-size:11px;letter-spacing:2px;font-family:monospace;">SINTESA TEMBAKAU NUSANTARA</div>'
        f'<div style="color:#FFFFFF;font-size:22px;font-weight:700;margin-top:6px;">Ringkasan Anomali Harian</div>'
        f'<div style="color:#A7F3D0;font-size:13px;margin-top:4px;">{escape(today)} · {count} anomali terbuka</div>'
        f'</td></tr>'
        f'<tr><td style="padding:24px 32px;">'
        f'<p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px;">Halo Admin,</p>'
        f'<p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px;">Berikut daftar anomali rantai pasok yang <strong>masih terbuka</strong> per pagi ini. Silakan tinjau di dashboard.</p>'
        f'<table role="presentation" width="100%" style="border-collapse:collapse;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">'
        f'<thead><tr style="background:#F1F5F9;"><th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748B;">Batch</th><th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748B;">Severity</th><th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748B;">Deskripsi</th><th style="padding:10px 12px;"></th></tr></thead>'
        f'<tbody>{rows}</tbody></table>'
        f'<p style="color:#334155;font-size:13px;line-height:1.6;margin:20px 0 0;">Buka <a href="{escape(FRONTEND_URL)}/exceptions" style="color:#059669;text-decoration:underline;">dashboard anomali</a> untuk menindaklanjuti.</p>'
        f'</td></tr>'
        f'<tr><td style="padding:16px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0;">'
        f'<p style="color:#64748B;font-size:11px;line-height:1.5;margin:0;">Dikirim oleh {escape(EMAIL_FROM_NAME)}. Kami tidak pernah meminta kata sandi lewat email.</p>'
        f'</td></tr>'
        f'</table></td></tr></table>'
    )
    email_id = await send_email(to=admin_email, subject=f"Ringkasan Anomali Harian — {today}", html=html)
    logger.info(f"Anomaly digest sent to {admin_email}: id={email_id} count={count}")

async def build_and_send_weekly_trend():
    """Weekly aggregate email: top variety, top region, avg quality compliance."""
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip()
    if not admin_email:
        return
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    variety_agg = {}
    region_agg = {}
    async for b in db.batches.find({"prefix": "HB", "created_at": {"$gte": week_ago}}):
        v = b.get("variety", "Lain")
        variety_agg[v] = variety_agg.get(v, 0) + b.get("weight_kg", 0)
        r = (b.get("location") or "").split(",")[0].strip() or "Lain"
        region_agg[r] = region_agg.get(r, 0) + b.get("weight_kg", 0)
    top_variety = max(variety_agg.items(), key=lambda x: x[1], default=("-", 0))
    top_region = max(region_agg.items(), key=lambda x: x[1], default=("-", 0))
    total_kg = sum(variety_agg.values())

    contracts_ok = await db.smart_contract_logs.count_documents({"result": {"$in": ["PASSED", "AUTHORIZED"]}, "timestamp": {"$gte": week_ago}})
    contracts_total = await db.smart_contract_logs.count_documents({"timestamp": {"$gte": week_ago}})
    compliance = round((contracts_ok / contracts_total) * 100, 1) if contracts_total else 100.0

    new_batches = await db.batches.count_documents({"created_at": {"$gte": week_ago}})
    open_ex = await db.exceptions.count_documents({"status": "open"})

    week_label = datetime.now(timezone.utc).strftime("%d %B %Y")
    kpi_card = lambda label, value, color: (
        f'<td width="33%" style="padding:8px;"><div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px;">'
        f'<div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#64748B;font-family:monospace;">{escape(label)}</div>'
        f'<div style="font-size:22px;font-weight:700;color:{color};margin-top:6px;">{escape(str(value))}</div>'
        f'</div></td>'
    )
    html = (
        f'<table role="presentation" width="100%" style="background:#F8FAFC;padding:24px 0;font-family:Arial,sans-serif;">'
        f'<tr><td align="center">'
        f'<table role="presentation" width="640" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">'
        f'<tr><td style="background:#0F5132;padding:24px 32px;">'
        f'<div style="color:#4ADE80;font-size:11px;letter-spacing:2px;font-family:monospace;">SINTESA TEMBAKAU NUSANTARA · WEEKLY REPORT</div>'
        f'<div style="color:#FFFFFF;font-size:22px;font-weight:700;margin-top:6px;">Laporan Tren Mingguan</div>'
        f'<div style="color:#A7F3D0;font-size:13px;margin-top:4px;">Minggu berakhir {escape(week_label)}</div>'
        f'</td></tr>'
        f'<tr><td style="padding:24px 32px;">'
        f'<p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px;">Selamat pagi Pimpinan,</p>'
        f'<p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px;">Berikut ringkasan performa rantai pasok tembakau selama 7 hari terakhir:</p>'
        f'<table role="presentation" width="100%" style="border-collapse:separate;border-spacing:0;">'
        f'<tr>{kpi_card("Kepatuhan Kualitas", str(compliance) + "%", "#059669")}{kpi_card("Batch Baru", str(new_batches), "#2563EB")}{kpi_card("Anomali Terbuka", str(open_ex), "#DC2626" if open_ex > 0 else "#059669")}</tr>'
        f'</table>'
        f'<table role="presentation" width="100%" style="margin-top:20px;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;">'
        f'<tr style="background:#F1F5F9;"><td style="padding:12px 16px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#64748B;font-family:monospace;">Kategori</td><td style="padding:12px 16px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#64748B;font-family:monospace;">Nilai</td></tr>'
        f'<tr><td style="padding:14px 16px;border-top:1px solid #E2E8F0;color:#334155;font-size:13px;">Varietas Terbanyak</td><td style="padding:14px 16px;border-top:1px solid #E2E8F0;color:#0F172A;font-size:14px;font-weight:600;">{escape(str(top_variety[0]))} · {escape(str(top_variety[1]))} kg</td></tr>'
        f'<tr><td style="padding:14px 16px;border-top:1px solid #E2E8F0;color:#334155;font-size:13px;">Wilayah Terbanyak</td><td style="padding:14px 16px;border-top:1px solid #E2E8F0;color:#0F172A;font-size:14px;font-weight:600;">{escape(str(top_region[0]))} · {escape(str(top_region[1]))} kg</td></tr>'
        f'<tr><td style="padding:14px 16px;border-top:1px solid #E2E8F0;color:#334155;font-size:13px;">Total Volume Panen</td><td style="padding:14px 16px;border-top:1px solid #E2E8F0;color:#0F172A;font-size:14px;font-weight:600;">{escape(str(total_kg))} kg</td></tr>'
        f'</table>'
        f'<p style="text-align:center;margin:24px 0 0;"><a href="{escape(FRONTEND_URL)}/analytics" style="display:inline-block;padding:12px 24px;background:#059669;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">Buka Dashboard Analitik →</a></p>'
        f'</td></tr>'
        f'<tr><td style="padding:16px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0;">'
        f'<p style="color:#64748B;font-size:11px;line-height:1.5;margin:0;">Dikirim oleh {escape(EMAIL_FROM_NAME)}. Kami tidak pernah meminta kata sandi lewat email.</p>'
        f'</td></tr>'
        f'</table></td></tr></table>'
    )
    email_id = await send_email(to=admin_email, subject=f"Laporan Tren Mingguan — {week_label}", html=html)
    logger.info(f"Weekly trend sent to {admin_email}: id={email_id}")

# ============ Cron Endpoint ============
@app.post("/api/cron/anomaly-digest")
async def anomaly_digest_cron(background: BackgroundTasks, request: Request):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else ""
    if not WEBHOOK_CRON_SECRET or not hmac.compare_digest(token, WEBHOOK_CRON_SECRET):
        raise HTTPException(status_code=401, detail="Unauthorized")
    background.add_task(build_and_send_digest)
    return {"ok": True, "queued": True}

@app.post("/api/cron/weekly-trend")
async def weekly_trend_cron(background: BackgroundTasks, request: Request):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else ""
    if not WEBHOOK_CRON_SECRET or not hmac.compare_digest(token, WEBHOOK_CRON_SECRET):
        raise HTTPException(status_code=401, detail="Unauthorized")
    background.add_task(build_and_send_weekly_trend)
    return {"ok": True, "queued": True}

# ============ Startup ============
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.batches.create_index("batch_id", unique=True)
    await db.batches.create_index("product_id")
    await db.ledger.create_index("block_index", unique=True)
    await seed_db()
    logger.info("Startup complete: seeded users + demo batches")

@app.on_event("shutdown")
async def on_shutdown():
    client.close()
