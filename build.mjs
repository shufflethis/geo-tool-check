// Bundelt CLI und MCP-Server zu je einer Datei ohne Abhaengigkeiten. Der
// Pruefkern (src/core) ist derselbe Code, der auch den GEO Score auf
// geo-tool.com berechnet — dieses Repo ist der oeffentliche Stand des auf
// npm veroeffentlichten Pakets.
import { chmod, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import esbuild from 'esbuild'

const root = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(root, 'dist')
await mkdir(dist, { recursive: true })

await esbuild.build({
  entryPoints: [path.join(root, 'src', 'cli.ts'), path.join(root, 'src', 'mcp.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  outdir: dist,
  banner: { js: '#!/usr/bin/env node' },
  logLevel: 'warning',
})

for (const file of ['cli.js', 'mcp.js']) {
  await chmod(path.join(dist, file), 0o755)
  const code = await readFile(path.join(dist, file), 'utf8')
  // Ein Aufruf an geo-tool.com waere ein Kostenleck: das Paket darf die Domain
  // nur in Texten und Links nennen, nie abrufen.
  if (/fetch\(\s*[`'"][^`'"]*geo-tool\.com/.test(code)) {
    throw new Error(`${file} ruft geo-tool.com auf — das darf nicht ins Paket.`)
  }
}
console.log('built dist/cli.js + dist/mcp.js')
