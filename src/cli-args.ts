// Pure CLI argument parsing and output rendering. No process access, no I/O:
// everything here is deterministic and unit-testable. The thin orchestrator in
// cli.ts owns stdin/stdout/exit codes.

import type { CheckResult, Lang } from './check'
import type { runCrawlerCheck } from './check'

export type CliOptions = {
  url: string
  lang: Lang
  json: boolean
  minScore: number | null
  crawlersOnly: boolean
}

export type ParsedCli =
  | { kind: 'help' }
  | { kind: 'error'; message: string }
  | { kind: 'run'; options: CliOptions }

export const HELP = `geo-tool-check — is this page readable for AI search?

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

export function parseCliArgs(argv: string[]): ParsedCli {
  const args = argv.slice(2)
  if (!args.length || args.includes('-h') || args.includes('--help')) return { kind: 'help' }

  const options: CliOptions = {
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
      if (!Number.isFinite(value))
        return { kind: 'error', message: '--min-score needs a number between 0 and 100.' }
      options.minScore = Math.min(100, Math.max(0, value))
      index += 1
    } else if (arg === '--lang') {
      options.lang = args[index + 1] === 'de' ? 'de' : 'en'
      index += 1
    } else if (arg !== undefined && !arg.startsWith('-')) {
      if (!options.url) options.url = arg
    }
  }

  if (!options.url) return { kind: 'error', message: 'No URL given. Try: npx geo-tool-check example.com' }
  return { kind: 'run', options }
}

// ── Rendering ────────────────────────────────────────────────────────────────

const DIM = '[2m'
const BOLD = '[1m'
const RESET = '[0m'
const RED = '[31m'
const YELLOW = '[33m'
const GREEN = '[32m'

export type Paint = (code: string, text: string) => string

export function makePaint(useColor: boolean): Paint {
  return (code, text) => (useColor ? `${code}${text}${RESET}` : text)
}

function toneFor(score: number) {
  return score >= 75 ? GREEN : score >= 50 ? YELLOW : RED
}

function bar(paint: Paint, score: number, max: number, width = 18): string {
  const filled = Math.round((score / max) * width)
  return '█'.repeat(filled) + paint(DIM, '░'.repeat(width - filled))
}

export type CrawlerCheckResult = Awaited<ReturnType<typeof runCrawlerCheck>>

/** Human-readable output of `--crawlers`, byte-identical to the pre-refactor CLI. */
export function renderCrawlerResult(result: CrawlerCheckResult, paint: Paint): string {
  let out = `\n${paint(BOLD, result.origin)}\n`
  if (!result.robotsTxtFound) {
    out += paint(DIM, 'No robots.txt found — nothing is blocked.\n\n')
    return out
  }
  for (const crawler of result.crawlers) {
    const state = crawler.blocked ? paint(RED, 'blocked') : paint(GREEN, 'allowed')
    out += `  ${crawler.token.padEnd(20)} ${state}  ${paint(DIM, crawler.operator)}\n`
  }
  out += '\n'
  return out
}

/** Human-readable output of the full check, byte-identical to the pre-refactor CLI. */
export function renderCheckResult(result: CheckResult, paint: Paint): string {
  let out = `\n${paint(BOLD, result.url)}\n`
  if (!result.reachable) {
    out += `${paint(RED, 'unreachable')} ${paint(DIM, `HTTP ${result.httpStatus ?? '—'}`)}\n\n`
    return out
  }
  const tone = toneFor(result.score)
  out +=
    `${paint(tone, paint(BOLD, String(result.score)))}/100  ${result.readiness}` +
    `  ${paint(DIM, `${result.wordCount} words · ${result.responseMs ?? '—'} ms`)}\n\n`
  for (const entry of result.breakdown) {
    out +=
      `  ${entry.category.padEnd(18)} ${String(entry.score).padStart(2)}/${String(entry.maxScore).padEnd(3)} ` +
      `${bar(paint, entry.score, entry.maxScore)}\n`
  }
  const problems = result.findings.filter((finding) => finding.status !== 'pass')
  if (problems.length) {
    out += `\n  ${paint(DIM, 'What is in the way')}\n`
    for (const finding of problems.slice(0, 6)) {
      const mark = finding.status === 'fail' ? paint(RED, '✕') : paint(YELLOW, '!')
      out += `  ${mark} ${finding.label}\n    ${paint(DIM, finding.detail.slice(0, 150))}\n`
    }
  }
  if (result.blockedCrawlers.length) {
    out += `\n  ${paint(RED, 'Blocked crawlers:')} ${result.blockedCrawlers.join(', ')}\n`
  }
  out += `\n  ${paint(DIM, 'Full report: https://www.geo-tool.com/en/geo-score')}\n\n`
  return out
}
