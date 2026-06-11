# Rasid — Deployment & Operations Runbook

The app reads **real amazon.eg data** through one seam (`web/src/lib/data.ts` →
`real-store.ts`), from JSON committed under `web/src/data/real/`. amazon.eg
serves `200` to residential traffic and `503` to datacenter/cloud IPs, so every
collection path is built around that fact.

---

## 0. Current production setup (what actually runs)

**Primary writer — fully cloud, $0:** `.github/workflows/scrape-and-deploy.yml`

1. Runs once daily (cron `17 6 * * *` ≈ 08:17 Cairo; GitHub's scheduler often
   adds a few hours of drift) and on manual dispatch.
2. Scrapes amazon.eg **through Firecrawl** (`RASID_FETCH=firecrawl`, country=EG,
   ~1 credit/page, per-run cap `RASID_FIRECRAWL_MAX=35` to protect the
   ~1,000/month free tier).
3. Refreshes demand keywords (`scrapers/trends.py`) as a **best-effort, alerted**
   step — a failure opens a deduped `keywords-stale` issue instead of passing
   silently.
4. **Schema gate:** the refreshed JSON must pass
   `web/src/lib/__tests__/real-data-integrity.test.ts` (the same validators the
   app enforces at read time, `web/src/lib/real-schema.ts`) BEFORE anything is
   committed.
5. Commits changed JSON back to the repo (append-only data history) and deploys
   to **Vercel production** (CLI pinned to `vercel@54`).
6. Any failed step auto-opens a tracking issue.

**Watchdog:** `.github/workflows/data-freshness.yml` checks the committed
timestamps every evening — `bestsellers.json` older than 36h or `keywords.json`
older than 72h opens a deduped `data-stale` issue.

**Quality gate:** `.github/workflows/ci.yml` runs lint + typecheck + unit tests
+ production build + the Python parser suite (`scrapers/tests/`) on every push/PR.

**Secrets** (GitHub Actions): `FIRECRAWL_API_KEY`, `VERCEL_TOKEN`,
`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. None are committed.

---

## 1. Local/backup writer (optional, residential IP)

`scrapers/run_daily.sh` + the launchd agent `com.rasid.amazoneg.scrape`
(09:07 + 21:13 Cairo) scrape directly with curl_cffi from a residential IP —
deeper enrichment than the lean Firecrawl budget allows.

- The script **pulls (`--rebase --autostash`) before scraping** so it never
  works on a base older than the cloud writer's latest commit.
- If the pull fails (offline), the run stays local-only — **do not push it**.
- A laptop won't run the job while asleep:
  `sudo pmset repeat wakeorpoweron MTWRFSU 09:05:00`
- Disable anytime:
  `launchctl unload ~/Library/LaunchAgents/com.rasid.amazoneg.scrape.plist`

If you keep both writers active, the cloud workflow remains the source of truth;
the local agent is a freshness/depth supplement.

---

## 2. Deploying the app itself

Vercel project with **Root Directory = `web`**. Pushes to `main` deploy via the
workflow (prebuilt); manual deploys work too (`vercel --cwd web`). The real-data
JSON is bundled into the serverless functions via `outputFileTracingIncludes`
(see `web/next.config.ts`) — without it the app silently falls back to seed data
in production.

Health probe: `GET /api/health` → `ok` (real data served, with any non-core
`issues` listed) or `degraded`/503 (manifest missing or a core file failed
schema validation). Suitable for uptime monitors.

---

## 3. Scale-up path — Supabase (when twice-daily static stops being enough)

Schema in `supabase/migrations/0001_init.sql` (append-only snapshots/rankings,
RLS-isolated user tables, `riser_daily` view). Steps:

1. Create a Supabase project; apply the schema (`supabase db push` or
   `psql -f supabase/migrations/0001_init.sql`).
2. Set env per `web/.env.example` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   for the scraper; `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   for the app).
3. Add an upsert step to the scraper (products/snapshots/rankings/reviews/
   keyword_snapshots).
4. Code change is confined to the seam: the `data.ts` functions become async
   (and their call sites await) — domain types and screens stay unchanged. The
   localStorage watchlist/alerts stores migrate to the RLS tables at the same
   time.

Auth (multi-user): Supabase Auth issues a JWT with `tenant_id`; the RLS policies
in the migration isolate `watchlists`/`alerts` per tenant. Until then the app is
single-user.

---

## 4. Guardrails (baked into the scraper — keep them)

Logged-out only · public pages only · rate-limited (10–18 s jitter, serial) ·
stop-on-block kill-switch (never rotate IPs to evade) · Firecrawl per-run budget
cap · no PII stored (reviewer names dropped at ingest) · private cache ·
personal/non-commercial use.

---

## 5. Operations cheat-sheet

| Task | How |
|---|---|
| Force a refresh now | Actions → scrape-and-deploy → Run workflow |
| Check data health | `GET /api/health`, or `meta.json` → `health` (fill rates, firecrawl_calls) |
| Scrape stopped? | Look for `data-stale` issues; check workflow runs + secrets + Firecrawl quota |
| Keywords stale? | `keywords-stale` issue; Demand Radar shows the channel's own age |
| Validate data locally | `cd web && npx vitest run src/lib/__tests__/real-data-integrity.test.ts` |
| Parser regression check | `python3 -m pytest scrapers/tests/ -q` |
| Smoke E2E locally | `cd web && npm run build && npm run e2e` |

**Known dependency advisory (accepted):** `npm audit` flags a moderate postcss
XSS advisory via Next.js's bundled postcss. The suggested "fix" downgrades to
`next@9` (nonsensical); the advisory concerns CSS stringification of untrusted
input, which this app never does. Re-evaluate on each Next.js upgrade.
