import crypto from 'node:crypto'
import { cookieHeader, getCookie } from '@/lib/http'
import { ensureSeed, findUserById, getMeta, setMeta, type CasinoUser } from '@/lib/casino-db'

const COOKIE = 'shf_session'
const THIRTY_DAYS = 60 * 60 * 24 * 30

let CACHED_SECRET: string | null = null

async function sessionSecret(): Promise<string> {
  if (CACHED_SECRET) return CACHED_SECRET
  try {
    const existing = await getMeta('session_secret')
    if (existing) {
      CACHED_SECRET = existing
      return existing
    }
    const generated = crypto.randomBytes(48).toString('hex')
    await setMeta('session_secret', generated)
    CACHED_SECRET = generated
    return generated
  } catch {
    CACHED_SECRET = crypto.randomBytes(48).toString('hex')
    return CACHED_SECRET
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const check = crypto.scryptSync(password, salt, 32).toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'))
  } catch {
    return false
  }
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
}

export async function createToken(userId: string): Promise<string> {
  const exp = Date.now() + THIRTY_DAYS * 1000
  const payload = `${userId}.${exp}`
  return `${payload}.${sign(payload, await sessionSecret())}`
}

export async function verifyToken(token: string | undefined): Promise<string | null> {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, exp, sig] = parts
  const secret = await sessionSecret()
  if (sign(`${userId}.${exp}`, secret) !== sig) return null
  if (Number(exp) < Date.now()) return null
  return userId
}

export const SESSION_COOKIE = COOKIE
export const SESSION_MAX_AGE = THIRTY_DAYS

export async function getSessionUser(req: Request): Promise<CasinoUser | null> {
  await ensureSeed()
  const token = getCookie(req, COOKIE)
  const userId = await verifyToken(token)
  if (!userId) return null
  return findUserById(userId)
}

export async function sessionCookie(userId: string, maxAge = SESSION_MAX_AGE): Promise<string> {
  const token = await createToken(userId)
  return cookieHeader(COOKIE, token, {
    maxAge,
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

export function clearSessionCookie(): string {
  return cookieHeader(COOKIE, '', { maxAge: 0, httpOnly: true, sameSite: 'Lax', path: '/' })
}
