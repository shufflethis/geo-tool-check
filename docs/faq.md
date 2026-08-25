# FAQ

## What is Generative Engine Optimization (GEO)?

GEO means getting recommended in the answers of ChatGPT, Perplexity, Claude,
Google AI, and similar systems. Where classic SEO optimizes for a ranked list
of links, GEO optimizes for being **read, understood, and cited inside a
generated answer**. The levers overlap with SEO (crawlability, structure,
structured data) but the target is different: quotability.

## What is a GEO audit?

A GEO audit checks a site's readiness for AI search: can AI crawlers fetch it,
can models parse it without JavaScript, does the content answer questions
directly, is there schema markup and evidence worth citing? This package runs
that check locally; the free hosted
[audit on geo-tool.com](https://www.geo-tool.com) adds a prioritized list of
concrete optimization actions.

## How do I check whether ChatGPT can read my website?

```bash
npx geo-tool-check example.com
```

Two things must be true: robots.txt must not block OpenAI's crawlers
(GPTBot for training, OAI-SearchBot for ChatGPT search), and the content must
exist in the plain HTML — ChatGPT's crawlers do not execute JavaScript.
`--crawlers` shows the robots.txt view alone.

## What do GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, and Google-Extended do?

They are the fetchers of AI systems: **GPTBot** (OpenAI training),
**OAI-SearchBot** (ChatGPT search results), **ClaudeBot** (Anthropic),
**PerplexityBot** (Perplexity's index), **Google-Extended** (controls whether
Google may use your content for AI training; blocking it does not remove you
from Google Search). `check_ai_crawlers` lists each one with a one-line
explanation and whether your robots.txt blocks it.

## Does robots.txt block AI search visibility?

It can — completely. A `Disallow: /` for GPTBot means OpenAI's systems never
see your content, which usually means never being cited. The checker flags
blocked **scored** crawlers separately because they directly affect
visibility; blocking training-only bots is a legitimate choice with different
consequences than blocking search bots.

## Do I need an llms.txt file?

It is optional and cheap. `llms.txt` is a plain-text map of your most
important content for language models. Google states it does not use it, but
several AI tools read it, and it never hurts. The check detects a real
llms.txt and — importantly — does not count an SPA catch-all page that
returns HTML at `/llms.txt`.

## Why does a JavaScript-rendered page score poorly?

Because AI crawlers see what `curl` sees: the initial HTML. If your content
only exists after client-side rendering, models find an empty shell. That low
score is the finding, not a bug. Fixes: server-side rendering, static
generation, or prerendering for the pages that should be citable.

## What makes content citable by AI systems?

The properties `check_citability` scores: a direct answer in the first
paragraph, scannable structure (lists, tables), concrete evidence (numbers,
sources, dates), freshness signals, and enough depth to be worth quoting.
Marketing prose without claims gives a model nothing to cite.

## How do I use geo-tool-check as an MCP server?

`npx geo-tool-check --mcp` — full client setup for Claude, Cursor, VS Code,
and Codex in the [MCP guide](mcp.md).

## Does geo-tool-check upload my website content?

No. Every fetch goes from your machine to the target site. No account, no
API key, no telemetry, and never a request to geo-tool.com — the build fails
if a bundle would try.

## How do I run GEO checks in GitHub Actions?

`npx -y geo-tool-check <url> --min-score 70` in any job — full recipes in the
[GitHub Actions guide](github-actions.md).

## What do the CLI exit codes mean?

`0` success, `1` quality failure (below `--min-score`, or a blocked scored
crawler in `--crawlers`), `2` configuration error. Details in the
[CLI reference](cli.md).

## How do I improve visibility in ChatGPT, Perplexity, Claude, and Google AI?

In order of leverage: unblock the AI crawlers, make content exist in plain
HTML, answer the question in the first paragraph, add schema markup and
evidence, then build external proof (independent sources that AI answers
cite). The checker measures the first four. For the measurement side —
which of your buying-intent questions actually mention you today — run the
free [audit at geo-tool.com](https://www.geo-tool.com).
