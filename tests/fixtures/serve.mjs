// Local fixture server for tests and golden-master capture. No test may call
// third-party sites — everything comes from 127.0.0.1.
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'site')
const read = (name) => readFileSync(path.join(root, name))

/**
 * @param {{ llmsMode?: 'plain' | 'spa-html' | 'missing' }} [options]
 *   'spa-html' simulates an SPA catch-all: /llms.txt answers 200 with an HTML
 *   body, which must NOT count as a real llms.txt.
 */
export function startFixtureServer(options = {}) {
  const llmsMode = options.llmsMode ?? 'plain'
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    if (url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      return res.end(read('page.html'))
    }
    if (url.pathname === '/robots.txt') {
      res.writeHead(200, { 'content-type': 'text/plain' })
      return res.end(read('robots.txt'))
    }
    if (url.pathname === '/llms.txt') {
      if (llmsMode === 'missing') {
        res.writeHead(404, { 'content-type': 'text/plain' })
        return res.end('not found')
      }
      if (llmsMode === 'spa-html') {
        res.writeHead(200, { 'content-type': 'text/html' })
        return res.end('<!doctype html><html><body>app</body></html>')
      }
      res.writeHead(200, { 'content-type': 'text/plain' })
      return res.end(read('llms.txt'))
    }
    if (url.pathname === '/redirect') {
      res.writeHead(301, { location: '/' })
      return res.end()
    }
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('not found')
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, origin: `http://127.0.0.1:${server.address().port}` })
    })
  })
}
