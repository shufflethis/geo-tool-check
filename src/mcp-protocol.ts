// Pure MCP protocol handling: tool catalog, JSON-RPC dispatch, tool execution.
// No stdin/stdout here — the transport in mcp.ts feeds messages in and writes
// replies out, which keeps every protocol path unit-testable.
//
// Deliberately SDK-free. The MCP protocol over stdio is JSON-RPC 2.0 with the
// handful of methods needed here — initialize, tools/list, tools/call, ping.
// A dependency-free package starts instantly via `npx`, has no supply chain,
// and does not age with third-party releases.

import { assessContentReadiness } from './core/content-readiness'
import { runCheck, runCrawlerCheck, type Lang } from './check'
import { VERSION } from './version'

export const PROTOCOL_VERSION = '2024-11-05'
export const SERVER = { name: 'geo-tool-check', version: VERSION }

export type JsonRpcRequest = {
  jsonrpc: '2.0'
  id?: number | string | null
  method: string
  params?: Record<string, unknown>
}

export type JsonRpcReply = Record<string, unknown>

const LANG_SCHEMA = {
  type: 'string',
  enum: ['de', 'en'],
  default: 'en',
  description: 'Language of the labels and explanations in the result.',
} as const

export const TOOLS = [
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
        content: {
          type: 'string',
          description: 'The passage. HTML is scored more accurately than plain text.',
        },
        lang: LANG_SCHEMA,
      },
      required: ['content'],
    },
  },
] as const

/** MCP expects tool results as content blocks. */
function textResult(payload: unknown, isError = false) {
  return {
    content: [
      { type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) },
    ],
    isError,
  }
}

function langOf(args: Record<string, unknown>): Lang {
  return args.lang === 'de' ? 'de' : 'en'
}

export async function callTool(name: string, args: Record<string, unknown>) {
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
    const words = args.content
      .replace(/<[^>]*>/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length

    return textResult({
      score: result.score,
      wordCount: words,
      // Without this note an agent reads a low value on short passages as
      // "bad text" instead of "too little text".
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

function reply(id: JsonRpcRequest['id'], result: unknown): JsonRpcReply {
  return { jsonrpc: '2.0', id, result }
}

export function replyError(id: JsonRpcRequest['id'], code: number, message: string): JsonRpcReply {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

/**
 * Dispatch one JSON-RPC message. Returns the reply to send, or null when the
 * message is a notification (or an unknown method without an id) and no reply
 * must be written. A throwing tool never kills the session: the error becomes
 * a readable isError tool result.
 */
export async function handleMcpMessage(request: JsonRpcRequest): Promise<JsonRpcReply | null> {
  const { id, method } = request

  switch (method) {
    case 'initialize':
      return reply(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER,
        instructions:
          'Tools for AI search visibility. All checks run on this machine — no API key, no account, no data sent to geo-tool.com. Reach for check_ai_crawlers first when a site is missing from AI answers entirely, check_ai_readiness for a full page score, and check_citability while drafting text.',
      })
    case 'notifications/initialized':
      return null
    case 'tools/list':
      return reply(id, { tools: TOOLS })
    case 'tools/call': {
      const params = (request.params ?? {}) as { name?: string; arguments?: Record<string, unknown> }
      if (!params.name) {
        return replyError(id, -32602, 'Missing tool name')
      }
      try {
        return reply(id, await callTool(params.name, params.arguments ?? {}))
      } catch (error) {
        return reply(id, textResult(error instanceof Error ? error.message : String(error), true))
      }
    }
    case 'ping':
      return reply(id, {})
    default:
      if (id !== undefined && id !== null) return replyError(id, -32601, `Method not found: ${method}`)
      return null
  }
}
