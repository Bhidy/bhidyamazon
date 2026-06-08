# Rasid — Amazon Egypt Product-Research & Arbitrage Platform

Rasid (راصد, "observer") is an institutional-grade product-research and arbitrage
platform for **amazon.eg** (Amazon Egypt). It surfaces best-sellers, rank
movement, demand signals, review sentiment, and FBA profit estimates so a seller
or arbitrageur can decide *what to source for the Egyptian market* — from **real,
honestly-labelled data**, in a bilingual (Arabic / English) UI.

Egypt has no public sales feed and no first-party Amazon data API for this market.
Rasid is built around that constraint instead of pretending it away: every number
on screen is either a **scraped fact** (price, rating, review count, best-seller
position) or a clearly-labelled **relative signal** derived from our own
time-series. We never invent absolute units sold or search volume.

---

## What Rasid gives you

- **Best-sellers & movers** per category, ranked by Amazon best-seller position
  (BSR) and by rank-velocity once enough daily snapshots exist.
- **Relative demand**, expressed as a 0–100 score and demand *bands*
  (very-high / high / moderate / low) — **never** as a fabricated unit count.
- **Product detail** with price, rating, review count, a BSR/price snapshot that
  grows into real history with each daily run, and provenance on every field.
- **Review sentiment** computed honestly from review star-ratings, always shown as
  "based on N of M reviews" so the sample size is visible.
- **Demand keywords** from Google Trends Egypt — *relative interest*, explicitly
  not search volume.
- **FBA profit calculator** (referral + fulfilment + VAT) — labelled as an
  estimate, not a guarantee.

---

## The honest-data approach (this is a correctness feature)

Rasid's credibility rests on never overstating what the data can support. The rules
below are enforced in the data layer and the UI, not left to good intentions:

1. **Scraped facts vs. modeled signals are separated.** Price, rating, review
   count and best-seller position are scraped facts. BSR→demand and
   trends→interest are *modeled, wide-error* signals.
2. **No absolute units, ever.** We do **not** display "units sold" or "search
   volume". Demand is shown as ranks, rank-velocity, demand bands, and a 0–100
   *relative* score.
3. **Every estimate is labelled.** Modeled values carry a `confidence`
   (low / medium / high) and an `isEstimated` flag end-to-end (`provenance`), and
   the UI renders the matching disclosure copy and a calibration notice on any
   screen that shows ranks or demand.
4. **Sentiment shows its sample.** Sentiment is derived from review star-ratings
   (a real signal) and always rendered as "based on N of M reviews".
5. **No PII.** Reviewer display names are dropped at ingest; nothing personal is
   stored.

Where data comes from:

- **Primary:** live **amazon.eg** public, logged-out best-seller and product pages.
  amazon.eg returns `200` to residential traffic but `503` to datacenter/cloud IPs,
  so the fetch runs either from a **residential machine** or, in the cloud, **through
  Firecrawl** (country = EG) — never by rotating IPs to evade a block.
- **Demand keywords:** Google Trends Egypt (relative interest).

---

## Architecture

Rasid is two cleanly-separated halves joined by a single data **seam**, so the
data source can change without touching a single screen.

```
  ┌─────────────────────┐     writes JSON      ┌──────────────────────────┐
  │  Scraper (Python)    │  ───────────────▶    │  web/src/data/real/*.json │
  │  scrapers/           │                      │  bestsellers · products   │
  │   fetch · parse      │                      │  keywords · meta          │
  │   run  · trends      │                      └─────────────┬────────────┘
  └─────────────────────┘                                     │ fs read
                                                              ▼
                          ┌───────────────────────────────────────────────┐
                          │  THE SEAM:  web/src/lib/data.ts                 │
                          │  → delegates to real-store.ts when real data    │
                          │    is present, else deterministic seed fallback │
                          └─────────────────────┬─────────────────────────┘
                                                │ typed domain objects
                                                ▼
                          ┌───────────────────────────────────────────────┐
                          │  Next.js 16 App Router  (web/)                  │
                          │  async Server Components · shadcn/ui (Base UI)  │
                          │  Tailwind v4 · Recharts · bilingual AR/EN       │
                          │  Screens: dashboard · products · detail ·       │
                          │           keywords · movers · calculator …      │
                          └───────────────────────────────────────────────┘
```

- **Scraper — `scrapers/`** (Python): `fetch.py` (browser-grade fetch / Firecrawl
  transport), `parse.py` (HTML → normalized records), `run.py` (orchestration),
  `trends.py` (demand keywords). Output is written to `web/src/data/real/` as JSON
  plus a `meta.json` manifest (`scraped_at`, `product_count`, `categories`).
