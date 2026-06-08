I'll design the technical architecture for this free/scraping build. This is a substantial architecture document task using the rich research context provided. Let me produce the complete technical architecture.

# Technical Architecture — Amazon Egypt (amazon.eg) Product-Research Platform

**Build profile:** FREE / scraping-first, paid-API-ready
**Stack baseline:** Next.js App Router + TypeScript + shadcn/ui + Tailwind · Supabase/Postgres · Playwright/Crawlee scraper workers · BullMQ+Redis (or pg_cron) scheduler · optional Python sentiment worker
**Date:** 2026-06-08 · **Marketplace:** amazon.eg (mid `ARBP9OOSHTCHU`), EGP, AR/EN bilingual

---

## 1. Guiding principles

1. **One normalized schema, many sources.** Every fetcher — HTML scraper, autocomplete client, reviews scraper, manual CSV — implements a single `DataAdapter` interface and emits the same normalized DTOs. Swapping in **Keepa / PA-API 5.0** later is a config change + one new adapter class, not a rewrite.
2. **Snapshots are immutable.** We never overwrite a price/rank; we append timestamped rows. All "rising / most-selling" metrics are derived from our own time-series, because no Egypt sales feed exists.
3. **Estimates are labelled estimates.** BSR→units, autocomplete→demand are modeled, wide-error signals. The data layer carries a `confidence` + `is_estimated` flag end-to-end so the UI can never present them as ground truth.
4. **Anti-block is a first-class subsystem,** not a flag. amazon.eg returns **HTTP 503 to plain datacenter fetches** (verified) — browser-grade TLS, residential IPs, pacing and backoff are mandatory.
5. **Free-first, paid-ready.** Default to $0 components (self-hosted Crawlee, Supabase free tier, GitHub Actions cron). Every external dependency has a documented paid upgrade path (residential proxies ~$3.50/mo, Firecrawl stealth, Keepa).
6. **Multi-tenant from day one.** Postgres Row-Level Security (RLS) on a `tenant_id`; shared scrape cache, isolated watchlists/alerts/users.

---

## 2. Architecture diagram (described)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT (browser)                                │
│  Next.js App Router · shadcn/ui · Tailwind (RTL/LTR) · TanStack Table · Recharts│
│  Screens: dashboard · products grid · product detail (Keepa chart) · keywords  │
│           · movers · calculator · brands · lists · alerts · settings · auth    │
└───────────────┬────────────────────────────────────────────────┬───────────────┘
                │ HTTPS (Supabase Auth JWT)                        │ realtime (alerts)
                ▼                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION / API LAYER (Next.js)                        │
│  Route Handlers / Server Actions  ·  tRPC-or-REST  ·  Zod validation            │
│  ┌────────────┐ ┌─────────────┐ ┌──────────────┐ ┌───────────────┐ ┌─────────┐ │
│  │ Search-by- │ │ Metrics svc │ │ Calculator   │ │ Watchlist/    │ │ Auth /  │ │
│  │ name flow  │ │ (BSR Δ,     │ │ svc (fees+   │ │ Alerts svc    │ │ tenant  │ │
│  │ (adapter)  │ │  rising)    │ │  VAT engine) │ │               │ │ guard   │ │
│  └────────────┘ └─────────────┘ └──────────────┘ └───────────────┘ └─────────┘ │
│        Read-through CACHE (Redis + Postgres materialized views)                 │
└───────┬───────────────────────────────┬───────────────────────────┬────────────┘
        │ enqueue jobs                   │ read/write                 │ read/write
        ▼                                ▼                            ▼
