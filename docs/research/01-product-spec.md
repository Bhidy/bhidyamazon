I'll write this product spec directly as my final response. This is a documentation/specification task — no file creation or research tools needed since the CONTEXT is comprehensive. Let me synthesize it into a complete institutional-grade spec.

# Suuq — Amazon Egypt Product-Research & Arbitrage-Sourcing Platform
## Institutional Product Specification (Free / Scraping-First Strategy)

**Document owner:** Product Director
**Date:** 2026-06-08
**Status:** Draft v1.0 (for engineering + design kickoff)
**Working name:** *Suuq* (سوق) — placeholder; "Souq" was amazon.eg's predecessor brand, so confirm trademark clearance before adopting.

---

> **READ-FIRST DATA-INTEGRITY DECLARATION (governs the entire product)**
>
> This platform is built **entirely on free, scraped, and undocumented-public-endpoint data**. There is **no paid data API** and **no ground-truth sales feed for the Egypt marketplace** (Helium 10, Jungle Scout, Keepa, and SmartScout do **not** cover amazon.eg). Two consequences are non-negotiable and are wired into every screen:
>
> 1. **"Most-selling" is an ordinal rank proxy (BSR), not a unit count.** Any unit/revenue figure is a *modeled estimate with wide error bars* and must be visibly labeled as such. Displaying "X units sold" as if it were fact is a **Critical defect**.
> 2. **"Most-searched" does not exist as a number.** Amazon publishes no search volume. What we surface is an **"Estimated Demand" 0–100 score** derived from autocomplete ordering + BSR — labeled honestly, never as "search volume."
>
> Every estimate carries a confidence chip, a freshness timestamp, and the raw evidence (BSR + snapshot time) so the user can audit it. This honesty is a **product feature and a legal posture**, not a disclaimer afterthought.

---

## 1. Vision & Positioning

### 1.1 One-line
**The first product-research and arbitrage-sourcing cockpit built specifically for amazon.eg — turning free public signals (Best Sellers, Movers & Shakers, autocomplete, product pages, reviews) into honest, EGP-denominated sourcing decisions, in Arabic and English.**

### 1.2 The gap we fill
The entire global research-tool industry (Helium 10, Jungle Scout, Keepa, SmartScout) **stops at the Egyptian border.** Egyptian and cross-border sellers/arbitrageurs sourcing into amazon.eg — the #1 marketplace in Egypt as of 2026, ahead of Noon and Temu — are flying blind: no BSR history, no demand signal, no EGP-aware profit math, no Arabic review intelligence. They currently improvise with manual browsing and spreadsheets.

### 1.3 Positioning statement
> For **Egyptian and MENA arbitrage sellers and sourcing agents** who need to decide *what to buy and resell on amazon.eg*, **Suuq** is a **product-research and profit-analysis platform** that **surfaces selling/rising/demand signals and computes real EGP margins from free public data** — unlike **Helium 10 / Jungle Scout / Keepa**, which **do not support the Egypt marketplace at all**, and unlike **manual browsing**, which gives no history, no math, and no Arabic sentiment.

### 1.4 What we are NOT (scope guardrails)
- **Not a seller-account automation tool.** We never log into a user's Amazon account, never act on stored credentials, never place orders. (This is both a legal line — see §11 — and a trust line.)
- **Not a "guaranteed sales numbers" tool.** We sell *decision support under honest uncertainty*, not false precision.
- **Not a data reseller.** Scraped data is a private decision cache for the logged-in user; we do not republish or expose raw Amazon content as an open API (EU database-right + Amazon ToS line, §11).
- **Not a live-trading / financial-instrument tool.** (Despite shared house design tooling, this is a commerce research app.)

### 1.5 Strategic moat
1. **Egypt-only focus** — nobody else has the data here; the moat *accrues over time* because BSR/price history can only be built by snapshotting from day one (Keepa-quality charts are a function of how early we started).
2. **Honest-estimate methodology** — defensible metrics (rank-velocity, autocomplete-derived demand) that we can explain and stand behind.
3. **EGP + Arabic-native** — the profit calculator encodes Egypt's exact referral/FBA/VAT rules; sentiment understands Egyptian dialect + Franco-Arabic. These are deep, locale-specific investments competitors won't replicate for a "small" market.

---

## 2. Target Users & Jobs-to-be-Done

### 2.1 Primary personas

**P1 — "Karim," the Egyptian arbitrage seller (core user).**
Sells on amazon.eg via FBA/Easy Ship; sources locally and via import. Phone-first, bilingual (thinks in Arabic, reads English product specs). Cash-flow sensitive, ROI-obsessed. *JTBD:* "When I have capital to deploy this week, help me find a product I can buy and resell on amazon.eg at a margin that's actually worth it after every Egyptian fee and VAT — and tell me how confident I should be."

**P2 — "Mona," the sourcing agent / VA.**
Researches products on behalf of multiple sellers. Needs to triage hundreds of candidates fast, export shortlists, and justify picks. *JTBD:* "Help me screen the whole catalog down to a defensible shortlist with the numbers attached, and let me hand it off as a clean CSV/Excel."

**P3 — "Tarek," the rising-trend hunter / dropshipper.**
Chases momentum — wants what's *climbing* before it's saturated. *JTBD:* "Show me what's rising on amazon.eg in the last 24h/7d that isn't already crowded, so I can move first."

### 2.2 Secondary personas
- **P4 — Small brand owner / private-label seller** monitoring their own ASINs + competitors (watchlists, alerts, brand-gating awareness).
- **P5 — Category analyst / agency** building market views (category explorer, brand/seller intel, export).

### 2.3 Core jobs-to-be-done (mapped to features)

