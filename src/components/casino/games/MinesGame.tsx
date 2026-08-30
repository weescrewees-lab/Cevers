'use client'

import { useState } from 'react'
import { Bomb, Gem } from 'lucide-react'
import { toast } from 'sonner'
import { useCasino } from '@/lib/store'
import { apiPost } from '@/lib/apiClient'
import { minesMultiplier } from '@/lib/games'
import { formatAmount } from '@/lib/currencies'
import { BetPanel } from '@/components/casino/games/GameView'
import { sound } from '@/lib/sound'

interface MinesResponse {
  started?: boolean
  boom?: boolean
  tile?: number
  revealed?: number[]
  mineSpots?: number[]
  multiplier?: number
  payout?: number
  balance?: number | null
  cashout?: boolean
  mines?: number
}

export function MinesGame() {
  const { user, activeCurrency, refreshMe } = useCasino()
  const [amount, setAmount] = useState(1)
  const [mines, setMines] = useState(3)
  const [active, setActive] = useState(false)
  const [revealed, setRevealed] = useState<number[]>([])
  const [boomTile, setBoomTile] = useState<number | null>(null)
  const [mineSpots, setMineSpots] = useState<number[]>([])
  const [multiplier, setMultiplier] = useState(0)
  const [busy, setBusy] = useState(false)
  const [finished, setFinished] = useState<'win' | 'lose' | null>(null)
  const [payout, setPayout] = useState(0)

  const start = async () => {
    setBusy(true)
    try {
      await apiPost<MinesResponse>('/api/games/mines', {
        action: 'start',
        currency: activeCurrency,
        amount,
        mines,
      })
      sound.play('bet')
      setActive(true)
      setRevealed([])
      setBoomTile(null)
      setMineSpots([])
      setMultiplier(0)
      setFinished(null)
      setPayout(0)
      refreshMe()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const reveal = async (tile: number) => {
    if (!active || busy || revealed.includes(tile)) return
    setBusy(true)
    try {
      const res = await apiPost<MinesResponse>('/api/games/mines', { action: 'reveal', tile })
      if (res.boom) {
        setBoomTile(tile)
        setMineSpots(res.mineSpots || [])
        setActive(false)
        setFinished('lose')
        sound.play('boom')
        toast.error('BOOM! Kamu kena ranjau')
      } else {
        setRevealed(res.revealed || [])
        setMultiplier(res.multiplier || 0)
        sound.play('reveal')
        if (res.cashout) {
          setActive(false)
          setFinished('win')
          setPayout(res.payout || 0)
          setMineSpots(res.mineSpots || [])
          sound.play('bigwin')
          toast.success(`Semua permata terbuka! ${res.multiplier?.toFixed(2)}×`)
        }
      }
      refreshMe()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const cashout = async () => {
    if (!active || revealed.length === 0) return
    setBusy(true)
    try {
      const res = await apiPost<MinesResponse>('/api/games/mines', { action: 'cashout' })
      setActive(false)
      setFinished('win')
      setPayout(res.payout || 0)
      setMultiplier(res.multiplier || 0)
      setMineSpots(res.mineSpots || [])
      sound.play('cashout')
      toast.success(`Cashout ${res.multiplier?.toFixed(2)}×! +${formatAmount(activeCurrency, res.payout || 0)} ${activeCurrency}`)
      refreshMe()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const nextMult = minesMultiplier(mines, revealed.length + 1)
  const safeTiles = 25 - mines

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
      {/* Papan */}
      <div className="flex min-h-[420px] flex-col rounded-3xl border border-white/[0.08] bg-surface-2 p-5 md:p-6">
        <div className="mx-auto grid w-full max-w-[420px] flex-1 grid-cols-5 content-center gap-2.5">
          {Array.from({ length: 25 }, (_, i) => {
            const isRevealed = revealed.includes(i)
            const isBoom = boomTile === i
            const isMine = mineSpots.includes(i)
            const showAll = !active && mineSpots.length > 0
            const flipped = isRevealed || isBoom || (showAll && isMine)
            return (
              <button
                key={i}
                onClick={() => reveal(i)}
                disabled={!active || busy || isRevealed}
                className="flip-3d aspect-square disabled:cursor-default"
              >
                <div className={`flip-inner ${flipped ? 'flipped' : ''}`}>
                  {/* Depan: tile tertutup */}
                  <div
                    className={`flip-face flex items-center justify-center bg-surface-3 shadow-[inset_0_-3px_0_rgba(0,0,0,0.4)] transition ${
                      active && !isRevealed ? 'cursor-pointer hover:bg-surface-3/60 hover:ring-2 hover:ring-white/25' : ''
                    }`}
                  >
                    <span className="font-mono text-[10px] text-white/20">{i + 1}</span>
                  </div>
                  {/* Belakang: isi */}
                  <div
                    className={`flip-face flip-back flex items-center justify-center ${
                      isBoom
                        ? 'bg-[#ff453a] shadow-[0_0_24px_rgba(255,69,58,0.5)]'
                        : isRevealed
                          ? 'bg-[#30d158]/15 ring-1 ring-inset ring-[#30d158]/40'
                          : 'bg-[#ff453a]/10 ring-1 ring-inset ring-[#ff453a]/25'
                    }`}
                  >
                    {isBoom ? (
                      <Bomb className="h-7 w-7 text-white" strokeWidth={1.8} />
                    ) : isRevealed ? (
                      <Gem className="h-6 w-6 text-[#30d158]" strokeWidth={1.8} />
                    ) : (
                      <Bomb className="h-6 w-6 text-[#ff453a]/60" strokeWidth={1.8} />
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Status bar */}
        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-surface-3/50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div>
              <div className="text-[9.5px] font-semibold uppercase tracking-wider text-[#6a6a73]">Multiplier saat ini</div>
              <div className="font-mono text-[20px] font-semibold tabular-nums text-[#30d158]">
                {(multiplier || minesMultiplier(mines, 0)).toFixed(4)}×
              </div>
            </div>
            <div className="text-center">
              <div className="text-[9.5px] font-semibold uppercase tracking-wider text-[#6a6a73]">Permata</div>
              <div className="font-mono text-[13px] font-semibold tabular-nums">
                {revealed.length}<span className="text-[#5c5c66]">/{safeTiles}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9.5px] font-semibold uppercase tracking-wider text-[#6a6a73]">Buka berikutnya</div>
              <div className="font-mono text-[13px] font-semibold tabular-nums text-white/85">{nextMult.toFixed(4)}×</div>
            </div>
            {active && (
              <button
                onClick={cashout}
                disabled={busy || revealed.length === 0}
                className="btn-primary ml-auto h-10 min-w-[128px] px-6 text-[13px]"
              >
                Cashout
              </button>
            )}
          </div>
          {active && revealed.length > 0 && (
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-[#30d158] transition-all duration-300"
                style={{ width: `${(revealed.length / safeTiles) * 100}%` }}
              />
            </div>
          )}
        </div>

        {finished === 'win' && (
          <div className="float-in mt-3 rounded-xl border border-[#30d158]/30 bg-[#30d158]/[0.08] px-4 py-3 text-center text-[13px] font-semibold text-[#30d158]">
            Menang! +{formatAmount(activeCurrency, payout)} {activeCurrency}
          </div>
        )}
        {finished === 'lose' && (
          <div className="float-in mt-3 rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/[0.08] px-4 py-3 text-center text-[13px] font-semibold text-[#ff453a]">
            Kena ranjau! Coba lagi.
          </div>
        )}
      </div>

      {/* Panel */}
      <div className="rounded-3xl border border-white/[0.08] bg-surface-2 p-5">
        {active ? (
          <div className="space-y-3.5">
            <div className="rounded-2xl border border-white/[0.07] bg-surface-3/50 p-4 text-center">
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#6a6a73]">Game berjalan</div>
              <div className="mt-1 text-[22px] font-semibold">{mines} ranjau</div>
              <div className="mt-0.5 font-mono text-[14px] font-semibold text-[#30d158] tabular-nums">
                {multiplier.toFixed(4)}×
              </div>
            </div>
            <button
              onClick={cashout}
              disabled={busy || revealed.length === 0}
              className="btn-primary h-12 w-full text-[15px]"
            >
              Cashout
            </button>
            <p className="text-center text-[11px] text-[#6a6a73]">Buka minimal 1 permata untuk cashout</p>
          </div>
        ) : (
          <BetPanel amount={amount} setAmount={setAmount} currency={activeCurrency} onBet={start} disabled={busy}>
            <div>
              <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wider text-[#86868b]">
                Jumlah Ranjau
              </label>
              <select
                value={mines}
                onChange={(e) => setMines(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-surface-3 px-3 text-[13.5px] font-semibold outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m} ranjau
                  </option>
                ))}
              </select>
            </div>
          </BetPanel>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-[#6a6a73]">
          Buka permata satu per satu — hindari ranjau. Multiplier naik setiap permata; cashout kapan saja.
          Posisi ranjau ditentukan server secara provably fair.
        </p>
      </div>
    </div>
  )
}
