'use client'

import { Heart } from 'lucide-react'
import { GAMES, GameDef, slotThemeOf } from '@/components/casino/registry'
import { useCasino } from '@/lib/store'
import { sound } from '@/lib/sound'

/**
 * Kartu game ber-foto asli — ala lobi kasino modern:
 * foto penuh, gradasi gelap dari bawah, nama & RTP, badge pemain live.
 */
export function GameCard({ game, size = 'md' }: { game: GameDef; size?: 'md' | 'sm' }) {
  const setRoute = useCasino((s) => s.setRoute)
  const favorites = useCasino((s) => s.favorites)
  const toggleFavorite = useCasino((s) => s.toggleFavorite)
  const Icon = game.icon
  const fav = favorites.includes(game.id)

  return (
    <div className="group relative">
      <button
        onClick={() => setRoute(`game/${game.id}`)}
        className={`game-tile relative w-full overflow-hidden rounded-2xl bg-[#0e0e10] text-left ${
          size === 'md' ? 'aspect-[3/4]' : 'aspect-square'
        }`}
      >
        {/* Foto asli */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          style={{ backgroundImage: `url(${game.photo})` }}
          role="img"
          aria-label={game.name}
        />
        {/* Overlay legibilitas — gelap pekat di bawah, tipis di atas */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 32%, rgba(0,0,0,0.18) 60%, rgba(0,0,0,0.28) 100%)',
          }}
        />
        {/* Hint aksen warna game di garis atas */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
          style={{ background: `linear-gradient(90deg, transparent, ${game.tint}55, transparent)` }}
        />

        {/* Pemain live */}
        <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 text-[10px] font-medium text-white/85 backdrop-blur-sm">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#30d158]" />
          {game.players.toLocaleString('id-ID')}
        </div>

        {/* Ikon kecil di pojok kanan bawah — kontinuitas identitas game */}
        <div
          className="absolute bottom-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-lg border backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"
          style={{
            backgroundColor: `${game.tint}1f`,
            borderColor: `${game.tint}45`,
          }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: game.tint }} strokeWidth={1.9} />
        </div>

        {/* Nama + RTP */}
        <div className="absolute bottom-0 left-0 right-0 p-3 pr-12">
          <div className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {game.name}
          </div>
          <div className="mt-0.5 flex items-center justify-between">
            <span className="text-[10.5px] font-medium text-white/60">{game.edge}</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">
              NOIR
            </span>
          </div>
        </div>
      </button>

      {/* Tombol favorit */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleFavorite(game.id)
        }}
        className={`absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-200 ${
          fav
            ? 'bg-white/20 text-white opacity-100'
            : 'bg-black/50 text-white/70 opacity-0 hover:text-white group-hover:opacity-100'
        }`}
        aria-label={fav ? 'Hapus dari favorit' : 'Tambah ke favorit'}
      >
        <Heart className={`h-3.5 w-3.5 ${fav ? 'fill-current' : ''}`} strokeWidth={2} />
      </button>
    </div>
  )
}

export function GameRow({ title, items, onViewAll }: { title: string; items: GameDef[]; onViewAll?: () => void }) {
  return (
    <section className="mb-8">
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{title}</h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="rounded-full px-3 py-1.5 text-[12px] font-medium text-[#86868b] transition hover:bg-white/[0.06] hover:text-white"
          >
            Lihat semua
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {items.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
    </section>
  )
}

export function gameToSlotsId(id: string): { theme: string } {
  return { theme: slotThemeOf(id) }
}

export { GAMES }
