import type { Context, Next } from 'hono'
import { hashApiKey } from '../lib/apiKey'
import { createDb } from '../db'
import type { AppEnv, ApiKeyRow } from '../types'

/**
 * B2B API key auth. Accepts `Authorization: Bearer <key>` or `x-api-key: <key>`.
 * Hashes the presented key with SHA-256 and matches it against stored hashes.
 * On success, bumps `last_used_at` and `usage_count`.
 */
export async function apiKeyAuth(c: Context<AppEnv>, next: Next) {
  const header = c.req.header('Authorization')
  const presented = header?.startsWith('Bearer ') ? header.slice(7) : c.req.header('x-api-key')
  if (!presented) {
    return c.json(
      { error: 'Missing API key. Send it via Authorization: Bearer <key> or x-api-key header.' },
      401,
    )
  }

  const hash = await hashApiKey(presented)
  const db = createDb(c.env)
  try {
    const rows = await db.execute({
      sql: 'SELECT * FROM api_keys WHERE key_hash = ? AND revoked = 0',
      args: [hash],
    })
    if (rows.rows.length === 0) {
      return c.json({ error: 'Invalid API key.' }, 401)
    }
    const key = rows.rows[0] as unknown as ApiKeyRow
    await db.execute({
      sql: 'UPDATE api_keys SET last_used_at = ?, usage_count = usage_count + 1 WHERE id = ?',
      args: [new Date().toISOString(), key.id],
    })
    c.set('key', key)
    return next()
  } finally {
    db.close()
  }
}
