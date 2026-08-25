# CLI reference

```
npx geo-tool-check <url> [options]
```

## Options

| Flag                  | Effect                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| `--json`              | Machine-readable output (stable field names, see below)                |
| `--min-score <0-100>` | Exit with code 1 when the score is below the threshold — built for CI  |
| `--crawlers`          | Only check which AI crawlers robots.txt blocks (faster, no page fetch) |
| `--lang <de\|en>`     | Language of labels and details. Default: `en`                          |
| `--mcp`               | Start the MCP server instead of the CLI ([guide](mcp.md))              |
| `-h`, `--help`        | Show help                                                              |

## Exit codes

| Code | Meaning                                                                                    |
| ---- | ------------------------------------------------------------------------------------------ |
| `0`  | Success (including help output)                                                            |
| `1`  | Quality failure: score below `--min-score`, or `--crawlers` found a blocked scored crawler |
| `2`  | Configuration error: missing URL, invalid `--min-score`, unexpected runtime error          |

Notes that matter in CI:

- An **unreachable page scores 0**, so `--min-score` fails it (exit 1) —
  a dead page is a failed readiness check, not an infrastructure shrug.
- The blocked-crawler exit 1 applies to the human-readable `--crawlers` view.
  With `--crawlers --json` the exit code stays 0 and your script decides —
  the JSON contains `blocked` and `countsTowardScore` per crawler.

## JSON output

`--json` prints one object with stable field names:

```json
{
  "url": "https://example.com/",
  "reachable": true,
  "httpStatus": 200,
  "responseMs": 238,
  "score": 92,
  "readiness": "Excellent",
  "breakdown": [{ "category": "directAnswers", "score": 25, "maxScore": 25 }],
  "findings": [{ "id": "...", "label": "...", "status": "pass", "detail": "..." }],
  "blockedCrawlers": [],
  "wordCount": 534,
  "llmsTxt": true
}
```

`--crawlers --json` returns `origin`, `robotsTxtFound`, and a `crawlers` array
with `token`, `operator`, `blocked`, `countsTowardScore`, and a one-line `note`
per crawler.

## Examples

```bash
# Fail the pipeline when the marketing page drops below 70
npx geo-tool-check https://example.com --min-score 70

# Track a score over time
npx geo-tool-check example.com --json | jq .score

# German findings for a German team
npx geo-tool-check example.com --lang de
```

For running these in CI, see the [GitHub Actions guide](github-actions.md).
The same score with a prioritized fix list is available in the free audit at
[geo-tool.com](https://www.geo-tool.com).
