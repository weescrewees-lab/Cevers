'use client'

import { create } from 'zustand'
import { toast } from 'sonner'
import { sound } from '@/lib/sound'
import { autoRestoreFromDevice, forgetCurrentUser } from '@/lib/permaSync'
import { CURRENCIES } from '@/lib/currencies'
import { getConsent, hasDecided, writeConsent, ConsentPrefs } from '@/lib/consent'

export interface SessionUser {
  id: string
  username: string
  email?: string | null
  totalWager: number
  totalBets: number
  lastFaucetAt?: string | null
  wallets: { currency: string; balance: number }[]
  fair: { serverSeedHashed: string; clientSeed: string; nonce: number }
}

export interface FeedItem {
  id: string
  user: string
  game: string
  currency: string
  amount: number
  multiplier: number
  payout: number
  win: boolean
  createdAt: string
}

const FAV_KEY = 'shf_favorites'
const RECENT_KEY = 'shf_recents'

function loadFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(FAV_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function loadRecents(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

interface CasinoState {
  booted: boolean
  user: SessionUser | null
  route: string
  authOpen: boolean
  fairnessOpen: boolean
  /** sidebar desktop (rail kiri) */
  sidebarOpen: boolean
  /** drawer mobile bergaya "buku" yang terbuka dari kiri */
  mobileNavOpen: boolean
  activeCurrency: string
  cookieBanner: boolean
  cookiePrefsOpen: boolean
  consent: ConsentPrefs | null
  favorites: string[]
  recents: string[]
  soundOn: boolean
  setRoute: (r: string) => void
  setAuthOpen: (v: boolean) => void
  setFairnessOpen: (v: boolean) => void
  setSidebarOpen: (v: boolean) => void
  setMobileNavOpen: (v: boolean) => void
  setActiveCurrency: (c: string) => void
  setCookiePrefsOpen: (v: boolean) => void
  acceptCookies: () => void
  rejectCookies: () => void
  saveConsent: (p: { analytics: boolean; marketing: boolean }) => void
  toggleFavorite: (gameId: string) => void
  toggleSound: () => void
  setUser: (u: SessionUser | null) => void
  refreshMe: () => Promise<void>
  boot: () => Promise<void>
  logout: () => Promise<void>
}

export const useCasino = create<CasinoState>((set, get) => ({
  booted: false,
  user: null,
  route: typeof window !== 'undefined' && window.location.hash ? window.location.hash.slice(1) : 'lobby',
  authOpen: false,
  fairnessOpen: false,
  sidebarOpen: true,
  mobileNavOpen: false,
  activeCurrency: 'USDT',
  cookieBanner: false,
  cookiePrefsOpen: false,
  consent: null,
  favorites: [],
  recents: [],
  soundOn: true,

  setRoute: (r) => {
    if (typeof window !== 'undefined') {
      window.location.hash = r
      if (r.startsWith('game/')) {
        const gid = r.slice(5)
        const cur = get().recents.filter((g) => g !== gid)
        const next = [gid, ...cur].slice(0, 12)
        set({ recents: next })
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      }
    }
    set({ route: r, mobileNavOpen: false })
    sound.play('click')
  },
  setAuthOpen: (v) => set({ authOpen: v }),
  setFairnessOpen: (v) => set({ fairnessOpen: v }),
  setSidebarOpen: (v) => {
    set({ sidebarOpen: v })
    if (typeof window !== 'undefined') localStorage.setItem('shf_sidebar', v ? '1' : '0')
  },
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
  setActiveCurrency: (c) => set({ activeCurrency: c }),
  setCookiePrefsOpen: (v) => set({ cookiePrefsOpen: v }),
  acceptCookies: () => {
    writeConsent({ analytics: true, marketing: true })
    set({ cookieBanner: false, cookiePrefsOpen: false, consent: getConsent() })
  },
  rejectCookies: () => {
    writeConsent({ analytics: false, marketing: false })
    set({ cookieBanner: false, cookiePrefsOpen: false, consent: getConsent() })
  },
  saveConsent: (p) => {
    writeConsent(p)
    set({ cookieBanner: false, cookiePrefsOpen: false, consent: getConsent() })
    sound.play('click')
  },
  toggleFavorite: (gameId) => {
    const cur = get().favorites
    const next = cur.includes(gameId) ? cur.filter((g) => g !== gameId) : [...cur, gameId]
    set({ favorites: next })
    if (typeof window !== 'undefined') localStorage.setItem(FAV_KEY, JSON.stringify(next))
    sound.play('click')
  },
  toggleSound: () => {
    const v = !get().soundOn
    set({ soundOn: v })
    sound.setEnabled(v)
    if (v) sound.play('click')
  },

  setUser: (u) => {
    set({ user: u })
    if (u && u.wallets.length > 0) {
      const cur = get().activeCurrency
      const has = u.wallets.some((w) => w.currency === cur && !!CURRENCIES[cur])
      if (!has) {
        // Utamakan wallet yang dikenal (hindari mata uang lama/unknown), fallback USDT.
        const known = u.wallets.find((w) => !!CURRENCIES[w.currency])
        set({ activeCurrency: known ? known.currency : 'USDT' })
      }
    }
  },

  refreshMe: async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        set({ user: data.user })
      } else {
        set({ user: null })
      }
    } catch {
      // offline
    }
  },

  boot: async () => {
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => {
        set({ route: window.location.hash.slice(1) || 'lobby', mobileNavOpen: false })
      })
      set({
        favorites: loadFavorites(),
        recents: loadRecents(),
        soundOn: localStorage.getItem('shf_sound') !== '0',
        sidebarOpen: localStorage.getItem('shf_sidebar') !== '0',
        consent: getConsent(),
        cookieBanner: !hasDecided(),
      })
    }
    sound.setEnabled(get().soundOn)
    await get().refreshMe()

    // PermaSync — sesi hilang (mis. setelah redeploy server): pulihkan akun
    // otomatis dari cadangan terenkripsi di perangkat, tanpa input pengguna.
    if (!get().user) {
      const restored = await autoRestoreFromDevice()
      if (restored) {
        await get().refreshMe()
        if (get().user) {
          sound.play('levelup')
          toast.success(`Akun ${restored} dipulihkan otomatis dari perangkat ini`)
        }
      }
    }

    set({ booted: true })
  },

  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    forgetCurrentUser()
    set({ user: null, route: 'lobby', mobileNavOpen: false })
  },
}))
