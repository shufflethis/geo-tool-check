// Fuehrt den GEO-Technik-Check auf dem Rechner des Nutzers aus.
//
// Alle Abrufe gehen vom Rechner des Nutzers direkt zur Zielseite — nie ueber
// geo-tool.com. Deshalb kostet dieses Paket den Betreiber nichts, egal wie oft
// es laeuft. Dieselbe Regel wie in der Browser-Erweiterung.
//
// Bewusst OHNE Render-Proxy: Node fuehrt kein JavaScript aus, und ein bezahlter
// Rendering-Dienst waere genau die Kostenquelle, die hier nicht entstehen soll.
// Das ist keine Einschraenkung, sondern die richtige Perspektive — ein
// KI-Crawler fuehrt ebenfalls kein JavaScript aus und sieht genau das hier.

import { evaluateTechnicalFindings, evaluateUnreachable, type PageEvidence } from './core/evaluate'
import { buildAnalysisResult } from './core/build-analysis'
import { robotsBlocksAiBots, stripTags } from './core/pure'
import { AI_CRAWLERS, AI_CRAWLER_TOKENS } from './core/ai-crawlers'

export type Lang = 'de' | 'en'

const USER_AGENT = 'geo-check/1.0 (+https://www.geo-tool.com/en/developers)'
const TIMEOUT_MS = 15_000

export type CheckResult = {
  url: string
  reachable: boolean
  httpStatus: number | null
  responseMs: number | null
  score: number
  readiness: string
  breakdown: Array<{ category: string; score: number; maxScore: number }>
  findings: Array<{ id: string; label: string; status: string; detail: string }>
  blockedCrawlers: string[]
  wordCount: number
  llmsTxt: boolean
}

type Fetched = {
  ok: boolean
  status: number | null
  body: string
  responseMs: number | null
  finalUrl: string | null
  contentType: string | null
}

async function get(url: string): Promise<Fetched> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const startedAt = Date.now()
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,text/plain;q=0.9,*/*;q=0.8' },
      signal: controller.signal,
    })
    return {
      ok: response.ok,
      status: response.status,
      body: await response.text(),
      responseMs: Date.now() - startedAt,
      finalUrl: response.url || null,
      contentType: response.headers.get('content-type'),
    }
  } catch {
    return { ok: false, status: null, body: '', responseMs: null, finalUrl: null, contentType: null }
  } finally {
    clearTimeout(timer)
  }
}

/** Ein 200 mit HTML-Body bei /llms.txt ist die SPA-Catch-all-Route, kein Treffer. */
function isPlainText(body: string, contentType: string | null): boolean {
  if (contentType && /html/i.test(contentType)) return false
  return !/^\s*<(!doctype|html|head|body)/i.test(body)
}

export function normalizeUrl(input: string): string {
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`
  return new URL(withScheme).toString()
}

export async function runCheck(rawUrl: string, lang: Lang = 'en'): Promise<CheckResult> {
  const url = normalizeUrl(rawUrl)
  const origin = new URL(url).origin

  const [page, robots, llms] = await Promise.all([
    get(url),
    get(`${origin}/robots.txt`),
    get(`${origin}/llms.txt`),
  ])

  if (!page.ok || !page.status) {
    const findings = evaluateUnreachable({ httpStatus: page.status, lang })
    return {
      url,
      reachable: false,
      httpStatus: page.status,
      responseMs: page.responseMs,
      score: 0,
      readiness: lang === 'de' ? 'Nicht erreichbar' : 'Unreachable',
      breakdown: [],
      findings: findings.map(toPlainFinding),
      blockedCrawlers: [],
      wordCount: 0,
      llmsTxt: false,
    }
  }

  const robotsTxt = robots.ok && isPlainText(robots.body, robots.contentType) ? robots.body : null
  const llmsTxt = llms.ok && isPlainText(llms.body, llms.contentType)
  const words = stripTags(page.body).split(/\s+/).filter(Boolean).length

  const evidence: PageEvidence = {
    finalUrl: page.finalUrl ?? url,
    httpStatus: page.status,
    responseMs: page.responseMs,
    blockedDirectAccess: false,
    html: page.body,
    directWordCount: words,
    // Node fuehrt kein JavaScript aus — genau wie ein KI-Crawler.
    renderedSource: 'direct',
    robotsTxt,
    llmsTxtFound: llmsTxt,
    lang,
  }

  const technical = evaluateTechnicalFindings(evidence)
  const analysis = buildAnalysisResult({
    technicalFindings: technical.findings,
    html: page.body,
    url,
    language: lang,
  })

  return {
    url,
    reachable: true,
    httpStatus: page.status,
    responseMs: page.responseMs,
    score: analysis.totalScore,
    readiness: analysis.aiReadiness,
    breakdown: Object.entries(analysis.breakdown).map(([category, detail]) => ({
      category,
      score: detail.score,
      maxScore: detail.maxScore,
    })),
    findings: [
      ...technical.findings.map(toPlainFinding),
      ...analysis.suggestions.immediate.map((s) => ({
        id: 'suggestion',
        label: s.issue,
        status: s.priority === 'HIGH' ? 'fail' : 'warn',
        detail: s.fix,
      })),
    ],
    blockedCrawlers: robotsTxt ? robotsBlocksAiBots(robotsTxt, AI_CRAWLER_TOKENS) : [],
    wordCount: technical.wordCount,
    llmsTxt,
  }
}

/** Nur die robots.txt — schneller und ohne die Zielseite abzurufen. */
export async function runCrawlerCheck(rawUrl: string, lang: Lang = 'en') {
  const origin = new URL(normalizeUrl(rawUrl)).origin
  const robots = await get(`${origin}/robots.txt`)
  const robotsTxt = robots.ok && isPlainText(robots.body, robots.contentType) ? robots.body : null
  const blocked = new Set(robotsTxt ? robotsBlocksAiBots(robotsTxt, AI_CRAWLER_TOKENS) : [])

  return {
    origin,
    robotsTxtFound: robotsTxt !== null,
    crawlers: AI_CRAWLERS.map((crawler) => ({
      token: crawler.token,
      operator: crawler.operator,
      blocked: blocked.has(crawler.token),
      countsTowardScore: crawler.scored,
      note: crawler.note[lang],
    })),
  }
}

function toPlainFinding(finding: { id: string; label: string; status: string; detail: string }) {
  return { id: finding.id, label: finding.label, status: finding.status, detail: finding.detail }
}
