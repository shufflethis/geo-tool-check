// Golden-Master-Capture: friert die HEUTIGE Ausgabe des gebauten CLI ein
// (vor jedem Refactor gelaufen). Normalisiert Port und Laufzeiten.
import { execFile } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { startFixtureServer } from './serve.mjs'

const run = promisify(execFile)
const { server, origin } = await startFixtureServer()

export function normalize(text, origin) {
  return text
    .replaceAll(origin, 'http://127.0.0.1:PORT')
    .replace(/"responseMs": \d+/g, '"responseMs": 0')
    .replace(/\d+ ms/g, 'N ms')
}

async function cli(args) {
  try {
    const { stdout, stderr } = await run('node', ['dist/cli.js', ...args], {
      env: { ...process.env, NO_COLOR: '1' },
    })
    return { stdout, stderr, code: 0 }
  } catch (error) {
    return { stdout: error.stdout ?? '', stderr: error.stderr ?? '', code: error.code ?? 1 }
  }
}

const cases = {
  'check-json': [origin + '/', '--json'],
  'check-pretty': [origin + '/'],
  'check-de-json': [origin + '/', '--json', '--lang', 'de'],
  'crawlers-json': [origin + '/', '--crawlers', '--json'],
  'crawlers-pretty': [origin + '/', '--crawlers'],
  'redirect-json': [origin + '/redirect', '--json'],
  'unreachable-json': [origin + '/missing', '--json'],
  'unreachable-pretty': [origin + '/missing'],
  'min-score-fail': [origin + '/', '--min-score', '99'],
  'min-score-pass': [origin + '/', '--min-score', '10'],
  'min-score-unreachable': [origin + '/missing', '--min-score', '10'],
  help: ['--help'],
  'no-url': ['--json'],
  'bad-min-score': [origin + '/', '--min-score', 'abc'],
}

const exitCodes = {}
for (const [name, args] of Object.entries(cases)) {
  const result = await cli(args)
  writeFileSync(`tests/fixtures/golden/${name}.stdout.txt`, normalize(result.stdout, origin))
  writeFileSync(`tests/fixtures/golden/${name}.stderr.txt`, normalize(result.stderr, origin))
  exitCodes[name] = result.code
}
writeFileSync('tests/fixtures/golden/exit-codes.json', JSON.stringify(exitCodes, null, 2) + '\n')
console.log(JSON.stringify(exitCodes))
server.close()
