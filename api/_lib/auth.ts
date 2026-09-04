import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'akpsi_admin_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours

export interface AdminSession {
  name: string
  email: string
  expiresAt: number
}

function getSecret(): string {
  const secret = process.env.APPLICATIONS_ADMIN_SECRET
  if (!secret) throw new Error('APPLICATIONS_ADMIN_SECRET is not set')
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex')
}

function secureCookieFlags(): string {
  // Vercel's local dev server runs over http; Secure would silently drop the cookie there.
  return process.env.VERCEL_ENV ? '; Secure' : ''
}

// The session carries the brother's identity so evaluations can be attributed
// without a user collection: the chapter shares one password, but each login
// states who is signing in and the HMAC keeps that name from being edited.
export function createSessionCookie(user: { name: string; email: string }): string {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = Buffer.from(
    JSON.stringify({ name: user.name, email: user.email, expiresAt: expires }),
  ).toString('base64url')
  const token = `${payload}.${sign(payload)}`
  const maxAge = Math.floor(SESSION_TTL_MS / 1000)
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secureCookieFlags()}`
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureCookieFlags()}`
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim())
  }
  return out
}

export function getSession(req: { headers: { cookie?: string } }): AdminSession | null {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME]
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  let expected: string
  try {
    expected = sign(payload)
  } catch {
    return null
  }
  const expectedBuf = Buffer.from(expected)
  const signatureBuf = Buffer.from(signature)
  if (expectedBuf.length !== signatureBuf.length) return null
  if (!timingSafeEqual(expectedBuf, signatureBuf)) return null

  let session: AdminSession
  try {
    session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (typeof session?.expiresAt !== 'number' || Date.now() >= session.expiresAt) return null
  if (typeof session.name !== 'string' || typeof session.email !== 'string') return null

  return session
}

export function isAuthenticated(req: { headers: { cookie?: string } }): boolean {
  return getSession(req) !== null
}

export function checkPassword(password: string): boolean {
  const expected = process.env.APPLICATIONS_ADMIN_PASSWORD
  if (!expected) throw new Error('APPLICATIONS_ADMIN_PASSWORD is not set')
  const a = Buffer.from(password)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
