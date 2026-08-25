# Troubleshooting

## "unreachable" although the page opens in my browser

The checker fetches like a crawler, not like a browser. Common causes:

- **Bot protection** (Cloudflare challenges, WAF rules) answering non-browser
  user agents with 403/503. That is a real finding: AI crawlers hit the same
  wall. Allowlist the AI crawlers you want.
- **Geo-blocking or VPN-only access** — the check runs from your machine, so
  it sees what your network sees.
- **Slow origin**: requests time out after 15 seconds.

Note for CI: an unreachable page scores 0, so `--min-score` fails it.

## The score is much lower than expected

- Run the check on the exact URL, not the domain root, if the content lives
  deeper.
- View the page source (`curl -s <url> | less`): if your text is not in the
  initial HTML, the page is client-rendered — see the
  [FAQ](faq.md#why-does-a-javascript-rendered-page-score-poorly).
- Compare against the same engine with a fix list: the free
  [audit on geo-tool.com](https://www.geo-tool.com).

## `--crawlers` says blocked, but I never wrote a robots.txt rule

Wildcard rules (`User-agent: *` with `Disallow: /`) block every crawler,
including AI ones. CDNs and CMS plugins sometimes inject such rules. The
check reports the effective robots.txt of the origin.

## llms.txt shows `false` although the file exists

If `/llms.txt` answers with an HTML page (an SPA catch-all route), that is
not a real llms.txt and is deliberately not counted. Serve it as plain text.

## MCP tools do not appear in my client

- Restart the client after configuration changes — most only read MCP config
  at startup.
- Test the server by hand:

  ```bash
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | npx -y geo-tool-check --mcp
  ```

  A JSON reply with `"serverInfo"` means the server is fine and the problem
  is client configuration — see the [MCP guide](mcp.md).

## First `npx` run is slow or fails behind a proxy

`npx` downloads the package once from the npm registry, then caches it.
Behind a corporate proxy, configure npm's proxy settings; the check itself
uses Node's `fetch` and honors standard proxy environment variables.

## Exit code 2 in CI

Exit 2 is a configuration error: missing URL or invalid `--min-score`
value — check the job's command line. Quality failures are exit 1, see the
[CLI reference](cli.md).

Still stuck? Open a
[bug report](https://github.com/geo-tool-com/geo-tool-check/issues/new/choose)
with the exact command and output.
