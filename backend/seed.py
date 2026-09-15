"""Staff seeding + one-time cleanup of demo domain data. No demo partners/documents/implementations."""
import os
import uuid
from datetime import datetime, timezone
import auth as A

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@unej.ac.id").lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
STAFF_PASSWORD = "Staff2026!"
SEED_VERSION = "clean-1"


def _id():
    return str(uuid.uuid4())


def iso(dt):
    return dt.isoformat()


# email, name, role, jabatan
STAFF = [
    (ADMIN_EMAIL, "Shinta Syafrina", "admin", "Admin Kerja Sama · Tim Kerja Sama"),
    ("alif.rizki@unej.ac.id", "Alif Rizki", "tim_kerjasama", "Tim Kerja Sama"),
    ("arga.hita@unej.ac.id", "Arga Hita", "tim_mbkm", "Tim Kampus Berdampak / MBKM"),
    ("winda.amilia@unej.ac.id", "Winda Amilia", "tim_mbkm", "Tim Kampus Berdampak / MBKM"),
    ("manajemen@unej.ac.id", "Tim Manajemen", "tim_manajemen", "Tim Manajemen"),
]

OLD_STAFF = ["kerma1@unej.ac.id", "kerma2@unej.ac.id", "mbkm@unej.ac.id"]


async def seed_all(db):
    # Remove obsolete placeholder staff accounts
    for email in OLD_STAFF:
        await db.users.delete_one({"email": email})

    # Staff (idempotent; keep admin password synced with env)
    for email, name, role, jabatan in STAFF:
        existing = await db.users.find_one({"email": email})
        if existing is None:
            await db.users.insert_one({
                "id": _id(), "email": email, "name": name, "role": role, "jabatan": jabatan,
                "password_hash": A.hash_password(ADMIN_PASSWORD if role == "admin" else STAFF_PASSWORD),
                "is_active": True, "created_at": iso(datetime.now(timezone.utc)),
            })
        else:
            upd = {"name": name, "role": role, "jabatan": jabatan}
            if role == "admin" and not A.verify_password(ADMIN_PASSWORD, existing.get("password_hash", "")):
                upd["password_hash"] = A.hash_password(ADMIN_PASSWORD)
            await db.users.update_one({"email": email}, {"$set": upd})

    # One-time cleanup: remove all demo cooperation/implementation data so the
    # institution can enter real data. Runs once (guarded by seed version).
    meta = await db.meta.find_one({"key": "seed_version"})
    if meta and meta.get("value") == SEED_VERSION:
        return
    await db.partners.delete_many({})
    await db.documents.delete_many({})
    await db.implementations.delete_many({})
    await db.notifications.delete_many({})
    await db.meta.update_one({"key": "seed_version"}, {"$set": {"value": SEED_VERSION}}, upsert=True)
