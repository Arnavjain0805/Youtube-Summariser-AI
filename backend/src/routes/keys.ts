import { Hono } from 'hono'
import type { AppEnv, ApiKeyRow } from '../types'
import { createDb } from '../db'
import { jwtAuth } from '../middleware/auth'
import { generateApiKey, hashApiKey, apiKeyPrefix } from '../lib/apiKey'

export const keysRoutes = new Hono<AppEnv>()

keysRoutes.use('*', jwtAuth)

function sanitize(key: ApiKeyRow) {
  return {
    id: key.id,
    name: key.name,
    prefix: key.key_prefix,
    createdAt: key.created_at,
    lastUsedAt: key.last_used_at,
    usageCount: key.usage_count,
    revoked: key.revoked === 1,
  }
}

keysRoutes.get('/', async (c) => {
  const db = createDb(c.env)
  try {
    const rows = await db.execute({
      sql: 'SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC',
      args: [c.get('user').sub],
    })
    return c.json({ keys: rows.rows.map((r) => sanitize(r as unknown as ApiKeyRow)) })
  } finally {
    db.close()
  }
})

keysRoutes.post('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : 'API Key'
  const plain = generateApiKey()
  const hash = await hashApiKey(plain)

  const db = createDb(c.env)
  try {
    await db.execute({
      sql: 'INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash) VALUES (?, ?, ?, ?, ?)',
      args: [crypto.randomUUID(), c.get('user').sub, name, apiKeyPrefix(plain), hash],
    })
  } finally {
    db.close()
  }

  return c.json(
    {
      key: plain,
      message: 'Copy this key now. It will not be shown again.',
      createdAt: new Date().toISOString(),
    },
    201,
  )
})

keysRoutes.delete('/:id', async (c) => {
  const db = createDb(c.env)
  try {
    const res = await db.execute({
      sql: 'UPDATE api_keys SET revoked = 1 WHERE id = ? AND user_id = ?',
      args: [c.req.param('id'), c.get('user').sub],
    })
    if (res.rowsAffected === 0) return c.json({ error: 'API key not found.' }, 404)
    return c.json({ ok: true })
  } finally {
    db.close()
  }
})