| # | Job (user language) | Feature(s) | Module |
|---|---|---|---|
| J1 | "What's selling best right now?" | Best Sellers feed, ordinal sales bands | Discovery |
| J2 | "What are people searching for?" | Estimated-Demand keyword explorer | Demand |
| J3 | "Show me everything about this product + are the reviews any good?" | Product detail + review sentiment | Product |
| J4 | "Find this specific product by name." | Search-by-name | Search |
| J5 | "Will I actually make money on it?" | Profit/Fee calculator (EGP) | Economics |
| J6 | "Which of these is the *best opportunity*?" | Opportunity Score | Intelligence |
| J7 | "Tell me when its rank/price changes." | Watchlists + alerts | Tracking |
| J8 | "What's climbing fast?" | Rising-product / Movers detection | Discovery |
| J9 | "Can I even sell this brand?" | Brand-gating flags | Risk |
| J10 | "Let me work in Arabic." | Full RTL/Arabic mode | Platform-wide |
| J11 | "Let me take this list elsewhere." | CSV/Excel export | Platform-wide |
| J12 | "Has its rank/price trended up or down?" | Historical BSR/price charts | Product |
| J13 | "Who else is selling it / who's the competitor?" | Competitor & seller view | Competition |

---

## 3. Data Source Map (the spine of the product)

Every feature in §5 cites one of these sources. This table is the canonical reference for *what is real, what is modeled, and what the free/scraping limit is.*

| Src ID | Source | What it yields | Refresh ceiling | Free/scraping limitation (hard truths) |
|---|---|---|---|---|
| **DS-BS** | `amazon.eg/-/en/gp/bestsellers/<cat>` (Best Sellers list) | Rank badge, ASIN, title, EGP price, rating, review count, image, /dp/ link | Amazon updates ~hourly; we poll **every 1–3h** | **Lazy-load**: only ~30 of 50 cards in initial HTML; rest hydrate on scroll → needs headless browser or AJAX-fragment replay. **503/CAPTCHA** from datacenter IPs (verified). No BSR number, brand, or seller on the card. Thin EG categories may return **<50 items**. Browse-node IDs not published → must harvest from live left-nav. |
| **DS-MS** | `amazon.eg/-/en/gp/movers-and-shakers/<cat>` | Same fields + 24h rank-gain badge (`+1,234%` / "was #X") | Amazon ~hourly; poll **hourly** | Same anti-bot + lazy-load as DS-BS. Confirms momentum, not volume. Path existence on .eg beyond bestsellers **not fully verified** — confirm live. |
| **DS-AC** | `completion.amazon.com/api/2017/suggestions?mid=ARBP9OOSHTCHU&alias=aps&prefix=…` (autocomplete) | Ranked query-completion strings (the demand proxy) | On demand; **daily** tracked-term refresh + **weekly** full seed sweep | **No volume numbers** — ordinal rank only. Returns ~10/query. Needs **browser-like UA + session-id + cache-buster** or array comes back **empty** (verified empty from bare server fetch). `lop=ar_EG` for Arabic; Arabic prefixes must be UTF-8 encoded. Ordering may be personalized if session/customer IDs sent. |
| **DS-PD** | `amazon.eg/-/en/dp/<ASIN>` (product detail) | Title, EGP price, brand, avg rating, **total review count**, rating histogram, seller/sold-by + seller ID, availability, **BSR (when present)** | **Price 6–24h**; static attrs **weekly** | **503/CAPTCHA** (verified). **BSR frequently absent** on .eg listings (per-category, not verified). Selector drift (build-hash classes rotate). |
| **DS-RV** | `amazon.eg/-/en/product-reviews/<ASIN>/` | Per-review: star, title, body, date, verified badge, helpful votes, reviewer name | **Weekly** per tracked ASIN (or on-demand) | **Pagination cap**: logged-out ~5 pages (~50 reviews; was 100). Star-filter + sort passes expand to **~300–500 max** reachable free. **Login wall growing** — full/deep reviews increasingly gated; totals + histogram remain visible logged-out. Reviews are **mixed Arabic/English/Franco-Arabic** regardless of page locale. |
| **DS-SR** | `amazon.eg/-/en/s?k=<query>` (search SERP) | Per-result ASIN, title, EGP price, rating, review count, thumbnail, sponsored flag, DOM-rank | On demand (cache 15 min) | **503 to plain fetch** (verified) → needs headless browser. Sponsored results pollute organic rank. |
| **DS-FEE** | `sell.amazon.eg/pricing` (fee schedule) | Referral % per category, tier breakpoints, FBA EGP ladder, storage rate, VAT note | **Weekly** re-scrape | Single dynamic page; rates change (revised 2025, promos into mid-2026) → store as **versioned, editable config with as-of date**, never hard-code. Some FBA cells must be **spot-confirmed**. |
| **DS-ROBOTS** | `amazon.eg/robots.txt` | Allow/deny path families + named-bot blocklist | Per-crawl re-fetch | `/dp/` not broadly disallowed to generic UA, **but** recognized scraper/AI UAs sit in `Disallow: /`. No published Crawl-delay. Re-pull verbatim before relying on specific paths. |
| **DS-DERIVED** | **Our own snapshot store** (time-series of DS-BS/MS/PD) | BSR history, price history, rank-velocity, demand trend | Built continuously from the above | **History only accrues from launch forward** — no backfill exists. Early users see short charts. |
| **DS-MODEL** | **Computed** (BSR→sales power law, opportunity scoring, sentiment) | Sales bands, unit estimates (gated), scores, sentiment, themes | On compute | **No EG calibration data** → published A/B coefficients are **US/Books-only**, ~5× cross-category error; treat unit numbers as order-of-magnitude. Thin EG categories amplify rank noise. |
| **DS-PAAPI** *(optional, post-MVP)* | Product Advertising API 5.0, Egypt locale | Clean title/price/image/ASIN/availability, zero ban risk | Per Associates quota | Requires approved **Amazon Associates** account; quota tied to affiliate sales; **no review text**. Legal/ToS-clean fallback for catalog fields only. |

---

## 4. System Architecture (free-stack summary, informs features)

*Engineering detail lives in a separate tech spec; this is the product-relevant shape.*

