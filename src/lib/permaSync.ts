'use client'

/**
 * PermaSync klien — akun permanen lintas deploy.
 *
 * Setelah login/daftar, server memberi snapshot akun. Klien mengenkripsinya
 * dengan AES-256-GCM yang kuncinya diturunkan dari kata sandi (PBKDF2-SHA256,
 * 250k iterasi) lalu menyimpannya di localStorage. Snapshot lama otomatis
 * diperbarui setelah aksi yang mengubah saldo.
 *
 * Bila server kehilangan akun karena deploy baru (login 401), klien
 * mendekripsi snapshot dengan kata sandi yang diketik dan memulihkan akun
 * ke server — saldo, riwayat, dan seeds kembali utuh.
 *
 * Keamanan: blob terenkripsi tanpa kata sandi tidak berguna; restorasi ke
 * akun yang masih ada menuntut passwordHash identik (dicek server).
 */

const PBKDF2_ITER = 250_000
const enc = new TextEncoder()

function lsKey(username: string) {
  return `perma:key:${username.toLowerCase()}`
}
function lsBlob(username: string) {
  return `perma:blob:${username.toLowerCase()}`
}
export const CURRENT_USER_KEY = 'perma:current'

async function deriveKey(username: string, password: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(`shf-perma:${username.toLowerCase()}`),
      iterations: PBKDF2_ITER,
      hash: 'SHA-256',
    },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function b64ToBuf(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64)
  const buf = new ArrayBuffer(s.length)
  const out = new Uint8Array(buf)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function encryptJson(key: CryptoKey, data: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(data))
  )
  const merged = new Uint8Array(iv.length + ct.byteLength)
  merged.set(iv, 0)
  merged.set(new Uint8Array(ct), iv.length)
  return bufToB64(merged)
}

async function decryptJson<T>(key: CryptoKey, payload: string): Promise<T> {
  const raw = b64ToBuf(payload)
  const iv = raw.slice(0, 12)
  const ct = raw.slice(12)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return JSON.parse(new TextDecoder().decode(pt)) as T
}

/** Enkripsi & simpan snapshot dengan kata sandi (dipakai saat login/daftar). */
export async function saveBlobWithPassword(
  username: string,
  password: string,
  snapshot: unknown
): Promise<boolean> {
  try {
    const key = await deriveKey(username, password)
    const blob = await encryptJson(key, snapshot)
    const raw = await crypto.subtle.exportKey('raw', key)
    localStorage.setItem(lsKey(username), bufToB64(raw))
    localStorage.setItem(lsBlob(username), blob)
    localStorage.setItem(CURRENT_USER_KEY, username)
    return true
  } catch {
    return false
  }
}

/** Simpan snapshot memakai kunci yang sudah tersimpan (sinkron senyap). */
export async function saveBlobWithStoredKey(username: string, snapshot: unknown): Promise<boolean> {
  try {
    const keyB64 = localStorage.getItem(lsKey(username))
    if (!keyB64) return false
    const raw = b64ToBuf(keyB64)
    const key = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, [
      'encrypt',
      'decrypt',
    ])
    const blob = await encryptJson(key, snapshot)
    localStorage.setItem(lsBlob(username), blob)
    return true
  } catch {
    return false
  }
}

/**
 * Buka snapshot dengan kata sandi. Mengembalikan null bila kata sandi salah
 * (autentikasi GCM gagal) atau blob tidak ada.
 */
export async function openBlobWithPassword<T = unknown>(
  username: string,
  password: string
): Promise<T | null> {
  try {
    const blob = localStorage.getItem(lsBlob(username))
    if (!blob) return null
    const key = await deriveKey(username, password)
    return await decryptJson<T>(key, blob)
  } catch {
    return null
  }
}

export function hasBlob(username: string): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(lsBlob(username))
}

export function currentUser(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CURRENT_USER_KEY)
}

export function forgetCurrentUser() {
  if (typeof window !== 'undefined') localStorage.removeItem(CURRENT_USER_KEY)
}

/** Buka snapshot memakai kunci yang sudah tersimpan di perangkat (tanpa kata sandi). */
export async function openBlobWithStoredKey<T = unknown>(username: string): Promise<T | null> {
  try {
    const keyB64 = localStorage.getItem(lsKey(username))
    const blob = localStorage.getItem(lsBlob(username))
    if (!keyB64 || !blob) return null
    const key = await crypto.subtle.importKey('raw', b64ToBuf(keyB64), { name: 'AES-GCM' }, true, [
      'encrypt',
      'decrypt',
    ])
    return await decryptJson<T>(key, blob)
  } catch {
    return null
  }
}

/**
 * Pemulihan OTOMATIS saat boot — inti perbaikan akun reset saat deploy.
 * Bila sesi server hilang (redeploy) tetapi cadangan terenkripsi ada di
 * perangkat, akun dipulihkan tanpa input apa pun. Mengembalikan nama
 * pengguna bila berhasil.
 */
