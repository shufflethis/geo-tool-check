# Getting started

geo-tool-check answers one question: **can AI search systems read, understand,
and cite this page?** It is the command-line and MCP companion to the free
[GEO audit on geo-tool.com](https://www.geo-tool.com) and computes the same
0–100 score with the same engine.

## Requirements

- Node.js 18 or newer (`node --version`)
- Nothing else — the package has zero runtime dependencies

## First check

```bash
npx geo-tool-check example.com
```

The scheme is optional (`https://` is assumed). You get:

1. **Score 0–100** with a verdict (Excellent / Good / Fair / Poor)
2. **Six category bars** — direct answers, structure, schema markup,
   citations, multimedia, platform specifics
3. **Findings** — what stands in the way, most important first
4. **Blocked crawlers** — AI bots your robots.txt locks out

## The three everyday commands

```bash
# Full readiness check for one page
npx geo-tool-check https://example.com/pricing

# Only the robots.txt view: which AI crawlers are blocked?
npx geo-tool-check example.com --crawlers

# Machine-readable, e.g. for scripts and dashboards
npx geo-tool-check example.com --json
```

German output: add `--lang de`.

## Install it permanently (optional)

```bash
npm install -g geo-tool-check
geo-tool-check example.com
```

`npx` works fine without installing; a global install just skips the
first-run download.

## Where to go next

- Gate deploys on a minimum score: [GitHub Actions guide](github-actions.md)
- Let your AI agent run checks: [MCP server guide](mcp.md)
- Understand the number: [How scoring works](scoring.md)
- If a result surprises you: [Troubleshooting](troubleshooting.md)

When you want optimization actions beyond the score — concrete fixes with
examples — run the free full audit at
[geo-tool.com](https://www.geo-tool.com); it uses the same engine and adds a
prioritized action list.
