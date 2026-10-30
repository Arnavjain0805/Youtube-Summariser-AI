export interface Env {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
  JWT_SECRET: string

  LLM_API_KEY: string
  LLM_BASE_URL?: string
  LLM_MODEL?: string

  APIFY_API_TOKEN: string

  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string

  OAUTH_REDIRECT_BASE?: string
  FRONTEND_URL?: string
  CORS_ORIGIN?: string
}
