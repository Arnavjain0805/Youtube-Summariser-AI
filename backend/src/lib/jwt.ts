import { bytesToBase64Url, base64UrlToBytes } from './encoding'
import type { JwtPayload } from '../types'

const encoder = new TextEncoder()

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new Uint8Array(encoder.encode(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  secret: string,
  ttlSeconds = 60 * 60 * 24 * 30,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const body: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  }
  const headerB64 = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const payloadB64 = bytesToBase64Url(encoder.encode(JSON.stringify(body)))
  const signingInput = `${headerB64}.${payloadB64}`
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new Uint8Array(encoder.encode(signingInput)))
  return `${signingInput}.${bytesToBase64Url(new Uint8Array(sig))}`
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed token')
  const [headerB64, payloadB64, sigB64] = parts
  const key = await importKey(secret)
  const ok = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlToBytes(sigB64),
    new Uint8Array(encoder.encode(`${headerB64}.${payloadB64}`)),
  )
  if (!ok) throw new Error('Invalid signature')

  const payload = JSON.parse(
    new TextDecoder().decode(base64UrlToBytes(payloadB64)),
  ) as JwtPayload
  if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired')
  }
  return payload
}
