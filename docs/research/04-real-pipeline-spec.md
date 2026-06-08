I have the full picture: the app already defines a `DataAdapter` registry contract (architecture §3) and normalized DTOs, with `data.ts` as the single UI seam. The spec must align to that. I have everything needed to write the unified build spec now.

```markdown
# Rasid — Unified Real-Data Pipeline Build Spec
**amazon.eg → normalized DataAdapter → `web/src/lib/data.ts` seam. Zero UI changes.**
Authored by Chief Data Architect · as-of 2026-06-08 · all numbers below are from live, HTTP-200, no-CAPTCHA validation + verification runs on the residential IP `197.57.120.221` (AS8452 TE-AS, Telecom Egypt, Cairo).

---

## 0. The one-paragraph truth

Everything works **today, for free, from this Mac**. A residential IP gets HTTP 200 from amazon.eg with a plain `curl_cffi --impersonate chrome` request; a datacenter/cloud IP gets 503. So the entire decision space collapses to: **run the scheduled fetcher from a residential egress** (default: a local `launchd` cron on this Mac — $0) and pour the parsed rows into the existing `DataAdapter` seam. Best Sellers, Movers, Product+BSR, Reviews (8/product), Search SERP, Arabic, and the autocomplete endpoint are all validated. The only genuinely *unavailable* primitives are (a) Movers & Shakers — **empty marketplace-wide on .eg right now**, and (b) true search-volume — **does not exist for free**. Both are handled honestly below: Movers is **derived** from our own BSR time-series, and "most searched" is **Google Trends EG (relative interest)** clearly labelled as such. **The single user action required is one of: keep this Mac awake at the two scheduled times, OR run one `sudo pmset` line, OR (recommended for set-and-forget) a $15 Raspberry Pi.** No paid key is required for launch.

---

## 1. FETCH RECIPE (proven 200 from a residential IP)

### 1.1 The request that works
Two equivalent fetchers. **`curl_cffi` (Python) is the production pick** — it is the *reason* you get 200 not 503 (it forges the Chrome TLS/JA3 + HTTP-2 fingerprint Amazon's WAF checks). Plain `curl` with the same UA has a LibreSSL JA3 (`375c…`) that is fingerprintably non-Chrome; `curl_cffi` presents the real Chrome JA3 (`767c…`).

**Python (primary):**
```python
from curl_cffi import requests as creq  # curl_cffi 0.13.0

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "en-EG,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Fetch-Dest": "document", "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none", "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

r = creq.get(url, headers=HEADERS, impersonate="chrome", timeout=30,
             cookies=jar)   # see cookie hygiene below
```

**curl (equivalent, for shell smoke-tests / launchd):**
```bash
curl -sS --max-time 30 --compressed \
  -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" \
  -H "Accept-Language: en-EG,en;q=0.9" \
  -H "Sec-Fetch-Dest: document" -H "Sec-Fetch-Mode: navigate" -H "Sec-Fetch-Site: none" \
  -b /var/rasid/amz_cookies.txt -c /var/rasid/amz_cookies.txt \
  "https://www.amazon.eg/-/en/gp/bestsellers/electronics" -o out.html
```

### 1.2 Hard rules baked into the fetcher
- **Locale prefix `/-/en/` is mandatory** on every URL — forces English UI chrome and stable English selectors/labels (the "Best Sellers Rank" text anchor breaks on the Arabic page). Use `/-/ar/` only for the deliberate Arabic title pass (§2).
- **Do NOT rotate the UA.** On one residential IP a *stable* UA looks human; a rotating UA on a single IP is itself a bot signal. Pin Chrome/124.
- **Do NOT send the `accept-ch` client-hints** Amazon requests — curl can't produce a coherent device profile; partial hints are worse than none.
- **Cookie jar = persist & reuse.** On first 200, capture `session-id`, `session-id-time`, and pin `i18n-prefs=EGP` + `lc-acbeg=en_AE`. Send them back on every subsequent request (a stable session = returning visitor = lower suspicion). **Rotate the jar (fresh session-id) once per day** so one session doesn't accumulate an abuse score.

### 1.3 Anti-ban cadence (hardcode these numbers)
| Knob | Value |
|---|---|
| Steady-state rate | **3–5 req/min**; hard ceiling **6 req/min** |
| Token bucket | capacity **3**, refill **1 token / 12 s** |
| Inter-request delay | `sleep = random.uniform(10, 18)` s — **never < 8 s**, full jitter, never fixed |
| Concurrency | **1** (serial; no parallel connections from the residential IP) |
| Burst cap | ≤ **20** fetches in any 10-min window |
| Daily budget | **150–200** page fetches/day (a full daily cycle needs ~15–40, see §6) |
| Schedule jitter | fire at random minute offsets, **avoid tidy `:00/:15/:30`** |

### 1.4 Kill-switch (stop-on-block — non-negotiable)
Trip on **ANY**:
- HTTP status ∈ `{403, 429, 503}`.
- Body (case-insensitive) contains any of: `robot check`, `enter the characters`, `validatecaptcha`, `automated access to amazon`, `api-services-support@amazon`.
- `<title>` contains "Robot Check" OR `form[action*="validateCaptcha"]` present.
- **Soft warning** (back off, don't hard-trip): HTTP 200 but product-node count drops to 0, OR response time > 2.5× baseline (~0.8 s → warn > 2.5 s). This catches **CAPTCHA-at-200** — the silent failure where status is 200 but the body is a challenge. **A naïve `if status==200: ok` WILL ingest a challenge page as data; the min-product-count assert below is mandatory.**

```python
MARKERS = ["robot check","enter the characters","validatecaptcha",
           "automated access to amazon","api-services-support@amazon"]
