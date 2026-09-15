"""Backend tests for SIMETRI-TIP UNEJ."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://agri-collab-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "shintasyafrina9801@gmail.com", "password": "AdminUNEJ2026!"}
KERMA = {"email": "kerma1@unej.ac.id", "password": "Staff2026!"}
MBKM = {"email": "mbkm@unej.ac.id", "password": "Staff2026!"}
MGMT = {"email": "manajemen@unej.ac.id", "password": "Staff2026!"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed {creds['email']}: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def admin(): return _login(ADMIN)


@pytest.fixture(scope="module")
def kerma(): return _login(KERMA)


@pytest.fixture(scope="module")
def mbkm(): return _login(MBKM)


@pytest.fixture(scope="module")
def mgmt(): return _login(MGMT)


# ---- Auth ----
class TestAuth:
    def test_login_admin_sets_cookie(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN["email"].lower()
        assert data["role"] == "admin"
        assert "access_token" in s.cookies.get_dict()

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_me(self, admin):
        r = admin.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_magic_link_unej_success(self):
        r = requests.post(f"{API}/auth/magic-link/request",
                          json={"email": "211710101999@student.unej.ac.id", "name": "Test Student"}, timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "dev_magic_link" in j and "token=" in j["dev_magic_link"]

    def test_magic_link_non_unej_rejected(self):
        r = requests.post(f"{API}/auth/magic-link/request", json={"email": "a@gmail.com"}, timeout=30)
        assert r.status_code == 400

    def test_magic_link_verify_creates_mahasiswa(self):
        req = requests.post(f"{API}/auth/magic-link/request",
                            json={"email": "211710101888@student.unej.ac.id", "name": "MHS Verify"}, timeout=30)
        assert req.status_code == 200
        link = req.json()["dev_magic_link"]
        token = link.split("token=")[-1]
        s = requests.Session()
        v = s.post(f"{API}/auth/magic-link/verify", json={"token": token}, timeout=30)
        assert v.status_code == 200, v.text
        assert v.json()["role"] == "mahasiswa"
        assert "access_token" in s.cookies.get_dict()


# ---- Dashboard KPI ----
class TestDashboard:
    def test_kpi(self, admin):
        r = admin.get(f"{API}/dashboard/kpi", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("cards", "partner_growth", "doc_status", "impl_trend", "kategori", "expiring"):
            assert k in d
        for k in ("total_partners", "active_docs", "approved_impls", "coverage_pct"):
            assert k in d["cards"]


# ---- Partners CRUD + duplicate ----
class TestPartners:
    def test_list_seeded(self, admin):
        r = admin.get(f"{API}/partners", timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_search(self, admin):
        r = admin.get(f"{API}/partners?q=Nestl", timeout=30)
        assert r.status_code == 200

    def test_duplicate_detection(self, admin):
        r = admin.post(f"{API}/partners/check-duplicate", json={"nama": "PT Nestle Indonesia"}, timeout=30)
        assert r.status_code == 200
        dups = r.json().get("duplicates", [])
        assert any("nestl" in d["nama"].lower() for d in dups), f"expected Nestle duplicate, got {dups}"

    def test_create_partner_admin(self, admin):
        payload = {"nama": "TEST_ Mitra Uji", "kategori": "Nasional", "sektor": "Industri",
                   "region": "Jawa Timur", "pic": "PIC", "email": "pic@x.id"}
        r = admin.post(f"{API}/partners", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        # verify persistence
        g = admin.get(f"{API}/partners/{pid}", timeout=30)
        assert g.status_code == 200
        assert g.json()["partner"]["nama"] == payload["nama"]
        # cleanup
        admin.delete(f"{API}/partners/{pid}", timeout=30)

    def test_mgmt_cannot_create_partner(self, mgmt):
        r = mgmt.post(f"{API}/partners", json={"nama": "TEST_ NoWrite"}, timeout=30)
        assert r.status_code == 403


# ---- Documents versioning ----
class TestDocuments:
    def test_list(self, admin):
        r = admin.get(f"{API}/documents", timeout=30)
        assert r.status_code == 200

    def test_create_and_revise(self, admin):
        partners = admin.get(f"{API}/partners", timeout=30).json()
        pid = partners[0]["id"]
        create = admin.post(f"{API}/documents", json={
            "partner_id": pid, "jenis": "PKS", "judul": "TEST_ Doc V1", "status": "Active",
            "tanggal_mulai": "2025-01-01", "tanggal_berakhir": "2027-01-01",
        }, timeout=30)
        assert create.status_code == 200, create.text
        did = create.json()["id"]
        assert create.json()["version"] == 1
        assert create.json()["is_latest"] is True

        # Revise
        rev = admin.put(f"{API}/documents/{did}", json={
            "partner_id": pid, "jenis": "PKS", "judul": "TEST_ Doc V2", "status": "Active",
            "changelog": "revised",
        }, timeout=30)
        assert rev.status_code == 200, rev.text
        assert rev.json()["version"] == 2
        assert rev.json()["is_latest"] is True

        # Old is superseded
        old = admin.get(f"{API}/documents/{did}", timeout=30).json()
        assert old["document"]["status"] == "Superseded"
        assert old["document"]["is_latest"] is False
        # versions list
        assert len(old["versions"]) == 2


# ---- Implementations + Approval ----
class TestImplementations:
    def test_create_and_approve(self, admin, kerma):
        partners = admin.get(f"{API}/partners", timeout=30).json()
        pid = partners[0]["id"]
        r = admin.post(f"{API}/implementations", json={
            "partner_id": pid, "tahun": 2025, "triwulan": "Q1",
            "jenis_kegiatan": "Riset", "judul": "TEST_ Impl", "status_kegiatan": "On Process",
        }, timeout=30)
        assert r.status_code == 200, r.text
        iid = r.json()["id"]
        assert r.json()["status_approval"] == "Pending"

        # Get KPI approved before
        before = admin.get(f"{API}/dashboard/kpi", timeout=30).json()["cards"]["approved_impls"]

        # Approve
        ap = kerma.post(f"{API}/implementations/{iid}/approval",
                        json={"status_approval": "Approved", "catatan": "OK"}, timeout=30)
        assert ap.status_code == 200

        after = admin.get(f"{API}/dashboard/kpi", timeout=30).json()["cards"]["approved_impls"]
        assert after == before + 1

    def test_mgmt_cannot_create_impl(self, mgmt, admin):
        partners = admin.get(f"{API}/partners", timeout=30).json()
        pid = partners[0]["id"]
        r = mgmt.post(f"{API}/implementations", json={
            "partner_id": pid, "tahun": 2025, "jenis_kegiatan": "X", "judul": "TEST_ NoWrite",
        }, timeout=30)
        assert r.status_code == 403

    def test_mahasiswa_sees_only_own(self):
        # Login as mahasiswa via magic link
        req = requests.post(f"{API}/auth/magic-link/request",
                            json={"email": "211710101777@student.unej.ac.id"}, timeout=30).json()
        s = requests.Session()
        token = req["dev_magic_link"].split("token=")[-1]
        s.post(f"{API}/auth/magic-link/verify", json={"token": token}, timeout=30)
        r = s.get(f"{API}/implementations", timeout=30)
        assert r.status_code == 200
        # Fresh mahasiswa has no implementations
        assert r.json() == []
        # Cannot access forbidden endpoints
        assert s.get(f"{API}/kampus-berdampak", timeout=30).status_code in (200, 403)  # currently allowed for all
        assert s.get(f"{API}/audit-logs", timeout=30).status_code == 403
        assert s.get(f"{API}/users", timeout=30).status_code == 403


# ---- Kampus Berdampak ----
class TestKampusBerdampak:
    def test_endpoint(self, admin):
        r = admin.get(f"{API}/kampus-berdampak", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "summary" in d and "regions" in d
        for k in ("total_eligible", "total_implemented", "coverage_pct"):
            assert k in d["summary"]


# ---- Audit ----
class TestAudit:
    def test_admin_can_read(self, admin):
        r = admin.get(f"{API}/audit-logs", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---- Reports ----
class TestReports:
    @pytest.mark.parametrize("rtype", ["implementasi", "partner", "tahunan", "kampus-berdampak", "mbkm"])
    def test_preview(self, admin, rtype):
        r = admin.get(f"{API}/reports/{rtype}", timeout=30)
        assert r.status_code == 200, f"{rtype}: {r.text}"
        d = r.json()
        assert "title" in d and "headers" in d and "rows" in d

    @pytest.mark.parametrize("rtype", ["implementasi", "partner", "tahunan", "kampus-berdampak", "mbkm"])
    def test_export_pdf(self, admin, rtype):
        r = admin.get(f"{API}/reports/{rtype}/export?format=pdf", timeout=60)
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("application/pdf")
        assert len(r.content) > 100

    @pytest.mark.parametrize("rtype", ["implementasi", "partner", "tahunan", "kampus-berdampak", "mbkm"])
    def test_export_excel(self, admin, rtype):
        r = admin.get(f"{API}/reports/{rtype}/export?format=excel", timeout=60)
        assert r.status_code == 200
        assert "spreadsheetml" in r.headers["content-type"]
        assert len(r.content) > 100


# ---- Notifications ----
class TestNotifications:
    def test_list_and_mark_all(self, admin):
        r = admin.get(f"{API}/notifications", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "unread" in d
        m = admin.post(f"{API}/notifications/read-all", timeout=30)
        assert m.status_code == 200
        after = admin.get(f"{API}/notifications", timeout=30).json()
        assert after["unread"] == 0


# ---- Users (admin only) ----
class TestUsers:
    def test_list_users_admin(self, admin):
        r = admin.get(f"{API}/users", timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 4

    def test_list_users_kerma_forbidden(self, kerma):
        r = kerma.get(f"{API}/users", timeout=30)
        assert r.status_code == 403
