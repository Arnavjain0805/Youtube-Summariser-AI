import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { AppEnv } from './types'
import { authRoutes } from './routes/auth'
import { oauthRoutes } from './routes/oauth'
import { chatsRoutes } from './routes/chats'
import { preferencesRoutes } from './routes/preferences'
import { keysRoutes } from './routes/keys'
import { profileRoutes } from './routes/profile'
import { publicRoutes } from './routes/public'
import { YtError } from './lib/youtube'
import { LlmError } from './lib/llm'

const app = new Hono<AppEnv>()

app.use('/api/*', cors({
  origin: (origin, c) => {
    const env = c.env as { CORS_ORIGIN?: string }
    const allowed = (env.CORS_ORIGIN ?? '*').split(',').map((s: string) => s.trim())
    if (allowed.includes('*')) return origin ?? '*'
    if (origin && allowed.includes(origin)) return origin
    return ''
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
}))

app.get('/', (c) =>
  c.json({
    name: 'yt-summarizer-api',
    version: '1.0.0',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET  /api/auth/me',
      'GET  /api/auth/oauth/{google|github}',
      'POST /api/chats',
      'GET  /api/chats',
      'GET  /api/chats/:id',
      'POST /api/chats/:id/messages',
      'DELETE /api/chats/:id',
      'GET  /api/preferences',
      'PUT  /api/preferences',
      'GET  /api/keys',
      'POST /api/keys',
      'DELETE /api/keys/:id',
      'GET  /api/profile',
      'POST /api/v1/summarize (API key)',
    ],
  }),
)

app.route('/api/auth', authRoutes)
app.route('/api/auth', oauthRoutes)
app.route('/api/chats', chatsRoutes)
app.route('/api/preferences', preferencesRoutes)
app.route('/api/keys', keysRoutes)
app.route('/api/profile', profileRoutes)
app.route('/api/v1', publicRoutes)

app.notFound((c) => c.json({ error: 'Not found.' }, 404))

app.onError((err, c) => {
  console.error('Unhandled error:', err)
  if (err instanceof YtError) return c.json({ error: err.message, code: err.code }, 422)
  if (err instanceof LlmError)
    return c.json({ error: err.message }, err.status as ContentfulStatusCode)
  return c.json({ error: 'Internal server error.' }, 500)
})

export default app
