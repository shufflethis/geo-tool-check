import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { normalizeUrl, runCheck, runCrawlerCheck } from '../src/check'
import { startFixtureServer } from './fixtures/serve.mjs'

type Fixture = Awaited<ReturnType<typeof startFixtureServer>>

let fixture: Fixture

beforeAll(async () => {
  fixture = await startFixtureServer()
})

afterAll(() => {
  fixture.server.close()
})

const golden = JSON.parse(
  readFileSync(new URL('./fixtures/golden/check-json.stdout.txt', import.meta.url), 'utf8')
) as { score: number; readiness: string; breakdown: unknown[]; blockedCrawlers: string[]; llmsTxt: boolean }

describe('normalizeUrl', () => {
  it('adds https:// when the scheme is missing and keeps explicit schemes', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/')
    expect(normalizeUrl('http://example.com/pricing')).toBe('http://example.com/pricing')
  })

  it('throws on garbage input', () => {
    expect(() => normalizeUrl('http://')).toThrow()
  })
})

describe('runCheck scoring regression', () => {
  // Frozen golden master: the fixture page must keep scoring exactly what the
  // pre-refactor CLI scored. Any change here means the scoring core changed —
  // which this repository must never do on its own.
  it('reproduces the golden score, categories, crawler blocks and llms.txt', async () => {
    const result = await runCheck(`${fixture.origin}/`, 'en')
    expect(result.score).toBe(golden.score)
    expect(result.readiness).toBe(golden.readiness)
    expect(result.breakdown).toEqual(golden.breakdown)
    expect(result.blockedCrawlers).toEqual(golden.blockedCrawlers)
    expect(result.llmsTxt).toBe(golden.llmsTxt)
    expect(result.reachable).toBe(true)
    expect(result.httpStatus).toBe(200)
  })

  it('follows redirects to the same result', async () => {
    const direct = await runCheck(`${fixture.origin}/`, 'en')
    const redirected = await runCheck(`${fixture.origin}/redirect`, 'en')
    expect(redirected.score).toBe(direct.score)
    expect(redirected.reachable).toBe(true)
  })

  it('reports unreachable pages honestly: score 0, findings, no crawler claims', async () => {
    const result = await runCheck(`${fixture.origin}/missing`, 'en')
    expect(result.reachable).toBe(false)
    expect(result.httpStatus).toBe(404)
    expect(result.score).toBe(0)
    expect(result.breakdown).toEqual([])
    expect(result.blockedCrawlers).toEqual([])
    expect(result.findings.length).toBeGreaterThan(0)
  })

  it('does not count an SPA catch-all HTML page as llms.txt', async () => {
    const spa = await startFixtureServer({ llmsMode: 'spa-html' })
    try {
      const result = await runCheck(`${spa.origin}/`, 'en')
      expect(result.llmsTxt).toBe(false)
    } finally {
      spa.server.close()
    }
  })

  it('handles a missing llms.txt', async () => {
    const bare = await startFixtureServer({ llmsMode: 'missing' })
    try {
      const result = await runCheck(`${bare.origin}/`, 'en')
      expect(result.llmsTxt).toBe(false)
      expect(result.reachable).toBe(true)
    } finally {
      bare.server.close()
    }
  })
})

describe('runCrawlerCheck robots.txt precedence', () => {
  it('reports the specifically disallowed crawler as blocked, wildcard-allowed ones as open', async () => {
    const result = await runCrawlerCheck(`${fixture.origin}/deep/path`, 'en')
    expect(result.robotsTxtFound).toBe(true)
    const byToken = new Map(result.crawlers.map((crawler) => [crawler.token, crawler]))
    expect(byToken.get('GPTBot')?.blocked).toBe(true)
    expect(byToken.get('GPTBot')?.countsTowardScore).toBe(true)
    expect(byToken.get('PerplexityBot')?.blocked).toBe(false)
    // Only the origin is used — the deep path must not change the answer.
    expect(result.origin).toBe(fixture.origin)
  })
})
