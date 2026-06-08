"""
amazon.eg fetcher — residential-IP, Chrome-fingerprinted, polite, stop-on-block.

Why curl_cffi: it forges the real Chrome TLS/JA3 + HTTP-2 fingerprint that
amazon.eg's WAF checks, so a residential IP gets HTTP 200 (a plain requests/curl
TLS signature is fingerprintably non-Chrome). Datacenter IPs still get 503 — this
must run from a residential egress (see docs/research/04-real-pipeline-spec.md §4).
"""
from __future__ import annotations
import os
import random
import time

from curl_cffi import requests as creq  # type: ignore

BASE = "https://www.amazon.eg"
# "direct" = curl_cffi from a RESIDENTIAL IP (local runs). "firecrawl" = via the
# Firecrawl API, which fetches from non-blocked IPs → used by the cloud cron,
# since datacenter/CI IPs get 503 from amazon.eg. Set RASID_FETCH=firecrawl in CI.
FETCH_BACKEND = os.environ.get("RASID_FETCH", "direct").lower()

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "en-EG,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

# Block markers (CAPTCHA / robot-check can be served at HTTP 200, so we scan the body).
_MARKERS = [
    "robot check",
    "enter the characters",
    "validatecaptcha",
    "automated access to amazon",
    "api-services-support@amazon",
]

# Persistent cookie jar across the run (stable session = returning visitor).
_JAR: dict[str, str] = {"i18n-prefs": "EGP", "lc-acbeg": "en_AE"}
_last_request = [0.0]


class Blocked(Exception):
    """Raised on any hard block — the caller STOPS the run, never retry-hammers."""


def _is_blocked(status: int, html: str) -> bool:
    if status in (403, 429, 503):
        return True
    low = html.lower()
    return any(m in low for m in _MARKERS)


def _is_eg_page(html: str) -> bool:
    """Positive identity assertion: a genuine amazon.eg page carries the EG
    marketplace id; a challenge/interstitial/wrong-marketplace page does not."""
    return "ARBP9OOSHTCHU" in html or "amazon.eg" in html.lower()


def _throttle(min_s: float = 10.0, max_s: float = 18.0) -> None:
    """Full-jitter delay between requests; never < 8s, serial, 1 connection."""
    elapsed = time.time() - _last_request[0]
    wait = random.uniform(min_s, max_s) - elapsed
    if wait > 0:
        time.sleep(wait)
    _last_request[0] = time.time()


def _fetch_firecrawl(url: str, lang: str) -> str:
    """Fetch via the Firecrawl API (datacenter-safe → used by the cloud cron). ~1 credit/page."""
    key = os.environ.get("FIRECRAWL_API_KEY")
    if not key:
        raise Blocked("FIRECRAWL_API_KEY not set")
    r = creq.post(
        "https://api.firecrawl.dev/v1/scrape",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={
            "url": url,
            "formats": ["rawHtml"],
            "location": {"country": "EG", "languages": ["ar-EG" if lang == "ar" else "en-EG"]},
            "onlyMainContent": False,
            "timeout": 45000,
        },
        timeout=80,
    )
    if r.status_code != 200:
        raise Blocked(f"firecrawl HTTP {r.status_code}")
    d = r.json()
    html = (d.get("data") or {}).get("rawHtml") or (d.get("data") or {}).get("html") or ""
    if not html:
        raise Blocked("firecrawl returned no html")
    return html


def fetch(path: str, *, throttle: bool = True, lang: str = "en") -> str:
    """GET an amazon.eg path. lang='ar' forces the Arabic UI (Arabic titles).
    Returns HTML or raises Blocked."""
    url = path if path.startswith("http") else BASE + path
    if throttle:
        _throttle()
    if FETCH_BACKEND == "firecrawl":
        html = _fetch_firecrawl(url, lang)
        if _is_blocked(200, html) or not _is_eg_page(html):
            raise Blocked(f"BLOCKED/invalid (firecrawl content) url={url}")
        return html
    headers = dict(HEADERS)
    jar = _JAR
    if lang == "ar":
        headers["Accept-Language"] = "ar-EG,ar;q=0.9"
        jar = {**_JAR, "lc-acbeg": "ar_AE"}  # ephemeral — don't pollute the English session
    r = creq.get(url, headers=headers, cookies=jar, impersonate="chrome", timeout=30)
    if lang == "en":  # persist session cookies only from the canonical English session
        try:
            for k, v in r.cookies.items():
                _JAR[k] = v
        except Exception:
            pass
    html = r.text or ""
    if _is_blocked(r.status_code, html) or not _is_eg_page(html):
        raise Blocked(f"BLOCKED/invalid status={r.status_code} url={url}")
    return html