def blocked(status, html):
    return status in (403,429,503) or any(m in html.lower() for m in MARKERS)
# Accept a page ONLY if:  status==200 and not blocked and >=20 product nodes parsed.
```

**Back-off on hard trip:** STOP the run immediately (no retry-hammer). Honor `Retry-After` if present; else cooldown `min(30min * 2**(strikes-1), 24h)` ± 20% jitter (1st=30m, 2nd=2h, 3rd=6h, 4th+=24h). Reset strikes after 24 h clean. **Never circumvent** (no IP rotation / no captcha solving after a block — that crosses the ToS anti-circumvention line; see §6 legal note).

> **Live proof:** dozens of fetches across all validation agents returned HTTP 200, 0.7–1.6 s, sizes 270 KB–1.6 MB, `x-amz-cf-pop: CAI50-P2` (CloudFront Cairo edge → served from origin to the EG residential IP), zero CAPTCHA. The exact ban threshold was **deliberately never probed** (it's the user's home IP); the policy is built to never find it.

---

## 2. SELECTORS TABLE (validated against live HTML, 2026-06-08)

> **Stability rule for every selector below:** anchor on **stable hooks** — `id^="p13n-asin-index"` / `id^="gridItemRoot"`, `span.zg-bdg-text`, `span.a-icon-alt`, `[data-asin]`, `[data-component-type='s-search-result']`, `th`-text "Best Sellers Rank", `data-hook` values, and `class*="p13n-sc-"` **substring** matches. **Never hard-code hashed classes** like `_cDEzb_p13n-sc-price_3mJ9Z` — the `p13n-sc-` *prefix* is stable, the hashed suffix churns every deploy. Ship a **fill-rate health monitor**: if title fill-rate < 90% (or ASIN count < 5 on a list page), Amazon changed the markup — alert, don't silently emit garbage.

### 2.1 Best Sellers — `GET /-/en/gp/bestsellers/<slug>[?pg=N]`
30 items/page. **`pg=1` → ranks #1–#30; `pg=2` → #51–#80** (NOT #31–#60 — the rendered list jumps). **Never compute rank from array index — read `span.zg-bdg-text`.**

| Field | Selector (within each container) | Parse |
|---|---|---|
| Container | `div[id^="p13n-asin-index"]` (also `div#gridItemRoot`) — exactly 30 | iterate these |
| ASIN | **regex `/dp/([A-Z0-9]{10})` on `a[href*="/dp/"]`** (100% reliable). Inner `div[data-asin]` is a fallback; the *outer* card's `data-asin` is empty | dedupe by ASIN (cells render ~3×) |
| Rank | `span.zg-bdg-text` → `"#1"` | `int(t.lstrip("#"))` |
| Title | `div[class*="p13n-sc-css-line-clamp"]`; fallback `img[alt]` | strip |
| Price | `span[class*="p13n-sc-price"]` → `"EGP\xa049.99"` | strip NBSP `\xa0`; `re.search(r'([\d,]+\.?\d*)',t)`; **missing element = out of stock → store `null`, keep the row** (~2/30 on HOME) |
| Rating | `span.a-icon-alt` → `"4.7 out of 5 stars"` | `float(t.split()[0])` |
| Reviews | `span.a-size-small` → `"863"` | `int(t.replace(',',''))`; corroborated by rating anchor `aria-label` |
| Image | `img['src']` (thumbs `_AC_UL300`; swap `_SX300` for hi-res) | |
| Link | `a[href*="/dp/"]` → prefix `https://www.amazon.eg` | |

**Validated slugs:** `electronics`, `beauty`, `home` (live). Same `p13n` template for `kitchen, toys, books, fashion, grocery, health, baby-products, videogames, …` → one smoke-test fetch per new slug.

### 2.2 Movers & Shakers — `GET /-/en/gp/movers-and-shakers/<slug>`
**Empty on amazon.eg marketplace-wide right now** (electronics/books/home all server-render `<h4>` "Sorry, there are no movers and shakers available in this category."). Root `/movers-and-shakers` is worst (CardJS crash, empty `#zg-right-col`). See §3 for the decision.
- **Empty-state detector (run before any card parse):** `soup.select_one('.p13n-desktop-grid h4')` text contains `"no movers and shakers"` **OR** `#zg-right-col` card count == 0 → mark unavailable, skip.
- **If/when populated**, it reuses the Best Sellers card template exactly: iterate `#gridItemRoot`, ASIN via `[data-asin]`/`/dp/` regex, title `.zg-grid-general-faceout`, gain badge `span.zg-bdg-text` inside `div.zg-bdg-ctr` (a single trailing `%`, no "was #X"). **Gain selector/format is UNVERIFIED on .eg** (no card ever rendered) — validate against a real populated card before trusting it.

