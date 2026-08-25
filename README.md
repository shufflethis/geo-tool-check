# geo-tool-check

Is this page readable for AI search? Checks crawler access, structure and
citability for ChatGPT, Perplexity, Claude and Google AI — as a CLI and as an
MCP server.

**Everything runs on your machine.** No account, no API key, no data sent to
geo-tool.com.

## CLI

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

### In CI

```bash
npx geo-tool-check https://example.com/pricing --min-score 70
```

Exit code 1 below the threshold. Catches the deploy that blocks GPTBot or
hides the content behind JavaScript.

```bash
npx geo-tool-check example.com --crawlers   # only robots.txt, exits 1 if a scored crawler is blocked
npx geo-tool-check example.com --json       # machine-readable
npx geo-tool-check example.com --lang de    # German labels
```

## MCP server

Gives an agent three tools for AI visibility.

```json
{
  "mcpServers": {
    "geo-tool-check": {
      "command": "npx",
      "args": ["-y", "geo-tool-check", "--mcp"]
    }
  }
}
```

Or point directly at the binary: `npx -y geo-tool-check-mcp`.

Also on [Smithery](https://smithery.ai/servers/tracktronaut/geo-tool-check):

```bash
npx -y smithery mcp add tracktronaut/geo-tool-check
```

To rebuild and republish the bundle:

```bash
npm run bundle                    # geo-tool-check.mcpb
./scripts/publish-smithery.sh     # needs: smithery auth login
```

| Tool | What it does | Network |
|---|---|---|
| `check_ai_readiness` | Full page score, six categories, findings | fetches the page |
| `check_ai_crawlers` | Which AI crawlers robots.txt blocks | fetches robots.txt |
| `check_citability` | Scores a passage while drafting | none |

## What the score means

Twenty-five checks across six categories, 0 to 100. The same code that powers
[geo-tool.com](https://www.geo-tool.com/en/geo-score) — the scoring logic is
imported, not reimplemented, so both produce the same number for the same
input.

**Node executes no JavaScript.** This tool therefore reports what a plain HTML
crawler sees — which is exactly what GPTBot, ClaudeBot and PerplexityBot see. A
client-rendered page will score low here, and that is the finding, not a
limitation. To compare the crawler's view against the rendered page, use the
[browser extension](https://www.geo-tool.com/en/ext-report).

There is deliberately no JavaScript rendering fallback: a paid rendering
service is exactly the running cost this package must not create.

## Zero dependencies

The MCP protocol over stdio is JSON-RPC with three methods, implemented
directly. Nothing to install beyond Node 18+, no supply chain, no version drift.

## Claude Code plugin

Install once:

```
/plugin marketplace add shufflethis/geo-tool-check
/plugin install geo-tool-check@geo-tool
```

Then check any page with one command — works immediately, no restart needed:

```
/geo-tool-check example.com
```

You get the 0-100 readiness score, which AI crawlers robots.txt blocks, and a
prioritized fix list. You can also just ask in plain language ("is example.com
readable for AI search?") — after a restart the three MCP tools answer that
directly. The full audit with concrete optimization actions is free at
[geo-tool.com](https://www.geo-tool.com); the paid workspace additionally
measures real AI answers (ChatGPT, Perplexity, Gemini) for your
buying-intent questions daily.

## Links

- npm: [geo-tool-check](https://www.npmjs.com/package/geo-tool-check)
- Smithery: [tracktronaut/geo-tool-check](https://smithery.ai/server/tracktronaut/geo-tool-check)
- Docs: [geo-tool.com/en/developers](https://www.geo-tool.com/en/developers)

## License

MIT. Built by [track by track GmbH](https://www.geo-tool.com).
