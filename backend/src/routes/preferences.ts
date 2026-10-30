import { Hono } from 'hono'
import type { InValue } from '@libsql/client/web'
import type { AppEnv } from '../types'
import { createDb } from '../db'
import { jwtAuth } from '../middleware/auth'
import { TONES } from '../lib/llm'

export const preferencesRoutes = new Hono<AppEnv>()

preferencesRoutes.use('*', jwtAuth)

preferencesRoutes.get('/', async (c) => {
  const db = createDb(c.env)
  try {
    const rows = await db.execute({
      sql: 'SELECT tone, theme FROM user_preferences WHERE user_id = ?',
      args: [c.get('user').sub],
    })
    if (rows.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO user_preferences (user_id) VALUES (?)',
        args: [c.get('user').sub],
      })
      return c.json({ preferences: { tone: 'Bullet points', theme: 'dark' } })
    }
    return c.json({ preferences: rows.rows[0] })
  } finally {
    db.close()
  }
})

preferencesRoutes.put('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  const tone = typeof body?.tone === 'string' ? body.tone : null
  const theme = typeof body?.theme === 'string' ? body.theme : null

  if (tone !== null && !TONES.includes(tone as never)) {
    return c.json({ error: `Tone must be one of: ${TONES.join(', ')}` }, 400)
  }
  if (theme !== null && theme !== 'dark' && theme !== 'light') {
    return c.json({ error: 'Theme must be "dark" or "light".' }, 400)
  }

  const db = createDb(c.env)
  try {
    const sets: string[] = []
    const args: InValue[] = []
    if (tone !== null) {
      sets.push('tone = ?')
      args.push(tone)
    }
    if (theme !== null) {
      sets.push('theme = ?')
      args.push(theme)
    }
    if (sets.length === 0) return c.json({ error: 'Nothing to update.' }, 400)
    sets.push('updated_at = ?')
    args.push(new Date().toISOString())
    args.push(c.get('user').sub)

    const res = await db.execute({
      sql: `UPDATE user_preferences SET ${sets.join(', ')} WHERE user_id = ?`,
      args,
    })
    if (res.rowsAffected === 0) {
      await db.execute({
        sql: 'INSERT INTO user_preferences (user_id, tone, theme) VALUES (?, ?, ?)',
        args: [c.get('user').sub, tone ?? 'Bullet points', theme ?? 'dark'],
      })
    }
    const rows = await db.execute({
      sql: 'SELECT tone, theme FROM user_preferences WHERE user_id = ?',
      args: [c.get('user').sub],
    })
    return c.json({ preferences: rows.rows[0] })
  } finally {
    db.close()
  }
})
