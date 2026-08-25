// geo-tool-check — prueft eine URL auf Lesbarkeit fuer KI-Suchen.
//
// Fuer CI gedacht: `--min-score 70` setzt den Exit-Code auf 1, wenn die Seite
// darunter liegt. So faellt ein Deploy auf, der Crawler aussperrt oder den
// Inhalt hinter JavaScript versteckt.

import { runCheck, runCrawlerCheck, type Lang } from './check'

type Options = {
  url: string
  lang: Lang
  json: boolean
  minScore: number | null
  crawlersOnly: boolean
}

const HELP = `geo-tool-check — is this page readable for AI search?

Usage
  npx geo-tool-check <url> [options]

Options
  --json                 Machine-readable output.
  --min-score <0-100>    Exit with code 1 below this score. For CI.
  --crawlers             Only check which AI crawlers robots.txt blocks.
  --lang <de|en>         Language of labels and details. Default: en.
  -h, --help             Show this help.

Examples
  npx geo-tool-check example.com
  npx geo-tool-check https://example.com/pricing --min-score 70
  npx geo-tool-check example.com --crawlers --json

Every request goes from this machine straight to the target site. Nothing is
sent to geo-tool.com, and no account is needed.

The score is computed with the same code as https://www.geo-tool.com/en/geo-score.
Node runs no JavaScript, so this reports what a plain HTML crawler sees — which
is exactly what GPTBot, ClaudeBot and PerplexityBot see. To compare that against
the rendered page, use the browser extension.`

function parseArgs(argv: string[]): Options | 'help' {
  const args = argv.slice(2)
  if (!args.length || args.includes('-h') || args.includes('--help')) return 'help'

  const options: Options = {
    url: '',
    lang: 'en',
    json: args.includes('--json'),
    minScore: null,
    crawlersOnly: args.includes('--crawlers'),
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--min-score') {
      const value = Number(args[index + 1])
      if (!Number.isFinite(value)) fail('--min-score needs a number between 0 and 100.')
      options.minScore = Math.min(100, Math.max(0, value))
      index += 1
    } else if (arg === '--lang') {
      options.lang = args[index + 1] === 'de' ? 'de' : 'en'
      index += 1
    } else if (!arg.startsWith('-')) {
      if (!options.url) options.url = arg
    }
  }

  if (!options.url) fail('No URL given. Try: npx geo-tool-check example.com')
  return options
}

function fail(message: string): never {
  process.stderr.write(`geo-tool-check: ${message}\n`)
  process.exit(2)
}

const DIM = '[2m'
const BOLD = '[1m'
const RESET = '[0m'
const RED = '[31m'
const YELLOW = '[33m'
const GREEN = '[32m'

const useColor = process.stdout.isTTY && !process.env.NO_COLOR
const paint = (code: string, text: string) => (useColor ? `${code}${text}${RESET}` : text)

function toneFor(score: number) {
  return score >= 75 ? GREEN : score >= 50 ? YELLOW : RED
}

function bar(score: number, max: number, width = 18): string {
  const filled = Math.round((score / max) * width)
  return '█'.repeat(filled) + paint(DIM, '░'.repeat(width - filled))
}

async function runCli() {
  const parsed = parseArgs(process.argv)
  if (parsed === 'help') {
    process.stdout.write(`${HELP}\n`)
    return
  }

  if (parsed.crawlersOnly) {
    const result = await runCrawlerCheck(parsed.url, parsed.lang)
    if (parsed.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
      return
    }
    process.stdout.write(`\n${paint(BOLD, result.origin)}\n`)
    if (!result.robotsTxtFound) {
      process.stdout.write(paint(DIM, 'No robots.txt found — nothing is blocked.\n\n'))
      return
    }
    for (const crawler of result.crawlers) {
      const state = crawler.blocked ? paint(RED, 'blocked') : paint(GREEN, 'allowed')
      process.stdout.write(`  ${crawler.token.padEnd(20)} ${state}  ${paint(DIM, crawler.operator)}\n`)
    }
    process.stdout.write('\n')
    // Eine Sperre eines bewerteten Crawlers ist der Fall, der in CI auffallen soll.
    if (result.crawlers.some((crawler) => crawler.blocked && crawler.countsTowardScore)) process.exitCode = 1
    return
  }

  const result = await runCheck(parsed.url, parsed.lang)

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } else {
    const tone = toneFor(result.score)
    process.stdout.write(`\n${paint(BOLD, result.url)}\n`)
    if (!result.reachable) {
      process.stdout.write(`${paint(RED, 'unreachable')} ${paint(DIM, `HTTP ${result.httpStatus ?? '—'}`)}\n\n`)
    } else {
      process.stdout.write(
        `${paint(tone, paint(BOLD, String(result.score)))}/100  ${result.readiness}` +
          `  ${paint(DIM, `${result.wordCount} words · ${result.responseMs ?? '—'} ms`)}\n\n`
      )
      for (const entry of result.breakdown) {
        process.stdout.write(
          `  ${entry.category.padEnd(18)} ${String(entry.score).padStart(2)}/${String(entry.maxScore).padEnd(3)} ` +
            `${bar(entry.score, entry.maxScore)}\n`
        )
      }
      const problems = result.findings.filter((finding) => finding.status !== 'pass')
      if (problems.length) {
        process.stdout.write(`\n  ${paint(DIM, 'What is in the way')}\n`)
        for (const finding of problems.slice(0, 6)) {
          const mark = finding.status === 'fail' ? paint(RED, '✕') : paint(YELLOW, '!')
          process.stdout.write(`  ${mark} ${finding.label}\n    ${paint(DIM, finding.detail.slice(0, 150))}\n`)
        }
      }
      if (result.blockedCrawlers.length) {
        process.stdout.write(
          `\n  ${paint(RED, 'Blocked crawlers:')} ${result.blockedCrawlers.join(', ')}\n`
        )
      }
      process.stdout.write(
        `\n  ${paint(DIM, 'Full report: https://www.geo-tool.com/en/geo-score')}\n\n`
      )
    }
  }

  if (parsed.minScore !== null && result.score < parsed.minScore) {
    process.stderr.write(`geo-tool-check: score ${result.score} is below --min-score ${parsed.minScore}\n`)
    process.exitCode = 1
  }
}

// Ein Eintrag in der MCP-Konfiguration statt zwei Binaries: `npx geo-tool-check --mcp`
// startet denselben Server wie `npx geo-tool-check-mcp`.
if (process.argv.includes('--mcp')) {
  await import('./mcp')
} else {
  await runCli().catch((error: unknown) => {
    process.stderr.write(`geo-tool-check: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(2)
  })
}
