The skill is loaded. I have comprehensive RESEARCH and VERIFICATION context. No live system to test — this is a feasibility/risk audit of a proposed strategy, so I'll audit the strategy against evidence. I have everything I need to produce the report.

# Feasibility & Risk Audit — FREE / SCRAPING Strategy for an amazon.eg Product-Research App

**Auditor stance:** Strict senior institutional auditor. Assume nothing; cite evidence; flag "Not verified." This audit covers ONLY the free/scraping data strategy (no paid data APIs, no paid proxies as baseline). Evidence is drawn from the supplied RESEARCH dossier and the four adversarial VERIFICATION checks (live-tested 2026-06-08).

---

## 1. Executive Summary

The free/scraping strategy is **technically buildable but evidentiarily fragile**, and its fragility is concentrated in exactly the two requirements the user most likely cares about: "most searched" and "most selling." Live verification on 2026-06-08 produced three load-bearing findings that the build must be designed around:

- **Datacenter/$0 fetches of amazon.eg return HTTP 503 on the first request** (Best Sellers root and `/electronics` both confirmed). A pure $0, single-datacenter-IP recurring scraper is **confirmed non-viable** for a reliable feed.
- **The Amazon autocomplete endpoint accepts the Egypt marketplace ID but returns an EMPTY suggestions array for Egypt**, while the identical call for the US marketplace returns 10 rich, current suggestions. The "most searched" demand proxy via autocomplete is **not currently obtainable** for `.eg` through the documented endpoint.
- **BSR→units and autocomplete→demand are ordinal signals at best, and on amazon.eg they are uncalibratable** (no Egyptian ground-truth sales panel; the paid tools that define published accuracy figures do not cover Egypt). Any absolute "units sold/month" number is **misleading by construction**.

None of this kills the product, but it forces a **scope correction**: the app must reposition from "we tell you how much sells and what people search" to "we surface Amazon's own public Best Sellers / Movers & Shakers rankings, track them over time, and estimate relative demand — with explicit uncertainty." The profit calculator and the review-sentiment pipeline are the two **genuinely solid** pillars and should anchor the product's credibility.

**Overall Risk Rating: HIGH** (driven by data-accuracy and operational-sustainability risk, not by build complexity).

---

## 2. Overall Risk Rating

| Dimension | Rating | Basis |
|---|---|---|
| Technical feasibility (can it be built) | Medium | Stack is mature (Crawlee/Playwright/curl_cffi); selectors documented. |
| Operational sustainability at $0 | **Critical** | Live 503 on first datacenter request; residential IP effectively mandatory. |
| Data accuracy / non-misleading display | **Critical** | BSR→units uncalibratable for EG; autocomplete EG empty. |
| Legal / ToS | Medium | Clear ToS breach; low litigation risk for personal use; rises sharply on commercialization/PII. |
| Build complexity (calculator, sentiment) | Low–Medium | Calculator is deterministic; sentiment stack is free/CPU-OK. |

---

## 3. Release Decision

**CONDITIONAL GO** — for a **personal-use, low-volume, uncertainty-disclosed** build, conditioned on the explicit gating items in §19. **NO-GO** for any version that (a) presents estimated units/revenue as fact, (b) is commercialized/redistributed on scraped data, or (c) depends on autocomplete for the "most searched" feature without a working data source.

---

## 4. Scope Reviewed

- The four user requirements mapped to free data sources: (R1) "most searched" demand proxy; (R2) "most selling / rising" via BSR + Best Sellers/Movers & Shakers; (R3) profit/FBA/VAT calculator for amazon.eg; (R4) Arabic+English review sentiment & themes.
- Free/scraping data acquisition: amazon.eg Best Sellers, Movers & Shakers, search SERP, product detail, reviews, autocomplete endpoint.
- Anti-bot reality, sustainable $0 cadence, first paid upgrade.
- Legal/ToS posture (Amazon COU, robots.txt, CFAA/hiQ/Meta v. Bright Data, Amazon v. Perplexity, Egypt PDPL 151/2020 & Cybercrime 175/2018).
- Data-accuracy caveats and required UI uncertainty disclosures.

## 5. What Was Not Verified

