'use client'

import { useEffect, useState } from 'react'
import { Flame, ShieldCheck, Gift, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useCasino, FeedItem } from '@/lib/store'
import { GAMES, GameDef, PHOTOS } from '@/components/casino/registry'
import { GameCard, GameRow } from '@/components/casino/GameCard'
import { apiGet } from '@/lib/apiClient'
import { CURRENCIES, formatAmount } from '@/lib/currencies'
import { sound } from '@/lib/sound'

const BANNERS = [
  {
    title: 'Naikkan levelmu.',
    sub: 'Mulai dengan 500 USDT, klaim bonus 250 USDT satu kali, lalu selesaikan misi harian untuk hadiah tambahan.',
    cta: 'Klaim sekarang',
    route: 'wallet',
    photo: PHOTOS.hero,
    pos: 'center',
  },
  {
    title: 'Race harian 10 juta.',
    sub: 'Hadiah koin untuk 500 pemain teratas setiap hari — murni untuk keseruan.',
    cta: 'Lihat tantangan',
    route: 'challenges',
    photo: '/images/games/blackjack.jpg',
    pos: 'center',
  },
  {
    title: 'Maxwin 888×.',
    sub: 'Coba keberuntunganmu di slot Neon Nights & Lucky 7 Deluxe.',
    cta: 'Putar slot',
    route: 'game/slots-neon',
    photo: '/images/games/slots-lucky777.jpg',
    pos: 'center',
  },
]

function Hero() {
  const [idx, setIdx] = useState(0)
  const setRoute = useCasino((s) => s.setRoute)

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % BANNERS.length), 6500)
    return () => clearInterval(t)
  }, [])

  const b = BANNERS[idx]
  return (
    <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
      {/* Hero utama — foto asli + tipografi besar ala Apple */}
      <div className="hero-soft relative flex min-h-[210px] flex-col justify-center overflow-hidden rounded-3xl border border-white/[0.08] p-6 transition-all duration-500 sm:p-7 md:p-9">
        {/* Foto latar */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${b.photo})` }}
          role="img"
          aria-label=""
        />
        {/* Overlay legibilitas teks: pekat kiri, tembus kanan */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(100deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.82) 38%, rgba(0,0,0,0.45) 68%, rgba(0,0,0,0.30) 100%)',
          }}
        />
        <div key={idx} className="float-in relative">
          <h2 className="max-w-md text-[28px] font-semibold leading-[1.12] tracking-[-0.025em] md:text-[38px]">
            {b.title}
          </h2>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-[#c7c7cc]">{b.sub}</p>
          <button
            onClick={() => setRoute(b.route)}
            className="btn-primary relative mt-5 h-10 px-5 text-[13.5px]"
          >
            {b.cta}
          </button>
        </div>
        <div className="absolute bottom-5 right-7 flex gap-1.5">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'w-7 bg-white' : 'w-1.5 bg-white/25 hover:bg-white/40'}`}
            />
          ))}
        </div>
        <button
          onClick={() => setIdx((idx - 1 + BANNERS.length) % BANNERS.length)}
          className="absolute left-3 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white/60 backdrop-blur transition hover:text-white md:flex"
          aria-label="Sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setIdx((idx + 1) % BANNERS.length)}
          className="absolute right-3 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white/60 backdrop-blur transition hover:text-white md:flex"
          aria-label="Berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Kartu samping */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-1 flex-col justify-between rounded-3xl border border-[#30d158]/20 bg-gradient-to-b from-[#30d158]/[0.08] to-transparent p-5">
          <div>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#30d158]">
              <ShieldCheck className="h-4 w-4" strokeWidth={2} /> Provably Fair
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[#9d9da6]">
              Semua hasil dihitung server dengan HMAC-SHA256. Verifikasi sendiri setiap taruhan.
            </p>
          </div>
          <button
            onClick={() => {
              sound.play('click')
              useCasino.getState().setFairnessOpen(true)
            }}
            className="mt-4 w-fit rounded-full bg-[#30d158]/15 px-3.5 py-1.5 text-[12px] font-semibold text-[#30d158] transition hover:bg-[#30d158]/25"
          >
            Pelajari
          </button>
        </div>
        <div className="flex flex-1 flex-col justify-between rounded-3xl border border-white/[0.08] bg-surface-2 p-5">
          <div>
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <Flame className="h-4 w-4 text-[#ffd60a]" strokeWidth={2} /> Bonus Pendaftaran
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[#9d9da6]">
              Daftar & dapat 500 USDT. Bonus 250 USDT bisa diklaim satu kali; hadiah berikutnya lewat misi harian.
            </p>
          </div>
          <button
            onClick={() => {
              sound.play('click')
              if (useCasino.getState().user) setRoute('wallet')
              else useCasino.getState().setAuthOpen(true)
            }}
            className="mt-4 flex w-fit items-center gap-1.5 rounded-full bg-white/[0.08] px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-white/[0.14]"
          >
            <Gift className="h-3.5 w-3.5" /> Daftar
          </button>
        </div>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'lobi', label: 'Lobi' },
  { id: 'original', label: 'Core' },
  { id: 'crypto', label: 'Crypto' },
]

