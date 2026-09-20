"""UNEJ SSO (Apereo CAS 3.0) client: build login URL and validate service tickets."""
import os
import logging
from urllib.parse import urlencode
import httpx
from defusedxml import ElementTree as ET

logger = logging.getLogger(__name__)

CAS_BASE = os.environ.get("CAS_BASE_URL", "https://sso.unej.ac.id/cas").rstrip("/")


def login_url(service: str) -> str:
    return f"{CAS_BASE}/login?{urlencode({'service': service})}"


def logout_url(service: str) -> str:
    return f"{CAS_BASE}/logout?{urlencode({'service': service})}"


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


class CASError(Exception):
    def __init__(self, code: str, message: str = ""):
        super().__init__(f"{code}: {message}")
        self.code = code


def parse_response(xml: bytes) -> dict:
    root = ET.fromstring(xml)
    failure = next((e for e in root.iter() if _local(e.tag) == "authenticationFailure"), None)
    if failure is not None:
        raise CASError(failure.attrib.get("code", "CAS_FAILURE"), (failure.text or "").strip())
    success = next((e for e in root.iter() if _local(e.tag) == "authenticationSuccess"), None)
    if success is None:
        raise CASError("CAS_FAILURE", "missing authenticationSuccess")
    username = ""
    attrs: dict = {}
    for child in success:
        if _local(child.tag) == "user":
            username = (child.text or "").strip()
        elif _local(child.tag) == "attributes":
            for a in child:
                val = (a.text or "").strip()
                if val:
                    attrs.setdefault(_local(a.tag), val)
    if not username:
        raise CASError("MISSING_USER", "CAS response has no user")

    def first(*names):
        low = {k.lower(): v for k, v in attrs.items()}
        for n in names:
            if low.get(n.lower()):
                return low[n.lower()]
        return None

    email = first("email", "mail", "emailaddress", "userprincipalname")
    if not email and "@" in username:
        email = username
    name = first("name", "displayname", "cn", "nama", "fullname", "givenname") or username
    return {"username": username, "email": (email or "").lower(), "name": name, "attributes": attrs}


async def validate_ticket(ticket: str, service: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=False) as client:
        r = await client.get(f"{CAS_BASE}/p3/serviceValidate", params={"service": service, "ticket": ticket})
    r.raise_for_status()
    return parse_response(r.content)
