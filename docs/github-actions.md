# GEO checks in GitHub Actions

Gate deploys on AI-search readiness the same way you gate them on tests:
`--min-score` turns the score into an exit code.

## Minimal check after deploy

```yaml
name: GEO readiness

on:
  deployment_status:

jobs:
  geo-check:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Readiness gate
        run: npx -y geo-tool-check ${{ github.event.deployment_status.environment_url }} --min-score 70
```

Exit code 1 fails the job when the page scores below 70 — for example when a
release accidentally ships a client-rendered shell that AI crawlers cannot
read, or a robots.txt that locks out GPTBot.

## Crawler-only gate (fast)

```yaml
- name: AI crawlers must not be blocked
  run: npx -y geo-tool-check https://example.com --crawlers
```

This fetches only robots.txt and exits 1 when a **scored** crawler (one that
affects the GEO score) is blocked. Unscored crawlers are reported but do not
fail the job.

## Scheduled monitoring of key pages

```yaml
on:
  schedule:
    - cron: '0 6 * * 1' # Mondays 06:00 UTC

jobs:
  weekly-geo:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        url:
          - https://example.com/
          - https://example.com/pricing
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npx -y geo-tool-check ${{ matrix.url }} --min-score 70
```

## Notes

- The runner fetches your page directly — no third-party service, no secrets.
- `--json` + `jq` lets you post scores to dashboards or PR comments.
- Exit codes: `0` pass, `1` threshold/crawler failure, `2` configuration
  error — see the [CLI reference](cli.md).

A CI gate keeps a page from regressing; it does not tell you whether ChatGPT
actually cites you. For that measurement, use the hosted
[geo-tool.com audit and workspace](https://www.geo-tool.com).
