-- Rasid — production schema (Supabase/Postgres). Pipeline writes; app reads.
-- Append-only snapshots so BSR history becomes real over time. Shared scrape
-- cache is global-read; user-owned tables are tenant-scoped via RLS.
-- Apply:  supabase db push   (or psql -f this file)

-- ─── Tenancy & auth ──────────────────────────────────────────────────────────
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',                  -- free | pro | team
  created_at timestamptz not null default now()
);

create table if not exists app_users (                -- mirrors auth.users
  id uuid primary key,                                -- = auth.uid()
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null unique,
  role text not null default 'member',                -- owner | admin | member | viewer
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

-- ─── Scrape governance ───────────────────────────────────────────────────────
create table if not exists sources (
  id text primary key,                                -- SourceType (amazon_html_bestsellers, google_trends, …)
  cost_class text not null default 'free',
  reliability text not null default 'high',
  enabled boolean not null default true,
  last_health jsonb
);

create table if not exists scrape_runs (
  id bigint generated always as identity primary key,
  source text references sources(id),
  job_type text not null,                             -- bestsellers | product | reviews | trends | …
  status text not null,                               -- ok | partial | failed | blocked
  started_at timestamptz, finished_at timestamptz,
  requested int default 0, succeeded int default 0, blocked int default 0,
  null_rate numeric,                                  -- selector-drift alarm
  meta jsonb
);

-- ─── Catalogue ───────────────────────────────────────────────────────────────
create table if not exists categories (
  node_id text primary key,                           -- slug or harvested numeric node
  slug text, name_en text, name_ar text,
  parent_node text references categories(node_id),
  list_url text
);

create table if not exists products (
  asin text primary key,
  title_en text, title_ar text,
  brand text,
  category_node text references categories(node_id),
  image_url text, product_url text,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  attributes jsonb
);
create index if not exists products_brand_idx on products (brand);
create index if not exists products_cat_idx on products (category_node);

-- ─── Time-series (append-only) ───────────────────────────────────────────────
create table if not exists snapshots (
  asin text not null references products(asin),
  captured_at timestamptz not null default now(),
  source text not null references sources(id),
  price_egp numeric, in_stock boolean,
  rating numeric, review_count int,
  is_estimated boolean not null default false,
  confidence text,                                    -- high | medium | low
  primary key (asin, captured_at, source)
);
create index if not exists snapshots_asin_time on snapshots (asin, captured_at desc);
create index if not exists snapshots_time_brin on snapshots using brin (captured_at);

create table if not exists rankings (
  asin text not null references products(asin),
  category_node text not null references categories(node_id),
  list_type text,                                     -- bestsellers | movers | detail
  list_rank int,                                      -- position on the list page (#1..)
  bsr int,                                            -- leaf Best Seller Rank (nullable)
  bsr_category text,
  gain_pct numeric,                                   -- movers / derived velocity
  captured_at timestamptz not null default now(),
  source text not null references sources(id),
  primary key (asin, category_node, captured_at, source)
);
create index if not exists rankings_cat_time on rankings (category_node, captured_at desc);
create index if not exists rankings_asin_time on rankings (asin, captured_at desc);

-- ─── Keywords / demand (Google Trends EG) ────────────────────────────────────
create table if not exists keywords (
  id bigint generated always as identity primary key,
  query text not null, lang text not null,
  unique (query, lang)
);
create table if not exists keyword_snapshots (
  keyword_id bigint not null references keywords(id),
  captured_at timestamptz not null default now(),
  demand_score numeric,                               -- 0–100 RELATIVE interest (Trends)
  trend text,                                         -- rising | flat | falling
  source text not null default 'google_trends',
  is_estimated boolean not null default true,
  primary key (keyword_id, captured_at)
);

-- ─── Reviews + sentiment ─────────────────────────────────────────────────────
create table if not exists reviews (
  review_id text primary key,
  asin text not null references products(asin),
  rating numeric, title text, body text,
  detected_lang text,                                 -- ar | en | mixed
  author_name text, reviewed_at text,
  verified_purchase boolean, helpful_votes int,
  scraped_at timestamptz not null default now(),
  source text references sources(id)
);
create index if not exists reviews_asin on reviews (asin);

create table if not exists review_sentiment (
  review_id text primary key references reviews(review_id) on delete cascade,
  model text, label text, score numeric, aspects jsonb,
  processed_at timestamptz not null default now()
);

-- ─── Fees (versioned config) ─────────────────────────────────────────────────
create table if not exists fees (
  id bigint generated always as identity primary key,
  as_of date not null,
  vat_rate numeric not null default 0.14,
  fba_price_band_egp numeric default 350,
  referral jsonb not null, fba_ladder jsonb not null
);

-- ─── User-owned (tenant-scoped, RLS) ─────────────────────────────────────────
create table if not exists watchlists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_id uuid not null references app_users(id),
  name text not null,
  created_at timestamptz not null default now()
);
create table if not exists watchlist_items (
  watchlist_id uuid references watchlists(id) on delete cascade,
  asin text references products(asin),
  added_at timestamptz not null default now(),
  primary key (watchlist_id, asin)
);
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_id uuid not null references app_users(id),
  asin text references products(asin),
  rule_type text not null,                            -- price_drop | bsr_rising | back_in_stock | rating_drop
  threshold jsonb not null,
  channel text not null default 'in_app',
  active boolean not null default true,
  last_fired_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── RLS: shared cache = read-only to all; user tables = tenant-isolated ─────
alter table watchlists enable row level security;
alter table watchlist_items enable row level security;
alter table alerts enable row level security;

create policy tenant_rw_watchlists on watchlists
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy tenant_rw_alerts on alerts
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
-- watchlist_items has RLS enabled above; scope it through its parent watchlist
-- (without a policy, RLS-enabled = deny-all, which would block legitimate reads).
create policy tenant_rw_watchlist_items on watchlist_items
  using (exists (select 1 from watchlists w
                 where w.id = watchlist_id
                   and w.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid))
  with check (exists (select 1 from watchlists w
                      where w.id = watchlist_id
                        and w.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid));

-- ─── Derived metric: rising via Δlog(BSR) over the trailing window ───────────
create or replace view riser_daily as
  with windowed as (
    select asin, category_node, bsr, captured_at,
           first_value(bsr) over w as bsr_now,
           last_value(bsr)  over w as bsr_prev
    from rankings
    where bsr is not null and captured_at > now() - interval '8 days'
    window w as (partition by asin, category_node order by captured_at desc
                 rows between unbounded preceding and unbounded following)
  )
  select distinct asin, category_node,
         ln(nullif(bsr_prev,0)) - ln(nullif(bsr_now,0)) as rise_score
  from windowed
  where bsr_prev is not null and bsr_now is not null
  order by rise_score desc;

insert into sources (id, cost_class, reliability) values
  ('amazon_html_bestsellers','free','high'),
  ('amazon_html_product','free','high'),
  ('amazon_html_reviews','free','medium'),
  ('google_trends','free','low')
on conflict (id) do nothing;
