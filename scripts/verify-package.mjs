// Package verification: proves that what `npm pack` ships actually works.
// Builds, packs, inspects the tarball, installs it into a throwaway dir,
// runs both distributed executables, initializes the MCP server, and checks
// that no runtime dependencies exist. Cleans up only its own temp directory.
import { execFile, spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const failures = []
const ok = (label) => console.log(`  ✔ ${label}`)
const fail = (label) => {
  failures.push(label)
  console.error(`  ✘ ${label}`)
}
const assert = (condition, label) => (condition ? ok(label) : fail(label))

console.log('verify:package')

// 1. Build + pack
await run('node', ['build.mjs'], { cwd: root })
ok('build succeeded')

const workDir = mkdtempSync(path.join(tmpdir(), 'geo-tool-check-verify-'))
try {
  const packOutput = await run('npm', ['pack', '--json', '--pack-destination', workDir], { cwd: root })
  const packInfo = JSON.parse(packOutput.stdout)[0]
  const tarball = path.join(workDir, packInfo.filename)
  ok(`packed ${packInfo.filename} (${packInfo.files.length} files)`)

  // 2. Tarball contents: required files in, development files out
  const shipped = packInfo.files.map((file) => file.path)
  for (const required of [
    'dist/cli.js',
    'dist/mcp.js',
    'README.md',
    'manifest.json',
    'package.json',
    'LICENSE',
  ]) {
    assert(shipped.includes(required), `tarball contains ${required}`)
  }
  const leaks = shipped.filter(
    (file) =>
      file.startsWith('src/') ||
      file.startsWith('tests/') ||
      file.startsWith('docs/') ||
      file.startsWith('.github/') ||
      file.startsWith('scripts/') ||
      file.includes('eslint') ||
      file.includes('tsconfig') ||
      file.includes('vitest')
  )
  assert(leaks.length === 0, `no source/test/config leaks (${leaks.join(', ') || 'clean'})`)

  // 3. Install the tarball in isolation and run the packaged executables
  await run('npm', ['install', '--no-audit', '--no-fund', tarball], { cwd: workDir })
  const installedPkg = JSON.parse(
    readFileSync(path.join(workDir, 'node_modules', 'geo-tool-check', 'package.json'), 'utf8')
  )
  const deps = installedPkg.dependencies ?? {}
  assert(Object.keys(deps).length === 0, 'no runtime dependencies')
  assert(installedPkg.bin['geo-tool-check'] === 'dist/cli.js', 'bin geo-tool-check preserved')
  assert(installedPkg.bin['geo-tool-check-mcp'] === 'dist/mcp.js', 'bin geo-tool-check-mcp preserved')

  const binDir = path.join(workDir, 'node_modules', '.bin')
  const help = await run(path.join(binDir, 'geo-tool-check'), ['--help'])
  assert(help.stdout.includes('is this page readable for AI search?'), 'packaged CLI prints help (exit 0)')

  // 4. MCP initialize over stdio against the packaged server binary
  const mcpReply = await new Promise((resolve, reject) => {
    const child = spawn(path.join(binDir, 'geo-tool-check-mcp'), [], { stdio: ['pipe', 'pipe', 'inherit'] })
    let out = ''
    child.stdout.on('data', (chunk) => {
      out += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', () => resolve(out))
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })}\n`)
    child.stdin.end()
  })
  const initialize = JSON.parse(mcpReply.trim().split('\n')[0])
  assert(initialize.result?.serverInfo?.name === 'geo-tool-check', 'packaged MCP server initializes')
  assert(
    initialize.result?.serverInfo?.version === installedPkg.version,
    'MCP server reports the package version'
  )

  // 5. Cost-leak guard on the shipped bundles
  for (const file of ['dist/cli.js', 'dist/mcp.js']) {
    const code = readFileSync(path.join(workDir, 'node_modules', 'geo-tool-check', file), 'utf8')
    assert(!/fetch\(\s*[`'"][^`'"]*geo-tool\.com/.test(code), `${file} never fetches geo-tool.com`)
  }
} finally {
  rmSync(workDir, { recursive: true, force: true })
}

if (failures.length) {
  console.error(`\nverify:package failed: ${failures.length} problem(s)`)
  process.exit(1)
}
console.log('\nverify:package passed')