┌──────────────────┐         ┌──────────────────────────┐   ┌────────────────────┐
│  SCHEDULER        │         │   POSTGRES (Supabase)     │   │  REDIS (cache+queue)│
│  pg_cron OR       │ enqueue │  products · snapshots     │   │  BullMQ queues      │
│  BullMQ Job       │────────▶│  rankings · keywords      │   │  hot cache (TTL)    │
│  Schedulers OR    │         │  suggestions · reviews    │   │  session/cookie jar │
│  GitHub Actions   │         │  review_sentiment · fees  │   │  proxy health       │
│  (daily/wk/mo)    │         │  watchlists · alerts      │   └────────────────────┘
└──────────────────┘         │  users · tenants · sources│
                             │  scrape_runs · adapter_log │
                             │  TimescaleDB ext (optional)│
                             └─────────▲─────────────────┘
                                       │ upsert normalized DTOs
        ┌──────────────────────────────┴───────────────────────────────────────┐
        │                     SCRAPING WORKER POOL (Node/TS)                      │
        │   Crawlee orchestrator  ·  BullMQ Worker (separate process)            │
        │   ┌──────────────────────────────────────────────────────────────┐    │
        │   │           DATA-ADAPTER LAYER  (pluggable, behind 1 interface)   │    │
        │   │  ┌───────────────┐ ┌────────────────┐ ┌──────────────┐         │    │
        │   │  │ BestSellers/   │ │ Autocomplete   │ │ Reviews       │         │    │
        │   │  │ Movers HTML    │ │ suggestions    │ │ scraper       │         │    │
        │   │  │ adapter        │ │ JSON client    │ │ adapter       │         │    │
        │   │  └───────────────┘ └────────────────┘ └──────────────┘         │    │
        │   │  ┌───────────────┐ ┌────────────────┐ ┌──────────────┐         │    │
        │   │  │ Product-detail │ │ Manual CSV     │ │ Keepa / PA-API│ (stub) │    │
        │   │  │ HTML adapter   │ │ import adapter  │ │ adapter ▣paid │         │    │
        │   │  └───────────────┘ └────────────────┘ └──────────────┘         │    │
        │   └──────────────────────────────────────────────────────────────┘    │
        │   ANTI-BLOCK ENGINE: curl_cffi/TLS-impersonate → Playwright+stealth     │
        │   fallback · proxy rotation · Poisson pacing · backoff · CAPTCHA sniff  │
        └──────────────────────────────┬───────────────────────────────────────┘
                                       │ HTTPS (residential/mobile egress IP)
                                       ▼
        ┌──────────────────────────────────────────────────────────────────────┐
        │  EXTERNAL SOURCES                                                       │
        │  amazon.eg HTML (bestsellers/movers/dp/product-reviews/SERP)            │
        │  completion.amazon.com /api/2017/suggestions (JSON)                     │
        │  [later] Keepa API · PA-API 5.0 Egypt (webservices.amazon.eg)           │
        └──────────────────────────────────────────────────────────────────────┘

        ┌──────────────────────────────────────────────────────────────────────┐
        │  PYTHON SENTIMENT WORKER (optional, separate service / queue)           │
        │  consume new reviews → langdetect → route AR(MARBERTv2)/EN(DistilBERT)  │
        │  → KeyBERT themes → write review_sentiment + aspect rows                │
        └──────────────────────────────────────────────────────────────────────┘
```

**Data flow (one cycle):** Scheduler fires a job → BullMQ enqueues `scrape:bestsellers{category,lang,page}` → Worker picks the adapter via the registry → Anti-block engine fetches (TLS-impersonate first, Playwright fallback on partial/CAPTCHA) → adapter parses to normalized DTO → upsert `products` + append immutable `snapshots`/`rankings` → Metrics service (materialized views / scheduled SQL) recomputes Δlog(BSR) risers → new reviews enqueued to the Python sentiment worker → Alerts service evaluates rules → Realtime push to client.

---

## 3. The DATA-ADAPTER layer

### 3.1 Design

* A **registry** maps `(SourceType, Capability)` → adapter instance. The app and workers only ever talk to the registry, never to a concrete adapter.
* Every adapter declares which **capabilities** it provides, its **reliability tier**, its **cost class** (`free` | `paid`), and a **health probe**.
* All adapters return the same normalized DTOs (`NormalizedProduct`, `NormalizedRanking`, `NormalizedSuggestion`, `NormalizedReview`, `NormalizedFeeSchedule`). The persistence layer is adapter-agnostic.
* Fetching is **injected** (`FetchContext`) so the same parser works behind curl_cffi, Playwright, Firecrawl, or a paid HTTP client.

### 3.2 Adapter interface (TypeScript signature)

```ts
// ─────────────────────────────────────────────────────────────────────────────
// Normalized schema — every adapter, free or paid, emits THESE shapes only.
// ─────────────────────────────────────────────────────────────────────────────

export type Locale = "en_AE" | "ar_AE";
export type SourceType =
  | "amazon_html_bestsellers"
  | "amazon_html_movers"
  | "amazon_html_product"
  | "amazon_html_reviews"
  | "amazon_autocomplete"
  | "amazon_html_serp"
  | "manual_csv"
  | "keepa_api"        // paid, stubbed now
  | "paapi5";          // paid, stubbed now

export type Capability =
  | "rankings"         // bestsellers / movers list rows
  | "product"          // detail enrichment (BSR, brand, seller, price)
  | "suggestions"      // autocomplete demand proxy
  | "reviews"          // review rows
  | "fees"             // fee schedule
  | "search";          // search-by-name → ASINs

export type ReliabilityTier = "high" | "medium" | "low";
export type CostClass = "free" | "freemium" | "paid";

export interface Provenance {
  source: SourceType;
  sourceUrl?: string;
  fetchedAt: string;            // ISO-8601 (UTC)
  locale: Locale;
  isEstimated: boolean;         // true for BSR→units, autocomplete demand
  confidence: ReliabilityTier;  // carried to the UI
  rawHash?: string;             // dedupe / change detection
}

export interface NormalizedProduct {
  asin: string;                 // canonical 10-char key
  title?: string;
  brand?: string;
  priceEgp?: number;            // machine value, VAT-inclusive (consumer price)
  currency: "EGP";
  rating?: number;              // 0–5
  reviewCount?: number;
  imageUrl?: string;
  sellerId?: string;
  sellerName?: string;
  inStock?: boolean;
  bsr?: Array<{ rank: number; categoryNode: string; categoryName?: string }>;
  categoryPath?: string[];
  provenance: Provenance;
}