### 2.3 Product detail (incl. BSR) — `GET /-/en/dp/<ASIN>`
~1.4–1.6 MB. **BSR lives in a TABLE on .eg — the amazon.com `#detailBullets_feature_div` / `#productDetails_detailBullets_sections1` selectors RETURN NOTHING here.** This is the single biggest porting trap.

| Field | Selector | Parse |
|---|---|---|
| Title | `#productTitle` | strip |
| Brand | `#bylineInfo` → `re.search(r'Visit the (.+?) Store', t)`; fallback `Brand:\s*(.+)`; also in details `th=="Brand Name"` | |
| Price | first non-empty of `#corePrice_feature_div span.a-offscreen` → `span.a-price span.a-offscreen` → `.priceToPay span.a-offscreen` → `"EGP9,999.00"`. **Use `a-offscreen`, NOT `a-price-whole`+`a-price-fraction`** (latter yields `"EGP79 .00"` stray space) | amount `re.sub(r'[^\d.]','',p)`; currency `EGP` |
| Rating | `#acrPopover[title]` → `"4.4 out of 5 stars"`; fallback `#acrPopover span.a-icon-alt` | `re.search(r'([\d.]+)',t)` |
| Review count | `#acrCustomerReviewText` → `"(333)"` | `int(re.sub(r'[^0-9]','',t))` |
| Availability | `#availability` → `"In Stock"` | |
| **BSR** | Find node where text matches `/Best Sellers Rank/i`; `tr = node.parent.find_parent('tr')`; `raw = tr.select_one('td').get_text(' ',strip=True)`; then `re.findall(r'#([\d,]+)\s+in\s+(.+?)(?=\s*\(|\s*#[\d]|$)', raw)` → `[(rank,category),…]`. Leaf-category node-id from `tr td a[href*="/gp/bestsellers/"]` (e.g. `21833243031`) | **BSR is OPTIONAL** — return `null` if the th is absent, do not error |

**Live proof of non-artifact:** `B0CPC8JMCW` → `#1 in Electronics / #1 in USB Cables`; `B072MSNSR8` → `#28 in Electronics / #5 in USB Cables`. Two products → two different ranks → genuine extraction. Capture **both** the broad rank and the **leaf** rank; the **leaf rank is the meaningful key** for the app's within-category demand band.

### 2.4 Reviews — embedded in the SAME `/-/en/dp/<ASIN>` page (8/product, no auth)
**Do NOT request `/-/en/product-reviews/<ASIN>` logged-out — it 302-redirects to `/ap/signin`** (wasted request, leaks intent). The embedded widget uses **camelCase** `data-hook`s (the kebab-case `review-title`/`review-body` return None on .eg).

| Field | Selector | Note |
|---|---|---|
| Container | `div#localTopReviewsList` | up to 8 |
| Each review | `div[data-hook="review"]` | `id` attr = review id (e.g. `R1Z0FYBN9SSZZ0`) = dedupe PK |
| Rating | `i[data-hook="review-star-rating"] span.a-icon-alt` | `float(t.split()[0])` |
| Title | `h5[data-hook="reviewTitle"]` | **NOT** `review-title`; strip leading `^\d(\.\d)? out of 5 stars` |
| Body | `div[data-hook="reviewText"]` (or `reviewRichContentContainer`) | **NOT** `review-body`; strip boilerplate `"Brief content visible, double tap…"`, `"Full content visible…"`, `\bRead more\b|\bRead less\b` |
| Author | `span.a-profile-name` | |
| Date | `span[data-hook="review-date"]` → `"Reviewed in Egypt on 3 May 2026"` | |
| Verified | `span[data-hook="avp-badge"]` present → True | |
| Helpful | `span[data-hook="helpful-vote-statement"]` → `"3 people found this helpful"` / `"One person…"`→1 / absent→0 | |
| Lang | regex `[\u0600-\u06FF]` on title+body | reviews are mostly Arabic; store raw UTF-8 |

**Logged-out ceiling = 8 reviews/product** (relevance-ranked "top", NOT most-recent). Sufficient for a sentiment/quality signal. Full archive requires user session cookies (§6 optional).

### 2.5 Search SERP — `GET /-/en/s?k=<urlencoded query>[&page=N]`
~48–60 cards/page (organic + sponsored interleaved). 1.2–1.9 MB. Arabic queries work URL-encoded.

