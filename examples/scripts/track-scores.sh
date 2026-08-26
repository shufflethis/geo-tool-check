#!/usr/bin/env bash
# Appends one CSV row per URL: date, url, score, readiness, response ms.
# Run daily via cron and you have a score history without any service:
#   0 6 * * * /path/to/track-scores.sh >> geo-scores.csv
set -euo pipefail

URLS=(
  "https://example.com/"
  "https://example.com/pricing"
)

for url in "${URLS[@]}"; do
  npx -y geo-tool-check "$url" --json |
    jq -r --arg d "$(date +%F)" '[$d, .url, .score, .readiness, .responseMs] | @csv'
done