export interface NormalizedRanking {
  listType: "bestsellers" | "movers";
  categoryNode: string;
  rank: number;                 // 1-based; enumerate-index fallback allowed
  asin: string;
  priceEgp?: number;
  rating?: number;
  reviewCount?: number;
  gainText?: string;            // movers-only ("+1,234%", "was #X")
  gainPct?: number;             // parsed movers gain
  snapshot: NormalizedProduct;  // embedded card-level fields
  provenance: Provenance;
}

export interface NormalizedSuggestion {
  query: string;
  lang: Locale;
  ordinalRank: number;          // array position = popularity proxy
  seedPrefix: string;           // which prefix surfaced it
  refTag?: string;
  provenance: Provenance;       // isEstimated = true ALWAYS
}

export interface NormalizedReview {
  reviewId: string;
  asin: string;
  rating?: number;
  title?: string;
  body: string;                 // UTF-8, RTL preserved
  detectedLang?: "ar" | "en" | "mixed" | "unknown";
  authorName?: string;
  reviewedAt?: string;          // normalized ISO date
  verifiedPurchase?: boolean;
  helpfulVotes?: number;
  provenance: Provenance;
}

export interface NormalizedFeeSchedule {
  asOf: string;
  vatRate: number;              // 0.14
  referral: Array<{
    category: string;
    tiers: Array<{ uptoEgp: number | null; rate: number }>; // piecewise
    minFeeEgp: number | null;
  }>;
  fbaLadder: Array<{
    sizeTier: string; maxWeightKg: number;
    lowPriceFeeEgp: number; highPriceFeeEgp: number; // split at ~350 EGP
  }>;
  fbaPriceBandEgp: number;      // ~350
  storageEgpPerCuFtMonth: number;
  provenance: Provenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch is injected so one parser works behind any transport (free or paid).
// ─────────────────────────────────────────────────────────────────────────────

export interface FetchRequest {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  renderJs?: boolean;           // hint: needs Playwright (lazy-load/JS-gated)
  waitForSelector?: string;
  scrollTo?: string;            // e.g. ".a-pagination" for lazy cards
}

export interface FetchResponse {
  status: number;
  body: string;                 // HTML or JSON text
  finalUrl: string;
  blocked: boolean;             // 503/429/captcha/"Robot Check" detected
  viaProxy?: string;
}

export interface FetchContext {
  fetch(req: FetchRequest): Promise<FetchResponse>;
  locale: Locale;
  signal?: AbortSignal;
  log: (level: "info" | "warn" | "error", msg: string, meta?: unknown) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE one interface every adapter implements.
// ─────────────────────────────────────────────────────────────────────────────

export interface AdapterMeta {
  source: SourceType;
  capabilities: Capability[];
  reliability: ReliabilityTier;
  cost: CostClass;
  requiresBrowser: boolean;     // true → route through Playwright tier
  defaultLocale: Locale;
}

export type AdapterResult<T> = {
  ok: true;  data: T[]; provenance: Provenance;
} | {
  ok: false; error: { code: "BLOCKED" | "PARSE" | "EMPTY" | "RATE_LIMIT" | "AUTH" | "UNKNOWN";
                      message: string; retryable: boolean };
};

export interface DataAdapter<P = Record<string, unknown>> {
  readonly meta: AdapterMeta;

  /** Cheap liveness/health probe (used by registry + dashboards). */
  health(ctx: FetchContext): Promise<{ healthy: boolean; nullRate?: number; note?: string }>;

  // Capability methods are OPTIONAL; the registry checks `meta.capabilities`.
  fetchRankings?(params: { listType: "bestsellers" | "movers"; categoryNode: string;
                           page: number } & P, ctx: FetchContext): Promise<AdapterResult<NormalizedRanking>>;

  fetchProduct?(params: { asin: string } & P, ctx: FetchContext): Promise<AdapterResult<NormalizedProduct>>;

  fetchSuggestions?(params: { prefix: string; lang: Locale } & P,
                    ctx: FetchContext): Promise<AdapterResult<NormalizedSuggestion>>;

  fetchReviews?(params: { asin: string; page: number; sortBy?: "recent" | "helpful";
                          filterByStar?: string } & P,
                ctx: FetchContext): Promise<AdapterResult<NormalizedReview>>;

  search?(params: { query: string; lang: Locale } & P,
          ctx: FetchContext): Promise<AdapterResult<NormalizedProduct>>;