- **Scraper tier (Crawlee + TypeScript):** Cheerio HTTP path first (cheap), Playwright + stealth fallback only for JS-gated/blocked pages. TLS impersonation (curl_cffi-equivalent) is the #1 free anti-block lever (~2% → ~94% success). Poisson-jittered pacing (~1 req / 4–6s, single warm IP), aggressive caching, exponential backoff + kill-switch on CAPTCHA. Residential/Egypt IP is effectively mandatory for sustained volume — a true $0 plan is fragile; budget ~$2–5/mo residential as the first paid upgrade. Firecrawl free tier (1,000 credits/mo, stealth = 5/page) as a managed bridge.
- **Scheduler:** BullMQ + Redis (real host) or pg_cron / GitHub Actions cron (zero-infra, best-effort, 5-min floor). Workers run **outside** the web app process.
- **Store:** Postgres/Supabase. Immutable timestamped snapshots `(snapshot_ts, list_type, category_node, lang, rank, asin, bsr, price_egp)` power all history/derived metrics.
- **NLP service (CPU, batch/nightly):** HuggingFace transformers — MARBERTv2 (Arabic/dialect) + DistilBERT-SST2 / twitter-roberta (English), routed by per-review language detection; KeyBERT/BERTopic for themes. All free/open weights, ~1–2 GB RAM.
- **Web app:** Next.js (App Router) + shadcn/ui + Tailwind (logical properties for RTL) + Recharts. House rule: shadcn-first, restrained GSAP only (reduced-motion respected), tabular-nums, deltas use arrow+color (never color alone).

---

## 5. Full Feature List by Module

Legend per feature: **Data source** (from §3) · **Free/scraping limitation** · **Honesty/UX note** where the estimate must be labeled.

### Module A — Discovery (Best Sellers & Movers)

**A1. Best Sellers feed (daily / weekly / monthly).**
Ranked product lists per category and overall; toggle the **time window** (Today / 7d / 30d). "Today" = latest snapshot; weekly/monthly = aggregated/median rank over the window from our store (suppresses single-snapshot spikes).
- *Data source:* DS-BS (live list) + DS-DERIVED (windowed aggregation).
- *Limitation:* Amazon's own list reflects ~24–48h; true daily/weekly/monthly **roll-ups are ours**, only as deep as our history. Lazy-load means we must headless-render to get the full 50/100. Thin categories may show <50.
- *Honesty note:* "Most-selling" badge tooltip: *"Ranked by Amazon Best Sellers position (relative popularity), not unit sales."*

**A2. Movers & Shakers (rising) feed.**
Amazon's biggest 24h rank gainers per category, surfaced directly, with rank-change arrows + % badges.
- *Data source:* DS-MS.
- *Limitation:* Hourly refresh; momentum ≠ volume (a 30/day product can outrank a 200/day one). `.eg` path beyond `/gp/bestsellers` not fully verified — fall back to our own DS-DERIVED velocity if the path 503s/404s.

**A3. Sales-band indicator (ordinal, not units).**
Each product gets a **Very High / High / Moderate / Low** band derived from log(BSR) percentiles *within its category* from our snapshot history — never a cross-category raw-BSR comparison.
- *Data source:* DS-DERIVED + DS-MODEL.
- *Limitation:* Requires accumulated per-category history to set percentiles; cold-start categories show "Insufficient data."
- *Honesty note:* Band, not a number. Optional unit estimate is gated behind A4.

**A4. (Gated) rough unit/revenue estimate.**
Behind an explicit "Show rough estimate" reveal: `Daily ≈ A·BSR^B` with **category-specific, editable** coefficients, shown as a **range (±50%+)** with a **Low/Med/High confidence chip**, the underlying BSR, and snapshot time.
- *Data source:* DS-MODEL (power law) + DS-PD (BSR).
- *Limitation:* **No EG calibration** — coefficients are US/Books-derived; cross-category error ~5×; thin categories worse. **By construction "Not verified" for EG.**
- *Honesty note:* Label verbatim: *"Estimated — modeled from public rank, not actual sales."* Showing a bare "X units" point value = Critical defect.

**A5. New Releases / Most Wished For (optional, v2).**
If `.eg` exposes these paths (unverified), mirror as additional discovery feeds.
- *Data source:* DS-BS-family. *Limitation:* path existence unconfirmed on .eg.

### Module B — Demand (Estimated-Demand Keyword Explorer)

**B1. Estimated-Demand keyword explorer.**
Searchable, sortable table of harvested queries with a **0–100 Demand Score** (not search volume), 30d/90d trend sparkline, and the top ASINs each query surfaces.
- *Data source:* DS-AC (autocomplete) + DS-PD/DS-SR (matching products) + DS-DERIVED (trend).
- *Limitation:* Ordinal proxy only; needs browser-like session or empty results; English vs Arabic via `lop`. Personalization risk if session IDs included.
- *Honesty note:* Column header tooltip: *"Relative interest from autocomplete ordering — not real search volume."*

**B2. Demand-score methodology (transparent).**
`DemandScore = 0.5·normalized_autocomplete_score + 0.3·normalized_inverse_median_BSR_of_top_matches + 0.2·normalized_riser_signal`. Autocomplete score = base 100 apportioned by the **prefix length at first appearance** × **position factor** (top=1.0 → tail≈0). An info panel exposes this formula to the user (trust through transparency).
- *Data source:* DS-AC + DS-MODEL.
- *Limitation:* Weights are heuristic, not empirically tuned to EG; presented as relative score.

**B3. Seed-expansion harvester (background).**
Iterates seeds (category names, brands, product nouns) × `[a–z, 0–9, core Arabic letters]` suffixes, dedupes, recurses on frequent stems; frequency = co-occurrence across distinct seed queries = relative-popularity signal.
- *Data source:* DS-AC.
- *Limitation:* ~350 unique suggestions/seed; throttle 1–3 req/s + jitter; soft (undocumented) rate limit.

**B4. Bilingual demand (AR + EN).**
Run harvest in both `lop=ar_EG` and English; show a language toggle and a "bilingual" merged view.
- *Data source:* DS-AC. *Limitation:* canonical Arabic `lop` value (`ar_EG` vs `ar_AE`) not fully verified — make configurable.

