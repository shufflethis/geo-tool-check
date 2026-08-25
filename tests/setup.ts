// Network guard: no test may call a third-party site. Everything a test
// fetches must come from the local fixture server (127.0.0.1/localhost).
// A test that slips in a real-world URL fails immediately instead of
// becoming flaky CI six months from now.

const realFetch = globalThis.fetch

globalThis.fetch = ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
  const url = new URL(href)
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error(`Test tried to fetch a non-local host: ${url.hostname}. Use the fixture server.`)
  }
  return realFetch(input, init)
}) as typeof fetch
