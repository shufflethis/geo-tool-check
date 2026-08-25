import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

export default defineConfig({
  define: {
    // Same canonical version the bundler injects (see build.mjs).
    __PKG_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // Tests must never call third-party sites — the guard in tests/setup.ts
    // fails any fetch that leaves localhost.
    setupFiles: ['tests/setup.ts'],
    testTimeout: 20_000,
  },
})
