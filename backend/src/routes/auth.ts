import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { createDb } from '../db'
import { hashPassword, verifyPassword } from '../lib/password'
import { signJwt } from '../lib/jwt'
import { jwtAuth } from '../middleware/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const authRoutes = new Hono<AppEnv>()

authRoutes.post('/register', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!EMAIL_RE.test(email)) return c.json({ error: 'A valid email is required.' }, 400)
  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters long.' }, 400)
  }

  const db = createDb(c.env)
  try {
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email],
    })
    if (existing.rows.length > 0) {
      return c.json({ error: 'An account with this email already exists.' }, 409)
    }

    const id = crypto.randomUUID()
    const displayName = name || email.split('@')[0]
    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash, name, provider, created_at)
            VALUES (?, ?, ?, ?, 'email', ?)`,
      args: [id, email, await hashPassword(password), displayName, new Date().toISOString()],
    })
    await db.execute({
      sql: 'INSERT INTO user_preferences (user_id) VALUES (?)',
      args: [id],
    })

    const token = await signJwt({ sub: id, email, name: displayName }, c.env.JWT_SECRET)
    return c.json({ token, user: { id, email, name: displayName, provider: 'email' } }, 201)
  } finally {
    db.close()
  }
})

authRoutes.post('/login', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) return c.json({ error: 'Email and password are required.' }, 400)

  const db = createDb(c.env)
  try {
    const rows = await db.execute({
      sql: 'SELECT id, email, name, password_hash, provider FROM users WHERE email = ?',
      args: [email],
    })
    const user = rows.rows[0] as Record<string, any> | undefined
    if (!user || typeof user.password_hash !== 'string') {
      return c.json({ error: 'Invalid email or password.' }, 401)
    }
    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) return c.json({ error: 'Invalid email or password.' }, 401)

    const token = await signJwt(
      { sub: user.id, email: user.email, name: user.name ?? undefined },
      c.env.JWT_SECRET,
    )
    return c.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, provider: user.provider },
    })
  } finally {
    db.close()
  }
})

authRoutes.get('/me', jwtAuth, async (c) => {
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