  fetchFees?(params: P, ctx: FetchContext): Promise<AdapterResult<NormalizedFeeSchedule>>;
}

// Registry — app/workers depend on THIS, not on concrete adapters.
export interface AdapterRegistry {
  register(adapter: DataAdapter): void;
  resolve(capability: Capability, opts?: { preferCost?: CostClass }): DataAdapter[]; // ordered by reliability
  bySource(source: SourceType): DataAdapter | undefined;
}
```

**Dropping in Keepa later:** implement `class KeepaAdapter implements DataAdapter` with `meta.cost="paid"`, `capabilities=["product","rankings"]`, map Keepa's CSV history arrays to `NormalizedProduct.bsr` + append `snapshots`. `registry.register(new KeepaAdapter())` and set `preferCost:"paid"` for the product/rankings capability. Zero changes downstream — the metrics engine, charts and storage already consume the normalized shape.

---

## 4. DATA MODEL (Postgres / Supabase)

Conventions: all tables carry `tenant_id uuid` (RLS) except global reference tables (`products`, `snapshots`, `rankings`, `keywords`, `suggestions`, `reviews`, `review_sentiment`, `fees`, `categories`, `sources` — shared scrape cache). User-owned tables (`watchlists`, `alerts`, `users`, `csv_imports`) are tenant-scoped. Time-series tables are append-only; consider the **TimescaleDB** extension (hypertables on `snapshots`, `suggestions`) or native `BRIN` indexes on `captured_at`.

```sql
-- ─── Tenancy & auth ──────────────────────────────────────────────────────────
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',          -- free | pro | team
  created_at timestamptz not null default now()
);

create table users (                           -- mirrors Supabase auth.users
  id uuid primary key,                         -- = auth.uid()
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null unique,
  role text not null default 'member',         -- owner | admin | member | viewer
  locale text not null default 'en_AE',        -- UI language pref
  created_at timestamptz not null default now()
);

-- ─── Source / scrape governance ──────────────────────────────────────────────
create table sources (                          -- adapter health & config
  id text primary key,                          -- = SourceType
  cost_class text not null,                      -- free | freemium | paid
  reliability text not null,                     -- high | medium | low
  enabled boolean not null default true,
  last_health jsonb,                             -- {healthy,nullRate,note,at}
  config jsonb                                   -- proxy pool ref, rate caps
);

create table scrape_runs (                       -- one row per scheduled batch
  id bigint generated always as identity primary key,
  source text not null references sources(id),
  job_type text not null,                        -- bestsellers|movers|reviews|...
  status text not null,                          -- queued|running|ok|partial|failed
  started_at timestamptz, finished_at timestamptz,
  requested int default 0, succeeded int default 0,
  blocked int default 0, null_rate numeric,      -- selector-drift alarm
  meta jsonb
);

-- ─── Catalogue ───────────────────────────────────────────────────────────────
create table categories (
  node_id text primary key,                      -- harvested from live nav
  slug text, name_en text, name_ar text,
  parent_node text references categories(node_id),
  depth int, list_url text
);

create table products (
  asin text primary key,                         -- canonical key
  title_en text, title_ar text,
  brand text,
  category_node text references categories(node_id),
  image_url text,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  attributes jsonb                               -- weight, dims, seller, etc.
);
create index on products (brand);
create index on products (category_node);

-- ─── Time-series: price/rank snapshots (immutable, append-only) ──────────────
create table snapshots (                         -- hypertable candidate
  id bigint generated always as identity,
  asin text not null references products(asin),
  captured_at timestamptz not null default now(),
  source text not null references sources(id),
  locale text not null,
  price_egp numeric,
  in_stock boolean,
  rating numeric, review_count int,
  is_estimated boolean not null default false,
  confidence text,                               -- high|medium|low
  primary key (asin, captured_at, source)
);
create index snapshots_asin_time on snapshots (asin, captured_at desc);
-- BRIN keeps the time-series index tiny:
create index snapshots_time_brin on snapshots using brin (captured_at);

-- per-product BSR over time (drives risers + Keepa chart right axis)
create table rankings (                          -- hypertable candidate
  id bigint generated always as identity,
  asin text not null references products(asin),
  category_node text not null references categories(node_id),
  list_type text,                                -- bestsellers|movers|detail
  bsr int,                                        -- absolute rank (nullable)
  list_rank int,                                  -- position on the list page
  gain_pct numeric,                               -- movers only
  captured_at timestamptz not null default now(),
  source text not null references sources(id),
  primary key (asin, category_node, captured_at, source)
);
create index rankings_cat_time on rankings (category_node, captured_at desc);
create index rankings_asin_time on rankings (asin, captured_at desc);

-- ─── Keywords / demand (autocomplete) ───────────────────────────────────────
create table keywords (
  id bigint generated always as identity primary key,
  query text not null,
  lang text not null,
  first_seen_at timestamptz not null default now(),
  unique (query, lang)
);

create table suggestions (                       -- time-series of autocomplete
  id bigint generated always as identity,
  keyword_id bigint not null references keywords(id),
  captured_at timestamptz not null default now(),
  min_rank int,                                  -- best array position seen
  appearances int,                              -- # distinct prefixes surfacing it
  demand_score numeric,                         -- 0–100 (ESTIMATED, labelled)
  source text not null default 'amazon_autocomplete',
  is_estimated boolean not null default true,
  primary key (keyword_id, captured_at)
);
create index suggestions_kw_time on suggestions (keyword_id, captured_at desc);

-- optional: link top queries to ASINs via SERP enrichment
create table keyword_products (
  keyword_id bigint references keywords(id),
  asin text references products(asin),
  serp_rank int, sponsored boolean,
  captured_at timestamptz not null default now(),
  primary key (keyword_id, asin, captured_at)
);

-- ─── Reviews + sentiment ─────────────────────────────────────────────────────
create table reviews (
  review_id text primary key,                    -- Amazon review id (dedupe key)
  asin text not null references products(asin),
  rating numeric, title text, body text not null,
  detected_lang text,                            -- ar|en|mixed|unknown
  author_name text, reviewed_at date,
  verified_purchase boolean, helpful_votes int,
  scraped_at timestamptz not null default now(),
  source text not null references sources(id)
);
create index reviews_asin on reviews (asin);

create table review_sentiment (
  review_id text primary key references reviews(review_id) on delete cascade,
  model text not null,                           -- marbertv2|distilbert-sst2|...
  label text not null,                           -- positive|neutral|negative
  score numeric,                                 -- model confidence
  aspects jsonb,                                 -- [{aspect, sentiment, quote}]
  processed_at timestamptz not null default now()
);

-- aggregate per product (materialized; refreshed by metrics job)
create materialized view product_sentiment_rollup as
  select r.asin,
         count(*) as n,
         avg(case when s.label='positive' then 1 when s.label='negative' then 0 end) as pos_ratio,
         jsonb_agg(distinct s.aspects) as aspect_blob
  from reviews r join review_sentiment s using (review_id)
  group by r.asin;

-- ─── Fees (versioned config, scraped from sell.amazon.eg/pricing) ───────────
create table fees (
  id bigint generated always as identity primary key,
  as_of date not null,
  vat_rate numeric not null default 0.14,
  fba_price_band_egp numeric default 350,
  storage_egp_cuft_month numeric default 4,
  referral jsonb not null,                       -- [{category,tiers,minFee}]
  fba_ladder jsonb not null,                     -- [{sizeTier,maxWeightKg,low,high}]
  source text not null default 'amazon_html_product'
);

-- ─── User-owned: watchlists, alerts, CSV imports ────────────────────────────
create table watchlists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_id uuid not null references users(id),
  name text not null,
  created_at timestamptz not null default now()
);
create table watchlist_items (
  watchlist_id uuid references watchlists(id) on delete cascade,
  asin text references products(asin),
  added_at timestamptz not null default now(),
  primary key (watchlist_id, asin)
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_id uuid not null references users(id),
  asin text references products(asin),
  rule_type text not null,                       -- price_drop|bsr_rising|back_in_stock|rating_drop
  threshold jsonb not null,                      -- {pct:10} / {window:'24h',deltaLog:0.3}
  channel text not null default 'in_app',        -- in_app|email
  active boolean not null default true,
  last_fired_at timestamptz,
  created_at timestamptz not null default now()
);
create table alert_events (
  id bigint generated always as identity primary key,
  alert_id uuid references alerts(id) on delete cascade,
  fired_at timestamptz not null default now(),
  payload jsonb
);

