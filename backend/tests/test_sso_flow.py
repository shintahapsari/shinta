"""Mocked CAS success-path test: python3 tests/test_sso_flow.py (run from backend dir)."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from dotenv import load_dotenv  # noqa: E402

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
import sso  # noqa: E402
import server  # noqa: E402
from httpx import AsyncClient, ASGITransport  # noqa: E402

XML = b"""<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas"><cas:authenticationSuccess>
<cas:user>231710101099</cas:user><cas:attributes><cas:mail>231710101099@mail.unej.ac.id</cas:mail><cas:cn>Budi Santoso</cas:cn></cas:attributes>
</cas:authenticationSuccess></cas:serviceResponse>"""


async def fake_validate(ticket, service):
    return sso.parse_response(XML)


async def main():
    print("parse:", sso.parse_response(XML))
    sso.validate_ticket = fake_validate
    await server.startup()
    async with AsyncClient(transport=ASGITransport(app=server.app), base_url="http://test") as c:
        r = await c.get("/api/auth/sso/callback?ticket=ST-ok", follow_redirects=False)
        print("callback:", r.status_code, r.headers["location"])
        assert r.status_code == 302 and r.headers["location"].endswith("/dashboard")
        assert "access_token" in r.cookies and "refresh_token" in r.cookies
        me = await c.get("/api/auth/me", cookies={"access_token": r.cookies["access_token"]})
        data = me.json()
        print("me:", me.status_code, {k: data.get(k) for k in ("email", "name", "role", "nim", "sso_username")})
        assert data["role"] == "mahasiswa" and data["nim"] == "231710101099"
        r2 = await c.get("/api/auth/sso/callback?ticket=ST-ok2", follow_redirects=False)
        assert r2.status_code == 302
    n = await server.db.users.count_documents({"sso_username": "231710101099"})
    print("users with sso_username:", n)
    assert n == 1
    await server.db.users.delete_one({"sso_username": "231710101099"})
    await server.db.audit_logs.delete_many({"detail": "Login via SSO UNEJ"})
    print("ALL OK")


asyncio.run(main())
