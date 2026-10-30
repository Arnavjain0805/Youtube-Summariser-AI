const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function bytesToBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined
    out += B64[b0 >> 2]
    out += B64[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)]
    out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | (b2 === undefined ? 0 : b2 >> 6)]
    out += b2 === undefined ? '=' : B64[b2 & 63]
  }
  return out
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4 !== 0) s += '='
  const out: number[] = []
  for (let i = 0; i < s.length; i += 4) {
    const c0 = B64.indexOf(s[i])
    const c1 = B64.indexOf(s[i + 1])
    const c2 = s[i + 2] === '=' ? 0 : B64.indexOf(s[i + 2])
    const c3 = s[i + 3] === '=' ? 0 : B64.indexOf(s[i + 3])
    out.push((c0 << 2) | (c1 >> 4))
    if (s[i + 2] !== '=') out.push(((c1 & 15) << 4) | (c2 >> 2))
    if (s[i + 3] !== '=') out.push(((c2 & 3) << 6) | c3)
  }
  return new Uint8Array(out)
}
