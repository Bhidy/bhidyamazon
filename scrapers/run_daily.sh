#!/bin/bash
# Rasid daily real-data scrape — amazon.eg best sellers/detail/reviews + Google Trends EG.
# Single-instance lock, daily log, inherits the kill-switch in fetch.py (stop-on-block).
# Installed as a launchd agent (see com.rasid.amazoneg.scrape.plist). MUST run from a
# residential IP — amazon.eg serves 200 to residential, 503 to datacenter.
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
"$PY" "$REPO/scrapers/run.py" >>"$LOG" 2>&1
rc_scrape=$?
echo "--- $(date '+%F %T') trends (rc_scrape=$rc_scrape) ---" >>"$LOG"
"$PY" "$REPO/scrapers/trends.py" >>"$LOG" 2>&1
echo "=== $(date '+%F %T') done ===" >>"$LOG"
