# Contributing

Thanks for helping make AI-search readiness checks better. This project is
small on purpose: a dependency-free CLI and MCP server around a scoring core
that is maintained in the geo-tool.com engine.

## Ground rules

- **The scoring core does not change here.** Everything in `src/core/` is
  vendored byte-identical from the geo-tool.com monorepo so that this package,
  the website and the browser extension compute the same score. Scoring bugs
  are welcome as issues; fixes land upstream first.
- **Zero runtime dependencies.** `dependencies` stays empty. Dev tooling is fine.
- **No calls to geo-tool.com.** The build fails if a bundle fetches the domain.
  Every check runs from the user's machine to the target site only.
- **Compatibility is frozen:** package name, both binaries, `--mcp`, the three
  MCP tool names, all CLI flags, JSON field names, the 0–100 scale, and the
  exit-code contract (0 success/help, 1 threshold or scored-crawler failure,
  2 configuration error).

## Working on the code

```bash
npm ci
npm run check          # format:check + lint + typecheck + tests (builds first)
npm run verify:package # proves the packed tarball works
```

Tests must never call third-party sites — use the fixture server in
`tests/fixtures/`. A network guard fails any test that leaves localhost.
The golden-master files in `tests/fixtures/golden/` freeze user-visible CLI
output; if your change alters them on purpose, say so explicitly in the PR.

## Pull requests

Small, focused PRs with conventional commit messages
(`feat:`, `fix:`, `docs:`, `test:`, `build:`, `refactor:`). Fill in the PR
checklist — it mirrors the compatibility rules above.
