'use client'

/**
 * Manajemen persetujuan cookie yang sesungguhnya.
 * Pilihan disimpan dalam cookie `shf_consent` (12 bulan, SameSite=Lax,
 * Path=/) sehingga terbaca di setiap kunjungan & setiap request — bukan
 * sekadar localStorage kosmetik.
 */

export interface ConsentPrefs {
  analytics: boolean
  marketing: boolean
  ts: number
}

export const CONSENT_COOKIE = 'shf_consent'
const ONE_YEAR = 60 * 60 * 24 * 365

export function getConsent(): ConsentPrefs | null {
  if (typeof document === 'undefined') return null
  const raw = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
  if (!raw) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(raw.split('=')[1])) as Partial<ConsentPrefs>
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.marketing !== 'boolean') return null
    return {
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      ts: typeof parsed.ts === 'number' ? parsed.ts : 0,
    }
  } catch {
    return null
  }
}

export function hasDecided(): boolean {
  return getConsent() !== null
}

export function writeConsent(prefs: { analytics: boolean; marketing: boolean }) {
  if (typeof document === 'undefined') return
  const value = encodeURIComponent(
    JSON.stringify({ ...prefs, necessary: true, ts: Date.now() })
  )
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax`
}

export function writeAcceptAll() {
  writeConsent({ analytics: true, marketing: true })
}

export function writeRejectOptional() {
  writeConsent({ analytics: false, marketing: false })
}