Auditor must be explicit — the following are **Not verified** and carry residual risk:

1. **End-to-end live load of any amazon.eg list/detail/review page** — every datacenter fetch returned 503. All per-field CSS selectors are cross-validated from `.com`/`.ae` scraping guides, **not confirmed on live `.eg` HTML**.
2. **Whether a real Egyptian-geo browser session populates autocomplete for EG** — the documented endpoint returns empty; the authoritative DevTools-XHR capture from amazon.eg's own search box was beyond the research budget.
3. **Numeric browse-node IDs for `.eg` categories** — not published; must be harvested live.
4. **Whether `.eg` populates a full 50/100 items per category** — thin-catalog categories may return short lists.
5. **Logged-out review-page cap on `.eg` (5 vs 10 pages)** and exact login-gating threshold.
6. **Any BSR→units coefficients for `.eg` or any non-Books category** — all published power-law A/B values are US/Books.
7. **Exact anti-bot thresholds** (req/min before block) and whether `.eg` is softer than `.com` — only the first-request 503 is confirmed.
8. **`.eg`-localized Conditions of Use** (page 503'd) and **verbatim current robots.txt** (summarized, not captured line-by-line).
9. **FBA fee ladder cells and the ~350 EGP price-band cutoff** — read from a dynamic pricing page; spot-confirm before hard-coding.
10. **Sentiment model accuracy on real `.eg` reviews** — published F1s are on tweets, not amazon.eg.

---

## 6. Requirement-by-Requirement Feasibility (Brutally Honest)

### R1 — "Most searched" demand proxy

| Aspect | Verdict | Evidence |
|---|---|---|
| Autocomplete endpoint as the demand source | **NOT achievable today for `.eg`** | VERIFICATION: completion.amazon.com accepts `mid=ARBP9OOSHTCHU`, returns valid `responseId` but `{"suggestions":[]}` across 4 prefix/locale variants; identical US call returns 10 rich suggestions (decisive control, same tool/minute, only `mid` changed). |
| True search volume (numeric) | **NOT achievable** (any source) | Amazon publishes no volume numbers anywhere; autocomplete is ordinal/inferential even when populated. |
| Demand *proxy* via Best Sellers / Movers & Shakers ranking | **Achievable** (this is the fallback) | Both list pages confirmed live at the `.eg` URLs; ranking is a genuine, EG-specific demand signal. |
| Search-refinement / SERP-derived interest | Achievable but bot-gated | SERP returns 503 to plain fetch; needs headless + residential. |

**Brutal-honesty statement:** The headline "most searched on amazon.eg" feature, as users will imagine it (a keyword list with volumes), is the **weakest** part of the entire plan. The autocomplete channel — the cleanest free method — is **returning nothing for Egypt right now**, and even if it populated, it would be an ordinal popularity proxy with **no numbers**. The honest substitute is "trending products/categories" derived from Best Sellers + Movers & Shakers rank movement, plus optionally Google Trends `geo=EG` as a cross-platform (not Amazon-native) hint. **Do not ship a "search volume" number.**

**Required next step before committing to R1:** capture the live XHR that amazon.eg's own search box fires from an Egyptian-geo browser session (DevTools Network). This is the single test that determines whether keyword-level demand is recoverable at all.

### R2 — "Most selling / rising"

| Aspect | Verdict | Evidence |
|---|---|---|
| Best Sellers list (ordinal rank, EG-specific) | **Achievable** | `https://www.amazon.eg/-/en/gp/bestsellers` confirmed; ~50/page, top-100 over 2 pages. |
| Movers & Shakers ("rising") | **Achievable** | `.../gp/movers-and-shakers` confirmed; it IS the rising metric (24h rank % gain). |
| Per-product BSR snapshot | Achievable (with scraping infra) | BSR in product-info table; **frequently absent on `.eg`** (Not verified per category). |
| "Rising" via your own Δlog(BSR) snapshots | **Achievable & most defensible** | Reproduces M&S logic; needs no sales model. |
| Absolute units/month from BSR | **NOT achievable defensibly** | VERIFICATION: uncalibratable for EG; low-volume items show ±100% error even on calibrated US tools; same BSR = 10x unit spread across categories. |

**Brutal-honesty statement:** "Most *selling*" must become "**top-ranked** and "**rising in rank**." Rank and rank-velocity are real, scrapeable, EG-specific, and defensible. Unit/revenue *numbers* are not — Egypt is the **worst case** for BSR→units because the paid tools that calibrate these models explicitly exclude the MENA cluster (Jungle Scout cannot connect to `.eg`; its Sales Estimator excludes AE/SA/TR), so there is no panel to fit a curve and no way to measure your own error. **Egypt data thinness amplifies this**: sparse sub-categories mean a handful of sales swings rank violently, so single-snapshot BSR is low-trust — only multi-day scraped trends are usable.

### R3 — Profit / FBA / VAT calculator

| Aspect | Verdict | Evidence |
|---|---|---|
| Referral fees per category (incl. tiered) | **Achievable** | Fee schedule read from `sell.amazon.eg/pricing`; tier math specified (Electronics Accessories 15%/8% @1,000 EGP; Jewelry 19%/5% @5,000; Grocery 4%/10% @250). |
| FBA fee by size/weight/price-band | **Achievable** (with caveats) | EGP ladder + ~350 EGP band documented; **spot-confirm cells** (dynamic page). |
| 14% VAT on fees + VAT-inclusive consumer price | **Achievable & critical** | Amazon explicitly adds 14% VAT on all fees; consumer price is VAT-inclusive → registered seller revenue = price/1.14. |
| Inbound shipping / import duty | User-entered only | Not published by Amazon; de minimis 0 EGP. |

**Brutal-honesty statement:** This is the **strongest, most trustworthy** pillar — it is deterministic math on a public, EG-specific fee schedule, not a statistical estimate. The two failure modes are **not** feasibility but **correctness**: (1) most calculators get the **14% fee-VAT and output-VAT strip wrong** — this is the #1 thing to get right; (2) fee rates **change** (documented 2025 revisions + a promo running into mid-2026), so rates must be **editable config with an "as-of" date**, never hard-coded constants. The calculator's only data dependency is re-scraping **one** page, which is the easiest scrape in the whole system.

### R4 — Review sentiment & themes (Arabic + English)

| Aspect | Verdict | Evidence |
|---|---|---|
| Bilingual sentiment (MSA + Egyptian dialect + English) | **Achievable** | Free MIT/Apache stack: MARBERTv2 (Arabic dialect) + DistilBERT/twitter-roberta (English); CAMeL Tools for normalization/dialect-ID; CPU-OK. Confidence rated **high**. |
| Themes / pros-cons / complaints | **Achievable** | KeyBERT + BERTopic extractive; deterministic, no paid LLM. |
| **Getting enough review text to analyze** | **Constrained** | Logged-out pagination capped (~5 pages/~50 reviews); growing login-gate; star/sort filter passes expand to ~300–500. Detail-page rating/histogram/total remain logged-out-visible. |
| Egyptian dialect / Arabizi / code-switching | Handled but must be validated | Requires dialect-pretrained model + normalization; **validate on ~200 hand-labeled `.eg` reviews** before trusting class accuracy. |

**Brutal-honesty statement:** The sentiment *engine* is solid and free. The **binding constraint is input volume, not modeling** — Amazon caps logged-out reviews and increasingly gates them behind login. Since the strategy mandates **staying logged out** (the legal guardrail), you will analyze a **truncated, non-random subset** (recent + filter-expanded), which biases sentiment. The product must disclose "based on N of M reviews." Modern-Standard-Arabic-only or English-only models will silently mislabel Egyptian colloquial/Arabizi — dialect routing is mandatory, not optional.

---

## 7. Realistic $0 Operating Envelope & First Upgrade

### The $0 envelope (sustainable cadence/volume)

**Confirmed-false claim:** "recurring scraping is sustainable at ~$0 without Amazon blocking it into uselessness." Live evidence: **503 on the first datacenter request**, because AWS WAF classifies by ASN in the first packet — a single VPS/cloud IP is flagged pre-HTTP. Datacenter single-IP success ≈ 10–20%; every free proxy tier (e.g., Webshare 10 free) is datacenter and inherits that failure.

**What $0 actually buys (honest envelope):**

| Parameter | Realistic $0 setting |
|---|---|
| Fetcher | `curl_cffi` (`impersonate=chrome`) for static fields — TLS match is the #1 free lever (~2% → ~94% on Amazon generally; Not verified on `.eg`). Headless (Playwright + stealth) only for JS-gated reviews/offers. |
| Egress IP | A **residential home connection used directly** (NOT cloud). A cloud/VPS IP is the harshest case (confirmed 503). Risk: a home IP can be CAPTCHA-walled or semi-banned for hours–days. |
| Cadence | 1 request / 4–6s with **Poisson jitter** (never uniform); ~10–15 req/min single IP, with long "reading" pauses. |
| Volume ceiling | **Planning estimate only: ~500–900 pages/day** single IP before reputation decay (explicitly **Not verified / not measured**). Treat as a few hundred pages/day to be safe. |
| Refresh discipline | Cache aggressively: price re-check 6–24h, static attrs weekly, BSR snapshot 1–4×/day same-hour. Caching is the highest-leverage free mitigation. |
| Managed free bridge | Firecrawl free tier = 1,000 credits/month (~1,000 normal or ~200 stealth pages); 10 scrapes/min; **does not roll over**. Good for small/bursty jobs, not a steady high-volume feed. |
| Scheduling | GitHub Actions cron (free, 5-min floor, best-effort timing) for daily/weekly snapshots; or BullMQ+Redis / Supabase pg_cron on a host. Never run scraping inside the web-app process. |

**Bottom line:** A truly $0 build can sustain a **small, slow, daily/weekly personal feed** — a few hundred cached pages/day from a residential connection, plus Firecrawl free as overflow. It **cannot** sustain a reliable, refreshed, multi-category, hourly feed. The "Keepa-style" price-history chart only accrues value slowly because **history is built from your own snapshots starting at zero**.

### First upgrade to buy when free outgrows itself

**Buy residential proxy bandwidth — nothing else first.** The unavoidable cost is residential IP egress, not compute.

- **First purchase:** a small rotating **residential** plan, ~$1–3/GB to start (cheapest cited residential ~$1/GB; IPRoyal ~93% success). Budget a few dollars/month for low volume. This single change moves success from ~15% to ~85–99%.
- **Second (only if reviews/search at volume keep failing):** a managed scraper API (Scrape.do/ScrapingBee/Apify, ~$5–50/mo) that bundles proxies + CAPTCHA solving.
- **Do NOT** buy compute, a bigger VPS, or more datacenter proxies — they do not address the ASN-reputation block.
- **Official zero-ban alternative to evaluate in parallel:** PA-API 5.0 has an **Egypt locale** (free, ToS-compliant) but requires an approved Amazon Associates account and returns title/price/image/ASIN/availability — **no full review text and no autocomplete**. It is the lowest-risk path for the data it covers and should be pursued for R3 enrichment and basic catalog facts even on a "free" plan.

---

## 8. Legal / ToS Risk Summary + Guardrails

**Posture:** Scraping amazon.eg public pages for **personal** product-sourcing is **low-to-moderate, primarily contractual (not criminal)** risk — *because the use is narrow*. It is a **clear ToS breach throughout** (Amazon COU bans "data mining, robots…" and "collection and use of any product listings, descriptions, or prices"), so Amazon may terminate access at any time.

**Evidence calibration:**
- **Criminal/CFAA exposure is weak** for logged-out public pages (hiQ v. LinkedIn; Meta v. Bright Data, Jan 2024: "Terms do not bar logged-off scraping of public data").
- **Risk rises sharply** with: logging in / automating an account, barrier-bypassing (CAPTCHA-defeat, aggressive IP rotation to evade), high volume that degrades service, **commercialization/redistribution**, or scraping **PII** (seller names, reviewer profiles). **Amazon v. Perplexity** (preliminary injunction March 2026) shows rising litigation appetite — but the hooks were **concealment + logged-in agent + competitive public product**, not manual personal reading.
- **Egypt-specific:** Cybercrime Law 175/2018 targets **unauthorized (login/hacking) access**, not public no-login reads. PDPL 151/2020 applies only to **personal data** and has a **natural-person personal-use exemption** — prices/specs fall outside it; **seller/reviewer PII does not**. Penalties (EGP 0.5m–5m + imprisonment) bite only on PII misuse.

**Mandatory guardrails (build into the scraper, not the README):**
1. **Stay logged out.** Never attach Amazon account cookies/credentials. (This is the exact line that flipped Amazon's weak CFAA theory into a live claim in Perplexity.)
2. **Honor robots.txt programmatically.** Do not request the Disallowed families (`/gp/cart`, `/ap/signin`, `/gp/wishlist/`, most `/-/` except `/-/en/`). **Re-pull robots.txt verbatim before launch** (current copy was summarized, not captured).
3. **Do not send a recognized scraper/AI user-agent** (Scrapy default, ClaudeBot, GPTBot, PerplexityBot) — those sit in an explicit `Disallow: /` block. Use a plain browser-like UA; do not forge a specific human session.
4. **Rate-limit hard, back off on 503/429/CAPTCHA, and STOP on block** rather than escalating evasion.
5. **Scope fields to non-personal commercial facts** (ASIN, title, price, availability, rating count, BSR). **Skip seller legal names, reviewer handles, Q&A authors** to stay clear of PDPL/GDPR.
6. **Treat scraped data as a private local cache** with short TTL. **Never republish, resell, or expose raw Amazon content via an API/app** — this is the line the EU database right and the COU resale clause actually defend.
7. **Kill switch on any cease-and-desist or CAPTCHA wall.** Post-notice scraping converts tolerated activity into willful breach.
8. **Document personal, non-commercial intent** to support the PDPL personal-use posture.

**Hard line for the auditor:** the moment this product is **commercialized, redistributed, or scrapes PII**, the legal rating moves from Low toward **High** and the verdict for *that* version is **NO-GO** under the current plan.

---

## 9. Data-Accuracy Caveats & Required UI Uncertainty Disclosures

**Caveats (facts the data cannot support):**
- No true search volume exists; autocomplete (when populated) is ordinal only — and **currently empty for `.eg`**.
- BSR→units is uncalibratable for Egypt; absolute unit/revenue figures are order-of-magnitude at best, plausibly **≥2x error in either direction** (reasoned inference, **not** a measured EG benchmark).
- BSR is **category-relative** — never comparable across categories.
- Egyptian thin categories → volatile single-snapshot BSR; only multi-day trends are trustworthy.
- Sentiment runs on a **truncated, non-random** review subset (logged-out cap) and on models **not validated on `.eg` text**.
- Selectors are unconfirmed on live `.eg` HTML and **will drift** on Amazon redeploys.

**Required UI disclosures (treat any violation as a Critical defect):**
1. **Never show a single sales/revenue number.** Show a **range with a confidence band**, widened explicitly for Egypt (e.g., "~X units/mo, realistically 0.3×–3× — Egypt: low confidence").
2. **Label every modeled value** ESTIMATED / DERIVED / UNCALIBRATED with a per-signal confidence tier (High = scraped fact like price/review-count; Medium = within-category ordinal rank; Low = BSR→units and any keyword "demand").
3. **Separate FACTS from INFERENCES** visually — scraped facts in one column, modeled inferences in a distinct, caveated column.
4. **Force ordinal framing** ("ranks higher than B within Electronics on amazon.eg"); **disable/hard-warn cross-category numeric comparison**.
5. **Persistent calibration-gap notice**: "amazon.eg sales estimates are not calibrated against known Egyptian sales data; treat unit/revenue figures as rough magnitude only." Not buried in a tooltip.
6. **Show data freshness + volatility**: last-scraped timestamp and a stability indicator; flag single-snapshot BSR as low-trust; plot BSR sparkline (log axis) and badge "sustained" vs "spike."
7. **Flag low-data categories** ("few competing listings — rank is volatile").
8. **Keyword demand as a 0–100 relative score** with tooltip "relative interest, not search volume" — and if the autocomplete source is empty for `.eg`, **do not display the feature** rather than show zeros.
9. **Sentiment**: disclose "based on N of M reviews," show language-mix coverage, and the star-rating cross-check flag.
10. **Never auto-compute ROI/order-quantity from a point estimate** — propagate the full worst/expected/best range and surface the downside.

---

## 10. Risk Register

| # | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| 1 | $0 datacenter scraper blocked (503) → no reliable feed | **Critical** | **Confirmed/Certain** | Use residential home IP for $0; budget ~$1–3/GB residential as first upgrade; curl_cffi TLS impersonation; aggressive caching; Firecrawl free as overflow. |
| 2 | "Most searched" unbuildable — autocomplete empty for `.eg` | **Critical** | **Confirmed (today)** | Capture live amazon.eg search-box XHR before committing; fall back to Best Sellers/Movers & Shakers + Google Trends `geo=EG`; never ship a "volume" number. |
| 3 | Misleading sales/revenue numbers (BSR→units uncalibratable for EG) | **Critical** | High if numbers shown | Show ranges + confidence tiers; ordinal framing; persistent calibration-gap notice; no point estimates feeding ROI. |
| 4 | Commercialization/redistribution/PII capture → legal escalation | **High** | Medium | Keep personal/non-commercial; no PII fields; no raw-data republishing; kill switch on C&D. |
| 5 | Logged-in or barrier-bypass scraping → CFAA/Cybercrime exposure | **High** | Low (if guardrails honored) | Stay logged out; honor robots.txt; no CAPTCHA-defeat; stop on block. |
| 6 | Selector drift / unverified `.eg` DOM → silent data loss | **High** | High over time | Selectors in config, match by class prefix; null-rate alerting; fallback selector lists; keep enumerate-index rank fallback. |
| 7 | Review login-gate / cap → biased, partial sentiment | **High** | High | Star/sort filter passes (≤~500); disclose N-of-M; rely on detail-page rating/histogram (logged-out-safe) for aggregates. |
| 8 | Calculator VAT logic wrong (14% on fees + output-VAT strip) | **High** | Medium | Implement fee-VAT and price/1.14 exactly; show fee-VAT as a visible line; unit tests on break-even per category. |
| 9 | Fee schedule changes (2025 revisions + 2026 promo) | Medium | High | Editable config with "as-of" date; re-scrape `sell.amazon.eg/pricing` on schedule; never hard-code. |
| 10 | Egypt thin-catalog → volatile BSR / short lists | Medium | High | Prefer multi-day Δlog(BSR) trends; flag low-data categories; down-weight single spikes. |
| 11 | Home/residential IP semi-banned for hours–days | Medium | Medium | Conservative cadence + jitter; back off; accept gaps; do not evade aggressively. |
| 12 | Sentiment mislabels Egyptian dialect/Arabizi | Medium | Medium | Dialect-routed MARBERTv2 + CAMeL normalization; validate on ~200 hand-labeled `.eg` reviews; report macro-F1. |
| 13 | Firecrawl/free-tier limits exhausted mid-cycle | Low | Medium | Track credits; reserve stealth credits for hardest pages; degrade gracefully. |
| 14 | Robots.txt / COU `.eg`-localized terms differ from summary | Low | Low | Re-pull verbatim before launch; confirm no Crawl-delay added. |

---

## 11. Test Matrix (Pre-Build Validation Gates)

| ID | Area | Scenario | Expected | Severity | Status |
|---|---|---|---|---|---|
| T1 | Demand | Capture live amazon.eg search-box XHR (Egypt-geo browser) | Identify real endpoint/params that return populated EG suggestions | Critical | **Required, not done** |
| T2 | Acquisition | curl_cffi + residential IP fetch of `/gp/bestsellers/electronics` | HTTP 200 + ≥30 cards parsed | Critical | Not verified (datacenter = 503) |
| T3 | Acquisition | Confirm 50/100 items populate per top category on `.eg` | Full lists or documented short-list categories | High | Not verified |
| T4 | Parsing | Validate each field selector against live `.eg` DOM | Non-null rate >95% per field | High | Not verified |
| T5 | BSR | Per-product BSR presence across 5 categories | Documented presence/absence map | High | Not verified |
| T6 | Calculator | Break-even per category incl. tiered (Jewelry/Grocery/Elec-Accessories) | Matches hand-computed values incl. 14% fee-VAT | High | Buildable now |
| T7 | Calculator | VAT-registered vs non-registered net profit | price/1.14 strip applied only when registered | High | Buildable now |
| T8 | Reviews | Logged-out pagination cap + filter-expansion coverage on `.eg` | Documented reachable review count | High | Not verified |
| T9 | Sentiment | Macro-F1 on ~200 hand-labeled `.eg` reviews (MSA/Masry/Arabizi/EN) | Reported per-language F1 | Medium | Required |
| T10 | Robots/Legal | Re-pull amazon.eg/robots.txt verbatim; confirm path posture + UA blocklist | Matches guardrail config | Medium | Required |
| T11 | Resilience | Inject 503/CAPTCHA; verify backoff + stop-on-block | No evasion escalation; graceful pause | High | Buildable now |
| T12 | UI | Attempt to display a single units number | Blocked by design; range + confidence shown | Critical | Design gate |

---

## 12. Recommended Fix / Build Priority

1. **Gate the build on T1 (autocomplete XHR capture) and T2 (residential fetch).** These two tests decide whether R1 exists and whether the feed is sustainable. Do them **before** writing app code.
2. **Build R3 (calculator) first** — it is deterministic, EG-specific, trustworthy, and its only scrape is one page. It anchors product credibility while scraping infra matures.
3. **Build R2 as ranking + rank-velocity** (Best Sellers, Movers & Shakers, own Δlog(BSR)) — never as unit counts.
4. **Build the uncertainty-disclosure UI layer as a first-class system**, not a polish pass — it is a Critical correctness control here.
5. **Build R4 sentiment** on the truncated logged-out review set, with dialect routing and N-of-M disclosure.
6. **Reposition R1** to "trending products/categories" unless T1 proves keyword recovery; optionally add Google Trends `geo=EG`.
7. **Procure residential bandwidth** the moment the residential-home-IP $0 path shows reputation decay.

## 13. Retest Plan

- Re-run T1/T2 on the live `.eg` storefront from an Egyptian-geo session; re-run autocomplete monthly (undocumented behavior — EG coverage could switch on/off).
- Nightly null-rate monitoring on every selector; alert on drift; quarterly full selector re-validation.
- Re-scrape `sell.amazon.eg/pricing` on schedule; diff against stored fee config; alert on change.
- Re-pull robots.txt and COU before any launch and quarterly thereafter.
- Re-validate sentiment F1 on a fresh `.eg` sample each quarter.

---

## 14. Final Senior Expert Verdict

**Senior Expert Verdict: CONDITIONAL GO** — for a **personal-use, low-volume, fully-uncertainty-disclosed** free/scraping build, **conditioned on**:

1. **Stay logged out, no PII, no redistribution, no commercialization** (else NO-GO for that version).
2. **No absolute units/revenue numbers** anywhere — ranges + confidence tiers + persistent calibration-gap notice only.
3. **R1 ("most searched") is repositioned** to Best Sellers/Movers & Shakers–derived trending unless the live amazon.eg search-box XHR capture (T1) proves keyword recovery; the autocomplete endpoint is **empty for `.eg` today**.
4. **$0 is accepted as a small/slow personal feed** from a residential connection, with the explicit understanding that a reliable feed requires a **~$1–3/GB residential proxy** as the first upgrade — a pure single-datacenter-IP $0 scraper is **confirmed non-viable (503 on first request)**.
5. **The calculator implements 14% fee-VAT and the output-VAT strip correctly**, with editable, dated fee config.
6. **Selectors live in config with null-rate alerting** (live `.eg` DOM is unverified and will drift).

**In plain business language:** You can build this for yourself, cheaply, and get real value from Amazon's **public rankings**, a **correct EG profit calculator**, and **bilingual review sentiment**. What you **cannot** honestly deliver on the free plan is a "search-volume" number or a "units sold" number — those are either unavailable for Egypt (autocomplete empty) or uncalibratable (BSR→units), and presenting them as fact would be the single biggest way this product misleads its own user. Ship the trustworthy pillars, disclose uncertainty aggressively, keep it personal and logged-out, and budget a few dollars a month for residential IPs the moment the free feed degrades. Reassess to a **full GO** once T1/T2/T4 pass on live `.eg` data and the uncertainty-disclosure UI is verified in place.