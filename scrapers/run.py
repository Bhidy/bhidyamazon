"""
Rasid real-data scrape run. Fetches amazon.eg Best Sellers across categories +
enriches top products with detail (BSR + 8 reviews), writes normalized JSON into
web/src/data/real/ where data.ts reads it. Polite cadence + stop-on-block.

Run from a RESIDENTIAL IP:  python3 scrapers/run.py
"""
from __future__ import annotations
import datetime
import json
import os
from pathlib import Path

import fetch
import parse

# amazon.eg slug -> app categoryNode (web/src/lib/constants.ts)
CATEGORIES = [
    ("electronics", "electronics"),
    ("beauty", "beauty"),
    ("home", "home"),
    ("fashion", "fashion"),
    ("toys", "toys"),
    ("grocery", "grocery"),
    ("baby-products", "baby"),
    ("health", "health"),
]
REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "web" / "src" / "data" / "real"
TOP_N = 15
ENRICH_PER_CAT = 2
ENRICH_MAX = 8
SCHEMA_VERSION = 2


def _write_atomic(name: str, obj: dict) -> None:
    """Atomic write (temp + os.replace) so a concurrent reader never sees a torn JSON."""
    path = OUT / name
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2))
    os.replace(tmp, path)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    bestsellers: dict[str, list] = {}
    all_rows: list = []
    enrich: list[str] = []
    health: dict[str, dict] = {}  # per-category fill-rate telemetry

    print("=== Best Sellers ===", flush=True)
    for slug, node in CATEGORIES:
        try:
            html = fetch.fetch(f"/-/en/gp/bestsellers/{slug}")
        except fetch.Blocked as e:
            print(f"  [BLOCKED] {slug}: {e} — STOPPING (kill-switch).", flush=True)
            break
        except Exception as e:  # noqa: BLE001
            print(f"  [ERROR] {slug}: {e}", flush=True)
            continue
        rows = parse.parse_bestsellers(html, node)
        if len(rows) < 5:  # fill-rate guard: markup changed or empty
            print(f"  [WARN] {slug}: only {len(rows)} parsed — skipping.", flush=True)
            continue
        rows = rows[:TOP_N]
        # Arabic title pass (join on ASIN) — EN and AR stored independently.
        ar_titles: dict[str, str] = {}
        try:
            ar_html = fetch.fetch(f"/-/ar/gp/bestsellers/{slug}", lang="ar")
            for ar_row in parse.parse_bestsellers(ar_html, node):
                if ar_row.get("title"):
                    ar_titles[ar_row["asin"]] = ar_row["title"]
        except Exception as e:  # noqa: BLE001
            print(f"  [WARN] {slug} arabic pass: {e}", flush=True)
        for r in rows:
            r["title_ar"] = ar_titles.get(r["asin"])
        bestsellers[node] = rows
        all_rows.extend(rows)
        enrich.extend(r["asin"] for r in rows[:ENRICH_PER_CAT])
        priced = sum(1 for r in rows if r["price_egp"] is not None)
        titled = sum(1 for r in rows if r["title"])
        parsed_count = len(rows)
        title_fill = round(100 * titled / parsed_count, 1) if parsed_count else 0.0
        price_fill = round(100 * priced / parsed_count, 1) if parsed_count else 0.0
        degraded = title_fill < 90 or parsed_count < 10
        health[node] = {
            "parsed_count": parsed_count,
            "title_fill": title_fill,
            "price_fill": price_fill,
            "degraded": degraded,
        }
        if degraded:
            print(
                f"  [WARN] {slug}: DEGRADED — parsed={parsed_count} "
                f"title_fill={title_fill}% price_fill={price_fill}% "
                f"(need title_fill >= 90% and parsed >= 10).",
                flush=True,
            )
        top = rows[0]
        print(
            f"  [OK] {slug}: {len(rows)} products ({priced} priced) · #1 "
            f"{(top['title'] or '')[:46]} @ EGP {top['price_egp']} ({top['asin']})",
            flush=True,
        )

    print("\n=== Product detail (BSR + reviews) ===", flush=True)
    products: dict[str, dict] = {}
    for asin in list(dict.fromkeys(enrich))[:ENRICH_MAX]:
        try:
            html = fetch.fetch(f"/-/en/dp/{asin}")
        except fetch.Blocked as e:
            print(f"  [BLOCKED] dp/{asin}: {e} — STOPPING enrichment.", flush=True)
            break
        except Exception as e:  # noqa: BLE001
            print(f"  [ERROR] dp/{asin}: {e}", flush=True)
            continue
        p = parse.parse_product(html, asin)
        products[asin] = p
        leaf = p["bsr"][-1] if p["bsr"] else None
        print(
            f"  [DETAIL] {asin}: BSR={leaf} reviews={len(p['reviews_list'])} "
            f"· {(p['title'] or '')[:42]}",
            flush=True,
        )

    # Durability guard: never destroy good data with an empty / blocked / PARTIAL run.
    min_cats = max(1, (len(CATEGORIES) * 3) // 4)
    if not all_rows or len(bestsellers) < min_cats:
        print(
            f"\n[ABORT] degraded scrape ({len(all_rows)} products / {len(bestsellers)} of "
            f"{len(CATEGORIES)} categories; need >= {min_cats}) — KEEPING existing data.",
            flush=True,
        )
        return
    # Aggregate fill-rate health telemetry (reported alongside the data, never gates it).
    degraded_cats = sorted(node for node, h in health.items() if h["degraded"])
    title_fills = [h["title_fill"] for h in health.values()]
    health_summary = {
        "categories_ok": sum(1 for h in health.values() if not h["degraded"]),
        "categories_degraded": degraded_cats,
        "min_title_fill": round(min(title_fills), 1) if title_fills else 0.0,
        "total_products": len(all_rows),
        "per_category": health,
    }

    _write_atomic("bestsellers.json", {"schema_version": SCHEMA_VERSION, "scraped_at": now, "categories": bestsellers, "all": all_rows})
    _write_atomic("products.json", {"schema_version": SCHEMA_VERSION, "scraped_at": now, "products": products})
    _write_atomic(
        "meta.json",
        {
            "schema_version": SCHEMA_VERSION,
            "scraped_at": now,
            "categories": list(bestsellers.keys()),
            "product_count": len(all_rows),
            "enriched": len(products),
            "source": "amazon.eg via firecrawl"
            if os.environ.get("RASID_FETCH", "").lower() == "firecrawl"
            else "amazon.eg direct (residential)",
            "health": health_summary,
        },
    )
    if degraded_cats:
        print(f"\n[WARN] health: {len(degraded_cats)} degraded categor"
              f"{'y' if len(degraded_cats) == 1 else 'ies'}: {', '.join(degraded_cats)} "
              f"(min_title_fill={health_summary['min_title_fill']}%).", flush=True)
    print(
        f"\nDONE → {len(all_rows)} real products across {len(bestsellers)} categories; "
        f"{len(products)} enriched with BSR/reviews.\nWrote: {OUT}",
        flush=True,
    )


if __name__ == "__main__":
    main()
