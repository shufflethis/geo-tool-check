// Single canonical version: build.mjs injects the package.json version at
// bundle time. The 'dev' fallback only appears when running unbundled source
// (tests inject the real version through the vitest define).

declare const __PKG_VERSION__: string | undefined

export const VERSION = typeof __PKG_VERSION__ === 'string' ? __PKG_VERSION__ : 'dev'
