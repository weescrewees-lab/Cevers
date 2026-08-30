'use client'

import { useCallback, useRef, useState } from 'react'
import { ArrowLeft, ShieldCheck, Infinity as InfinityIcon } from 'lucide-react'
import { useCasino } from '@/lib/store'
import { getGame, slotThemeOf } from '@/components/casino/registry'
import { CURRENCIES, formatAmount } from '@/lib/currencies'
import { DiceGame } from '@/components/casino/games/DiceGame'
import { LimboGame } from '@/components/casino/games/LimboGame'
import { MinesGame } from '@/components/casino/games/MinesGame'
import { PlinkoGame } from '@/components/casino/games/PlinkoGame'
import { KenoGame } from '@/components/casino/games/KenoGame'
import { BlackjackGame } from '@/components/casino/games/BlackjackGame'
import { RouletteGame } from '@/components/casino/games/RouletteGame'
import { SlotsGame } from '@/components/casino/games/SlotsGame'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'
import { sound } from '@/lib/sound'

/** Panel taruhan bersama — gaya Apple, angka tabular, tombol putih */
export function BetPanel({
  amount,
  setAmount,
  currency,
  children,
  onBet,
  disabled,
  betLabel = 'Taruhan',
  betButtonText,
  extraHint,
}: {
  amount: number
  setAmount: (v: number) => void
  currency: string
  children?: React.ReactNode
  onBet: () => void
  disabled?: boolean
  betLabel?: string
  betButtonText?: string
  extraHint?: React.ReactNode
}) {
  const { user, activeCurrency, setActiveCurrency } = useCasino()
  const cfg = CURRENCIES[currency]
  const wallet = user?.wallets.find((w) => w.currency === currency)
  const invalid = !user || isNaN(amount) || amount <= 0 || (wallet ? amount > wallet.balance : false)

  return (
    <div className="space-y-3.5">
      <div>
        <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wider text-[#86868b]">
          {betLabel}
        </label>
        <div className="flex items-center overflow-hidden rounded-xl border border-white/[0.08] bg-surface-2 transition focus-within:border-white/30">
          <input
            type="number"
            min={0}
            step="any"
            value={Number.isFinite(amount) ? amount : ''}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !disabled && !invalid) onBet()
            }}
            className="h-11 min-w-0 flex-1 bg-transparent px-3.5 font-mono text-[14px] tabular-nums outline-none"
          />
          <div className="flex items-center gap-0.5 border-l border-white/[0.06] px-1.5">
            <button
              onClick={() => {
                setAmount(Math.max(0, Math.floor((amount / 2) * 1e8) / 1e8))
                sound.play('click')
              }}
              className="rounded-lg px-2 py-1.5 text-[11.5px] font-semibold text-[#9d9da6] transition hover:bg-white/[0.06] hover:text-white"
            >
              ½
            </button>
            <button
              onClick={() => {
                setAmount(amount * 2)
                sound.play('click')
              }}
              className="rounded-lg px-2 py-1.5 text-[11.5px] font-semibold text-[#9d9da6] transition hover:bg-white/[0.06] hover:text-white"
            >
              2×
            </button>
            <button
              onClick={() => {
                setAmount(Math.min(wallet?.balance ?? 0, cfg?.maxBet ?? Infinity))
                sound.play('click')
              }}
              className="rounded-lg px-2 py-1.5 text-[11.5px] font-semibold text-[#9d9da6] transition hover:bg-white/[0.06] hover:text-white"
            >
              Max
            </button>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11.5px] font-bold transition hover:bg-white/[0.06]">
                  <span style={{ color: cfg?.color }}>{currency}</span>
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-xl border-border bg-popover p-1">
                  {user.wallets.map((w) => (
                    <DropdownMenuItem
                      key={w.currency}
                      className="cursor-pointer rounded-lg"
                      onClick={() => {
                        setActiveCurrency(w.currency)
                        setAmount(0)
                      }}
                    >
                      <span className="text-xs font-bold" style={{ color: CURRENCIES[w.currency]?.color }}>
                        {w.currency}
                      </span>
                      <span className="ml-auto font-mono text-[11px] tabular-nums text-[#9d9da6]">
                        {formatAmount(w.currency, w.balance)}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          {wallet && (
            <span className="text-[#6a6a73]">
              Saldo: <span className="font-mono text-white/80">{formatAmount(currency, wallet.balance)}</span>{' '}
              <span className="font-semibold" style={{ color: cfg?.color }}>
                {currency}
              </span>
            </span>
          )}
          {!user && <span className="text-[#9d9da6]">Masuk untuk bertaruh</span>}
          {extraHint}
        </div>
      </div>
      {children}
      <button
        onClick={onBet}
        disabled={disabled || invalid}
        className="btn-primary h-12 w-full text-[15px] tracking-[-0.01em]"
      >
        {betButtonText ?? 'Taruh'}
      </button>
    </div>
  )
}

/** Chip hasil multiplier terakhir */
export function ResultChips({ results }: { results: number[] }) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
      {results.map((r, i) => (
        <span
          key={i}
          className={`float-in flex h-7 min-w-10 shrink-0 items-center justify-center rounded-lg px-1.5 font-mono text-[11px] font-semibold tabular-nums ${
            r >= 1 ? 'bg-[#30d158]/12 text-[#30d158]' : 'bg-white/[0.06] text-[#86868b]'
          }`}
        >
          {r.toFixed(2)}×
        </span>
      ))}
    </div>
  )
}

