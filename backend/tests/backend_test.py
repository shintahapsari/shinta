"""Comprehensive backend tests for Sintesa Tembakau Nusantara MVP."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://supply-verify-17.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "shintasyafrina9801@gmail.com", "password": "Admin@123"}
ROLE_CREDS = {
    "farmer": {"email": "farmer@tembakau.id", "password": "Password@123"},
    "collector": {"email": "collector@tembakau.id", "password": "Password@123"},
    "manufacturer": {"email": "manufacturer@tembakau.id", "password": "Password@123"},
    "distributor": {"email": "distributor@tembakau.id", "password": "Password@123"},
    "retailer": {"email": "retailer@tembakau.id", "password": "Password@123"},
}


def login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture(scope="module")
def admin_session():
    s, _ = login(ADMIN)
    return s


@pytest.fixture(scope="module")
def role_sessions():
    return {role: login(c)[0] for role, c in ROLE_CREDS.items()}


# ---------- Auth ----------
def test_admin_login_and_me():
    s, data = login(ADMIN)
    assert data["user"]["role"] == "admin"
    assert data["user"]["email"] == ADMIN["email"]
    me = s.get(f"{API}/auth/me").json()
    assert me["email"] == ADMIN["email"]
    assert me["role"] == "admin"


@pytest.mark.parametrize("role", list(ROLE_CREDS.keys()))
def test_role_logins(role):
    _, data = login(ROLE_CREDS[role])
    assert data["user"]["role"] == role


def test_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "bad"})
    assert r.status_code == 401


# ---------- Stats ----------
def test_dashboard_stats(admin_session):
    r = admin_session.get(f"{API}/stats/dashboard")
    assert r.status_code == 200
    d = r.json()
    for k in ["active_harvests", "supply_chain_stages", "traceability_records"]:
        assert k in d
    assert isinstance(d["supply_chain_stages"], list) and len(d["supply_chain_stages"]) == 5


def test_analytics(admin_session):
    r = admin_session.get(f"{API}/stats/analytics")
    assert r.status_code == 200
    d = r.json()
    for k in ["varieties", "regions", "grades", "trend"]:
        assert k in d and isinstance(d[k], list)


# ---------- Ledger ----------
def test_ledger_list(admin_session):
    r = admin_session.get(f"{API}/ledger")
    assert r.status_code == 200
    blocks = r.json()
    assert isinstance(blocks, list) and len(blocks) >= 5


def test_ledger_verify(admin_session):
    r = admin_session.get(f"{API}/ledger/verify")
    assert r.status_code == 200
    d = r.json()
    assert d["valid"] is True, f"chain invalid: {d}"


# ---------- Contracts ----------
def test_contracts(admin_session):
    r = admin_session.get(f"{API}/contracts")
    assert r.status_code == 200
    ids = [c["id"] for c in r.json()]
    assert set(ids) == {"SC-001", "SC-002", "SC-003"}


def test_contracts_logs(admin_session):
    r = admin_session.get(f"{API}/contracts/logs")
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) >= 1


# ---------- Role permissions on harvest ----------
def test_farmer_can_create_harvest(role_sessions):
    farmer = role_sessions["farmer"]
    payload = {
        "variety": "Srintil", "location": "Temanggung, Jawa Tengah",
        "gps": "-7.3,110.1", "harvest_date": "2026-01-20",
        "weight_kg": 100.0, "plant_age_days": 95, "moisture_pct": 12.0,
        "initial_grade": "A"
    }
    r = farmer.post(f"{API}/harvest", json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["batch"]["batch_id"].startswith("HB-")
    assert "current_hash" in d["block"]


def test_collector_forbidden_on_harvest(role_sessions):
    r = role_sessions["collector"].post(f"{API}/harvest", json={
        "variety": "X", "location": "y", "harvest_date": "2026-01-01", "weight_kg": 10
    })
    assert r.status_code == 403


# ---------- Full chain ----------
@pytest.fixture(scope="module")
def full_chain(role_sessions):
    farmer = role_sessions["farmer"]
    hb = farmer.post(f"{API}/harvest", json={
        "variety": "Srintil", "location": "Temanggung, Jawa Tengah",
        "harvest_date": "2026-01-18", "weight_kg": 200.0, "moisture_pct": 12.0
    }).json()
    hb_id = hb["batch"]["batch_id"]

    cb = role_sessions["collector"].post(f"{API}/collection", json={
        "source_harvest_id": hb_id, "received_kg": 198.0, "grade": "A"
    }).json()
    cb_id = cb["batch"]["batch_id"]

    pb = role_sessions["manufacturer"].post(f"{API}/production", json={
        "source_collection_id": cb_id, "input_kg": 190.0, "output_units": 1900,
        "excise_number": "CHT-TEST-001", "quality_grade": "A"
    }).json()
    pb_id = pb["batch"]["batch_id"]

    sb = role_sessions["distributor"].post(f"{API}/shipment", json={
        "source_production_id": pb_id, "destination": "Jakarta",
        "ship_date": "2026-01-26", "eta_date": "2026-01-28",
        "quantity_units": 1900, "temperature_c": 25.0, "humidity_pct": 60.0
    }).json()
    sb_id = sb["batch"]["batch_id"]

    rb = role_sessions["retailer"].post(f"{API}/retail", json={
        "source_shipment_id": sb_id, "received_units": 1900,
        "display_date": "2026-01-29", "store_location": "Toko Test"
    }).json()
    assert "product_id" in rb["batch"], f"missing product_id: {rb}"
    return {"hb": hb_id, "cb": cb_id, "pb": pb_id, "sb": sb_id, "rb": rb["batch"]["batch_id"],
            "product_id": rb["batch"]["product_id"]}


def test_full_chain_created(full_chain):
    for k in ["hb", "cb", "pb", "sb", "rb", "product_id"]:
        assert full_chain[k]


def test_trace_by_batch(admin_session, full_chain):
    r = admin_session.get(f"{API}/trace/{full_chain['hb']}")
    assert r.status_code == 200
    d = r.json()
    assert "chain" in d and len(d["chain"]) >= 1


def test_trace_by_product(admin_session, full_chain):
    r = admin_session.get(f"{API}/trace/{full_chain['product_id']}")
    assert r.status_code == 200
    d = r.json()
    batch_ids = [c["batch_id"] for c in d["chain"]]
    assert full_chain["rb"] in batch_ids


# ---------- Public verify ----------
def test_public_verify_no_auth(full_chain):
    r = requests.get(f"{API}/public/verify/{full_chain['product_id']}", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["authentic"] is True
    assert d["variety"] and d["cultivation_area"] and d["quality_grade"]


def test_public_verify_seeded():
    # Find seeded RB-0001 product_id via public no; use trace via admin instead
    s, _ = login(ADMIN)
    batches = s.get(f"{API}/batches?prefix=RB").json()
    assert len(batches) >= 1
    pid = batches[-1]["product_id"]  # last created is RB-0001 (seeded first)
    # actually pick the one that matches RB-0001
    for b in batches:
        if b["batch_id"] == "RB-0001":
            pid = b["product_id"]; break
    r = requests.get(f"{API}/public/verify/{pid}")
    assert r.status_code == 200
    assert r.json()["authentic"] is True


def test_public_verify_not_found():
    r = requests.get(f"{API}/public/verify/PRD-NOTREAL")
    assert r.status_code == 404


# ---------- Exceptions ----------
def test_exception_on_quantity_mismatch(role_sessions, admin_session):
    farmer = role_sessions["farmer"]
    collector = role_sessions["collector"]
    hb = farmer.post(f"{API}/harvest", json={
        "variety": "Srintil", "location": "Test", "harvest_date": "2026-01-19",
        "weight_kg": 100.0, "moisture_pct": 12.0
    }).json()
    hb_id = hb["batch"]["batch_id"]
    cb = collector.post(f"{API}/collection", json={
        "source_harvest_id": hb_id, "received_kg": 50.0, "grade": "B"
    }).json()
    cb_id = cb["batch"]["batch_id"]
    time.sleep(0.5)
    excs = admin_session.get(f"{API}/exceptions").json()
    matched = [e for e in excs if e.get("batch_id") == cb_id and e.get("type") == "quantity_mismatch"]
    assert len(matched) >= 1, f"no quantity_mismatch exception for {cb_id}"


# ---------- User invite / delete ----------
def test_admin_invite_and_farmer_forbidden(admin_session, role_sessions):
    email = f"test_invite_{int(time.time())}@t.id"
    r = admin_session.post(f"{API}/users/invite", json={
        "email": email, "password": "Password@123", "name": "Invited",
        "role": "farmer"
    })
    assert r.status_code == 200, r.text
    uid = r.json()["_id"]

    r2 = role_sessions["farmer"].post(f"{API}/users/invite", json={
        "email": f"x_{email}", "password": "Password@123", "name": "X", "role": "farmer"
    })
    assert r2.status_code == 403

    # cleanup
    admin_session.delete(f"{API}/users/{uid}")


# ---------- Exception resolve ----------
def test_admin_resolve_exception(admin_session, role_sessions):
    excs = admin_session.get(f"{API}/exceptions?status=open").json()
    if not excs:
        pytest.skip("no open exceptions to resolve")
    exc_id = excs[0]["_id"]
    r = admin_session.post(f"{API}/exceptions/{exc_id}/resolve",
                           json={"resolution": "test resolution"})
    assert r.status_code == 200

    r2 = role_sessions["farmer"].post(f"{API}/exceptions/{exc_id}/resolve",
                                       json={"resolution": "x"})
    assert r2.status_code == 403


# ---------- Corrections + Audit ----------
def test_admin_correction_and_audit(admin_session, full_chain):
    r = admin_session.post(f"{API}/corrections", json={
        "batch_id": full_chain["hb"],
        "reason": "Perbaikan test",
        "changes": {"notes": "diperbaiki test"}
    })
    assert r.status_code == 200, r.text
    audit = admin_session.get(f"{API}/audit").json()
    assert any(a["batch_id"] == full_chain["hb"] for a in audit)


# ---------- IoT ----------
def test_iot_live(admin_session):
    r = admin_session.get(f"{API}/iot/live")
    assert r.status_code == 200
    d = r.json()
    assert "current" in d and "history" in d and "ai_inspection" in d
    assert len(d["history"]) > 0
