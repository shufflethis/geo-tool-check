// Bundles the CLI and the MCP server into one dependency-free file each. The
// scoring core ships unchanged from geo-tool-nextjs — this package computes
// exactly the same score as the website.
import { chmod, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import esbuild from 'esbuild'

const root = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(root, 'dist')
await mkdir(dist, { recursive: true })

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))

await esbuild.build({
  entryPoints: [path.join(root, 'src', 'cli.ts'), path.join(root, 'src', 'mcp.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  outdir: dist,
  banner: { js: '#!/usr/bin/env node' },
  // One canonical version: visible server/CLI versions come from package.json.
  define: { __PKG_VERSION__: JSON.stringify(pkg.version) },
  logLevel: 'warning',
})

for (const file of ['cli.js', 'mcp.js']) {
  await chmod(path.join(dist, file), 0o755)
  const code = await readFile(path.join(dist, file), 'utf8')
  // A call to geo-tool.com would be a cost leak: the package may mention the
  // domain in text and links, but must never fetch it.
  if (/fetch\(\s*[`'"][^`'"]*geo-tool\.com/.test(code)) {
    throw new Error(`${file} calls geo-tool.com — that must never ship.`)
  }
}
console.log('built dist/cli.js + dist/mcp.js')
