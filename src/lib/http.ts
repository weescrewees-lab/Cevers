export function json(data: unknown, status = 200, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  })
}

export function tooMany(retryAfter: number): Response {
  return json(
    { error: `Terlalu banyak permintaan — coba lagi dalam ${retryAfter}s` },
    429,
    { 'Retry-After': String(retryAfter) },
  )
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'local'
}

export function getCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get('cookie')
  if (!raw) return undefined
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    if (k === name) return decodeURIComponent(part.slice(idx + 1).trim())
  }
  return undefined
}

export function cookieHeader(
  name: string,
  value: string,
  opts: { maxAge: number; httpOnly?: boolean; secure?: boolean; sameSite?: string; path?: string },
): string {
  const parts = [`${name}=${value}`]
  parts.push(`Path=${opts.path ?? '/'}`)
  parts.push(`Max-Age=${opts.maxAge}`)
  parts.push(`SameSite=${opts.sameSite ?? 'Lax'}`)
  if (opts.httpOnly !== false) parts.push('HttpOnly')
  if (opts.secure) parts.push('Secure')
  return parts.join('; ')
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return {}
  }
}
