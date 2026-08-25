// MCP server over stdio: the newline-delimited JSON-RPC transport. All
// protocol logic lives in mcp-protocol.ts; this file only reads stdin,
// writes stdout, and manages process lifetime.
//
// As in the CLI: every fetch goes from the user's machine straight to the
// target site, never through geo-tool.com. Running this server costs the
// provider nothing.

import { handleMcpMessage, replyError, type JsonRpcRequest } from './mcp-protocol'

function send(message: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

// Count in-flight requests: stdin ends as soon as the client closes the pipe,
// and an immediate process.exit would discard a check that is still running.
// The agent would get no answer at all instead of an error message.
let inFlight = 0
let stdinClosed = false

function exitWhenIdle(): void {
  if (stdinClosed && inFlight === 0) process.exit(0)
}

let buffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk: string) => {
  buffer += chunk
  let newline = buffer.indexOf('\n')
  while (newline !== -1) {
    const line = buffer.slice(0, newline).trim()
    buffer = buffer.slice(newline + 1)
    if (line) {
      let request: JsonRpcRequest | null = null
      try {
        request = JSON.parse(line) as JsonRpcRequest
      } catch {
        send(replyError(null, -32700, 'Parse error'))
      }
      if (request) {
        inFlight += 1
        void handleMcpMessage(request)
          .then((reply) => {
            if (reply) send(reply)
          })
          .finally(() => {
            inFlight -= 1
            exitWhenIdle()
          })
      }
    }
    newline = buffer.indexOf('\n')
  }
})
process.stdin.on('end', () => {
  stdinClosed = true
  exitWhenIdle()
})