| Field | Selector | Parse |
|---|---|---|
| Card | `div[data-component-type='s-search-result']` | iterate; skip empty `data-asin` |
| ASIN | `card['data-asin']` | |
| Title | `card.select_one("h2 span")` | **`h2 a span` is DEAD** — the `<a>` now wraps `<h2>`; use `h2 span` |
| Price | `div[data-cy='price-recipe'] .a-price:not(.a-text-price) .a-offscreen` → `"EGP\xa03,099.00"` | the `:not(.a-text-price)` guard **excludes the struck-through List price** — critical for price accuracy |
| Rating | `div[data-cy='reviews-block'] span.a-icon-alt` → `r'([\d.]+)\s+out of'` | |
| Reviews | `div[data-cy='reviews-block'] a[aria-label]` matching `r'^([\d,]+)\s+ratings?$'` | the **`$`-anchored regex disambiguates** from the sibling "4.3 out of 5 stars, rating details" anchor |
| Sponsored | `card.select_one("h2")[aria-label]` starts with "Sponsored" | filter out for organic ranking |
| URL | title link href, prefix `https://www.amazon.eg`; or build from ASIN | |

`rating`/`reviews` are legitimately `null` for brand-new listings — optional, not a parse failure.

### 2.6 Arabic bilingual capture
Same parser, two fetches joined on ASIN. **EN and AR titles are seller-provided localizations that diverge factually** (e.g. `B0CPC8JMCW` EN="1M … Black", AR="1.2 متر", omits color) — **store `titleEn` and `titleAr` as independent fields; never machine-translate one from the other.**
- Force Arabic: `GET /-/ar/gp/bestsellers/<slug>` (preferred, cache-friendly) **or** header `Accept-Language: ar-EG,ar;q=0.9`. Both identical.
- Containers `div#gridItemRoot`; title `div[class*="p13n-sc-css-line-clamp"]` (fallback `img[alt]`); join EN-dict ⋈ AR-dict on ASIN (validated 30/30 1:1).
- **Cosmetic artifact to ignore:** `<html lang="ar-ae"/"en-ae">` and `<title>` say **"amazon.ae"** — it's a shared GCC template. **Validate marketplace via `ue_mid=ARBP9OOSHTCHU` + `canonical=amazon.eg` + `EGP`, never the lang attribute.**

### 2.7 Category tree harvest — two-pass crawl
- Pass 1: `GET /-/en/gp/bestsellers/` → 11 top-level departments. Iterate `a[href]` matching `/gp/bestsellers/([a-z0-9\-]+)/ref=zg_bs_nav_([a-z0-9]+)_0` → `(slug, name)`. Exclude "Any Department". (Top-level depts carry **slug only, no node-id**.)
- Pass 2: `GET /-/en/gp/bestsellers/<slug>/` → that dept's children. Iterate `a[href]` matching `/gp/bestsellers/([a-z0-9\-]+)/(\d+)/ref=zg_bs_nav` → `(parent_slug, node_id, name)`. Skip the `zg_bs_unv_<slug>_0` back-link.
- Persist `{slug, node, name, parent}`; `node` is a stable integer key. **11 real departments confirmed**; Electronics has **17 sub-nodes** (Mobile Phones=21832868031, Headphones=21832869031, Tablets=21832915031, …). Budget ~11–12 polite fetches to map one level deep; spread across runs.

> **Note for the app:** `constants.ts` currently keys categories by slug (`nodeId:"electronics"`). The harvested numeric node-ids should backfill `Category.nodeId` for sub-categories so BSR leaf-rank links resolve. This is additive — `CATEGORY_BY_NODE` already supports it.

---

## 3. DEMAND DATA decision (real "most searched / trending" for Egypt)