**B5. Keyword→product bridge.**
From any query, jump to its live SERP results (ASIN/price/rating/sponsored flag) to map demand to concrete sourcing targets.
- *Data source:* DS-SR. *Limitation:* SERP 503s to plain fetch → headless; sponsored noise flagged.

### Module C — Product (Detail + Reviews + History)

**C1. Product detail page.**
Hero (image carousel, title, brand, EGP price, BSR if present, avg rating, **total review count**, seller badges, availability) + spec block.
- *Data source:* DS-PD. *Limitation:* 503 risk; BSR often absent; selector drift (wrap each selector with fallbacks + null-rate alerting).

**C2. Review intelligence — count + actual written reviews.**
Total review count + the **actual review text** we can reach (deduped across star/sort passes), each with star, date, verified badge, helpful votes, detected language tag.
- *Data source:* DS-RV. *Limitation:* **Hard cap ~300–500 reviews free**; growing **login wall** for deep reviews; we show "Showing N of M (free-access limited)" honestly.

**C3. Sentiment (Arabic + English + Franco-Arabic).**
Per-review and aggregate sentiment (positive/neutral/negative), routed by language: MARBERTv2 for Arabic/Masry, DistilBERT/twitter-roberta for English; Arabizi transliterated before scoring; cross-checked against star rating (1–2★ + "positive" = flagged).
- *Data source:* DS-RV + DS-MODEL (NLP). *Limitation:* No amazon.eg sentiment benchmark exists → accuracy unverified until validated on ~200 hand-labeled EG reviews; sarcasm/code-switch hard.
- *Honesty note:* Show a "model confidence / coverage" indicator and the % of reviews successfully language-routed.

**C4. Pros/Cons + theme extraction.**
Extractive, deterministic: KeyBERT on positive-set → **Pros**, negative-set → **Cons/complaints**, each with a real evidence quote, mapped to fixed Egypt-relevant aspect buckets (**Quality, Price/EGP Value, Shipping/Delivery, Authenticity/Counterfeit, Packaging, Seller/Service, Battery, Sizing**); per-aspect % positive.
- *Data source:* DS-RV + DS-MODEL. *Limitation:* Quality scales with review count reachable (C2 cap); thin-review products yield sparse themes.

**C5. Historical BSR + price charts (Keepa-style).**
Dual-axis time-series: left = EGP price, right = BSR (lower=better); series toggles; range chips Day/Week/Month/3M/Year/All; BSR plotted on **log axis**; risers badged **"sustained" vs "spike."**
- *Data source:* DS-DERIVED (our snapshots). *Limitation:* **History only from launch** — no backfill; early charts are short; gaps where scrapes 503'd are shown honestly (not interpolated as fact).

**C6. Rating histogram.**
Per-star distribution from the detail page (logged-out-safe even when individual reviews are gated).
- *Data source:* DS-PD. *Limitation:* none significant; available even under review login wall.

### Module D — Search

**D1. Search by product name.**
Free-text (AR/EN) search → live SERP-backed results with ASIN/price/rating/review-count/thumbnail/sponsored flag; click-through to C1.
- *Data source:* DS-SR. *Limitation:* 503 to plain fetch → headless render; cache 15 min; sponsored rows labeled.

**D2. Search by ASIN / paste-URL.**
Paste an ASIN or `/dp/` URL to jump straight to product detail.
- *Data source:* DS-PD. *Limitation:* anti-bot per fetch.

**D3. Saved searches.**
Persist a query + filter set; re-run on demand or on schedule; diff against last run ("3 new products matched").
- *Data source:* DS-SR + DS-DERIVED. *Limitation:* scheduled re-runs consume scrape budget → capped per user-tier.

### Module E — Economics (Profit / Fee Calculator)

**E1. EGP profit/fee calculator (referral + FBA + VAT → margin & ROI).**
Two-pane: inputs (Sale Price *VAT-inclusive*, COGS, inbound shipping/unit, category, size-tier/weight/volume, fulfilment method FBA/EasyShip/MFN, months-in-storage, monthly subscription, units/month, ad cost/unit, returns %, VAT-registered toggle) → live result card (**Net Profit/unit, Margin %, ROI %, break-even price**) + a **fee waterfall**.
- *Data source:* DS-FEE (versioned config) + user inputs. *Limitation:* Inbound freight to EG FCs is **not published** → user-entered; FBA cells need spot-confirm; rates change → editable config with as-of date.

**E2. Egypt fee engine (the locale moat).** Encodes exactly:
- Referral: flat categories `max(rate·P, 5 EGP)`; **tiered** categories with EGP breakpoints (Electronics Accessories 15%≤1,000 + 8% above; Jewelry 19%≤5,000 + 5% above; Grocery 4%≤250 + 10% above, **no minimum**).
- FBA: EGP ladder by size-tier/weight with the **~350 EGP price-band** split (low/high column).
- **VAT 14% added on top of every Amazon fee** (the thing most calculators get wrong); customer prices are **VAT-inclusive** so a VAT-registered seller's true revenue = `P/1.14`; registered sellers reclaim input VAT on fees, non-registered don't.
- Storage ~4 EGP/cu.ft/mo; Pro-plan currently 0 EGP (promo).
- Break-even solved per VAT-registration status; **numerically (bisection)** for tiered categories; guard for "can never break even."
- *Data source:* DS-FEE. *Limitation:* per-category nuances (referral on item-vs-item+shipping) **not isolated for EG** — verify; VAT-reclaim treatment flagged "confirm with EG tax advisor."

**E3. Calculator ↔ product binding.**
Open the calculator pre-filled from any product (price, category inferred) for one-click profitability on a real ASIN.
- *Data source:* DS-PD + E2. *Limitation:* category→referral-rate mapping may be ambiguous for some listings → user confirms category.

### Module F — Intelligence (Opportunity & Scoring)

