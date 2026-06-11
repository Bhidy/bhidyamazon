"""
Real Egypt demand keywords for Rasid → web/src/data/real/keywords.json.

PRIMARY source: Amazon EG search autocomplete via the completion.amazon.co.uk host
(the .com host returns EMPTY for EG; .co.uk + mid=ARBP9OOSHTCHU returns real EG
suggestions — validated by the pipeline research). Reliable, not rate-limited.
OPTIONAL: Google Trends EG to tag rising terms (best-effort; skipped on 429).

Honest output: an ORDINAL autocomplete-prominence signal, NOT search volume or
demand quantity. `demandScore` is purely a re-encoding of a term's POSITION in
Amazon's autocomplete list (100 = top suggestion, lower = further down) — it
measures how prominently Amazon SUGGESTS the term, never how many people search
or buy. We do not invent magnitudes; the UI labels it as prominence/tier only.
"""
from __future__ import annotations
import datetime
import json
import sys
import time
import urllib.parse
from pathlib import Path

from curl_cffi import requests as creq  # type: ignore  # handles macOS SSL + TLS impersonation

MID = "ARBP9OOSHTCHU"
REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "web" / "src" / "data" / "real"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

PREFIXES = [
    ("earbuds", "en"), ("wireless charger", "en"), ("power bank", "en"), ("laptop", "en"),
    ("air fryer", "en"), ("smart watch", "en"), ("headphones", "en"), ("usb cable", "en"),
    ("phone case", "en"), ("bluetooth speaker", "en"), ("baby", "en"), ("perfume", "en"),
    ("شاحن", "ar"), ("سماعات", "ar"), ("لابتوب", "ar"), ("ساعة ذكية", "ar"),
    ("قلاية", "ar"), ("عطر", "ar"),
]


def autocomplete(prefix: str, lop: str) -> list[str]:
    q = urllib.parse.urlencode({"mid": MID, "alias": "aps", "prefix": prefix, "lop": lop, "limit": 11})
    url = f"https://completion.amazon.co.uk/api/2017/suggestions?{q}"
    r = creq.get(url, headers={"User-Agent": UA, "Accept": "application/json"}, impersonate="chrome", timeout=15)
    if r.status_code != 200:
        raise RuntimeError(f"autocomplete HTTP {r.status_code}")
    data = r.json()
    return [s.get("value") for s in data.get("suggestions", []) if s.get("value")]


def trends_rising_tags(kws: dict) -> None:
    """Best-effort Google Trends EG enhancement — tag rising terms. Skip on any error/429."""
    try:
        import urllib3.util.retry as _retry

        _orig = _retry.Retry.__init__

        def _patched(self, *a, **k):  # noqa: ANN001
            if "method_whitelist" in k:
                k.setdefault("allowed_methods", k.pop("method_whitelist"))
            return _orig(self, *a, **k)

        _retry.Retry.__init__ = _patched  # type: ignore[method-assign]
        from pytrends.request import TrendReq  # type: ignore

        pt = TrendReq(hl="en-US", tz=120)
        seeds = ["earbuds", "laptop", "air fryer", "شاحن", "سماعات"]
        pt.build_payload(seeds, geo="EG", timeframe="today 3-m")
        rq = pt.related_queries()
        for s in seeds:
            rising = (rq.get(s) or {}).get("rising")
            if rising is not None:
                for _, row in rising.head(4).iterrows():
                    q = str(row["query"]).strip()
                    if q in kws:
                        kws[q]["trend"] = "rising"
        print("  [OK] Google Trends rising tags applied", flush=True)
    except Exception as e:  # noqa: BLE001
        print(f"  [SKIP] Trends enhancement unavailable: {e}", flush=True)


def main() -> None:
    kws: dict[str, dict] = {}
    for prefix, lang in PREFIXES:
        lop = "ar_AE" if lang == "ar" else "en_AE"
        try:
            sugg = autocomplete(prefix, lop)
        except Exception as e:  # noqa: BLE001
            print(f"  [WARN] {prefix}: {e}", flush=True)
            continue
        for pos, q in enumerate(sugg):
            q = (q or "").strip()
            if not q:
                continue
            # Ordinal autocomplete-prominence score: a re-encoding of the term's
            # POSITION in the suggestion list (pos 0 = top suggestion = 100), NOT
            # a search-volume or demand magnitude. Top-of-list terms tie at 100.
            score = max(15, 100 - pos * 8)
            if q in kws:
                kws[q]["appearances"] += 1
                kws[q]["demandScore"] = max(kws[q]["demandScore"], score)
            else:
                kws[q] = {"query": q, "lang": lang, "demandScore": score, "trend": "flat", "appearances": 1}
        print(f"  [OK] {prefix}: {len(sugg)} suggestions", flush=True)
        time.sleep(0.4)

    trends_rising_tags(kws)

    if not kws:
        # Exit non-zero so callers can SEE the failure: this exact case used to
        # pass silently in CI ("|| echo best-effort") and keywords froze for days
        # while the rest of the data kept refreshing. Existing keywords.json is
        # still kept — staleness is now visible (per-channel freshness in the UI,
        # a workflow warning step, and the data-freshness monitor).
        print("\n[FAIL] no keywords obtained — keeping existing keywords.json (exit 2).", flush=True)
        sys.exit(2)
    # Sort by autocomplete prominence (ordinal), then by how many seed prefixes
    # surfaced the term. demandScore stays the field name for schema stability,
    # but it is an ordinal prominence rank — never a demand/volume magnitude.
    items = sorted(kws.values(), key=lambda x: (-x["demandScore"], -x["appearances"]))[:40]
    data = {
        "scraped_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source": "amazon_eg_autocomplete (completion.amazon.co.uk) + google_trends",
        "signal": "autocomplete_prominence_ordinal",  # NOT search volume / demand quantity
        "keywords": items,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "keywords.json").write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"\nDONE → {len(items)} real EG keywords → {OUT}/keywords.json", flush=True)
    print("  (score = ordinal autocomplete prominence, NOT search volume)", flush=True)
    for k in items[:12]:
        print(f"  prom={k['demandScore']:>3}  {k['trend']:<7} {k['query']}", flush=True)


if __name__ == "__main__":
    main()
