'use client'

import { useEffect, useState } from 'react'
import {
  Home, Star, History, Trophy, Wallet, ShieldCheck, Gamepad2, Layers,
  User, X, Sparkles, ChevronRight, TrendingUp,
} from 'lucide-react'
import { useCasino } from '@/lib/store'
import { CURRENCIES } from '@/lib/currencies'
import { vipOf } from '@/lib/vip'
import { sound } from '@/lib/sound'

function NavItem({
  icon: Icon,
  label,
  active,
  badge,
  tint,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  active?: boolean
  badge?: number | string
  tint?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-[9px] text-[13.5px] font-medium transition-all duration-150 ${
        active
          ? 'bg-white/[0.09] text-white'
          : 'text-[#9d9da6] hover:bg-white/[0.05] hover:text-white active:scale-[0.99]'
      }`}
    >
      <Icon
        className={`h-[18px] w-[18px] transition-colors ${active ? 'text-white' : tint ?? 'text-[#7a7a84] group-hover:text-white'}`}
        strokeWidth={1.9}
      />
      <span className="flex-1 text-left tracking-[-0.01em]">{label}</span>
      {badge !== undefined && badge !== 0 && (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white/80">
          {badge}
        </span>
      )}
      {active && <span className="h-1 w-1 rounded-full bg-white" />}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5c5c66]">
      {children}
    </div>
  )
}

/** Kartu akun / VIP di atas sidebar */
function AccountCard() {
  const { user, setRoute, setAuthOpen } = useCasino()
  if (!user) {
    return (
      <div className="mx-2 mt-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-transparent p-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <Sparkles className="h-4 w-4 text-white" /> Bonus Pendaftaran
        </div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-[#86868b]">
          Daftar & langsung dapat 500 USDT. Bonus 250 USDT hanya bisa diklaim satu kali.
        </p>
        <button
          onClick={() => {
            sound.play('click')
            setAuthOpen(true)
          }}
          className="btn-primary mt-3 h-9 w-full text-[13px]"
        >
          Masuk / Daftar
        </button>
      </div>
    )
  }
  const vip = vipOf(user.totalWager)
  return (
    <button
      onClick={() => setRoute('profile')}
      className="mx-2 mt-3 w-[calc(100%-16px)] rounded-2xl border border-white/[0.08] bg-surface-2 p-3.5 text-left transition hover:border-white/[0.16] hover:bg-surface-3"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-black uppercase text-black">
          {user.username.slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold leading-tight">{user.username}</div>
          <div className="mt-0.5 text-[11px] font-semibold" style={{ color: vip.tier.color }}>
            {vip.tier.name}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-[#5c5c66]" />
      </div>
      {vip.next && (
        <div className="mt-3">
          <div className="mb-1.5 flex justify-between text-[10px] font-medium text-[#86868b]">
            <span>Menuju {vip.next.name}</span>
            <span className="tabular-nums">{Math.round(vip.progress * 100)}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.round(vip.progress * 100)}%`, backgroundColor: vip.tier.color }}
            />
          </div>
        </div>
      )}
    </button>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { route, setRoute, favorites } = useCasino()
  const tokenCfg = CURRENCIES.NOIR
  const nav = (r: string) => {
    setRoute(r)
    onNavigate?.()
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-2 pb-4">
      <AccountCard />

      <SectionLabel>Menu</SectionLabel>
      <NavItem icon={Home} label="Beranda" active={route === 'lobby'} onClick={() => nav('lobby')} />
      <NavItem icon={Star} label="Favorit" badge={favorites.length} active={route === 'favorit'} onClick={() => nav('favorit')} />
      <NavItem icon={History} label="Baru Dimainkan" active={route === 'riwayat'} onClick={() => nav('riwayat')} />
      <NavItem icon={Trophy} label="Tantangan" active={route === 'challenges'} onClick={() => nav('challenges')} />

      <SectionLabel>Permainan</SectionLabel>
      <NavItem icon={Gamepad2} label="Core" active={route === 'cat/original'} tint="#30d158" onClick={() => nav('cat/original')} />
      <NavItem icon={Layers} label="Crypto" active={route === 'cat/crypto'} tint="#f7931a" onClick={() => nav('cat/crypto')} />

      <SectionLabel>Akun</SectionLabel>
      <NavItem icon={Wallet} label="Dompet" active={route === 'wallet'} onClick={() => nav('wallet')} />
      <NavItem icon={User} label="Profil" active={route === 'profile'} onClick={() => nav('profile')} />
      <NavItem
        icon={ShieldCheck}
        label="Fairness"
        onClick={() => {
          useCasino.getState().setFairnessOpen(true)
          onNavigate?.()
        }}
      />

      {/* Kartu token */}
      <button
        onClick={() => nav('wallet')}
        className="mx-2 mt-5 rounded-2xl border border-white/[0.08] bg-surface-2 p-3.5 text-left transition hover:border-white/[0.16] hover:bg-surface-3"
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-black"
            style={{ backgroundColor: `${tokenCfg.color}1f`, color: tokenCfg.color }}
          >
            {tokenCfg.symbol}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold">CEVERS Token</div>
            <div className="flex items-center gap-1 text-[10.5px] text-[#86868b]">
              <TrendingUp className="h-3 w-3 text-[#30d158]" />
              $0.298 <span className="font-semibold text-[#30d158]">+3.15%</span>
            </div>
          </div>
        </div>
      </button>

      <div className="mt-auto px-3 pt-6 text-[10px] leading-relaxed text-[#48484f]">
        Koin virtual — tanpa nilai uang sungguhan.
      </div>
    </div>
  )
}

/** Sidebar desktop — rail permanen */
function DesktopRail() {
  const { sidebarOpen } = useCasino()
  return (
    <aside
      className="sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 border-r border-white/[0.08] bg-[#050506] transition-[width] duration-300 lg:block"
      style={{ width: sidebarOpen ? 248 : 0, overflow: 'hidden' }}
    >
      <div className="w-[248px]">
        <SidebarBody />
      </div>
    </aside>
  )
}

/** Drawer mobile — terbuka seperti sampul buku dengan kurva spring iOS */
function MobileBook() {
  const { mobileNavOpen, setMobileNavOpen } = useCasino()
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    let raf: number
    if (mobileNavOpen) {
      raf = requestAnimationFrame(() => setRendered(true))
      document.body.style.overflow = 'hidden'
    } else {
      raf = requestAnimationFrame(() => setRendered(false))
      document.body.style.overflow = ''
    }
    return () => cancelAnimationFrame(raf)
  }, [mobileNavOpen])

  return (
    <div className={`lg:hidden ${mobileNavOpen ? '' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        onClick={() => setMobileNavOpen(false)}
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-[6px] transition-opacity duration-300 ${
          mobileNavOpen && rendered ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {/* Panel buku */}
      <div
        className="fixed bottom-0 left-0 top-0 z-50 w-[304px] max-w-[86vw] rounded-r-[24px] border-r border-white/[0.08] bg-[#0a0a0b] shadow-[8px_0_60px_rgba(0,0,0,0.8)]"
        style={{
          transform: mobileNavOpen && rendered ? 'translateX(0)' : 'translateX(-104%)',
          transition: 'transform 420ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Header buku */}
        <div className="flex items-center justify-between px-4 pb-2 pt-5">
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] font-bold tracking-[-0.02em]">CEVERS</span>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[#9d9da6] transition hover:text-white"
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[calc(100%-64px)]">
          <SidebarBody onNavigate={() => setMobileNavOpen(false)} />
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <>
      <DesktopRail />
      <MobileBook />
    </>
  )
}
