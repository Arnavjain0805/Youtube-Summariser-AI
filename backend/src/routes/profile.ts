import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { createDb } from '../db'
import { jwtAuth } from '../middleware/auth'
import { verifyPassword, hashPassword } from '../lib/password'

export const profileRoutes = new Hono<AppEnv>()

profileRoutes.use('*', jwtAuth)

profileRoutes.get('/', async (c) => {
  const db = createDb(c.env)
  try {
    const rows = await db.execute({
      sql: 'SELECT id, email, name, provider, avatar_url, created_at FROM users WHERE id = ?',
      args: [c.get('user').sub],
    })
    if (rows.rows.length === 0) return c.json({ error: 'User not found.' }, 404)
    return c.json({ user: rows.rows[0] })
  } finally {
    db.close()
  }
})

profileRoutes.put('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  const name = typeof body?.name === 'string' ? body.name.trim() : null
  if (name === null || name === '') return c.json({ error: 'Name cannot be empty.' }, 400)

  const db = createDb(c.env)
  try {
    await db.execute({
      sql: 'UPDATE users SET name = ? WHERE id = ?',
      args: [name, c.get('user').sub],
    })
    const rows = await db.execute({
      sql: 'SELECT id, email, name, provider, avatar_url, created_at FROM users WHERE id = ?',
      args: [c.get('user').sub],
    })
    return c.json({ user: rows.rows[0] })
  } finally {
    db.close()
  }
})

profileRoutes.post('/password', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  const current = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const next = typeof body?.newPassword === 'string' ? body.newPassword : ''

  if (next.length < 8) {
    return c.json({ error: 'New password must be at least 8 characters long.' }, 400)
  }

  const db = createDb(c.env)
  try {
    const rows = await db.execute({
      sql: 'SELECT password_hash FROM users WHERE id = ?',
      args: [c.get('user').sub],
    })
    const user = rows.rows[0] as Record<string, any> | undefined
    if (!user || typeof user.password_hash !== 'string') {
      return c.json({ error: 'This account uses OAuth and has no password.' }, 400)
    }
    const ok = await verifyPassword(current, user.password_hash)
    if (!ok) return c.json({ error: 'Current password is incorrect.' }, 400)

    await db.execute({
      sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
      args: [await hashPassword(next), c.get('user').sub],
    })
    return c.json({ ok: true })
  } finally {
    db.close()
  }
})