**F1. Opportunity Score (1–10).**
Composite of **demand** (BSR band + Demand Score) ÷ **competition** (active-seller count, review-count saturation, rating) × **economics** (margin/ROI from E1 defaults) × **momentum** (rank-velocity). Shown 1–10 with a breakdown of each driver's contribution.
- *Data source:* DS-DERIVED + DS-MODEL + DS-PD. *Limitation:* Inputs are themselves estimates → score is **relative, not absolute**; transparent breakdown required.
- *Honesty note:* Tooltip: *"A relative, modeled score combining estimated demand, competition, and margin — not a guarantee."*

**F2. Competition tier (Very Low → Very High).**
5-tier categorical from seller count + review saturation + price dispersion.
- *Data source:* DS-PD (seller, reviews) + DS-SR. *Limitation:* active-seller count requires All-Offers-Display scrape (JS-gated); may be partial.

**F3. Rising-product detection (our own Movers logic).**
`Riser score = Δlog(BSR)` over 1d / 7d-slope / 30d-slope; requires a minimum prior BSR (exclude entries from null/very-deep ranks to avoid divide-by-noise) and **persistence ≥2 snapshots** (daily) or regression-slope sign (weekly/monthly) to suppress one-off spikes. Corroborated by the live DS-MS feed.
- *Data source:* DS-DERIVED + DS-MS. *Limitation:* needs same-hour daily snapshots; ideally 2–4×/day for tight daily risers (anti-bot budget permitting).
- *Honesty note:* BSR sparkline (log axis) shown so spike vs sustained is visually obvious; "sustained"/"spike" badge.

**F4. Opportunity quadrant (demand × competition scatter).**
Dashboard scatter plotting candidates by estimated demand (y) vs competition (x); the low-competition/high-demand quadrant is the sourcing sweet spot.
- *Data source:* DS-DERIVED + DS-MODEL. *Limitation:* axis values are estimates → quadrant is directional.

**F5. Low-data / thin-category flag.**
Any product/category with too few competing ASINs or sparse history is badged *"Few competing listings — rank is volatile; treat estimates with extra caution."*
- *Data source:* DS-DERIVED. *Limitation:* this **is** the mitigation for EG's thin-marketplace noise.

### Module G — Competition (Competitor & Seller View)