/* ------------------------- Auto-bet engine ------------------------- */

export interface AutoBetConfig {
  rounds: number // 0 = tanpa batas
  stopOnWin: boolean
  stopOnLose: boolean
  stopProfit: number // 0 = off
  stopLoss: number // 0 = off
}

export const DEFAULT_AUTO: AutoBetConfig = {
  rounds: 10,
  stopOnWin: false,
  stopOnLose: false,
  stopProfit: 0,
  stopLoss: 0,
}

export interface AutoResult {
  win: boolean
  profit: number // + / -
}

export function useAutoBet(play: () => Promise<AutoResult | null>) {
  const [auto, setAuto] = useState<AutoBetConfig>(DEFAULT_AUTO)
  const [running, setRunning] = useState(false)
  const [played, setPlayed] = useState(0)
  const [profit, setProfit] = useState(0)
  const runRef = useRef(false)
  const patch = (p: Partial<AutoBetConfig>) => setAuto((a) => ({ ...a, ...p }))

  const start = useCallback(async () => {
    if (runRef.current) return
    runRef.current = true
    setRunning(true)
    setPlayed(0)
    setProfit(0)
    let count = 0
    let net = 0
    const cfg = auto
    try {
      while (runRef.current) {
        if (cfg.rounds > 0 && count >= cfg.rounds) break
        if (cfg.stopProfit > 0 && net >= cfg.stopProfit) break
        if (cfg.stopLoss > 0 && net <= -cfg.stopLoss) break
        const res = await play()
        if (!runRef.current) break
        if (!res) break // error / saldo habis
        count++
        net += res.profit
        setPlayed(count)
        setProfit(net)
        if (cfg.stopOnWin && res.win) break
        if (cfg.stopOnLose && !res.win) break
        await new Promise((r) => setTimeout(r, 350))
      }
    } finally {
      runRef.current = false
      setRunning(false)
    }
  }, [play, auto])

  const stop = useCallback(() => {
    runRef.current = false
    setRunning(false)
  }, [])

  return { auto, patch, running, start, stop, played, profit }
}

