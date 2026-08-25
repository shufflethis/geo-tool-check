import { describe, expect, it } from 'vitest'
import { parseCliArgs } from '../src/cli-args'

const argv = (...args: string[]) => ['node', 'cli.js', ...args]

describe('parseCliArgs', () => {
  it('returns help for no args, -h and --help', () => {
    expect(parseCliArgs(argv())).toEqual({ kind: 'help' })
    expect(parseCliArgs(argv('-h'))).toEqual({ kind: 'help' })
    expect(parseCliArgs(argv('example.com', '--help'))).toEqual({ kind: 'help' })
  })

  it('parses the URL plus every flag', () => {
    const parsed = parseCliArgs(
      argv('example.com', '--json', '--crawlers', '--lang', 'de', '--min-score', '70')
    )
    expect(parsed).toEqual({
      kind: 'run',
      options: { url: 'example.com', json: true, crawlersOnly: true, lang: 'de', minScore: 70 },
    })
  })

  it('defaults to English and treats unknown languages as English', () => {
    const parsed = parseCliArgs(argv('example.com', '--lang', 'fr'))
    expect(parsed).toMatchObject({ kind: 'run', options: { lang: 'en' } })
  })

  it('clamps --min-score into 0..100 and rejects non-numbers with a message (exit 2 path)', () => {
    expect(parseCliArgs(argv('example.com', '--min-score', '150'))).toMatchObject({
      options: { minScore: 100 },
    })
    expect(parseCliArgs(argv('example.com', '--min-score', '-5'))).toMatchObject({
      options: { minScore: 0 },
    })
    expect(parseCliArgs(argv('example.com', '--min-score', 'abc'))).toEqual({
      kind: 'error',
      message: '--min-score needs a number between 0 and 100.',
    })
  })

  it('takes the first positional as URL and reports a missing URL', () => {
    expect(parseCliArgs(argv('a.com', 'b.com'))).toMatchObject({ options: { url: 'a.com' } })
    expect(parseCliArgs(argv('--json'))).toEqual({
      kind: 'error',
      message: 'No URL given. Try: npx geo-tool-check example.com',
    })
  })
})
