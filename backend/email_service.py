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
# Use .get() so the module imports cleanly on any host (e.g. Vercel/Railway/Render)
# even before the email key is configured. Sending is guarded at runtime below.
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Kemitraan TIP Universitas Jember")
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
    if not EMAIL_KEY:
        logger.warning("EMERGENT_EMAIL_KEY not set; skipping email send to %s", to)
        return None
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



def expiry_reminder_html(name: str, rows: list, link: str) -> str:
    safe_name = escape(name or "Tim Kerja Sama")
    safe_link = escape(link)
    items = ""
    for r in rows:
        judul = escape(str(r.get("judul", "-")))
        partner = escape(str(r.get("partner", "-")))
        tgl = escape(str(r.get("tanggal_berakhir", "-")))
        days = int(r.get("days", 0))
        items += (
            '<tr>'
            f'<td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a">{judul}<br>'
            f'<span style="color:#64748b;font-size:11px">{partner}</span></td>'
            f'<td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#475569;white-space:nowrap">{tgl}</td>'
            f'<td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:bold;color:#b45309;white-space:nowrap">{days} hari</td>'
            '</tr>'
        )
    return (
        '<table role="presentation" width="100%" style="background:#f8fafc;padding:32px 0">'
        '<tr><td align="center">'
        '<table role="presentation" width="620" style="background:#ffffff;border-radius:16px;'
        'overflow:hidden;font-family:Arial,Helvetica,sans-serif">'
        '<tr><td style="background:#0B2545;padding:24px 32px">'
        '<span style="color:#FFC72C;font-size:18px;font-weight:bold">Kemitraan TIP</span>'
        '<span style="color:#ffffff;font-size:13px;display:block;margin-top:4px">'
        'Program Studi Teknologi Industri Pertanian, Universitas Jember</span></td></tr>'
        f'<tr><td style="padding:28px 32px">'
        f'<p style="color:#0f172a;font-size:15px">Halo {safe_name},</p>'
        '<p style="color:#475569;font-size:13px;line-height:1.6">Beberapa dokumen kerja sama '
        'mendekati masa berakhir. Mohon segera lakukan pembaruan (revisi) dokumen berikut agar '
        'status kerja sama tetap aktif:</p>'
        '<table role="presentation" width="100%" style="border-collapse:collapse;margin:16px 0">'
        '<tr style="background:#f1f5f9">'
        '<td style="padding:8px 12px;font-size:11px;color:#475569;text-transform:uppercase">Dokumen</td>'
        '<td style="padding:8px 12px;font-size:11px;color:#475569;text-transform:uppercase">Berakhir</td>'
        '<td style="padding:8px 12px;font-size:11px;color:#475569;text-transform:uppercase">Sisa</td>'
        f'</tr>{items}</table>'
        f'<p style="text-align:center;margin:24px 0"><a href="{safe_link}" '
        'style="background:#F5A623;color:#0B2545;text-decoration:none;font-weight:bold;'
        'padding:12px 28px;border-radius:10px;display:inline-block">Buka Repository Dokumen</a></p>'
        '</td></tr>'
        '<tr><td style="background:#f1f5f9;padding:16px 32px;color:#64748b;font-size:12px">'
        'Dikirim oleh Kemitraan TIP Universitas Jember. Email pengingat otomatis.</td></tr>'
        '</table></td></tr></table>'
    )
