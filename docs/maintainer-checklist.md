# Maintainer checklist

## Every change

```bash
npm ci
npm run check          # format:check + lint + typecheck + tests (builds first)
npm run verify:package # tarball truth: contents, executables, MCP init, zero deps
git diff --check       # no whitespace errors
```

Compatibility gates that must never move without a conscious, documented
decision: package name and both bin names, `--mcp`, the three MCP tool names,
all CLI flags, JSON field names, the 0–100 scale, exit codes 0/1/2, Node 18
minimum, zero runtime dependencies, no fetch to geo-tool.com.

## Syncing the vendored core

`src/core/` must stay byte-identical to its source files in the geo-tool.com
monorepo (`geo-tool-nextjs/src/lib/core/technical-check/{pure,evaluate,build-analysis,content-readiness}.ts`
and `src/lib/ai-crawlers.ts`). When the engine changes upstream:

1. Copy the changed files into `src/core/` unchanged.
2. Run the suite — the scoring-regression fixture will flag score changes.
3. If scores legitimately changed, re-capture the golden master
   (`node tests/fixtures/capture-golden.mjs` after a build) and say so
   loudly in the changelog: users' CI gates may flip.

## Releasing a new version

1. Update `CHANGELOG.md` (move Unreleased → new version).
2. Bump `version` in `package.json`; keep `manifest.json` and `server.json`
   aligned. The visible CLI/MCP version follows automatically.
3. `npm run check && npm run verify:package`
4. `npm publish` (needs a granular npm token; the account enforces 2FA).
5. Official MCP Registry: `mcp-publisher login github && mcp-publisher publish`
   — the registry JWT lives only minutes, chain the two commands.
6. Rebuild the desktop bundle when needed: `npm run bundle` (`.mcpb`).

## Registry identifiers (do not "fix")

- npm `mcpName` and the Official MCP Registry name are
  `io.github.shufflethis/geo-tool-check` — published and immutable for
  existing versions. The repository has moved to `geo-tool-com`; old GitHub
  URLs redirect. A future parallel publish under `io.github.geo-tool-com/…`
  is possible but is a new registry entry, not a rename.
- Smithery lives under `tracktronaut/geo-tool-check`.

## External listings

Claude Code marketplace lives in this repo (`.claude-plugin/marketplace.json`
plus `plugins/geo-tool-check/`). Directory listings that may need updates on
release: npm, Official MCP Registry, Smithery, mcp.so, Glama, PulseMCP
(auto-ingests from the Official Registry), awesome-mcp-servers.