export async function autoRestoreFromDevice(): Promise<string | null> {
  const username = currentUser()
  if (!username) return null
  const snapshot = await openBlobWithStoredKey(username)
  if (!snapshot) return null
  try {
    const res = await fetch('/api/sync/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ snapshot }),
    })
    if (!res.ok) return null
    return username
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Kode Pemulihan — cadangan portabel lintas perangkat & lintas browser */
/* ------------------------------------------------------------------ */

const CODE_PREFIX = 'NOIR1-'
/** Prefix lama dari versi sebelumnya — tetap diterima agar kode pemulihan lama tetap berfungsi. */
const CODE_PREFIXES_LEGACY = ['SHFL1-']
const RECOVERY_MAX_BETS = 60
const RECOVERY_MAX_TX = 40

interface RecoveryPayload {
  /** username */
  u: string
  /** kunci AES mentah (b64) — pemegang kode = pemilik akun */
  k: string
  /** blob snapshot terenkripsi (b64, riwayat diringkas) */
  b: string
}

export interface ParsedRecovery {
  username: string
  snapshot: unknown
  keyB64: string
}

function b64urlFromJson(data: RecoveryPayload): string {
  const b64 = bufToB64(enc.encode(JSON.stringify(data)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function jsonFromB64url(s: string): RecoveryPayload | null {
  try {
    let t = s.replace(/-/g, '+').replace(/_/g, '/')
    while (t.length % 4) t += '='
    return JSON.parse(new TextDecoder().decode(b64ToBuf(t))) as RecoveryPayload
  } catch {
    return null
  }
}

function trimSnapshot(snap: Record<string, unknown>): Record<string, unknown> {
  const out = { ...snap }
  if (Array.isArray(out.bets)) out.bets = out.bets.slice(0, RECOVERY_MAX_BETS)
  if (Array.isArray(out.transactions)) out.transactions = out.transactions.slice(0, RECOVERY_MAX_TX)
  return out
}

/** Bangun kode pemulihan portabel dari cadangan perangkat (riwayat diringkas agar ringkas). */
export async function buildRecoveryCode(username: string): Promise<string | null> {
  try {
    const keyB64 = localStorage.getItem(lsKey(username))
    const blob = localStorage.getItem(lsBlob(username))
    if (!keyB64 || !blob) return null
    const key = await crypto.subtle.importKey('raw', b64ToBuf(keyB64), { name: 'AES-GCM' }, true, [
      'encrypt',
      'decrypt',
    ])
    const snap = await decryptJson<Record<string, unknown>>(key, blob)
    const compact = await encryptJson(key, trimSnapshot(snap))
    return CODE_PREFIX + b64urlFromJson({ u: username, k: keyB64, b: compact })
  } catch {
    return null
  }
}

/** Uraikan kode pemulihan → snapshot siap dikirim ke /api/sync/restore. */
export async function parseRecoveryCode(code: string): Promise<ParsedRecovery | null> {
  try {
    // Toleran: buang spasi/newline dan tanda kutip liar dari salin-tempel.
    const raw = code.trim().replace(/\s+/g, '').replace(/^["']+|["']+$/g, '')
    const prefix = [CODE_PREFIX, ...CODE_PREFIXES_LEGACY].find((p) => raw.startsWith(p))
    if (!prefix) return null
    const payload = jsonFromB64url(raw.slice(prefix.length))
    if (!payload || typeof payload.u !== 'string' || typeof payload.k !== 'string' || typeof payload.b !== 'string') {
      return null
    }
    const key = await crypto.subtle.importKey('raw', b64ToBuf(payload.k), { name: 'AES-GCM' }, true, [
      'encrypt',
      'decrypt',
    ])
    const snapshot = await decryptJson<unknown>(key, payload.b)
    if (!snapshot || typeof snapshot !== 'object') return null
    return { username: payload.u, snapshot, keyB64: payload.k }
  } catch {
    return null
  }
}

/** Simpan hasil pemulihan via kode sebagai cadangan perangkat ini juga. */
export async function importRecovery(parsed: ParsedRecovery): Promise<void> {
  try {
    const key = await crypto.subtle.importKey('raw', b64ToBuf(parsed.keyB64), { name: 'AES-GCM' }, true, [
      'encrypt',
      'decrypt',
    ])
    const blob = await encryptJson(key, parsed.snapshot)
    localStorage.setItem(lsKey(parsed.username), parsed.keyB64)
    localStorage.setItem(lsBlob(parsed.username), blob)
    localStorage.setItem(CURRENT_USER_KEY, parsed.username)
  } catch {
    // cadangan opsional
  }
}

/** Tarik snapshot terbaru dari server & perbarui blob (dipanggil ter-debounce). */
export async function refreshSnapshot(): Promise<void> {
  const username = currentUser()
  if (!username) return
  try {
    const res = await fetch('/api/sync/snapshot', { cache: 'no-store', credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    if (data?.snapshot) await saveBlobWithStoredKey(username, data.snapshot)
  } catch {
    // senyap — offline / sesi berakhir
  }
}

let timer: ReturnType<typeof setTimeout> | null = null
/** Jadwalkan sinkron senyap (debounce 2.5 detik setelah aksi terakhir). */
export function scheduleSnapshotRefresh() {
  if (typeof window === 'undefined') return
  if (!currentUser()) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void refreshSnapshot()
  }, 2500)
}
