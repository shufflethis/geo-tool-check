# geo-tool-check

**Is this page readable for AI search?** One command answers it: crawler
access, structure, and citability for ChatGPT, Perplexity, Claude, and
Google AI — scored 0–100 with concrete findings.

```bash
npx geo-tool-check example.com
```

```
https://example.com/
92/100  Excellent  534 words · 238 ms

  directAnswers      25/25  ██████████████████
  structure          15/20  ██████████████░░░░
  schemaMarkup       15/15  ██████████████████
  citations          12/15  ██████████████░░░░
  multimedia          5/5   ██████████████████
  platformSpecific   20/20  ██████████████████
```

**Everything runs on your machine.** No account, no API key, no telemetry —
nothing is ever sent to geo-tool.com. The score is computed by the same engine
as the free [website audit on geo-tool.com](https://www.geo-tool.com), so the
number here matches the number there.

## What you get

- **CLI** — human-readable or `--json`, built for CI (`--min-score 70` fails
  the build below 70; a blocked scored AI crawler fails `--crawlers`).
- **MCP server** — three read-only tools for any MCP client (Claude, Cursor,
  VS Code, Codex, …): `check_ai_readiness`, `check_ai_crawlers`,
  `check_citability`. See [docs/mcp.md](docs/mcp.md).
- **Zero runtime dependencies** — the MCP stdio protocol is implemented
  directly. Node 18+ is all you need.

## Quick start

| I want to…                              | Run                                                     |
| --------------------------------------- | ------------------------------------------------------- |
| Score a page                            | `npx geo-tool-check example.com`                        |
| See which AI crawlers robots.txt blocks | `npx geo-tool-check example.com --crawlers`             |
| Gate a deploy in CI                     | `npx geo-tool-check https://example.com --min-score 70` |
| Use it from an AI agent (MCP)           | `npx geo-tool-check --mcp` — [setup guide](docs/mcp.md) |

More: [Copy-paste examples](examples/) ·
[Getting started](docs/getting-started.md) ·
[CLI reference](docs/cli.md) · [GitHub Actions](docs/github-actions.md) ·
[How scoring works](docs/scoring.md) · [FAQ](docs/faq.md) ·
[Troubleshooting](docs/troubleshooting.md) ·
[Architecture](docs/architecture.md)

## Claude Code plugin

Install once:

```
/plugin marketplace add geo-tool-com/geo-tool-check
/plugin install geo-tool-check@geo-tool
```

Then check any page with one command — works immediately, no restart needed:

```
/geo-tool-check example.com
```

## Honest limits

Node runs no JavaScript — and neither do GPTBot, ClaudeBot, or PerplexityBot.
A client-rendered page that scores low here **is the finding, not a
measurement gap**. To compare the crawler's view against the rendered page,
use the [browser extension](https://www.geo-tool.com/en/ext-report).

This checker measures whether a page **can** be read and cited. Whether AI
systems actually mention your brand in real answers is a different
measurement: the hosted [geo-tool.com workspace](https://www.geo-tool.com)
checks real AI answers (ChatGPT, Perplexity, Gemini) for your buying-intent
questions daily.

## Links

- npm: [geo-tool-check](https://www.npmjs.com/package/geo-tool-check)
- Smithery: [tracktronaut/geo-tool-check](https://smithery.ai/server/tracktronaut/geo-tool-check)
- Docs: [geo-tool.com/en/developers](https://www.geo-tool.com/en/developers)

## License

MIT. Built by [track by track GmbH](https://www.geo-tool.com).
