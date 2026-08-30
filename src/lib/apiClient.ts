'use client'

import { scheduleSnapshotRefresh } from '@/lib/permaSync'

const FETCH_INIT: RequestInit = { cache: 'no-store', credentials: 'include' }

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, FETCH_INIT)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan')
  return data as T
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    ...FETCH_INIT,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan')
  // Setelah aksi yang mengubah saldo/akun, jadwalkan sinkronisasi cadangan akun.
  if (/^\/api\/(games|wallet|auth|sync)\//.test(path)) scheduleSnapshotRefresh()
  return data as T
}
