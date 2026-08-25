import type { Server } from 'node:http'

export function startFixtureServer(options?: {
  llmsMode?: 'plain' | 'spa-html' | 'missing'
}): Promise<{ server: Server; origin: string }>
