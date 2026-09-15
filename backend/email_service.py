"""Emergent-managed Resend email with structural guardrail gate."""
import os
import re
import ipaddress
import logging
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> str | None:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if EMAIL_REPLY_TO:
        payload["contact_email"] = EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except Exception as e:
        logger.error(f"Email send error: {str(e)}")
        return None


def magic_link_html(name: str, link: str) -> str:
    safe_name = escape(name or "Mahasiswa")
    safe_link = escape(link)
    return (
        '<table role="presentation" width="100%" style="background:#f8fafc;padding:32px 0">'
        '<tr><td align="center">'
        '<table role="presentation" width="560" style="background:#ffffff;border-radius:16px;'
        'overflow:hidden;font-family:Arial,Helvetica,sans-serif">'
        '<tr><td style="background:#0B2545;padding:28px 32px">'
        '<span style="color:#FFC72C;font-size:20px;font-weight:bold">Kemitraan TIP</span>'
        '<span style="color:#ffffff;font-size:14px;display:block;margin-top:4px">'
        'Program Studi Teknologi Industri Pertanian, Universitas Jember</span></td></tr>'
        f'<tr><td style="padding:32px">'
        f'<p style="color:#0f172a;font-size:16px">Halo {safe_name},</p>'
        '<p style="color:#475569;font-size:14px;line-height:1.6">Gunakan tombol di bawah ini '
        'untuk masuk ke Sistem Terintegrasi Kemitraan TIP. Tautan ini berlaku selama 30 menit '
        'dan hanya dapat digunakan satu kali.</p>'
        f'<p style="text-align:center;margin:28px 0"><a href="{safe_link}" '
        'style="background:#F5A623;color:#0B2545;text-decoration:none;font-weight:bold;'
        'padding:14px 32px;border-radius:10px;display:inline-block">Masuk ke Sistem</a></p>'
        '<p style="color:#94a3b8;font-size:12px;line-height:1.6">Jika Anda tidak meminta tautan '
        'ini, abaikan email ini. Kami tidak pernah meminta kata sandi atau kode melalui email.</p>'
        '</td></tr>'
        '<tr><td style="background:#f1f5f9;padding:16px 32px;color:#64748b;font-size:12px">'
        'Dikirim oleh Kemitraan TIP Universitas Jember.</td></tr>'
        '</table></td></tr></table>'
    )
