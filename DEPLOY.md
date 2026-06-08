# Rasid — Deployment & Operations Runbook

The app reads **real amazon.eg data** through one seam (`web/src/lib/data.ts` →
`real-store.ts`). The scraper must run from a **residential IP** (amazon.eg serves
`200` to residential, `503` to datacenter/cloud). Everything below follows from
that one fact.

---

## 0. Current state (works today, $0)
- Scraper: `scrapers/{fetch,parse,run,trends}.py` → writes `web/src/data/real/*.json`.
- Scheduled: `launchd` agent `com.rasid.amazoneg.scrape` (installed; runs 09:07 + 21:13 Cairo).
- App: `web/` (Next.js) reads those JSON files via `fs`. Run locally: `npm --prefix web run dev`.

**The ONE manual step (laptop wake):** a laptop won't run the job while asleep. Either keep it
awake/plugged at the two times, or run once (admin password):
```bash
sudo pmset repeat wakeorpoweron MTWRFSU 09:05:00
```
Disable the scraper anytime: `launchctl unload ~/Library/LaunchAgents/com.rasid.amazoneg.scrape.plist`

---

## 1. Deploy — Option A: "committed data" (RECOMMENDED, simplest, $0)
The residential cron commits fresh data to the repo; Vercel auto-redeploys. **No Supabase,
no async refactor** — the app keeps reading JSON via `fs` at build time. Data refreshes twice daily.

**You do (one-time):**
1. Push this repo to GitHub (the `github` integration is connected).
2. Create a free **Vercel** account → New Project → import the repo → set **Root Directory = `web`** → Deploy. You get a live `*.vercel.app` URL.
3. Let the cron push data: append to `scrapers/run_daily.sh` (after the scrape) —
   ```bash
   cd "$REPO" && git add web/src/data/real && git commit -m "data: $(date -u +%FT%TZ)" && git push
   ```
   (Configure a git credential/PAT once so the unattended push works.)

That's it — every scrape commits real data, Vercel rebuilds, the live site shows fresh Egypt data.

---

## 2. Deploy — Option B: Supabase (dynamic, real-time-ish, scale-up)
Use when you outgrow twice-daily static rebuilds.

**You do:**
1. Create a free **Supabase** project. Copy the Project URL + `anon` + `service_role` keys.
2. Apply the schema: `supabase db push` (or `psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql`).
3. Set env (see `.env.example`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (scraper writes),
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (app reads).
4. Point the scraper at Supabase (add an `upsert` step writing `products/snapshots/rankings/reviews/keyword_snapshots`).

**Code change required (follow-up, ~1 file):** `data.ts` functions are currently **synchronous**
(file read). Reading Supabase is async → the 8 functions + the screens that call them become
`async/await`. This is the only refactor; the domain types and UI are unchanged. The append-only
`snapshots`/`rankings` tables make `getBsrHistory`/movers genuinely historical, and the `riser_daily`
view computes Δlog(BSR) rising server-side.

---

## 3. Deploy — Option C: cloud cron via managed scraper (if no residential box)
If you can't keep a residential machine running, run the scrape in the cloud through
**Firecrawl** (already installed + authenticated, ~1,000 free credits/mo, live-tested on amazon.eg):
swap the `fetch.fetch()` transport for `firecrawl scrape "<url>" --country EG --format markdown`
behind the same kill-switch. Or a residential proxy (Webshare free 1 GB/mo) on a normal cloud cron.

---

## 4. Auth (when you add multi-user)
Supabase Auth (email/OAuth) issues a JWT with `tenant_id`; RLS policies in the migration isolate
`watchlists`/`alerts` per tenant. Until then the app is single-user/local.

## 5. Guardrails (baked into the scraper — keep them)
Logged-out only · public pages only · rate-limited (10–18 s jitter, serial) · stop-on-block
(kill-switch) · no PII stored · private cache · personal/non-commercial use. Never rotate IPs to
evade a block. These keep the scrape in the low-risk lane.

## 6. Your activation checklist
- [ ] `sudo pmset repeat wakeorpoweron MTWRFSU 09:05:00` (laptop wake)
- [ ] Push repo to GitHub
- [ ] Vercel: import repo, Root = `web`, deploy  (Option A)
- [ ] Add the `git push` line to `run_daily.sh` + a git credential  (Option A)
- [ ] (optional) Supabase project + keys + `supabase db push`  (Option B)
- [ ] (optional) free Firecrawl key at firecrawl.dev for the cloud fallback