create table csv_imports (                       -- manual CSV adapter landing
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  owner_id uuid not null references users(id),
  filename text, row_count int,
  status text not null default 'pending',
  mapping jsonb,                                 -- column→normalized field map
  created_at timestamptz not null default now()
);

-- ─── RLS (illustrative) ──────────────────────────────────────────────────────
alter table watchlists enable row level security;
create policy tenant_isolation on watchlists
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
-- (same pattern on alerts, watchlist_items, csv_imports, users)
```

**Derived metrics (materialized views / scheduled SQL):**

* `riser_daily`: `Δlog(BSR) = ln(bsr_prev) − ln(bsr_now)` over the window per `(asin, category_node)`; require ≥2 snapshots and a minimum prior BSR to suppress null-entry noise; rank descending.
* `bestseller_current`: latest list snapshot per category, ordered by `list_rank`.
* `sales_band`: log(BSR) percentile bucket **within category** (Very High / High / Moderate) — never a unit count, never cross-category.

---

## 5. Scraping worker + scheduler

### 5.1 Worker design (two-tier fetch)

* **Tier A — TLS-impersonating HTTP** (`curl_cffi impersonate=chrome` in a Python micro-fetcher, or `curl-impersonate`/Crawlee HTTP in Node). Default path for static fields (bestsellers cards 1–30, product title/price/BSR, autocomplete JSON). ~94% vs ~2% for plain `requests` — the single biggest free lever.
* **Tier B — Playwright + stealth** (Chromium, `playwright-extra` + stealth plugin). **Escalation only** when Tier A returns a partial list (lazy-load cards 31–50 need scroll-to `.a-pagination`), a JS-gated review set, or a `blocked` response. Block images/fonts/CSS via request interception to cut bandwidth.
* **Crawlee** wraps both behind one `RequestQueue` (persistent, dedupes ASINs, resumes after crash), `SessionPool` (warm cookies persisted across runs), autoscaling concurrency, retries.
* Workers run as a **separate BullMQ Worker process** — never inside the Next.js web process.

### 5.2 Scheduler (pick by host)

| Host profile | Scheduler | Cadence mechanism |
|---|---|---|
| VPS / always-on (recommended) | **BullMQ Job Schedulers + Redis** | repeatable jobs, retry/backoff, Bull Board monitoring |
| Supabase-centric | **pg_cron** → HTTP webhook / Edge Function that enqueues | ≤32 concurrent jobs; free trigger |
| Zero-infra | **GitHub Actions cron** | 5-min floor, best-effort, **avoid on-the-hour** (use `17 3 * * *`); fine for daily/weekly/monthly |

### 5.3 Refresh cadence

| Signal | Source | Cadence | Rationale |
|---|---|---|---|
| Movers & Shakers list | `amazon_html_movers` | **hourly** (data budget permitting) → realistic floor 2–4×/day | Amazon recomputes momentum hourly |
| Best Sellers list | `amazon_html_bestsellers` | **every 1–3h** → realistic 1–4×/day at fixed hour | BSR updates ~hourly; sample same hour to kill phase noise |
| Per-product BSR / price (watchlisted) | `amazon_html_product` | **daily at fixed hour** (price re-check 6–24h) | Feeds risers + Keepa chart; same-hour sampling |
| Autocomplete demand | `amazon_autocomplete` | **daily** refresh of tracked terms + **weekly** full seed sweep | Builds rank-trend; endpoint tolerates volume |
| Reviews | `amazon_html_reviews` | **weekly** per active ASIN (login-gated, costly) | ~50–100 logged-out cap; star/sort passes for breadth |
| Fee schedule | `sell.amazon.eg/pricing` | **monthly** (or on alert) | Rarely changes; versioned `fees` rows |
| Category tree (nav harvest) | bestsellers left-rail BFS | **weekly** | Node IDs not published for .eg |
| Snapshot retention | — | **rolling 90 days** hot; archive older | Trend/seasonality + median smoothing |

### 5.4 Anti-block design

* **Detection:** treat `503 | 429 | 403` **and** HTTP-200 bodies containing `Robot Check` / `validateCaptcha` / `Enter the characters` as `blocked=true`. Status alone is insufficient — Amazon serves CAPTCHA at 200.
* **Backoff:** exponential `2^n` with cap → rotate UA + egress IP → cool the IP minutes–hours → reschedule the job rather than hammer.
* **Pacing:** **Poisson-distributed** delays, mean ~3–5s/worker, **never uniform** (uniform timing is itself a bot tell). Add longer "reading" pauses. Conservative single-IP start ~10–15 req/min.
* **Identity:** recent-Chrome UA with **matching** `sec-ch-ua` + `Accept-Language` (`en-AE,en;q=0.9` or `ar-EG,ar;q=0.9`); seed cookies (`session-id`, `i18n-prefs={'currency':'EGP'}`); persist a warm session across a product + its review/offer subpages.
* **Proxies:** datacenter/free pools fail ~90% at scale → **residential/mobile mandatory** for production. Free single-IP curl_cffi sustains a few hundred–~1–2k pages/day before reputation decay. Documented paid floor: rotating residential ~$3.50/mo; Firecrawl free (1,000 credits/mo, stealth=5 credits/page) as a managed burst fallback when the home IP is burned.
* **Selector resilience:** match by **class prefix** (`span[class*='p13n-sc-price']`), keep an **enumerate-index rank fallback**, store selectors in config, and **alarm on `null_rate`** per `scrape_run` (selector-drift early warning).
* **Compliance guardrails (built into the fetcher):** stay logged out, honor `robots.txt` (skip `/gp/cart`, `/ap/signin`, `/gp/wishlist/`, most `/-/` except `/-/en/`), do **not** send recognizable scraper/AI UAs (they sit in an explicit `Disallow: /`), scope to non-personal commercial fields, treat the cache as private (short TTL, no republication), and **kill-switch** on any cease-and-desist or persistent CAPTCHA wall.

---

## 6. Time-series storage for BSR deltas / rising detection

* **Storage:** append-only `rankings` (per-product BSR) + `snapshots` (price). Optional **TimescaleDB** hypertables; otherwise native Postgres + `BRIN(captured_at)` keeps indexes tiny on heavy-tailed time-series.
* **Sampling discipline:** capture at a **fixed hour daily** so intraday rank churn doesn't masquerade as movement.
* **Rising metric (most defensible):** rank velocity in **log space** — `Δlog(BSR) = ln(BSR_prev) − ln(BSR_now)`; positive = improving. Equivalent Movers-style %: `(BSR_prev − BSR_now)/BSR_prev`. Smooth in log because BSR is heavy-tailed.
* **Noise control:** require gain to persist ≥2 snapshots (daily) or a positive regression slope (weekly/monthly); exclude items entering from null/very-deep ranks; down-weight single-snapshot spikes; flag thin categories ("few competing listings — rank volatile").
* **"Most selling":** ordinal BSR **within category** only. Optional `sales_band` from log(BSR) percentiles. A unit number, if shown at all, is gated behind a "rough estimate ± wide range" using `Daily ≈ A·BSR^B` with **category-specific** coefficients — and Egypt has no ground-truth to calibrate, so any unit display is a labelled order-of-magnitude band, never a point value. **Misleading "X units sold" = Critical defect.**

---

## 7. Review storage + Arabic/English sentiment pipeline

* **Storage:** `reviews` (UTF-8, RTL preserved, dedup on `review_id` across star/sort passes) + `review_sentiment` (label/score/aspects) + `product_sentiment_rollup` (materialized).
* **Worker:** optional **Python service** consuming a `reviews:new` queue (or polling unprocessed rows). All models free/CPU, Apache/MIT.
* **Pipeline:**
  1. **Normalize + detect** — CAMeL Tools Arabic normalization (dediac, strip tatweel, normalize alef/ya/ta-marbuta); language/script via fastText `lid.176`/langdetect; optionally transliterate Arabizi ("3ayez", "msh helw") → Arabic.
  2. **Route by language** — Arabic (incl. Egyptian "Masry") → **MARBERTv2** sentiment fine-tune (`Ammar-alhaj-ali/arabic-MARBERT-sentiment`, 3-class) or fine-tuned EgyBERT; English → **DistilBERT-SST-2** or `cardiffnlp/twitter-roberta-base-sentiment-latest`. Map all to `{positive, neutral, negative}`; cross-check vs star rating (1–2★ + positive ⇒ flag).
  3. **Themes (extractive, cheap)** — embed with `paraphrase-multilingual-MiniLM-L12-v2`; **KeyBERT** keyphrases (ngram 1–3, MMR, AR+EN stopwords) → PROS from positive set, CONS from negative set, with the highest-similarity real sentence as evidence quote; **BERTopic** for recurring topics across many reviews. Map to fixed Egypt aspect buckets: **Quality, Price/EGP value, Shipping/Delivery, Authenticity/counterfeit ("مقلد"), Packaging, Seller/service, Battery, Sizing**, with per-aspect % positive.
* **Runtime:** ~110M-param encoders ≈ 0.4–0.5 GB each, 1–2 GB RAM, CPU-fine for nightly batches (`batch_size=32`, truncate 128–256 tokens). Validate on ~200 hand-labelled real amazon.eg reviews (MSA/Masry/Arabizi/English) before trusting class accuracy — published F1s are on tweets.

---

## 8. Search-by-name flow

```
User types name (EN or AR)
   │
   ▼
