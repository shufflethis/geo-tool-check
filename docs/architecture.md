# Architecture

Small on purpose: two bundled executables around a vendored scoring core,
zero runtime dependencies.

```
src/
  cli.ts           Process orchestration: stdin/stdout, exit codes
  cli-args.ts      Pure: argument parsing + output rendering (unit-tested)
  mcp.ts           MCP transport: newline-delimited JSON-RPC over stdio
  mcp-protocol.ts  Pure: tool catalog + JSON-RPC dispatch (unit-tested)
  check.ts         Fetch orchestration: page + robots.txt + llms.txt → evidence
  version.ts       Canonical version, injected from package.json at build time
  core/            VENDORED scoring engine — byte-identical to geo-tool.com
```

## Design decisions

**The scoring core is vendored, not depended upon.** `src/core/` mirrors the
geo-tool.com engine source so that this package, the website, and the browser
extension compute the identical score. It is excluded from lint/format so the
copies stay diffable; scoring changes land upstream first. The type shim
`src/core/monorepo-types.d.ts` maps the monorepo's `@/types` alias.

**Zero runtime dependencies.** The MCP stdio protocol is JSON-RPC 2.0 with a
handful of methods — implemented directly rather than through an SDK. `npx`
starts it instantly, there is no supply chain, and nothing ages with
third-party releases.

**Pure logic, thin edges.** Parsing, rendering, and protocol dispatch are
pure functions; only `cli.ts` and `mcp.ts` touch the process. That is what
makes the test suite possible without mocking the world.

**No JavaScript rendering — as a feature.** AI crawlers do not execute
JavaScript; neither does this checker. A rendering service would also be a
running cost, and this package must stay free to operate.

**Never call geo-tool.com.** Every fetch goes from the user's machine to the
target site. `build.mjs` and `verify:package` both fail if a bundle contains
a fetch to geo-tool.com.

## Testing strategy

- **Golden master:** the exact stdout/stderr/exit codes of the pre-refactor
  CLI are frozen in `tests/fixtures/golden/` and asserted against the built
  binaries on every run — byte-for-byte (ports and timings normalized).
- **Scoring regression:** a fixed HTML fixture must keep its exact score and
  per-category breakdown.
- **Local-only network:** a fixture HTTP server provides every page; a fetch
  guard in `tests/setup.ts` fails any test that leaves localhost.
- **Package truth:** `npm run verify:package` packs the tarball, installs it
  in isolation, runs both executables, and initializes the MCP server.

## Build

`build.mjs` bundles `cli.ts` and `mcp.ts` with esbuild into two self-contained
ESM files (`dist/`), injects the package version, sets the shebang, and runs
the cost-leak guard. Node 18 is the compile target and the minimum runtime.
