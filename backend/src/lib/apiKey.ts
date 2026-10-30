import { bytesToBase64Url } from './encoding'

const encoder = new TextEncoder()
export const API_KEY_PREFIX = 'yt_live_'

/** Generate a `yt_live_...` API key using the Web Crypto RNG. */
export function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return API_KEY_PREFIX + bytesToBase64Url(bytes)
}

/** SHA-256 hex digest of a key. Only this hash is ever persisted. */
export async function hashApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(encoder.encode(key)))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Short display prefix used in the dashboard (e.g. `yt_live_AbCd…`). */
export function apiKeyPrefix(key: string): string {
  return key.slice(0, 12) + '…'
}
