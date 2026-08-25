// MCP-Server ueber stdio: gibt Agenten drei Werkzeuge fuer KI-Sichtbarkeit.
//
// Bewusst ohne SDK-Abhaengigkeit. Das Protokoll ueber stdio ist JSON-RPC 2.0
// mit drei Methoden, die hier gebraucht werden — initialize, tools/list und
// tools/call. Ein Paket ohne Abhaengigkeiten laesst sich mit `npx` sofort
// starten, hat keine Lieferkette und altert nicht mit fremden Versionen.
//
// Wie im CLI: jeder Abruf geht vom Rechner des Nutzers zur Zielseite, nie ueber
// geo-tool.com. Der Betrieb dieses Servers kostet den Anbieter nichts.

import { assessContentReadiness } from './core/content-readiness'
import { runCheck, runCrawlerCheck, type Lang } from './check'

const PROTOCOL_VERSION = '2024-11-05'
const SERVER = { name: 'geo-tool-check', version: '1.0.0' }

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id?: number | string | null
  method: string
  params?: Record<string, unknown>
}

const LANG_SCHEMA = {
  type: 'string',
  enum: ['de', 'en'],
  default: 'en',
  description: 'Language of the labels and explanations in the result.',
} as const

const TOOLS = [
  {
    name: 'check_ai_readiness',
    description:
      'Check whether a public web page can be read, understood and cited by AI search systems such as ChatGPT, Perplexity, Claude and Google AI. Returns a score from 0 to 100 across six categories plus concrete findings. Fetches the page from this machine; nothing is sent to a third party. Use this when someone asks why their page does not appear in AI answers, or before publishing a page.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Full URL of the page, e.g. https://example.com/pricing' },
        lang: LANG_SCHEMA,
      },
      required: ['url'],
    },
  },
  {
    name: 'check_ai_crawlers',
    description:
      "Read a domain's robots.txt and report which AI crawlers are fully blocked — GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended and others. Faster than a full readiness check and the first thing to look at when a site is missing from AI answers entirely.",
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Any URL on the domain; only the origin is used.' },
        lang: LANG_SCHEMA,
      },
      required: ['url'],
    },
  },
  {
    name: 'check_citability',
    description:
      'Score a passage of text or HTML on how likely an AI answer is to quote it: answer in the first paragraph, lists, tables, evidence, freshness and depth. Makes no network request at all. Use this while drafting content, before it is published.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The passage. HTML is scored more accurately than plain text.' },
        lang: LANG_SCHEMA,
      },
      required: ['content'],
    },
  },
] as const

function send(message: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

function reply(id: JsonRpcRequest['id'], result: unknown): void {
  send({ jsonrpc: '2.0', id, result })
}

function replyError(id: JsonRpcRequest['id'], code: number, message: string): void {
  send({ jsonrpc: '2.0', id, error: { code, message } })
}

/** MCP erwartet Werkzeugergebnisse als Content-Bloecke. */
function textResult(payload: unknown, isError = false) {
  return {
    content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) }],
    isError,
  }
}

function langOf(params: Record<string, unknown> | undefined): Lang {
  return params?.lang === 'de' ? 'de' : 'en'
}

async function callTool(name: string, args: Record<string, unknown>) {
  const lang = langOf(args)

  if (name === 'check_ai_readiness') {
    if (typeof args.url !== 'string' || !args.url.trim()) {
      return textResult('The url argument is required, for example https://example.com.', true)
    }
    return textResult(await runCheck(args.url, lang))
  }

  if (name === 'check_ai_crawlers') {
    if (typeof args.url !== 'string' || !args.url.trim()) {
      return textResult('The url argument is required, for example https://example.com.', true)
    }
    return textResult(await runCrawlerCheck(args.url, lang))
  }

  if (name === 'check_citability') {
    if (typeof args.content !== 'string' || !args.content.trim()) {
      return textResult('The content argument is required.', true)
    }
    const looksLikeHtml = /<\w+[\s>]/.test(args.content)
    const html = looksLikeHtml
      ? args.content
      : args.content
          .split(/\n{2,}/)
          .map((block) => `<p>${block.trim().replace(/[<>&]/g, ' ')}</p>`)
          .join('\n')
    const result = assessContentReadiness(html, { lang })
    const words = args.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length

    return textResult({
      score: result.score,
      wordCount: words,
      // Ohne diesen Hinweis liest ein Agent einen niedrigen Wert bei kurzen
      // Ausschnitten als "schlechter Text" statt als "zu wenig Text".
      note:
        words < 120
          ? 'Short passage: depth, freshness and content schema cannot be met in this little text, which lowers the score. Weigh the answer-first and structure findings most.'
          : undefined,
      inputTreatedAs: looksLikeHtml ? 'html' : 'plain text (converted approximately)',
      findings: result.findings.map((finding) => ({
        id: finding.id,
        label: finding.label,
        status: finding.status,
        detail: finding.detail,
      })),
    })
  }

  return textResult(`Unknown tool: ${name}`, true)
}

async function handle(request: JsonRpcRequest): Promise<void> {
  const { id, method } = request

  switch (method) {
    case 'initialize':
      reply(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER,
        instructions:
          'Tools for AI search visibility. All checks run on this machine — no API key, no account, no data sent to geo-tool.com. Reach for check_ai_crawlers first when a site is missing from AI answers entirely, check_ai_readiness for a full page score, and check_citability while drafting text.',
      })
      return
    case 'notifications/initialized':
      return
    case 'tools/list':
      reply(id, { tools: TOOLS })
      return
    case 'tools/call': {
      const params = (request.params ?? {}) as { name?: string; arguments?: Record<string, unknown> }
      if (!params.name) {
        replyError(id, -32602, 'Missing tool name')
        return
      }
      try {
        reply(id, await callTool(params.name, params.arguments ?? {}))
      } catch (error) {
        // Ein geworfener Fehler beendet sonst die Sitzung — der Agent soll
        // stattdessen lesen, was schiefging.
        reply(id, textResult(error instanceof Error ? error.message : String(error), true))
      }
      return
    }
    case 'ping':
      reply(id, {})
      return
    default:
      if (id !== undefined && id !== null) replyError(id, -32601, `Method not found: ${method}`)
  }
}

// Laufende Anfragen zaehlen: stdin endet, sobald der Client die Pipe schliesst,
// und ein sofortiges process.exit wuerde eine noch laufende Pruefung verwerfen.
// Ein Agent bekaeme dann gar keine Antwort statt einer Fehlermeldung.
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
      try {
        const request = JSON.parse(line) as JsonRpcRequest
        inFlight += 1
        void handle(request).finally(() => {
          inFlight -= 1
          exitWhenIdle()
        })
      } catch {
        replyError(null, -32700, 'Parse error')
      }
    }
    newline = buffer.indexOf('\n')
  }
})
process.stdin.on('end', () => {
  stdinClosed = true
  exitWhenIdle()
})
