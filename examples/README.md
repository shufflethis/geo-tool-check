# Examples

Copy-paste starting points. Every file works as-is after replacing
`example.com` with your page.

| File                                                                           | What it does                                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| [`github-actions/deploy-gate.yml`](github-actions/deploy-gate.yml)             | Fail a deploy when the live page scores below 70 or blocks a scored AI crawler |
| [`github-actions/weekly-monitoring.yml`](github-actions/weekly-monitoring.yml) | Score a list of key pages every Monday                                         |
| [`mcp/claude-desktop.json`](mcp/claude-desktop.json)                           | Claude Desktop — merge into `claude_desktop_config.json`                       |
| [`mcp/cursor.json`](mcp/cursor.json)                                           | Cursor — save as `.cursor/mcp.json` in your project                            |
| [`mcp/vscode.json`](mcp/vscode.json)                                           | VS Code (Copilot) — save as `.vscode/mcp.json`                                 |
| [`mcp/codex.toml`](mcp/codex.toml)                                             | OpenAI Codex CLI — merge into `~/.codex/config.toml`                           |
| [`scripts/track-scores.sh`](scripts/track-scores.sh)                           | Append per-URL scores to a CSV — a score history in one cron line              |

Background for each area: [CLI reference](../docs/cli.md) ·
[GitHub Actions guide](../docs/github-actions.md) · [MCP guide](../docs/mcp.md)