function LiveFeed() {
  const [items, setItems] = useState<FeedItem[]>([])
  const gameNames: Record<string, string> = {
    dice: 'Dadu', mines: 'Ranjau', limbo: 'Limbo', plinko: 'Plinko', keno: 'Keno',
    blackjack: 'Blackjack', roulette: 'Roulette', slots: 'Slot',
  }

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const d = await apiGet<{ feed: FeedItem[] }>('/api/feed')
        if (alive) setItems(d.feed)
      } catch { /* ignore */ }
    }
    load()
    const t = setInterval(load, 5000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-surface-2 p-4">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
        <span className="live-dot h-2 w-2 rounded-full bg-[#30d158]" />
        Taruhan Terbaru
      </div>
      <div className="max-h-[300px] space-y-1 overflow-y-auto">
        {items.length === 0 && (
          <div className="py-6 text-center text-[11px] text-[#5c5c66]">Memuat…</div>
        )}
        {items.map((b) => {
          const cfg = CURRENCIES[b.currency]
          return (
            <div
              key={b.id}
              className="float-in flex items-center gap-2.5 rounded-xl px-2 py-2 text-xs transition hover:bg-white/[0.04]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[10px] font-semibold uppercase text-white/70">
                {b.user.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-white/90">{b.user}</div>
                <div className="text-[10px] text-[#6a6a73]">{gameNames[b.game] || b.game}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[11.5px] font-medium tabular-nums" style={{ color: cfg?.color }}>
                  {formatAmount(b.currency, b.amount)}
                </div>
                <div className={`font-mono text-[10px] tabular-nums ${b.win ? 'text-[#30d158]' : 'text-[#5c5c66]'}`}>
                  {b.multiplier > 0 ? `${b.multiplier.toFixed(2)}×` : '—'}
                </div>
              </div>
              <div
                className={`w-16 text-right font-mono text-[11.5px] font-semibold tabular-nums ${
                  b.win ? 'text-[#30d158]' : 'text-[#48484f]'
                }`}
              >
                {b.win ? '+' : ''}
                {formatAmount(b.currency, b.win ? b.payout : 0)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, sub }: { icon: React.ComponentType<{ className?: string }>; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/[0.1] py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05]">
        <Icon className="h-6 w-6 text-[#6a6a73]" />
      </div>
      <p className="mt-4 text-[15px] font-semibold">{title}</p>
      <p className="mt-1 text-[12.5px] text-[#86868b]">{sub}</p>
    </div>
  )
}

export function Lobby() {
  const { route, setRoute, favorites, recents } = useCasino()
  const [q, setQ] = useState('')
  const tab = route.startsWith('cat/') ? route.slice(4) : 'lobi'

  const originals = GAMES.filter((g) => g.category === 'original')
  const cryptoGames = GAMES.filter((g) => g.category === 'crypto')

  const filterView = (cat: string) => {
    if (cat === 'original') return <GameRow title="Permainan Asli" items={originals} />
    if (cat === 'crypto') return <GameRow title="Crypto Originals" items={cryptoGames} />
    return null
  }

  // Pencarian
  const ql = q.trim().toLowerCase()
  const searchResults = ql
    ? GAMES.filter((g) => g.name.toLowerCase().includes(ql) || g.id.toLowerCase().includes(ql))
    : []

  const favGames = favorites.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean) as GameDef[]
  const recentGames = recents.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean) as GameDef[]

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-5">
      {route === 'favorit' ? (
        favGames.length > 0 ? (
          <GameRow title="Favorit Saya" items={favGames} />
        ) : (
          <EmptyState icon={Flame} title="Belum ada favorit" sub="Tandai game dengan ikon hati untuk melihatnya di sini." />
        )
      ) : route === 'riwayat' ? (
        recentGames.length > 0 ? (
          <GameRow title="Baru Dimainkan" items={recentGames} />
        ) : (
          <EmptyState icon={ChevronRight} title="Belum ada riwayat" sub="Mainkan satu game untuk mulai melacak aktivitasmu." />
        )
      ) : (
        <>
          <Hero />

          {/* Tab + pencarian */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-0.5 rounded-full bg-surface-2 p-1">
              {TABS.map((t) => {
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setRoute(t.id === 'lobi' ? 'lobby' : `cat/${t.id}`)}
                    className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${
                      active ? 'bg-white text-black' : 'text-[#9d9da6] hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
            <div className="relative min-w-[180px] flex-1 md:max-w-[240px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6a6a73]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari game…"
                className="h-9 w-full rounded-full border border-white/[0.08] bg-surface-2 pl-10 pr-3 text-[13px] outline-none transition placeholder:text-[#6a6a73] focus:border-white/25"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_300px]">
            <div className="min-w-0">
              {ql ? (
                searchResults.length > 0 ? (
                  <GameRow title={`Hasil untuk "${q}"`} items={searchResults} />
                ) : (
                  <EmptyState icon={Search} title="Tidak ditemukan" sub={`Tidak ada game yang cocok dengan "${q}".`} />
                )
              ) : tab === 'lobi' ? (
                <>
                  <GameRow title="Permainan CEVERS" items={GAMES.slice(0, 5) as GameDef[]} onViewAll={() => setRoute('cat/original')} />
                  <GameRow title="Crypto Originals" items={cryptoGames} onViewAll={() => setRoute('cat/crypto')} />
                </>
              ) : (
                filterView(tab)
              )}
            </div>
            <div className="order-first xl:order-none">
              <LiveFeed />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export { GameCard }