/** UI kontrol auto-bet */
export function AutoBetControls({
  auto,
  patch,
  running,
  played,
  profit,
}: {
  auto: AutoBetConfig
  patch: (p: Partial<AutoBetConfig>) => void
  running: boolean
  played: number
  profit: number
}) {
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.07] bg-surface-2/60 p-3.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
          <InfinityIcon className="h-3.5 w-3.5" /> Auto Taruhan
        </span>
        {running && (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#30d158]">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#30d158]" />
            {played} putaran · {profit >= 0 ? '+' : ''}
            {profit.toFixed(4)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#6a6a73]">Jumlah Putaran</label>
          <input
            type="number"
            min={0}
            value={auto.rounds}
            disabled={running}
            onChange={(e) => patch({ rounds: Math.max(0, Math.floor(parseFloat(e.target.value) || 0)) })}
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-surface-2 px-2.5 font-mono text-[12px] tabular-nums outline-none transition focus:border-white/30 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#6a6a73]">Stop Profit</label>
          <input
            type="number"
            min={0}
            step="any"
            value={auto.stopProfit}
            disabled={running}
            onChange={(e) => patch({ stopProfit: Math.max(0, parseFloat(e.target.value) || 0) })}
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-surface-2 px-2.5 font-mono text-[12px] tabular-nums outline-none transition focus:border-white/30 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#6a6a73]">Stop Loss</label>
          <input
            type="number"
            min={0}
            step="any"
            value={auto.stopLoss}
            disabled={running}
            onChange={(e) => patch({ stopLoss: Math.max(0, parseFloat(e.target.value) || 0) })}
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-surface-2 px-2.5 font-mono text-[12px] tabular-nums outline-none transition focus:border-white/30 disabled:opacity-50"
          />
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#9d9da6]">
            <input
              type="checkbox"
              checked={auto.stopOnWin}
              disabled={running}
              onChange={(e) => patch({ stopOnWin: e.target.checked })}
              className="h-3.5 w-3.5 accent-white"
            />
            Stop saat menang
          </label>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#9d9da6]">
          <input
            type="checkbox"
            checked={auto.stopOnLose}
            disabled={running}
            onChange={(e) => patch({ stopOnLose: e.target.checked })}
            className="h-3.5 w-3.5 accent-white"
          />
          Stop saat kalah
        </label>
      </div>
    </div>
  )
}

export function GameView({ gameId }: { gameId: string }) {
  const setRoute = useCasino((s) => s.setRoute)
  const game = getGame(gameId)

  if (!game) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-[17px] font-semibold">Permainan tidak ditemukan</p>
        <button onClick={() => setRoute('lobby')} className="btn-primary h-10 px-5 text-[13.5px]">
          Kembali ke Lobi
        </button>
      </div>
    )
  }

  const theme = gameId.startsWith('slots-') ? slotThemeOf(gameId) : undefined

  const renderGame = () => {
    switch (game.id) {
      case 'dice': return <DiceGame />
      case 'limbo': return <LimboGame />
      case 'mines': return <MinesGame />
      case 'plinko': return <PlinkoGame />
      case 'keno': return <KenoGame />
      case 'blackjack': return <BlackjackGame />
      case 'roulette': return <RouletteGame />
      default: return <SlotsGame themeId={theme || 'lucky777'} />
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          onClick={() => setRoute('lobby')}
          className="flex h-9 items-center gap-1.5 rounded-full border border-white/[0.08] bg-surface-2 px-3.5 text-[12.5px] font-medium text-[#9d9da6] transition hover:border-white/20 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Lobi
        </button>
        {/* Thumbnail foto asli */}
        <span
          className="hidden h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/[0.1] bg-cover bg-center sm:block"
          style={{ backgroundImage: `url(${game.photo})` }}
          role="img"
          aria-label={game.name}
        />
        <h1 className="min-w-0 truncate text-[16px] font-semibold tracking-[-0.02em] sm:text-[17px]">{game.name}</h1>
        <span
          className="hidden rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider sm:block"
          style={{ backgroundColor: `${game.tint}14`, color: game.tint }}
        >
          {game.edge}
        </span>
        <button
          onClick={() => {
            sound.play('click')
            useCasino.getState().setFairnessOpen(true)
          }}
          className="ml-auto flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-surface-2 px-3.5 py-2 text-[12px] font-medium text-[#9d9da6] transition hover:border-white/20 hover:text-white"
        >
          <ShieldCheck className="h-4 w-4 text-[#30d158]" /> Fairness
        </button>
      </div>
      {renderGame()}
    </div>
  )
}