**Constraint, stated honestly:** there is **no free source of absolute search volume**, and **amazon.eg autocomplete is empty on the `.com` host** (the assignment's symptom). Two real findings change the picture:

1. **Amazon autocomplete IS reachable for EG — via the `.co.uk` host.** `GET https://completion.amazon.co.uk/api/2017/suggestions?mid=ARBP9OOSHTCHU&alias=aps&prefix=<q>&lop=en_AE` → HTTP 200 JSON with **real EG keyword suggestions** (EN: "iphone 17 pro max…"; AR `lop=ar_AE`: "لاب توب, حامل لابتوب…"). `mid=ARBP9OOSHTCHU` is the discriminator (static, hardcode it). `.com` returns `suggestions:[]` (empty) — **that is the trap**; `.co.uk` is the live host. **But autocomplete gives ordered *prefixes*, not demand magnitude** — it's a typeahead/seed source, not a ranking signal.
2. **Google Trends `geo='EG'` is the only true *search* signal**, and it works live via `pytrends`.

### 3.1 The three real sources and what each honestly is
| Source | What it really is | Use for |
|---|---|---|
| **Google Trends EG** (`pytrends`, `geo='EG'`) | **Relative** interest index 0–100 + RISING/Breakout queries. NOT absolute volume. | **Forward demand** + "what's surging" |
| **amazon.eg Best Sellers** rank | Ordinal 1..N sales **proxy**, ~hourly refresh | **Durable popularity** |
| **amazon.eg Movers** (when populated) / **our derived Δlog(BSR)** | 24h velocity / acceleration | **What's heating up now** |
| amazon.co.uk completion (EG mid) | Ordered keyword **prefixes** | **Seed list / search-bar typeahead** — NOT a ranking |

### 3.2 pytrends recipe (validated live)
```python
from pytrends.request import TrendReq
pt = TrendReq(hl='en-US', tz=120)          # tz=120 = Cairo UTC+2 (minutes)
pt.build_payload([seed], cat=0, timeframe='today 3-m', geo='EG', gprop='')
iot = pt.interest_over_time()              # weekly index + 'isPartial'
rq  = pt.related_queries()[seed]           # ['top'] (0-100) + ['rising'] (% growth; 'Breakout'>5000%)
reg = pt.interest_by_region(resolution='REGION', inc_low_vol=True)  # Egyptian governorates
```
- **Required one-line patch** (pytrends 4.9.2 + urllib3≥2 crash): in `pytrends/request.py` rename `Retry(..., method_whitelist=...)` → `allowed_methods=...`. Pin the patched copy.
- **Serialization gotcha:** `interest_over_time` index is a pandas `Timestamp` — cast `str(k.date())` before `json.dumps`.
- **MANDATORY noise filter:** rising results include country-wide junk (`lidl near me`=700, `microservices architecture`=400, `wikipedia`). Keep only rows whose `query` contains the seed token or a brand/product whitelist before surfacing.
- **Rate limits (the real hazard):** Trends 429s aggressively. Space calls **≥ 8–10 s**, batch ≤ **5 seeds/payload**, reuse one `TrendReq` session, back off + STOP on 429, cap to a few dozen seed-requests/day on one IP. Refresh ≤ 1×/day (weekly granularity).

> **Live proof:** `geo='EG'`, `'today 3-m'`, seeds `iphone`/`laptop`/Arabic `شاحن`,`سماعات`,`air fryer` all returned usable top+rising **dated through today** (e.g. laptop TOP: `egypt laptop=100, laptop hp=99, gaming laptop=80` — clearly EG-localized) with **zero 429/CAPTCHA**. Egyptian governorate names + Arabic-script queries = conclusive geo-proof.

### 3.3 The honest metric: "Trend Score" (0–100), percentile-blended
Because the inputs are unitless, combine them as **percentile ranks within each source** (never a fabricated common unit):
```
TrendScore = 100 × (0.45·P_trends + 0.35·P_velocity + 0.20·P_bestseller)
  P_bestseller = 1 − (rank−1)/(N−1)              # rank 1 → 1.0
  P_velocity   = percentile of item's Δlog(BSR) (or Movers %) among today's movers
  P_trends     = percentile of item's Trends rising-value among EG rising queries
Missing source ⇒ DROP the term and renormalize weights over present sources. NEVER impute.
```
Entity resolution (Trends free-text Arabic/EN ⋈ Amazon product) = fuzzy `token_set_ratio ≥ 80` after Arabic↔EN transliteration + a brand whitelist (this is the main engineering risk → start with high thresholds).

### 3.4 The Movers decision (because .eg Movers is empty)
**Recommended:** **derive movers ourselves from the BSR time-series** (Δlog(BSR) over the period window) — which is exactly what the app's seam already models (`riseScore`, `getMovers`). Keep a **cheap daily probe** of `/-/en/gp/movers-and-shakers/<slug>` using the deterministic empty-state detector (§2.2); auto-enable native ingestion **if/when** Amazon ever populates it. **Do not** build a .eg Movers card parser expecting products today.

### 3.5 Honest labelling (non-negotiable; copy already exists in `constants.ts` `DISCLOSURE`)
- Name it **"Trend Score" / "Demand Index" (0–100)** or a **rank** — **NEVER "N searches"** or "N searches/month".
- Per-item provenance badge: **Search (Trends) / Velocity (Movers/derived) / Top Seller (Best Sellers)**; multi-source ⇒ "Hot".
- Always render **"as of <timestamp>"** + microcopy **"Relative popularity, not absolute search volume."**
- Trends-only (no Amazon match) ⇒ tag **"Emerging search interest"** (no rank). Amazon-only ⇒ **"Selling fast"**. If you ever show Google's RSS approx-traffic, label it exactly as a **bucket** ("2,000+ searches, Google-estimated"), never precise.
- This maps 1:1 onto the existing `Keyword.provenance` (`source:"amazon_autocomplete"`/`google_trends`, `confidence:"low"`, `isEstimated:true`) and `DISCLOSURE.demandProxyEn`.

---

## 4. DEPLOYMENT decision (run the scheduled scraper from a residential IP)

**Why:** amazon.eg serves **200 to residential/ISP IPs, 503 to datacenter** (Vercel=AWS AS16509, GitHub Actions=Azure AS8075, Render/Fly = datacenter → 503/Robot Check). So the scheduler must **egress residential**.

### 4.1 RECOMMENDED DEFAULT — local `launchd` cron on this Mac ($0)
Proven end-to-end: local pipeline fetched + parsed **58 real products** with ASIN/rank/title/EGP, and the generated plist passed `plutil -lint` and parsed the 09:00/21:00 Africa/Cairo schedule. Three files:
1. `~/rasid/scrape_eg.sh` — the curl recipe + 0–20 s jitter + stop-on-block guard (`exit 1` on non-200 or captcha markers; never retry-hammers).
2. `~/rasid/parse_eg.py` — the §2 selectors → timestamped JSON in `~/rasid/data/`.
3. `~/Library/LaunchAgents/com.rasid.amazoneg.scrape.plist` — `StartCalendarInterval` = `[{Hour 9,Minute 0},{Hour 21,Minute 0}]`, `ProcessType=Background`.

Install (user action): `cp …plist ~/Library/LaunchAgents/ && launchctl load -w ~/Library/LaunchAgents/com.rasid.amazoneg.scrape.plist`. Manual test: `launchctl start com.rasid.amazoneg.scrape`.

**Laptop caveat (this is a laptop, was on battery during test, `womp=0`):** launchd does **not wake a sleeping Mac** — a missed job coalesces to the next wake. Pick ONE mitigation:
- keep it plugged + lid-open / clamshell-with-power during the two windows, **OR**
- `sudo pmset repeat wakeorpoweron MTWRFSU 08:58:00` (wakes 2 min before the job) — **the one-line user action**.

### 4.2 Set-and-forget upgrade — Raspberry Pi Zero 2 W at home (~$15–20 once, ~$1/yr power)
Same residential IP, truly always-on. Best personal "never think about it" option. No code changes — same three files on Linux (`cron`/`systemd-timer` instead of launchd).

### 4.3 Fallbacks (only if the home IP gets challenged, or you must run in cloud)

**(A) Managed scraper API — Firecrawl (already installed + authenticated, $0 now).**
`firecrawl --status` → authenticated, **993/1000 free credits**. **Live-tested on amazon.eg and it works** (runs on Firecrawl's own IPs, sidesteps the residential requirement entirely):
- Cheap markdown (1 credit, ~3.7 s, full top-30): `firecrawl scrape "<url>" --format markdown --country EG -o out.md` → regex the fields.
- Zero-parse JSON (~4 credits, ~55 s, ~20 products): `--format json --schema-file schema.json --country EG`.
- Free tier = ~1,000 markdown OR ~250 schema scrapes/mo — **easily covers a twice-daily cycle**. **This is the recommended cloud/blocked fallback** (no new signup; provision your own free key at firecrawl.dev so the quota is yours).

**(B) Residential proxy + cloud cron (only if you insist on cloud + native curl).** Route the §1.1 request through an EG-targeted residential proxy. **Honest cost** (data is tiny — ~108 KB gzipped/bestseller page → < 1 GB/mo even at hundreds of fetches/day): the per-GB headline rates are bulk-only; the **practical floor is a ~$5.50/mo 1 GB minimum block** (Decodo $5.50/GB; IPRoyal PAYG $7.35/GB@1GB, traffic never-expires; Evomi $0.49/GB but **$49.99 / 100 GB minimum**). Webshare has a **permanent free 1 GB/mo tier** (≈ 9,700 bestseller fetches/mo) — good enough to *prove* 200-from-cloud and run ~300/day free. Wiring is a one-line proxy add to curl/requests/undici. **The advertised "$1.75/GB" is a multi-TB figure — do NOT quote it as the deployment cost.** **Unverified link:** no proxy was live-tested against amazon.eg (needs a paid/trial account) — confirm 200 on the free trial before wiring the cron.

**(C) Bright Data / Apify MCP** — secondary paid fallbacks; Bright Data's `web_data_amazon_product_search` takes an explicit Amazon **domain URL** (so .eg targeting is config-driven) with 5k req/mo free; Apify has a ready-made Bestsellers actor ($19.99/mo, .eg unverified). Test on free credits first.

**Decision:** **(default) local launchd → (always-on) Pi → (blocked/cloud) Firecrawl free tier.** Avoid paid proxy/managed for personal scale — it adds cost/dependency to replace something already free and proven.

---

## 5. INTEGRATION PLAN (into the `web/src/lib/data.ts` seam — zero screen changes)

### 5.1 The seam, confirmed
`data.ts` is the **single** module every screen imports; its header explicitly says *"When the live amazon.eg adapters are wired in, ONLY this file changes."* The app **already defines** the target contract in `docs/research/02-architecture.md §3`: a `DataAdapter` registry emitting `NormalizedProduct/Ranking/Suggestion/Review/FeeSchedule`. **We implement that contract — we don't invent a new one.** Types in `web/src/lib/types.ts` (`Product`, `RankingRow`, `Review`, `Keyword`, `SentimentSummary`, `BsrHistory`, `Provenance`, `DemandBand`, `Period`) are the UI-facing projection and **do not change**.

### 5.2 Architecture: pipeline writes DB; `data.ts` reads DB (do NOT scrape in the request path)
```
launchd/cron (residential)                    Next.js app (any host, incl. cloud)
  fetch (curl_cffi) ──▶ parse (§2 selectors) ──▶ upsert products
                                              └▶ append immutable snapshots/rankings
                                              └▶ pytrends → keywords            (Supabase / Postgres)
                                                       │
   getBestSellers / getMovers / getProduct / ─────────┘  read newest rows, project to types.ts
   getReviews / getKeywords / searchProducts            (this is the ONLY edit)
```
**Critical separation:** the **scraper** owns rank + reviews + Δlog(BSR); it runs on the schedule from the residential box. The **app** only ever reads the DB, so the Next.js front end can deploy to Vercel/datacenter **without ever touching amazon.eg** (no 503 risk in the request path). `supabase/migrations` + `supabase/seed` already exist for this; the DB schema is in architecture §4 (`products`, `snapshots`, `rankings`, `reviews`, `keywords`, `scrape_runs`).

### 5.3 The real `DataAdapter` (replaces the seed synthesis)
A thin client behind the registry. **Fetch+parse+cache live in the scheduled worker; the adapter the app uses is a read-through DB adapter** with a short in-process cache:

```ts
// web/src/lib/adapters/supabase-read.adapter.ts  (NEW)
class SupabaseReadAdapter implements DataAdapter {
  meta = { source: "amazon_html_bestsellers", cost: "free",
           capabilities: ["product","rankings","reviews","suggestions"], reliability: 3 };
  // reads newest snapshot rows; maps DB → NormalizedProduct/Ranking/Review/Suggestion
}
```
Caching TTLs (the single biggest anti-ban lever, applied in the **worker**, not the app): **bestsellers/category lists 4–6 h; product/price 1–3 h; Trends 24 h.** amazon.eg sends `cache-control:no-cache` + `x-cache:Miss` every time, so **CloudFront will not help — cache app-side.** Use conditional GET (ETag) where present; coalesce in-flight duplicate URLs.

### 5.4 EXACT functions to replace in `data.ts` (signatures **unchanged**)
Every signature below stays byte-identical so **no screen, component, or type changes**. Only the body swaps from `seed.ts` synthesis to a DB/adapter read + projection.

| Function (keep signature) | New body source | Honest provenance to emit |
|---|---|---|
| `getBestSellers(q: RankingQuery = {}): RankingRow[]` | newest `rankings` rows where `listType='bestsellers'`, filter `categoryNode`, order by stored rank | `source:"amazon_html_bestsellers"`, `confidence:"high"`, `isEstimated:false` (price/rating/reviews are **facts**) |
| `getMovers(q: RankingQuery = {}): RankingRow[]` | **derived** Δlog(BSR) from `snapshots` (native Movers stays disabled until populated). Keep the existing `gainPct ≥ 1%` filter | `confidence:"medium"`, `isEstimated:true`, note "velocity derived from our BSR snapshots; amazon.eg Movers is empty" |
| `getProduct(asin, period?): Product \| undefined` | newest `products` row + leaf BSR | price/rating/reviews `high`/fact; **`bsr` from leaf-category table, `medium`** |
| `getBsrHistory(asin): BsrHistory` | real `snapshots` time-series (replaces synthesized points) | `confidence` rises from `low`→`medium` as real history accumulates |
| `getReviews(asin, {limit?}): Review[]` | the **8 embedded** reviews (§2.4); cap honestly at 8 logged-out | `source:"amazon_html_reviews"`; real `lang`/`verifiedPurchase`/`helpfulVotes` |
| `getSentimentSummary(asin): SentimentSummary` | run sentiment over the real 8 (Arabic-aware); set `analysedCount=8`, `totalReported=<scraped (N)>` | `confidence:"low"`, `isEstimated:true` — "sentiment on a truncated logged-out sample" (copy already in file) |
| `getKeywords({limit?,lang?}): Keyword[]` | **Google Trends EG** (§3) → `demandScore` = relative interest, `trend` from rising; optional autocomplete prefixes as seeds | `source:"google_trends"`, `confidence:"low"`, `isEstimated:true`, `DISCLOSURE.demandProxyEn` |
| `searchProducts(query, period?): Product[]` | live SERP fetch via worker/cache (§2.5), organic-only, map to `Product[]` | facts `high`; exclude struck-through List price |
| `getDashboardSummary(period?)` | unchanged orchestration — it only **composes** the above; no edit needed beyond what they return | inherits |
| `demandBandForAsin` / `currentBsr` / `riseScore` / `toProduct` | **keep as-is** — they already operate on whatever BSR series they're given; now fed real `snapshots` instead of synthesized ones | — |
| `getWatchlist` / `getAlerts` | move to Supabase RLS tables later (already flagged in code) — **out of scope for the scrape pipeline** | — |

**Why this is zero-UI-change:** `RankingRow`, `Product`, `Review`, `Keyword`, `SentimentSummary` shapes are preserved; `Provenance` (`source/fetchedAt/confidence/isEstimated/note`) is already threaded end-to-end and rendered by the existing confidence-tier UI + `calibration-notice.tsx`. The DemandBand stays **within-category** (audit control C1 preserved). The UI literally cannot tell the data went from synthetic to real — except the numbers are now true and the timestamps move.

### 5.5 Output row schema the worker writes (maps cleanly to `NormalizedProduct`)
```json
{ "category":"electronics","rank":1,"asin":"B0CPC8JMCW",
  "title_en":"…","title_ar":"…","price_egp":79.00,"currency":"EGP",
  "rating":4.4,"reviews":333,"bsr_leaf":{"rank":1,"category":"USB Cables","node":"21833243031"},
  "image_url":"…","product_url":"…","in_stock":true,"scraped_at":"2026-06-08T…Z" }
```

---

## 6. PRIORITIZED BUILD ORDER + the ONE thing the user must do

### Build order (each step is independently shippable)
1. **Fetcher module** (`scrape_eg.sh` + `curl_cffi` core) with the §1.3 token bucket, §1.4 kill-switch, and cookie jar. *Proven; copy from `/tmp/rasid_demo` staging.*
2. **Parsers** for Best Sellers + Product/BSR + embedded Reviews (§2.1/2.3/2.4) → normalized JSON. *Validated; selector logic is production-ready.* Add the **fill-rate health monitor**.
3. **Supabase schema + upsert** (`products`/`snapshots`/`rankings`/`reviews`/`keywords`/`scrape_runs` per architecture §4). Append-only snapshots so `getBsrHistory` becomes real over time.
4. **`SupabaseReadAdapter` + swap the 8 function bodies in `data.ts`** (§5.4). Ship behind a flag so you can A/B against seed. **This is the only edit to the app.**
5. **Google Trends EG worker** (`pytrends`, patched) → `keywords` + Trend Score blend (§3). Wire `getKeywords`.
6. **SERP `searchProducts`** (§2.5) + **category-tree backfill** of numeric node-ids (§2.7) for leaf-BSR links.
7. **launchd schedule** (09:00 + 21:00 Cairo, jittered) + run.log; daily **Movers empty-state probe** (§3.4); daily cookie-jar rotation.
8. **Fallback wiring (optional):** Firecrawl `--country EG` behind the kill-switch as the auto-failover when the home IP trips.

### The ONE thing the user must do (concrete, honest)
**Approve running a local scheduled scraper on this Mac and pick a wake mitigation.** Specifically, one-time:
1. Copy the 3 staged files into `~/rasid/` and `~/Library/LaunchAgents/`, then `launchctl load -w …plist`.
2. Because this is a laptop that sleeps: run **`sudo pmset repeat wakeorpoweron MTWRFSU 08:58:00`** (admin password) **or** keep it plugged/awake at 09:00 & 21:00 — **or** put the job on a $15 Pi for true always-on.

**No paid key, no signup, no proxy is required for launch.** Optional, only-if-you-want-more:
- a **free** Firecrawl key (firecrawl.dev) so the cloud/blocked fallback quota is yours;
- **amazon.eg session cookies** (log in once, export jar) **only** if you need > 8 reviews/product;
- a residential proxy **only** if you later move the scraper off this residential line into a datacenter.

### Honest residual risks (carry these forward)
- **Single residential IP = single point of failure.** A trip = that cycle's data is stale until cooldown (kill-switch prevents escalation). Cadence ≤ 1–3 runs/day keeps you under the radar.
- **Hashed CSS classes churn** → anchored on stable hooks + fill-rate alarm, but expect periodic selector maintenance (treat selectors as a maintained artifact, not fire-and-forget).
- **`.eg` serves an `amazon.ae`-labelled GCC template** — data (ASIN/EGP/`ue_mid`) is correct EG; validate on `ue_mid=ARBP9OOSHTCHU`/canonical/EGP, never the `lang` attribute. (Confirm a sample is true Egypt catalog before fully trusting at scale.)
- **Movers empty + no free absolute search volume** → handled by derived Δlog(BSR) and clearly-labelled relative Trend Score. Never present either as units.
- **ToS:** this is scraping (against Amazon CoU). The defensible posture — **logged-out, public pages only, rate-limited, no block-circumvention, no PII stored, personal/non-commercial, no LLM-training on the content** — keeps it in the hiQ / Meta-v-Bright-Data low-risk lane, but it's a tolerated breach, not "permitted." Bake the DO/DON'T guardrails into the fetcher (stop-on-block, never rotate-to-evade).

---
**Bottom line:** Build the residential local-cron pipeline now (free, proven), write to Supabase, and swap 8 function bodies in `data.ts` behind a flag. The UI ships unchanged with honest provenance already wired. The user's only gate is approving a local cron + one wake-mitigation line. Movers and absolute-volume gaps are closed honestly (derived velocity + labelled Google-Trends Demand Index), not faked.
```

Key files referenced (all absolute):
- `/Users/home/Documents/Amazon/web/src/lib/data.ts` — the single seam; 8 function bodies to swap (signatures unchanged).
- `/Users/home/Documents/Amazon/web/src/lib/types.ts` — UI-facing domain types (no change).
- `/Users/home/Documents/Amazon/web/src/lib/constants.ts` — `MARKETPLACE.marketplaceId="ARBP9OOSHTCHU"`, category slugs (backfill numeric node-ids), `DISCLOSURE` copy already present.
- `/Users/home/Documents/Amazon/docs/research/02-architecture.md` — §3 `DataAdapter` registry + normalized DTOs (the contract to implement); §4 Postgres schema.
- `/Users/home/Documents/Amazon/scrapers/` and `/Users/home/Documents/Amazon/supabase/{migrations,seed}/` — empty, awaiting this build.