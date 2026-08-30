'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useCasino } from '@/lib/store'
import { apiPost } from '@/lib/apiClient'
import { SLOT_THEMES, SLOT_SYMBOL_GLYPHS, SlotTheme } from '@/lib/games'
import { formatAmount } from '@/lib/currencies'
import { BetPanel } from '@/components/casino/games/GameView'
import { sound } from '@/lib/sound'

interface SlotsResponse {
  multiplier: number
  win: boolean
  state: { grid: number[][]; wins: { line: number; symbol: string; count: number; payout: number }[]; theme: string }
  balance: number
  payout: number
}

export function SlotsGame({ themeId }: { themeId: string }) {
  const { user, activeCurrency, refreshMe } = useCasino()
  const theme: SlotTheme = SLOT_THEMES.find((t) => t.id === themeId) || SLOT_THEMES[0]
  const [amount, setAmount] = useState(1)
  const [grid, setGrid] = useState<number[][] | null>(null)
  const [spinningCols, setSpinningCols] = useState<boolean[]>([false, false, false, false, false])
  const [landedCols, setLandedCols] = useState<boolean[]>([true, true, true, true, true])
  const [wins, setWins] = useState<SlotsResponse['state']['wins']>([])
  const [lastPayout, setLastPayout] = useState<number | null>(null)
  const [tick, setTick] = useState(0)

  const idleGrid: number[][] = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 3 }, (_, c) => (r * 2 + c) % theme.symbols.length),
  )

  const play = async () => {
    if (!user || spinningCols.some(Boolean)) return
    setWins([])
    setLastPayout(null)
    sound.play('bet')
    try {
      const res = await apiPost<SlotsResponse>('/api/games/slots', {
        currency: activeCurrency,
        amount,
        theme: theme.id,
      })
      // semua gulungan berputar
      setLandedCols([false, false, false, false, false])
      setSpinningCols([true, true, true, true, true])
      const shuffler = setInterval(() => {
        setGrid(Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => Math.floor(Math.random() * theme.symbols.length))))
        setTick((t) => t + 1)
        sound.play('tick')
      }, 85)

      // gulungan berhenti satu per satu
      const finalGrid = res.state.grid
      for (let col = 0; col < 5; col++) {
        await new Promise((r) => setTimeout(r, 380))
        const stopped = finalGrid.map((c, i) => (i <= col ? c : Array.from({ length: 3 }, () => Math.floor(Math.random() * theme.symbols.length))))
        setGrid(stopped)
        setSpinningCols((s) => s.map((v, i) => (i <= col ? false : v)))
        setLandedCols((s) => s.map((v, i) => (i <= col ? false : true)))
        sound.play('chip')
        // trigger animasi landing
        requestAnimationFrame(() => setLandedCols((s) => s.map((v, i) => (i <= col ? true : v))))
      }
      clearInterval(shuffler)
      setGrid(finalGrid)
      setSpinningCols([false, false, false, false, false])
      setLandedCols([true, true, true, true, true])

      setWins(res.state.wins)
      setLastPayout(res.payout)
      if (res.win) {
        sound.play(res.multiplier >= 20 ? 'bigwin' : 'win')
        toast.success(`${res.multiplier}× — +${formatAmount(activeCurrency, res.payout)} ${activeCurrency}`)
      } else {
        sound.play('lose')
      }
      refreshMe()
    } catch (e) {
      setSpinningCols([false, false, false, false, false])
      setLandedCols([true, true, true, true, true])
      toast.error((e as Error).message)
    }
  }

  const displayGrid: number[][] = grid || idleGrid
  const anySpinning = spinningCols.some(Boolean)

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
      {/* Mesin slot */}
      <div
        className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/[0.08] p-6"
        style={{
          background: `radial-gradient(90% 70% at 50% 0%, ${theme.accent}14, transparent 60%), linear-gradient(180deg, #0b0b0d, #060607)`,
        }}
      >
        <div className="mb-5 text-center">
          <div className="text-[19px] font-semibold tracking-[-0.02em] text-white">{theme.name}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
            NOIR Original · 5 Gulungan · 5 Garis
          </div>
        </div>

        {/* Grid gulungan */}
        <div className="w-full max-w-[420px] rounded-[22px] border border-white/[0.09] bg-black/50 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.6)] sm:p-3">
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {displayGrid.map((col, r) => (
              <div key={r} className={`flex min-w-0 flex-col gap-1.5 sm:gap-2 ${spinningCols[r] ? 'reel-spinning' : landedCols[r] ? 'reel-land' : ''}`}>
                {col.map((sym, c) => {
                  const isWinCell =
                    !anySpinning &&
                    wins.some((w) => isOnLine(w.line, r, c))
                  return (
                    <div
                      key={`${c}-${tick}-${spinningCols[r] ? 'spin' : 'stop'}`}
                      className={`pop-result flex aspect-square w-full items-center justify-center rounded-xl text-[clamp(20px,6.5vw,30px)] ${
                        isWinCell
                          ? 'bg-[#ffd60a]/20 ring-2 ring-[#ffd60a] shadow-[0_0_20px_rgba(255,214,10,0.3)]'
                          : 'bg-white/[0.05] ring-1 ring-inset ring-white/[0.06]'
                      }`}
                    >
                      {SLOT_SYMBOL_GLYPHS[theme.symbols[sym]?.id ?? ''] || '◆'}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Banner menang */}
        {lastPayout !== null && wins.length > 0 && (
          <div className="float-in mt-5 rounded-2xl border border-[#ffd60a]/40 bg-[#ffd60a]/10 px-7 py-2.5 text-center">
            <div className="font-mono text-[20px] font-semibold tabular-nums text-[#ffd60a]">
              {formatAmount(activeCurrency, lastPayout)} {activeCurrency}
            </div>
            <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#ffd60a]/70">
              {wins[0].count}× {wins[0].symbol} · {wins[0].payout.toFixed(2)}× garis
            </div>
          </div>
        )}

        {/* Paytable ringkas */}
        <div className="mt-5 flex max-w-lg flex-wrap justify-center gap-1.5">
          {[...theme.symbols].reverse().map((s) => (
            <span
              key={s.id}
              className="rounded-lg border border-white/[0.07] bg-black/30 px-2 py-1 text-[10px] font-medium text-white/55"
            >
              {SLOT_SYMBOL_GLYPHS[s.id]} <span className="font-mono">3×={s.payout3} · 5×={s.payout5}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Panel */}
      <div className="rounded-3xl border border-white/[0.08] bg-surface-2 p-5">
        <BetPanel
          amount={amount}
          setAmount={setAmount}
          currency={activeCurrency}
          onBet={play}
          disabled={anySpinning}
          betLabel="Taruhan per putaran"
          betButtonText={anySpinning ? 'Berputar…' : 'Putar'}
        />
        <p className="mt-4 text-[11px] leading-relaxed text-[#6a6a73]">
          Simbol dengan bobot lebih rendah punya bayaran lebih tinggi (peluang muncul{' '}
          {Math.round((theme.symbols[0].weight / theme.symbols.reduce((a, s) => a + s.weight, 0)) * 100)}% untuk
          yang paling langka). 5 payline: 3 horizontal + 2 zig-zag.
        </p>
      </div>
    </div>
  )
}

function isOnLine(line: number, reel: number, row: number): boolean {
  const LINES = [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
  ]
  return LINES[line][reel] === row
}