[App] Search service ──► registry.resolve("search", {preferCost: tenantPlan==="pro" ? "paid" : "free"})
   │                         (free → amazon_html_serp via Playwright; paid → PA-API/Keepa later)
   ├─► 1) Cache check (Redis): normalized query key → recent ASIN set?  → return
   ├─► 2) Autocomplete expansion (amazon_autocomplete): completion.amazon.com
   │        ?mid=ARBP9OOSHTCHU&alias=aps&prefix=<q>&lop=ar_EG|en   → ranked queries
   ├─► 3) SERP enrichment (amazon_html_serp, Playwright; SERP returns 503 to plain fetch):
   │        parse div[data-component-type=s-search-result] → asin, title,
   │        span.a-price .a-offscreen (EGP), rating, review count, img, Sponsored flag
   ├─► 4) Upsert products + snapshots; link keyword_products
   └─► 5) Return normalized list → grid; queue watchlisted ASINs for detail/reviews/sentiment
```

* Autocomplete output is labelled **"estimated demand proxy (autocomplete-derived), not true search volume."**
* Send browser-like UA + `session-id` + cache-buster `_=<epoch>` to the completion endpoint (empty array otherwise is an anti-automation artifact, not an unsupported mid).

---

## 9. Caching

| Layer | Tech | TTL / policy |
|---|---|---|
| Hot read cache (lists, product cards, search results) | Redis | 15 min (lists/SERP), 6–24h (product detail), 15 min (autocomplete) |
| Derived metrics (risers, bestsellers, sentiment rollup) | Postgres **materialized views** | refreshed by metrics job after each scrape batch |
| Scrape-frontier dedupe | Crawlee `RequestQueue` + `rawHash` on snapshots | skip re-fetch if unchanged within cadence |
| Client | Next.js Route Handler cache + TanStack Query | `staleWhileRevalidate`; server pagination |
| Cookie/session jar, proxy health | Redis | per-session warm cookies; proxy success-rate gauges |

**Caching is the highest-leverage free mitigation:** dedupe ASINs, re-fetch only on schedule, conditional logic so a single-IP crawler stays sustainable.

---

## 10. Auth & multi-tenancy

* **Auth:** Supabase Auth (email/OAuth) issuing JWTs that embed `tenant_id` + `role`.
* **Isolation:** Postgres **RLS** on every user-owned table keyed to `auth.jwt() ->> 'tenant_id'`. Shared scrape cache (products/snapshots/rankings/reviews/keywords/fees) is global read; writes restricted to the worker service role.
* **Roles:** `owner | admin | member | viewer`. Watchlists/alerts/CSV imports are tenant-scoped; the scraped catalogue is shared so one tenant's scraping benefits all (and stays within free rate budgets).
* **Plan gating:** `tenants.plan` selects adapter `preferCost` (free SERP vs paid PA-API/Keepa), scrape frequency, alert channels, and CSV import quota.
* **CSV adapter:** `manual_csv` lands rows into `csv_imports` with a column→normalized-field `mapping`, then emits the same `NormalizedProduct`/`NormalizedRanking` DTOs — a tenant can seed or override data without scraping.

---

## 11. Requirements → scrape source → reliability

| # | User requirement | Primary scrape source (free) | Key fields / method | Reliability | Paid-ready fallback |
|---|---|---|---|---|---|
| 1 | **Most-selling / Best Sellers** (per category, ordinal) | `amazon.eg/-/en/gp/bestsellers/<cat>` (HTML, Playwright for lazy cards 31–50) | rank `span.zg-bdg-text`, `data-asin`, title `[class*=p13n-sc-css-line-clamp]`, price `[class*=p13n-sc-price]` (EGP), rating, reviews, image; paginate `?pg=2` | **Medium-High** — list is reliable; **absolute units NOT verifiable** for EG (label as ordinal/estimated) | Keepa "Monthly Sold" / PA-API rank → `rankings` |
| 2 | **Rising / Movers & Shakers** (momentum) | `amazon.eg/-/en/gp/movers-and-shakers` (HTML) **+** self-computed `Δlog(BSR)` from `rankings` snapshots | same card selectors + gain badge (`+1,234%` / "was #X"); our own fixed-hour BSR time-series is the defensible signal | **High** (our Δlog metric, no sales model) / **Medium** (Amazon's own list, hourly, thin-category noise) | PA-API/Keepa rank history → same Δlog math |
| 3 | **Estimated demand / "most searched"** (keywords) | `completion.amazon.com/api/2017/suggestions?mid=ARBP9OOSHTCHU&alias=aps&prefix=…&lop=ar_EG\|en` (JSON) | ordered `suggestions[].value`; seed/alphabet expansion; score = f(min array rank, appearance count) | **Medium** — clean JSON, scrape-friendly, but **ordinal proxy only, no true volume** (must be labelled) | (no direct paid equiv on EG; Keepa lacks EG) — keep demand_score model |
| 4 | **Reviews + AR/EN sentiment** (pros/cons, themes) | `amazon.eg/-/en/product-reviews/<ASIN>` (HTML, Playwright) → Python sentiment worker | `div[data-hook=review]` (id, `.a-profile-name`, stars, title, body, date, `avp-badge`, helpful); star/sort passes for breadth; MARBERTv2(ar)+DistilBERT(en)+KeyBERT | **Medium** — full content **login-gated** (~50–100 logged-out cap; histogram/count logged-out-safe); sentiment unvalidated on EG until hand-labelled | PA-API exposes **no** review text → scrape stays primary; aggregates from detail page |

**Cross-cutting reliability note:** every source is fronted by AWS WAF (verified **503** on plain datacenter fetches of bestsellers, product, reviews, and SERP). All four flows therefore depend on the shared anti-block engine (TLS-impersonate → Playwright fallback, residential IPs, Poisson pacing, CAPTCHA-aware backoff). Selector hashes (`_3mJ9Z`, `_g3dy1`) rotate on Amazon deploys → prefix-match + `null_rate` alarms. Browse-node IDs for .eg are unpublished → harvested weekly from the live left-rail. The legal posture is **contractual ToS risk** (Amazon COU bans data-mining), mitigated by staying logged-out, low-volume, non-republishing, and personal-use scoped.

---

## 12. Recommended free stack (concrete)

| Layer | Choice | Paid upgrade path |
|---|---|---|
| Frontend | Next.js App Router · TypeScript · shadcn/ui · Tailwind (RTL via logical props) · TanStack Table · Recharts | — |
| API | Next.js Route Handlers / Server Actions · Zod · tRPC-or-REST | — |
| DB | Supabase Postgres (+ RLS, optional TimescaleDB, BRIN indexes) | Supabase Pro / dedicated PG |
| Cache + queue | Redis (Upstash free) + BullMQ | managed Redis |
| Scraper | Crawlee (Cheerio/HTTP-first → Playwright+stealth fallback); curl_cffi TLS micro-fetcher | residential proxies ~$3.50/mo · Firecrawl stealth · **Keepa / PA-API 5.0 adapter** |
| Scheduler | pg_cron (Supabase) **or** BullMQ Job Schedulers (VPS) **or** GitHub Actions cron (zero-infra) | dedicated worker host |
| Sentiment | Python worker: transformers (MARBERTv2 / DistilBERT) · CAMeL Tools · KeyBERT · BERTopic · sentence-transformers (CPU) | GPU batch host |
| Auth | Supabase Auth (JWT w/ `tenant_id`) | SSO/SAML |

**Bottom line:** the `DataAdapter` interface + immutable normalized snapshots are the architectural spine — they let a $0 scraping build run today and let Keepa/PA-API drop in tomorrow without touching storage, metrics, charts, or UI. Every demand/sales number is modeled and labelled; the most defensible signal you ship is your own fixed-hour `Δlog(BSR)` rising metric.