**G1. Seller view.**
For a given seller (from a product's sold-by + seller ID): their visible product set, est. revenue band, FBA/FBM mix, rating.
- *Data source:* DS-PD (seller ID join) + DS-SR. *Limitation:* seller storefront scraping is JS-heavy + anti-bot; coverage partial; est. revenue is modeled.

**G2. Competitor offers (other sellers on an ASIN).**
All-Offers-Display panel: competing sellers, prices, ships-from/sold-by, seller rating.
- *Data source:* DS-PD (AOD fragment). *Limitation:* AOD loads via JS → headless; may be rate-limited separately.

**G3. Brand/seller intelligence lite (v2, SmartScout-style).**
Brand table filterable by est. revenue band, # sellers, dominant-seller share; brand dashboard with subcategory donut.
- *Data source:* DS-DERIVED aggregation. *Limitation:* all revenue figures modeled/estimated; heavy scrape cost.

### Module H — Risk

**H1. Brand-gating flags.**
Heuristic flag when a product/brand is likely **gated/restricted** for new sellers (signals: single dominant seller = Amazon/brand, brand on known-gated lists, "sold by" concentration).
- *Data source:* DS-PD (seller concentration) + curated brand list. *Limitation:* **No public gating API** — this is a *heuristic warning*, explicitly labeled *"possible gating — verify in your Seller Central before sourcing."* False pos/neg expected.

**H2. Authenticity/counterfeit theme surfacing.**
Elevate the "Authenticity/Counterfeit" review aspect (C4) as a risk flag when negative mentions exceed a threshold (common EG concern: مقلد / fake).
- *Data source:* DS-RV + DS-MODEL. *Limitation:* depends on reachable review volume.

**H3. Estimate-confidence + freshness everywhere.**
Global pattern: every estimated metric carries a confidence chip + "as of <timestamp>" + raw evidence link.
- *Data source:* cross-cutting. *Limitation:* freshness bounded by scrape cadence + any 503 gaps.

### Module I — Tracking (Watchlists & Alerts)

**I1. Watchlists / "My Lists."**
Save ASINs into named lists; push selected products from any grid into a list; lists drive prioritized scrape cadence.
- *Data source:* DS-DERIVED + user data. *Limitation:* tracked-ASIN count capped per tier (scrape budget).

**I2. Rank & price alerts.**
Threshold alerts (BSR improves past X, price drops below Y, rank-velocity spike, new competitor on ASIN, review-count jump). Delivered in-app + email/push.
- *Data source:* DS-DERIVED diffs. *Limitation:* alert latency = snapshot cadence (hours, not real-time); promise no faster than data refresh.

**I3. Rising-into-watchlist automation.**
Auto-surface F3 risers matching a saved filter into a "Watching" queue.
- *Data source:* DS-DERIVED. *Limitation:* same cadence bound.

### Module J — Category Explorer

**J1. Category/browse-node explorer.**
Navigate the harvested category tree; each node shows its Best Sellers, Movers, demand themes, avg price band, competition tier.
- *Data source:* DS-BS left-nav harvest + DS-DERIVED. *Limitation:* node IDs harvested live (not published); tree may be incomplete; some nodes thinly populated.

### Module K — Platform-Wide

**K1. CSV / Excel export.**
Export any grid (products, keywords, movers, watchlist, review themes) to CSV/XLSX with all visible + estimated columns, each estimate column suffixed `(est.)` and a header row noting methodology + snapshot time.
- *Data source:* whatever feeds the grid. *Limitation:* exports are a **private cache** — UI reminds users not to redistribute (ToS/DB-right line).

**K2. Full Arabic / RTL support.**
`dir=rtl` when lang=ar; Tailwind logical properties (ps/pe/ms/me) so grid + filter rail mirror; Arabic-capable font (IBM Plex Sans Arabic / Cairo); `Intl.NumberFormat('ar-EG')` with Arabic-Indic numeral option; EGP formatted `ج.م` / `EGP`; delta arrows + sparklines mirror correctly; charts keep LTR time-axis with a note (decided per design QA). EN/AR toggle persisted per user.
- *Data source:* cross-cutting. *Limitation:* review **content** stays in its original language regardless of UI locale (detect per-review).

**K3. Saved filters & presets.**
Reusable filter sets + one-click presets ("High Demand," "Low Competition," "Good ROI," "Rising").
- *Data source:* cross-cutting.

**K4. Freshness & data-source transparency panel.**
A global "Data & Methods" view documenting each source, cadence, and limitation (this spec's §3, user-facing) — core to the honest-estimate positioning and legal posture.
- *Data source:* meta. *Limitation:* none.

---

## 6. Screen-by-Screen Information Architecture

App Router routes; each screen lists its purpose, key shadcn components, KPIs, and primary data sources.

### 6.1 Global shell
- **Top bar:** global search (D1/D2), marketplace badge (EG), **EN/AR + currency toggle**, freshness indicator ("data as of…"), user menu.
- **Left nav (mirrors in RTL):** Dashboard · Products · Keywords · Movers · Categories · Calculator · Watchlists · Alerts · Brands *(v2)* · Settings · Data & Methods.
- **Cross-cutting:** Skeleton loaders, Sonner toasts, estimate-confidence chips, "est." prefixes, tabular-nums, reduced-motion-safe.

### 6.2 Routes

**`/dashboard` — Opportunity Overview.**
*Purpose:* the "what should I look at today" cockpit.
*Contains:* KPI stat cards (Tracked ASINs · New Risers Today · Avg Opportunity Score · Categories Scanned); **demand × competition scatter** (F4); "Top Movers (24h)" list (A2/F3); "Trending Keywords" (B1); "Watchlist Alerts" feed (I2).
*Components:* Card, Badge, Tabs, Recharts ScatterChart, Sparkline.
*Sources:* DS-DERIVED, DS-MS, DS-AC.

**`/products` — Product Database (core grid).**
*Purpose:* screen the catalog to a shortlist.
*Contains:* dense sortable grid (thumbnail, Title, ASIN, Brand, Category, Price EGP, **Sales Band** (A3) + gated est. units (A4), BSR + 30/90d trend sparkline, Review Count, Rating, Review Velocity, Sales-to-Reviews, Active Sellers, Seller Type, Date First Available, **Opportunity Score**, Competition tier, trend sparkline). Left filter **Sheet**: min-max NumberRange pairs (Price, BSR, Sales, Reviews, Rating, Weight), multi-select Comboboxes (Category, Seller Type), Include/Exclude keyword Inputs, Date-First-Available range, **preset chips** (K3). Sticky header + sticky image/title column, column show/hide DropdownMenu, row Checkbox → "push to Watchlist / Calculator / Compare," server pagination, **CSV/Excel export** (K1).
*Components:* TanStack Table + shadcn Table primitives, Sheet, Slider, Combobox (Command+Popover), Checkbox, DropdownMenu, Button, Pagination.
*Sources:* DS-DERIVED, DS-PD, DS-MODEL. *Honesty:* every sales/revenue cell `(est.)` + tooltip.

**`/products/[asin]` — Product Detail.**
*Purpose:* deep-dive a single product + decide.
*Contains:* hero (carousel, title, brand, EGP price, BSR if present, rating, **review count**, seller badges, availability) → **Keepa-style dual-axis history chart** (C5) with series toggles + range chips → **rating histogram** (C6) → **review intelligence panel** (C2): sentiment summary (C3), **Pros/Cons aspect table** (C4), recent written reviews list with language tags + verified badges + helpful votes → **profitability mini-card** (E3, opens full calculator) → **competitor offers** (G2) → "possible brand-gating" flag (H1).
*Components:* Card, Carousel, ToggleGroup (ranges), Recharts LineChart (dual-axis, log BSR), Tabs, Badge, HoverCard, progress bars (histogram).
*Sources:* DS-PD, DS-RV, DS-DERIVED, DS-MODEL.

**`/keywords` — Estimated-Demand Explorer.**
*Purpose:* find demand, map to products.
*Contains:* search Input (AR/EN toggle) → table (Query, **Demand Score 0–100**, 30d/90d trend sparkline + %, top matching ASINs, est. competition); **methodology info panel** (B2); reverse-ASIN mode (paste ASIN → its keyword set); 12-month seasonality strip.
*Components:* Input, Table, Sparkline, Badge, Tooltip, BarChart (seasonality).
*Sources:* DS-AC, DS-SR, DS-DERIVED. *Honesty:* "not search volume" tooltip on the score column header.

**`/movers` — Trend / Movers.**
*Purpose:* momentum hunting.
*Contains:* tabbed (Movers & Shakers / Risers-by-our-velocity / New Releases*) ranked lists with **rank-change arrows (▲▼ + delta)**, % badges (green up/red down), BSR sparklines, "sustained vs spike" badges (F3); category Select filter.
*Components:* Tabs, Table/List, Badge, Sparkline, Select.
*Sources:* DS-MS, DS-DERIVED. *Note:* New Releases tab only if `.eg` path verified.

**`/categories` — Category Explorer.**
*Purpose:* browse by niche.
*Contains:* category tree nav (harvested nodes) → per-node Best Sellers, Movers, demand themes, avg price band, competition tier, **thin-category flag** (F5).
*Components:* Tree/Accordion nav, Card, Badge.
*Sources:* DS-BS nav harvest, DS-DERIVED.

**`/calculator` — Profit / FBA Calculator.**
*Purpose:* will I make money (EGP).
*Contains:* two-pane — left Form (all E1 inputs incl. VAT-registered toggle) → right live Result Card (Net Profit/unit, Margin %, ROI %, break-even) + **fee waterfall** bar (referral, FBA, storage, **VAT-on-fees line surfaced explicitly**, COGS, shipping). Editable fee-config drawer (E2) with as-of date.
*Components:* Form (Input/Select/Switch), Card, Recharts BarChart (waterfall), Sheet (fee config), Tooltip.
*Sources:* DS-FEE, user inputs.

**`/watchlists` — My Lists.**
*Purpose:* track chosen ASINs.
*Contains:* named lists, each a mini-grid (price/BSR/velocity + last-change), priority-cadence indicator, bulk actions, export.
*Components:* Tabs, Table, Badge, Button.
*Sources:* DS-DERIVED + user data.

**`/alerts` — Alerts Center.**
*Purpose:* manage + view triggers.
*Contains:* alert-rule builder (BSR/price/velocity/new-competitor/review-jump thresholds), channel settings (in-app/email/push), triggered-alerts feed with timestamps.
*Components:* Form, Table, Switch, Badge.
*Sources:* DS-DERIVED diffs. *Honesty:* "alerts fire on data refresh (every few hours), not real-time."

**`/brands` — Brand/Seller Intel (v2).**
*Purpose:* competitor/market view.
*Contains:* brand table (est. revenue band, # sellers, dominant-share, avg price); brand dashboard (revenue, subcategory donut, seller-share bars); seller view (G1) + offers (G2).
*Components:* Table, Card, Donut/Treemap, Bar.
*Sources:* DS-DERIVED, DS-PD.

**`/settings` — Settings.**
*Purpose:* configure.
*Contains:* language (EN/AR) + numeral system, currency display, default fee assumptions (E2 config), tracked-ASIN tier, notification channels, account.
*Components:* Form, Switch, Select, Tabs.

**`/data-and-methods` — Data & Methods (transparency).**
*Purpose:* honesty + legal posture made visible.
*Contains:* user-facing §3 — each source, cadence, limitation; methodology for sales bands, demand score, opportunity score; "what these numbers are and are not."
*Components:* Accordion, Table, Callout.

**`/auth` — Login / Onboarding.**
*Purpose:* entry + expectation-setting.
*Contains:* sign-in; onboarding that **explicitly sets the honest-estimate expectation** and the "we never touch your Amazon account" promise.

### 6.3 Cross-screen interaction spine
Row-select in any grid → **push to Watchlist / open Calculator / add to Compare** (mirrors Helium 10's "send to" pattern). Saved filters + presets persist across `/products`, `/keywords`, `/movers`. Every numeric column right-aligned, tabular-nums; deltas arrow+color.

---

## 7. Master KPI Catalogue (with honesty status)

| KPI | Definition | Source | Status |
|---|---|---|---|
| Price (EGP) | Live listing price, VAT-inclusive | DS-PD/BS/SR | Fact (snapshot) |
| BSR | Best Sellers Rank (per category) | DS-PD/DS-BS | Fact when present; **often absent on .eg** |
| BSR 30/90d trend | Δlog(BSR) slope | DS-DERIVED | Derived (our history) |
| Review Count | Total ratings | DS-PD | Fact (snapshot) |
| Star Rating | Avg stars | DS-PD | Fact (snapshot) |
| Review Velocity | Reviews/month | DS-DERIVED | Derived |
| Sales Band | log(BSR) percentile in category | DS-MODEL | **Ordinal estimate** |
| Est. Monthly Units/Revenue | Power-law model | DS-MODEL | **Estimate, wide bands, gated** |
| Demand Score (0–100) | Autocomplete+BSR blend | DS-AC/DS-MODEL | **Relative proxy, not volume** |
| Demand 30/90d trend | Score time-series | DS-DERIVED | Derived |
| Opportunity Score (1–10) | Demand÷Competition×Margin×Momentum | DS-MODEL | **Relative composite** |
| Competition tier | Sellers+saturation+dispersion | DS-PD/DS-SR | Estimate |
| Riser score | Δlog(BSR) 1d/7d/30d | DS-DERIVED | Derived (defensible) |
| Active Sellers | AOD count | DS-PD | Fact when reachable (JS-gated) |
| Net Profit / Margin / ROI | EGP fee engine | DS-FEE+inputs | Computed from user inputs |
| Sentiment (pos/neu/neg) | NLP per review | DS-MODEL | **Model output, unvalidated on .eg** |
| Aspect % positive | Aspect-bucket sentiment | DS-MODEL | Estimate |

---

## 8. Phasing: MVP → v1 → v2

### MVP — "Honest signals + EGP math" (prove the core loop)
*Goal:* a sourcing user can find selling/rising products, see real reviews + sentiment, and compute true EGP profit — with honest labeling — for a handful of seeded categories.

**In:**
- Scraper foundation: DS-BS, DS-MS, DS-PD, DS-RV, DS-SR (Crawlee + Playwright fallback, caching, anti-bot pacing, snapshot store). Seed ~5 categories (Electronics, Beauty, Home, Office, Mobiles).
- A1 Best Sellers feed (daily window) · A2 Movers feed · A3 Sales bands.
- B1/B2/B3 Estimated-Demand explorer (autocomplete harvester + score) — **the honest "most-searched" answer.**
- C1 Product detail · C2 review count + written reviews · **C3 sentiment (AR+EN)** · C4 pros/cons · C6 histogram.
- C5 BSR/price history chart — **starts accumulating from day one** (short charts at launch, by design).
- D1 search-by-name · D2 ASIN/URL.
- **E1/E2 EGP profit calculator** (full Egypt fee engine — the locale moat; ship this in MVP, it's differentiating and self-contained).
- I1 watchlists · basic I2 price/BSR alerts.
- K1 CSV/Excel export · **K2 Arabic/RTL** (ship bilingual from MVP — it's core positioning, retrofitting RTL later is costly) · K4 Data & Methods.
- Onboarding that sets the honest-estimate + no-account-login expectation.

**Out (deferred):** opportunity scoring, competitor/seller deep view, brand intel, category-tree explorer, advanced alert types, gated unit estimates.

**MVP success criteria:** scraper sustains the seeded categories without sustained blocking; sentiment validated on ≥200 hand-labeled EG reviews (report macro-F1 per language bucket); calculator matches a manual EGP worked example incl. VAT-on-fees; users can export a shortlist.

### v1 — "Intelligence + tracking depth"
*Goal:* turn raw signals into ranked opportunities and proactive tracking.

**Add:**
- F1 Opportunity Score · F2 Competition tier · F3 rising-detection (our velocity, persistence-filtered) · F4 quadrant · F5 thin-category flags.
- A4 gated rough unit/revenue estimates (with full confidence/range UX).
- D3 saved searches · K3 saved filters/presets.
- I2 full alert types (velocity spike, new competitor, review jump) + I3 rising-into-watchlist.
- G1 seller view · G2 competitor offers.
- H1 brand-gating heuristic flags · H2 authenticity risk surfacing.
- J1 category explorer (full harvested tree).
- B4/B5 bilingual demand + keyword→SERP bridge.
- Scale categories beyond the seed set; introduce tracked-ASIN tiers.

### v2 — "Market intelligence + scale + resilience"
*Goal:* breadth, brand-level views, and durability.

**Add:**
- G3 brand/seller intelligence (SmartScout-style: brand DB, revenue bands, share donuts/treemaps).
- A5 New Releases / Most Wished For (if `.eg` paths verified).
- Advanced historical analytics: seasonality detection, multi-product compare, category trend lines.
- **DS-PAAPI** integration as a ToS-clean catalog-field fallback (title/price/image/availability) to reduce scrape load and ban risk (requires Associates approval).
- Optional abstractive review summaries (AraT5/mT5) gated on runtime budget.
- Team/agency features (shared lists, multi-client workspaces for persona P2/P5), audit-friendly export headers.
- Resilience hardening: selector-drift auto-alerting, null-rate monitoring, proxy-pool management, Firecrawl stealth fallback wired in.

---

## 9. Phasing rationale (why this order)
- **Arabic/RTL and the EGP calculator are in MVP, not deferred.** RTL is architecturally invasive (logical properties must be used from the first component); the fee engine is the clearest, most self-contained differentiator and needs no accumulated history.
- **History charts start in MVP even though they're "empty"** — because history is *unbackfillable*; every week of delay is a week of chart depth permanently lost.
- **Scoring/opportunity logic waits for v1** — it depends on having enough snapshot history to set credible percentiles and velocity baselines; shipping it on cold data would produce noise and undermine the honesty positioning.
- **Brand/seller intel waits for v2** — highest scrape cost, most JS-gated, lowest marginal value to the core "what should I source" loop.

---

## 10. Cross-cutting non-functional requirements
- **Honesty enforcement (P0):** estimate labeling, confidence chips, freshness timestamps, raw-evidence links, log-axis BSR charts, "sustained vs spike," thin-category flags. A bare unit number presented as fact is a Critical release-blocker.
- **Anti-bot resilience:** TLS impersonation default; headless only when needed; Poisson pacing; caching; CAPTCHA kill-switch + backoff; selector fallbacks + null-rate alerts.
- **RTL/i18n correctness:** logical properties only; `Intl.NumberFormat('ar-EG')`; per-review language detection independent of UI locale.
- **Performance:** virtualized grids (TanStack), server-side pagination, restrained motion, reduced-motion honored, tabular-nums.
- **A11y:** deltas never color-only; contrast on EGP/Arabic numerals; keyboard nav on grids.

---

## 11. Legal & compliance guardrails (product-level, must ship as behavior)
- **Logged-out only; never attach Amazon credentials.** (The logged-in-automation path is exactly what flips a weak CFAA theory into a live claim — per Amazon v. Perplexity, Nov 2025.)
- **Honor robots.txt programmatically** (re-pull `amazon.eg/robots.txt` verbatim; avoid disallowed path families; do **not** send recognized scraper/AI user-agents, which sit in `Disallow: /`).
- **Rate-limit hard, stop on block** (don't escalate evasion); kill-switch on CAPTCHA/cease-and-desist.
- **Scope to non-personal commercial facts** (ASIN/title/price/availability/rating-count); avoid harvesting reviewer PII where avoidable (Egypt PDPL Law 151/2020 bites on personal data, not prices; personal-use exemption supports the private-sourcing posture).
- **Treat scraped data as a private per-user cache** — short TTL, no republication/resale, no open API exposing raw Amazon content (Amazon ToS "data mining/robots" clause + EU sui-generis database right on re-utilization).
- **Document intent** (personal sourcing, non-commercial) and surface the `/data-and-methods` transparency page.
- *Posture:* low-to-moderate, primarily **contractual** risk at single-user low volume; the realistic enforcement is throttling/IP-block/account-ban, not litigation — most of which user behavior controls.

---

## 12. Open items to verify before/at build (from CONTEXT "notVerified")
1. Numeric **browse-node IDs** for .eg categories (harvest live).
2. Whether `.eg` exposes **Movers & Shakers / New Releases / Most Wished For** at `.com`-equivalent paths (only `/gp/bestsellers` confirmed).
3. Exact **logged-out review-page cap** on `.eg` (5 vs 10) and whether *any* reviews are login-gated.
4. Canonical **Arabic `lop`** value (`ar_EG` vs `ar_AE`) and whether autocomplete populates from a real browser session for EG.
5. **FBA EGP ladder** cells + exact **350 EGP** band cutoff (`<` vs `≤`); whether referral applies to item-only vs item+shipping on `.eg`; **VAT-reclaim** treatment (confirm with EG tax advisor).
6. Per-category **BSR presence** on `.eg`.
7. **Sentiment accuracy** on real `.eg` reviews (hand-label ≥200; no public benchmark exists).
8. Live **selector/build-hash** suffixes (rotate on Amazon deploys — match by prefix + fallbacks).
9. **PA-API Egypt** 2026 Associates eligibility + quota.
10. `amazon.eg/robots.txt` **verbatim** current lines + any added Crawl-delay; whether a locale-specific Conditions of Use page differs from the global COU.

---

**End of specification.** This document is the source of truth for the design-stack build (shadcn-first + restrained GSAP, RTL-ready) and the scraping/NLP/scheduler tech spec. Its non-negotiable through-line: **free data, honest estimates, EGP-true economics, Arabic-native — decision support under disclosed uncertainty, never false precision.**