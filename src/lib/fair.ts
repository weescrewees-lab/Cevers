import crypto from 'node:crypto'

/**
 * Provably Fair RNG — HMAC-SHA256 based.
 * Result dihitung dari HMAC(serverSeed, `${clientSeed}:${nonce}:${cursor}`).
 * Server seed disimpan di DB, hash-nya (sha256) ditampilkan ke user untuk verifikasi.
 */

export function generateSeed(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

export function hashSeed(seed: string): string {
  return crypto.createHash('sha256').update(seed).digest('hex')
}

export function hmacBytes(serverSeed: string, message: string): Buffer {
  return crypto.createHmac('sha256', serverSeed).update(message).digest()
}

/** 4 float [0,1) dari satu round HMAC */
export function floatsFrom(serverSeed: string, clientSeed: string, nonce: number, cursor: number): number[] {
  const buf = hmacBytes(serverSeed, `${clientSeed}:${nonce}:${cursor}`)
  const out: number[] = []
  for (let i = 0; i < 4; i++) {
    let v = 0
    for (let b = 0; b < 4; b++) v += buf[i * 4 + b] / 256 ** (b + 1)
    out.push(v)
  }
  return out
}

/** Generator float tak terbatas dengan cursor otomatis */
export function* floatStream(serverSeed: string, clientSeed: string, nonce: number) {
  let cursor = 0
  while (cursor < 1000) {
    for (const f of floatsFrom(serverSeed, clientSeed, nonce, cursor)) yield f
    cursor++
  }
  throw new Error('RNG stream exhausted')
}

export function makeRng(serverSeed: string, clientSeed: string, nonce: number): () => number {
  const gen = floatStream(serverSeed, clientSeed, nonce)
  return () => gen.next().value as number
}

export const HOUSE_EDGE = 0.99
