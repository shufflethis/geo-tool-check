# How the score works

The 0–100 score answers: **how well can an AI search system read, understand,
and cite this page?** It is computed by the same engine that powers the
[GEO score on geo-tool.com](https://www.geo-tool.com/en/geo-score) — the
scoring code in `src/core/` is vendored byte-identical from that engine, so
CLI, MCP server, website, and browser extension always agree.

## The six categories

| Category           | What it rewards                                                                  |
| ------------------ | -------------------------------------------------------------------------------- |
| `directAnswers`    | The page answers its question early and directly — quotable first paragraphs     |
| `structure`        | Headings, lists, and tables that models can parse into answer fragments          |
| `schemaMarkup`     | Structured data (Schema.org JSON-LD) that names what the page is                 |
| `citations`        | Evidence: sources, numbers, dates — the raw material of a citable claim          |
| `multimedia`       | Media with textual grounding (alt text, captions)                                |
| `platformSpecific` | Crawler access (robots.txt), llms.txt, and platform-specific readability signals |

Each category reports `score`/`maxScore`; the total is the 0–100 GEO score
with a verdict band (Excellent / Good / Fair / Poor).

## What the checker sees

The page is fetched once, plus `robots.txt` and `llms.txt` from the origin —
**without executing JavaScript**. That is deliberate: GPTBot, OAI-SearchBot,
ClaudeBot, and PerplexityBot do not render JavaScript either. A
client-rendered page that scores low here is the actual finding; see the
[FAQ](faq.md#why-does-a-javascript-rendered-page-score-poorly).

An unreachable page (HTTP error, timeout) scores 0 and reports why.

## What this repository will never change

Scoring weights, thresholds, category definitions, and the methodology are
maintained in the geo-tool.com engine — not here. This repository's tests
include a **frozen scoring regression fixture**: a fixed HTML page whose exact
score and per-category breakdown are asserted on every CI run. If a change
here moves that number, CI fails. Scoring issues are welcome as bug reports
and are fixed upstream, then re-vendored.

## Score vs. reality

A high readiness score means AI systems **can** read and cite the page — it
does not guarantee they mention your brand in live answers. Real-answer
measurement (which questions mention you, in which systems, with which cited
sources) is what the hosted [geo-tool.com workspace](https://www.geo-tool.com)
does daily.
