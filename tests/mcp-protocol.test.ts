import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { handleMcpMessage, PROTOCOL_VERSION, SERVER, TOOLS } from '../src/mcp-protocol'
import { startFixtureServer } from './fixtures/serve.mjs'

type Fixture = Awaited<ReturnType<typeof startFixtureServer>>
let fixture: Fixture

beforeAll(async () => {
  fixture = await startFixtureServer()
})

afterAll(() => {
  fixture.server.close()
})

type ToolReply = {
  jsonrpc: string
  id: unknown
  result: { isError: boolean; content: Array<{ text: string }> }
}

const msg = (method: string, params?: Record<string, unknown>, id: number | null = 1) => ({
  jsonrpc: '2.0' as const,
  id,
  method,
  params,
})

describe('MCP protocol', () => {
  it('initialize answers with protocol version, tools capability and server info', async () => {
    const reply = (await handleMcpMessage(msg('initialize', {}))) as Record<string, never>
    expect(reply.result).toMatchObject({
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: SERVER,
    })
    // Canonical version: the visible server version is the package version.
    expect(SERVER.version).not.toBe('')
  })

  it('ping answers with an empty result; the initialized notification stays silent', async () => {
    expect(await handleMcpMessage(msg('ping'))).toMatchObject({ result: {} })
    expect(await handleMcpMessage({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull()
  })

  it('tools/list exposes exactly the three preserved tools with schemas', async () => {
    const reply = (await handleMcpMessage(msg('tools/list'))) as { result: { tools: typeof TOOLS } }
    expect(reply.result.tools.map((tool) => tool.name)).toEqual([
      'check_ai_readiness',
      'check_ai_crawlers',
      'check_citability',
    ])
    for (const tool of reply.result.tools) {
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.description.length).toBeGreaterThan(40)
    }
  })

  it('check_citability works without any network access', async () => {
    const reply = (await handleMcpMessage(
      msg('tools/call', {
        name: 'check_citability',
        arguments: { content: '<p>The audit costs 0 to 500 euros.</p><ul><li>a</li></ul>' },
      })
    )) as ToolReply
    expect(reply.result.isError).toBe(false)
    const payload = JSON.parse(reply.result.content[0]!.text) as { score: number; note?: string }
    expect(payload.score).toBeGreaterThanOrEqual(0)
    expect(payload.note).toContain('Short passage')
  })

  it('check_ai_readiness runs against the fixture server', async () => {
    const reply = (await handleMcpMessage(
      msg('tools/call', { name: 'check_ai_readiness', arguments: { url: `${fixture.origin}/` } })
    )) as ToolReply
    expect(reply.result.isError).toBe(false)
    const payload = JSON.parse(reply.result.content[0]!.text) as { score: number; blockedCrawlers: string[] }
    expect(payload.score).toBeGreaterThan(0)
    expect(payload.blockedCrawlers).toContain('GPTBot')
  })

  it('missing or invalid arguments become readable isError results, not protocol errors', async () => {
    const noUrl = (await handleMcpMessage(
      msg('tools/call', { name: 'check_ai_readiness', arguments: {} })
    )) as ToolReply
    expect(noUrl.result.isError).toBe(true)
    const noContent = (await handleMcpMessage(
      msg('tools/call', { name: 'check_citability', arguments: {} })
    )) as ToolReply
    expect(noContent.result.isError).toBe(true)
  })

  it('unknown tools and a missing tool name are handled per spec', async () => {
    const unknown = (await handleMcpMessage(msg('tools/call', { name: 'nope', arguments: {} }))) as ToolReply
    expect(unknown.result.isError).toBe(true)
    expect(unknown.result.content[0]!.text).toContain('Unknown tool')
    const noName = (await handleMcpMessage(msg('tools/call', {}))) as { error: { code: number } }
    expect(noName.error.code).toBe(-32602)
  })

  it('unknown methods: error with id, silence without id', async () => {
    const withId = (await handleMcpMessage(msg('resources/list'))) as { error: { code: number } }
    expect(withId.error.code).toBe(-32601)
    expect(await handleMcpMessage({ jsonrpc: '2.0', method: 'notifications/cancelled' })).toBeNull()
  })

  it('a throwing tool call becomes an isError result and the session keeps answering', async () => {
    // 'http://' makes normalizeUrl throw inside the tool — the dispatcher must
    // convert that into a readable isError result instead of killing the session.
    const crash = (await handleMcpMessage(
      msg('tools/call', { name: 'check_ai_readiness', arguments: { url: 'http://' } })
    )) as ToolReply
    expect(crash.result.isError).toBe(true)
    const afterCrash = await handleMcpMessage(msg('ping'))
    expect(afterCrash).toMatchObject({ result: {} })
  })
})