- **The seam — `web/src/lib/data.ts`** is the *single* module the whole UI reads
  through. It returns real data via `real-store.ts` when the scraped JSON is
  present, and otherwise synthesizes deterministic seed data so the app always
  renders. Swapping the source (e.g. to Supabase) is a change to this seam only —
  the domain types and every screen stay the same.
- **App — `web/`**: Next.js 16 App Router. Pages are async Server Components;
  `params`/`searchParams` are Promises. UI is shadcn/ui (built on **Base UI**, not
  Radix — there is no `asChild`, use the `render` prop / `ButtonLink`), Tailwind v4,
  Recharts, and is fully bilingual (Arabic RTL / English LTR).

### Operational endpoints

- `GET /api/health` — readiness probe. Reads `web/src/data/real/meta.json` and
  returns `{ status, scrapedAt, productCount, categories }`. Reports `ok` when the
  dataset is present (and serving real data) or `degraded` (HTTP 503) when the
  manifest is missing and the app is on seed-fallback — suitable for uptime
  monitors and the deploy gate.

### Security headers

All routes are served with a hardened header baseline (configured in
`web/next.config.ts`): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, a locked-down
`Permissions-Policy` (camera / microphone / geolocation disabled), a
`Content-Security-Policy` tuned to keep the app working, and `poweredByHeader`
disabled.

---

## Cloud automation (fully hands-off, free-tier)

The whole refresh-and-deploy loop runs in the cloud, on free tiers, with no
machine to keep awake — see `.github/workflows/scrape-and-deploy.yml`:

1. **GitHub Actions** runs once daily (≈ 08:17 Africa/Cairo) and is also manually
   dispatchable.
2. It scrapes amazon.eg **through Firecrawl** (datacenter/CI IPs get `503` from
   amazon.eg, so the request is proxied with country = EG; ~1 credit/page, well
   within the free tier) and refreshes the demand keywords.
3. Changed JSON under `web/src/data/real/` is **committed back to the repo**, giving
   an append-only data history.
4. The workflow **deploys to Vercel (production)**, so the live site always reflects
   the latest Egypt data.

A local/residential cron (`scrapers/run_daily.sh`, launchd plist) is an
alternative for running the scrape from a home IP. Either way the guardrails below
travel with the scrape.

---

## Run it locally

Prerequisites: Node.js (per `web/package.json`), and Python 3.12 only if you want to
run the scraper.

```bash
# 1) The web app (uses committed real data, or deterministic seed fallback)
cd web
npm install
npm run dev          # http://localhost:3000
```

```bash
# 2) (optional) Refresh the real amazon.eg data
#    From a residential IP:
python scrapers/run.py
python scrapers/trends.py        # demand keywords (best-effort)

#    Or from anywhere, via Firecrawl (set your own key in the environment):
RASID_FETCH=firecrawl FIRECRAWL_API_KEY=... python scrapers/run.py
```

The scraper writes `web/src/data/real/*.json`; the dev server picks up a fresh
scrape automatically (the data store is keyed on file mtime).

Useful scripts (run inside `web/`): `npm run dev`, `npm run build`,
`npm run start`, `npm run lint`.

---

## Deploy

The recommended path is **committed data + Vercel** (zero extra infrastructure):

1. Push this repo to GitHub.
2. In Vercel, create a project from the repo with **Root Directory = `web`** and
   deploy — you get a live `*.vercel.app` URL.
3. Let the daily GitHub Actions workflow commit fresh data and redeploy.

Configuration is provided to the GitHub Actions / Vercel environments as
**secrets** (Firecrawl key, Vercel token/org/project ids) — none are committed and
none belong in this file. A Supabase-backed dynamic path (for sub-daily freshness)
is documented as a follow-up; it changes only the `data.ts` seam, not the UI.
The full runbook lives in **`DEPLOY.md`**.

---

## Guardrails (baked into the scrape — keep them)

These keep the data collection in the low-risk, good-citizen lane:

- **Logged-out, public pages only** — no accounts, no gated content.
- **Rate-limited and serial** — human-like pacing with jitter between requests.
- **Stop-on-block** — a kill-switch halts the run on the first sign of blocking;
  IPs are **never** rotated to evade a block.
- **No PII stored** — reviewer names dropped at ingest.
- **Private cache · personal / non-commercial use.**

---

## Repository layout

```
.
├── web/                 Next.js 16 app (the product) + committed real data
│   ├── src/app/         App Router screens + /api/health
│   ├── src/lib/         data.ts seam · real-store.ts · types · fees · format
│   └── src/data/real/   scraped JSON + meta.json manifest
├── scrapers/            Python scraper (fetch · parse · run · trends)
├── supabase/            Optional Postgres schema for the dynamic deploy path
├── docs/research/       Product spec, architecture, feasibility, pipeline spec
├── .github/workflows/   scrape-and-deploy automation
└── DEPLOY.md            Deployment & operations runbook
```
