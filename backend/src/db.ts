import { createClient } from '@libsql/client/web'
import type { Client } from '@libsql/client/web'
import type { Env } from './env'

/**
 * libSQL client bound to Turso.
 *
 * IMPORTANT: Cloudflare Workers requires the `@libsql/client/web` entry point.
 * The non-web import pulls in Node built-ins and will not bundle for Workers.
 *
 * We normalize `libsql://` URLs to `https://` so the driver uses plain HTTP
 * (no WebSocket upgrade), which is the most reliable transport inside workerd.
 */
export function createDb(env: Env): Client {
  const url = env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://')
  return createClient({
    url,
    authToken: env.TURSO_AUTH_TOKEN,
  })
}
