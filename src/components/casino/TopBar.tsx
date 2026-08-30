'use client'

import { useState } from 'react'
import {
  Search, Wallet as WalletIcon, ChevronDown, User, LogOut, ShieldCheck, Trophy,
  Volume2, VolumeX, PanelLeftClose, PanelLeft, Menu, Sparkles,
} from 'lucide-react'
import { useCasino } from '@/lib/store'
import { CURRENCIES, formatAmount } from '@/lib/currencies'
import { vipOf } from '@/lib/vip'
import { sound } from '@/lib/sound'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function TopBar() {
  const {
    user, setRoute, sidebarOpen, setSidebarOpen, mobileNavOpen, setMobileNavOpen,
    activeCurrency, setActiveCurrency, setAuthOpen, logout, refreshMe, soundOn, toggleSound,
  } = useCasino()
  const [search, setSearch] = useState('')

  const wallet = user?.wallets.find((w) => w.currency === activeCurrency)
  const cfg = CURRENCIES[activeCurrency]
  const vip = vipOf(user?.totalWager ?? 0)

  return (
    <header className="glass sticky top-0 z-40 hairline-b">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        {/* Toggle sidebar — desktop collapse / mobile buka drawer */}
        <button
          onClick={() => {
            sound.play('click')
            if (window.innerWidth >= 1024) setSidebarOpen(!sidebarOpen)
            else setMobileNavOpen(!mobileNavOpen)
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          aria-label="Buka menu"
        >
          <span className="lg:hidden">
            <Menu className="h-5 w-5" />
          </span>
          <span className="hidden lg:inline">
            {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </span>
        </button>

        {/* Logo — wordmark */}
        <button onClick={() => setRoute('lobby')} className="flex items-center gap-2" aria-label="Beranda">
          <span className="text-[16px] font-bold tracking-[-0.02em]">CEVERS</span>
        </button>

        {/* Search */}
        <div className="relative mx-auto hidden w-full max-w-[260px] lg:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim()) {
                setRoute(`game/${searchToGame(search)}`)
                setSearch('')
              }
            }}
            placeholder="Cari permainan…"
            className="h-9 w-full rounded-full border border-transparent bg-surface-2 pl-10 pr-3 text-[13px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-white/25 focus:bg-surface-3"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              {/* Saldo */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-9 items-center gap-2 rounded-full border border-border bg-surface-2 pl-3.5 pr-2.5 transition hover:border-white/20 hover:bg-surface-3">
                    <span className="max-w-[92px] truncate font-mono text-[13px] font-semibold tabular-nums sm:max-w-none">
                      {wallet ? formatAmount(activeCurrency, wallet.balance) : '0'}
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: cfg?.color }}>
                      {activeCurrency}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-2xl border-border bg-popover p-1.5">
                  <DropdownMenuLabel className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Dompet
                  </DropdownMenuLabel>
                  {user.wallets.map((w) => {
                    const c = CURRENCIES[w.currency]
                    if (!c) return null
                    return (
                      <DropdownMenuItem
                        key={w.currency}
                        onClick={() => {
                          setActiveCurrency(w.currency)
                          sound.play('click')
                        }}
                        className="cursor-pointer justify-between rounded-xl px-2 py-2.5"
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                            style={{ backgroundColor: `${c.color}1f`, color: c.color }}
                          >
                            {c.symbol}
                          </span>
                          <span className="text-[13px] font-semibold">{w.currency}</span>
                        </span>
                        <span className="font-mono text-[13px] tabular-nums">{formatAmount(w.currency, w.balance)}</span>
                      </DropdownMenuItem>
                    )
                  })}
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem className="cursor-pointer rounded-xl py-2.5" onClick={() => setRoute('wallet')}>
                    <WalletIcon className="mr-2.5 h-4 w-4" /> Kelola Dompet
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sound toggle */}
              <button
                onClick={toggleSound}
                className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-2 hover:text-foreground sm:flex"
                aria-label={soundOn ? 'Matikan suara' : 'Nyalakan suara'}
              >
                {soundOn ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
              </button>

              {/* Avatar + level */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-9 items-center gap-2 rounded-full border border-border bg-surface-2 pl-1 pr-3 transition hover:border-white/20 hover:bg-surface-3"
                    aria-label="Menu pengguna"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[11px] font-black uppercase text-black">
                      {user.username.slice(0, 2)}
                    </span>
                    <span
                      className="hidden text-[11px] font-bold sm:block"
                      style={{ color: vip.tier.color }}
                    >
                      {vip.tier.name}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 rounded-2xl border-border bg-popover p-1.5">
                  <div className="px-3 py-2">
                    <div className="text-sm font-bold">{user.username}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Wager total: ${Math.round(user.totalWager).toLocaleString('id-ID')}
                    </div>
                    {vip.next && (
                      <div className="mt-2.5">
                        <div className="mb-1 flex justify-between text-[10px] font-medium text-muted-foreground">
                          <span style={{ color: vip.tier.color }}>{vip.tier.name}</span>
                          <span>{vip.next.name}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.round(vip.progress * 100)}%`, backgroundColor: vip.tier.color }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem className="cursor-pointer rounded-xl py-2.5" onClick={() => setRoute('profile')}>
                    <User className="mr-2.5 h-4 w-4" /> Profil & Riwayat
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer rounded-xl py-2.5" onClick={() => setRoute('challenges')}>
                    <Trophy className="mr-2.5 h-4 w-4" /> Tantangan
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer rounded-xl py-2.5"
                    onClick={() => useCasino.getState().setFairnessOpen(true)}
                  >
                    <ShieldCheck className="mr-2.5 h-4 w-4" /> Fairness
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    className="cursor-pointer rounded-xl py-2.5 text-destructive"
                    onClick={async () => {
                      await logout()
                      await refreshMe()
                      toast.info('Anda telah keluar')
                    }}
                  >
                    <LogOut className="mr-2.5 h-4 w-4" /> Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <button
                onClick={toggleSound}
                className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-2 hover:text-foreground sm:flex"
                aria-label={soundOn ? 'Matikan suara' : 'Nyalakan suara'}
              >
                {soundOn ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
              </button>
              <button
                data-testid="open-login"
                onClick={() => setAuthOpen(true)}
                className="h-9 rounded-full px-4 text-[13px] font-semibold text-muted-foreground transition hover:text-foreground"
              >
                Masuk
              </button>
              <button
                data-testid="open-register"
                onClick={() => setAuthOpen(true)}
                className="flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-black transition hover:bg-white/90 active:scale-[0.98]"
              >
                <Sparkles className="h-3.5 w-3.5" /> Daftar
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function searchToGame(q: string): string {
  const lower = q.toLowerCase()
  const map: Record<string, string> = {
    dice: 'dice', dadu: 'dice',
    mines: 'mines', ranjau: 'mines', mine: 'mines',
    limbo: 'limbo',
    plinko: 'plinko',
    keno: 'keno',
    btc: 'btc-crash', crash: 'btc-crash',
    hash: 'hash-run', satoshi: 'satoshi-grid', crypto: 'btc-crash',
  }
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v
  }
  return 'dice'
}
