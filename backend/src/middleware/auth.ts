import type { Context, Next } from 'hono'
import { verifyJwt } from '../lib/jwt'
import type { AppEnv } from '../types'

export async function jwtAuth(c: Context<AppEnv>, next: Next) {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing Bearer token.' }, 401)
  }
  try {
    const payload = await verifyJwt(header.slice(7), c.env.JWT_SECRET)
    c.set('user', payload)
    return next()
  } catch {
    return c.json({ error: 'Invalid or expired token.' }, 401)
  }
}
