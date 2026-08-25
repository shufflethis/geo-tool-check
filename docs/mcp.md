# Using geo-tool-check as an MCP server

The [Model Context Protocol](https://modelcontextprotocol.io) (MCP) lets AI
assistants call external tools. geo-tool-check ships a stdio MCP server: your
assistant starts the process locally, talks JSON-RPC over stdin/stdout, and
every page fetch goes **from your machine straight to the target site** — no
account, no API key, no data sent to geo-tool.com.

## The canonical configuration

Almost every MCP client accepts this JSON shape:

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

If you installed the package globally, the dedicated binary works too:

```json
{
  "mcpServers": {
    "geo-tool-check": { "command": "geo-tool-check-mcp" }
  }
}
```

Client configuration formats occasionally change between releases — when in
doubt, your client's own MCP documentation wins over the snippets below.

## Client setup

**Claude Desktop** — Settings → Developer → Edit Config, then add the
canonical block to `claude_desktop_config.json` and restart. A one-click
`.mcpb` desktop bundle can be built from this repository with
`npm run bundle`.

**Claude Code** — easiest via the plugin:

```
/plugin marketplace add geo-tool-com/geo-tool-check
/plugin install geo-tool-check@geo-tool
```

or manually: `claude mcp add geo-tool-check -- npx -y geo-tool-check --mcp`

**Cursor** — Settings → MCP → Add server, or add the canonical block to
`.cursor/mcp.json` in your project.

**VS Code (GitHub Copilot)** — add the server to `.vscode/mcp.json`; the
canonical block goes under `"servers"`.

**OpenAI Codex (CLI)** — add to `~/.codex/config.toml`:

```toml
[mcp_servers.geo-tool-check]
command = "npx"
args = ["-y", "geo-tool-check", "--mcp"]
```

**Smithery** — install from the registry entry
[tracktronaut/geo-tool-check](https://smithery.ai/server/tracktronaut/geo-tool-check).

**Any other JSON-configured client** — use the canonical block; the server
speaks plain stdio JSON-RPC (initialize, tools/list, tools/call, ping).

## The three tools

| Tool                 | Arguments                  | What it answers                                                           |
| -------------------- | -------------------------- | ------------------------------------------------------------------------- |
| `check_ai_readiness` | `url`, optional `lang`     | Full 0–100 readiness score with per-category breakdown and findings       |
| `check_ai_crawlers`  | `url`, optional `lang`     | Which AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot, …) robots.txt blocks |
| `check_citability`   | `content`, optional `lang` | How quotable a draft passage is — no network request at all               |

`lang` is `en` (default) or `de` and only changes labels and explanations.

## Example prompts

- "Is example.com readable for AI search?"
- "Which AI crawlers does my site block?"
- "Check the citability of this draft: …"
- "Why doesn't my pricing page show up in ChatGPT answers?"

## Privacy

The server fetches only the URLs you ask it to check, from your machine.
It stores nothing, sends no telemetry, and never contacts geo-tool.com —
the build fails if a bundle tries. `check_citability` makes no network
request at all.

## Troubleshooting

- **Tools don't appear:** most clients need a restart after config changes.
- **First call is slow:** `npx` downloads the package once, then caches it.
- **Corporate proxy:** the server uses Node's `fetch`; standard proxy
  environment variables apply to the target-site requests.

More cases: [Troubleshooting](troubleshooting.md). If you want measurements
beyond readiness — whether AI answers actually mention your brand — that is
what the hosted [geo-tool.com workspace](https://www.geo-tool.com) measures
daily against real ChatGPT, Perplexity, and Gemini answers.
