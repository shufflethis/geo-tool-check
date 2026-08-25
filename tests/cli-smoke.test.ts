// Subprocess smoke tests against the BUILT binaries (dist/), compared against
// the frozen golden master. This is the byte-level proof that the refactor
// changed nothing user-visible: stdout, stderr and exit codes must match the
// pre-refactor capture exactly (ports and timings normalized).
import { execFile, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startFixtureServer } from './fixtures/serve.mjs'

const run = promisify(execFile)

type Fixture = Awaited<ReturnType<typeof startFixtureServer>>
let fixture: Fixture

beforeAll(async () => {
  fixture = await startFixtureServer()
})

afterAll(() => {
  fixture.server.close()
})

function normalize(text: string, origin: string): string {
  return text
    .replaceAll(origin, 'http://127.0.0.1:PORT')
    .replace(/"responseMs": \d+/g, '"responseMs": 0')
    .replace(/\d+ ms/g, 'N ms')
}

function goldenFile(name: string): string {
  return readFileSync(new URL(`./fixtures/golden/${name}`, import.meta.url), 'utf8')
}

const goldenExitCodes = JSON.parse(goldenFile('exit-codes.json')) as Record<string, number>

async function cli(args: string[]) {
  try {
    const { stdout, stderr } = await run('node', ['dist/cli.js', ...args], {
      env: { ...process.env, NO_COLOR: '1' },
    })
    return { stdout, stderr, code: 0 }
  } catch (error) {
    const failed = error as { stdout?: string; stderr?: string; code?: number }
    return { stdout: failed.stdout ?? '', stderr: failed.stderr ?? '', code: failed.code ?? 1 }
  }
}

const CASES: Record<string, (origin: string) => string[]> = {
  'check-json': (o) => [`${o}/`, '--json'],
  'check-pretty': (o) => [`${o}/`],
  'check-de-json': (o) => [`${o}/`, '--json', '--lang', 'de'],
  'crawlers-json': (o) => [`${o}/`, '--crawlers', '--json'],
  'crawlers-pretty': (o) => [`${o}/`, '--crawlers'],
  'redirect-json': (o) => [`${o}/redirect`, '--json'],
  'unreachable-json': (o) => [`${o}/missing`, '--json'],
  'unreachable-pretty': (o) => [`${o}/missing`],
  'min-score-fail': (o) => [`${o}/`, '--min-score', '99'],
  'min-score-pass': (o) => [`${o}/`, '--min-score', '10'],
  'min-score-unreachable': (o) => [`${o}/missing`, '--min-score', '10'],
  help: () => ['--help'],
  'no-url': () => ['--json'],
  'bad-min-score': (o) => [`${o}/`, '--min-score', 'abc'],
}

describe('CLI golden master (built binary)', () => {
  for (const [name, argsFor] of Object.entries(CASES)) {
    it(`matches the frozen output and exit code: ${name}`, async () => {
      const result = await cli(argsFor(fixture.origin))
      expect(normalize(result.stdout, fixture.origin)).toBe(goldenFile(`${name}.stdout.txt`))
      expect(normalize(result.stderr, fixture.origin)).toBe(goldenFile(`${name}.stderr.txt`))
      expect(result.code).toBe(goldenExitCodes[name])
    })
  }
})

function mcpSession(binary: string, lines: string[], extraArgs: string[] = []): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [binary, ...extraArgs], { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', () => resolve(out.trim().split('\n').filter(Boolean)))
    child.stdin.write(lines.map((line) => `${line}\n`).join(''))
    child.stdin.end()
  })
}

describe('MCP server smoke (both distributed binaries)', () => {
  const script = [
    JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    'this is not json',
    JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'check_ai_readiness', arguments: { url: 'http://' } },
    }),
    JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list' }),
    JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'ping' }),
  ]

  function assertSession(replies: string[]) {
    const parsed = replies.map((line) => JSON.parse(line) as Record<string, never>)
    const byId = new Map(parsed.map((reply) => [reply['id'], reply] as const))
    expect(
      (byId.get(1 as never) as never as { result: { serverInfo: { name: string } } }).result.serverInfo.name
    ).toBe('geo-tool-check')
    // Malformed JSON answers a parse error without ending the session ...
    expect(
      parsed.some((reply) => (reply as never as { error?: { code: number } }).error?.code === -32700)
    ).toBe(true)
    // ... a crashing tool answers isError ...
    expect((byId.get(2 as never) as never as { result: { isError: boolean } }).result.isError).toBe(true)
    // ... and the session still lists tools and answers ping afterwards.
    expect((byId.get(3 as never) as never as { result: { tools: unknown[] } }).result.tools).toHaveLength(3)
    expect(byId.get(4 as never)).toBeDefined()
  }

  it('dist/mcp.js survives malformed input and tool errors in one session', async () => {
    assertSession(await mcpSession('dist/mcp.js', script))
  })

  it('dist/cli.js --mcp starts the identical server', async () => {
    assertSession(await mcpSession('dist/cli.js', script, ['--mcp']))
  })
})
