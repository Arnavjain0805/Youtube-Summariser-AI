import { Hono } from 'hono'
import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { createDb } from '../db'
import { signJwt } from '../lib/jwt'

interface OAuthProviderConfig {
  clientId: string
  clientSecret: string
  authorizeUrl: string
  tokenUrl: string
  scope: string
}

function providerConfig(c: Context<AppEnv>, provider: string): OAuthProviderConfig | null {
  const env = c.env
  if (provider === 'google') {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null
    return {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'openid email profile',
    }
  }
  if (provider === 'github') {
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return null
    return {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      authorizeUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scope: 'read:user user:email',
    }
  }
  return null
}

function redirectUri(c: Context<AppEnv>, provider: string): string {
  const base = c.env.OAUTH_REDIRECT_BASE?.replace(/\/$/, '')
  if (base) return `${base}/api/auth/${provider}/callback`
  const url = new URL(c.req.url)
  return `${url.origin}/api/auth/${provider}/callback`
}

export const oauthRoutes = new Hono<AppEnv>()

oauthRoutes.get('/:provider', (c) => {
  const provider = c.req.param('provider')
  const cfg = providerConfig(c, provider)
  if (!cfg) {
    return c.json(
      { error: `OAuth provider "${provider}" is not configured on the server.` },
      400,
    )
  }
  const state = crypto.randomUUID()
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri(c, provider),
    response_type: 'code',
    scope: cfg.scope,
    state,
  })
  const res = c.redirect(`${cfg.authorizeUrl}?${params.toString()}`)
  res.headers.append(
    'Set-Cookie',
    `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
  )
  return res
})

oauthRoutes.get('/:provider/callback', async (c) => {
  const provider = c.req.param('provider')
  const cfg = providerConfig(c, provider)
  if (!cfg) {
    return c.json({ error: `OAuth provider "${provider}" is not configured.` }, 400)
  }

  const code = c.req.query('code')
  const state = c.req.query('state')
  const cookie = c.req.header('Cookie')?.match(/oauth_state=([^;]+)/)?.[1]
  if (state && cookie && state !== cookie) {
    return c.json({ error: 'OAuth state mismatch. Try again.' }, 400)
  }
  if (!code) return c.json({ error: 'OAuth callback missing authorization code.' }, 400)

  let accessToken: string
  try {
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        redirect_uri: redirectUri(c, provider),
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = (await tokenRes.json()) as Record<string, any>
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'token exchange failed')
    }
    accessToken = tokenData.access_token as string
  } catch (e) {
    return c.json({ error: `Failed to exchange OAuth code: ${(e as Error).message}` }, 502)
  }

  let email = ''
  let name = ''
  let avatar = ''
  let providerId = ''
  try {
    if (provider === 'google') {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = (await res.json()) as Record<string, any>
      email = data.email
      name = data.name
      avatar = data.picture
      providerId = data.id
    } else {
      const headers = { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'yt-summarizer' }
      const [userRes, emailsRes] = await Promise.all([
        fetch('https://api.github.com/user', { headers }),
        fetch('https://api.github.com/user/emails', { headers }),
      ])
      const userData = (await userRes.json()) as Record<string, any>
      providerId = String(userData.id)
      name = userData.name ?? userData.login
      avatar = userData.avatar_url
      if (userData.email) email = userData.email
      else {
        const emails = (await emailsRes.json()) as Array<Record<string, any>>
        email = emails.find((e) => e.primary)?.email ?? emails[0]?.email ?? ''
      }
    }
  } catch (e) {
    return c.json({ error: `Failed to fetch OAuth profile: ${(e as Error).message}` }, 502)
  }

  if (!email) return c.json({ error: 'OAuth provider did not return an email address.' }, 400)

  const db = createDb(c.env)
  let userId: string
  try {
    const byProvider = await db.execute({
      sql: 'SELECT id, name FROM users WHERE provider = ? AND provider_id = ?',
      args: [provider, providerId],
    })
    if (byProvider.rows.length > 0) {
      userId = byProvider.rows[0].id as string
    } else {
      const byEmail = await db.execute({
        sql: 'SELECT id FROM users WHERE email = ?',
        args: [email.toLowerCase()],
      })
      if (byEmail.rows.length > 0) {
        userId = byEmail.rows[0].id as string
        await db.execute({
          sql: 'UPDATE users SET provider = ?, provider_id = ?, avatar_url = COALESCE(?, avatar_url), name = COALESCE(NULLIF(?, \'\'), name) WHERE id = ?',
          args: [provider, providerId, avatar, name, userId],
        })
      } else {
        userId = crypto.randomUUID()
        await db.execute({
          sql: `INSERT INTO users (id, email, name, provider, provider_id, avatar_url, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            userId,
            email.toLowerCase(),
            name || email.split('@')[0],
            provider,
            providerId,
            avatar,
            new Date().toISOString(),
          ],
        })
        await db.execute({
          sql: 'INSERT INTO user_preferences (user_id) VALUES (?)',
          args: [userId],
        })
      }
    }
  } finally {
    db.close()
  }

  const token = await signJwt({ sub: userId, email, name: name || undefined }, c.env.JWT_SECRET)
  const frontend = c.env.FRONTEND_URL ?? 'http://localhost:5173'
  const params = new URLSearchParams({ token, provider })
  return c.redirect(`${frontend}/oauth/callback?${params.toString()}`)
})
