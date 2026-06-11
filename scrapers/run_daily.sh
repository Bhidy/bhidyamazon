#!/bin/bash
# Rasid LOCAL/BACKUP scrape — amazon.eg best sellers/detail/reviews + EG keywords.
# The PRIMARY writer is the cloud workflow (.github/workflows/scrape-and-deploy.yml,
# daily, Firecrawl); this launchd agent is the residential-IP backup. It pulls the
# cloud's latest commits before scraping so the two writers never diverge.
# Single-instance lock, daily log, inherits the kill-switch in fetch.py (stop-on-block).
# MUST run from a residential IP — amazon.eg serves 200 to residential, 503 to datacenter.
set -uo pipefail

REPO="/Users/home/Documents/Amazon"
LOG_DIR="$REPO/scrapers/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/scrape-$(date +%Y%m%d).log"
LOCK="/tmp/rasid_scrape.lock"

# Single instance: mkdir is atomic.
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "$(date '+%F %T') another run in progress — skipping" >>"$LOG"
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

PY="$(command -v python3)"
echo "=== $(date '+%F %T') scrape start (py=$PY) ===" >>"$LOG"

# Sync to the cloud writer's latest BEFORE scraping, so a local run never works
# on a stale base or produces a divergent data commit. If the pull fails
# (offline / conflict), continue — the run stays local-only; do not push it.
git -C "$REPO" pull --rebase --autostash >>"$LOG" 2>&1 \
  || echo "$(date '+%F %T') git pull failed — continuing on local base (do NOT push this run)" >>"$LOG"

"$PY" "$REPO/scrapers/run.py" >>"$LOG" 2>&1
rc_scrape=$?
echo "--- $(date '+%F %T') trends (rc_scrape=$rc_scrape) ---" >>"$LOG"
"$PY" "$REPO/scrapers/trends.py" >>"$LOG" 2>&1
echo "=== $(date '+%F %T') done ===" >>"$LOG"
