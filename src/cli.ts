// geo-tool-check — checks a URL for readability by AI search systems.
//
// Built for CI: `--min-score 70` sets exit code 1 when the page scores below
// that, so a deploy that locks out crawlers or hides content behind JavaScript
// fails loudly. Parsing and rendering are pure functions in cli-args.ts; this
// file owns process I/O and exit codes only.

import { runCheck, runCrawlerCheck } from './check'
import { HELP, makePaint, parseCliArgs, renderCheckResult, renderCrawlerResult } from './cli-args'

function fail(message: string): never {
  process.stderr.write(`geo-tool-check: ${message}\n`)
  process.exit(2)
}

async function runCli() {
  const parsed = parseCliArgs(process.argv)
  if (parsed.kind === 'help') {
    process.stdout.write(`${HELP}\n`)
    return
  }
  if (parsed.kind === 'error') fail(parsed.message)

  const options = parsed.options
  const paint = makePaint(Boolean(process.stdout.isTTY) && !process.env.NO_COLOR)

  if (options.crawlersOnly) {
    const result = await runCrawlerCheck(options.url, options.lang)
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
      return
    }
    process.stdout.write(renderCrawlerResult(result, paint))
    // A blocked scored crawler is the case CI should catch.
    if (
      result.robotsTxtFound &&
      result.crawlers.some((crawler) => crawler.blocked && crawler.countsTowardScore)
    ) {
      process.exitCode = 1
    }
    return
  }

  const result = await runCheck(options.url, options.lang)

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } else {
    process.stdout.write(renderCheckResult(result, paint))
  }

  if (options.minScore !== null && result.score < options.minScore) {
    process.stderr.write(`geo-tool-check: score ${result.score} is below --min-score ${options.minScore}\n`)
    process.exitCode = 1
  }
}

// One MCP configuration entry instead of two binaries: `npx geo-tool-check --mcp`
// starts the same server as `npx geo-tool-check-mcp`.
if (process.argv.includes('--mcp')) {
  await import('./mcp')
} else {
  await runCli().catch((error: unknown) => {
    process.stderr.write(`geo-tool-check: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(2)
  })
}
