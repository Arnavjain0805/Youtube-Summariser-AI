import type { Env } from './env'

export interface JwtPayload {
  sub: string
  email: string
  name?: string
  iat: number
  exp: number
}

export interface UserRow {
  id: string
  email: string
  name: string | null
  password_hash: string | null
  provider: string
  provider_id: string | null
  avatar_url: string | null
  created_at: string
}

export interface ApiKeyRow {
  id: string
  user_id: string
  name: string
  key_prefix: string
  key_hash: string
  created_at: string
  last_used_at: string | null
  usage_count: number
  revoked: number
}

export type AppEnv = {
  Bindings: Env
  Variables: {
    user: JwtPayload
    key: ApiKeyRow
  }
}
