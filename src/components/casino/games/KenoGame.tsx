'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useCasino } from '@/lib/store'
import { apiPost } from '@/lib/apiClient'
import { KENO_PAYTABLE } from '@/lib/games'
import { formatAmount } from '@/lib/currencies'
import { BetPanel } from '@/components/casino/games/GameView'
import { sound } from '@/lib/sound'

interface KenoResponse {
  multiplier: number
  win: boolean
  state: { drawn: number[]; hits: number; picks: number[] }
  balance: number
  payout: number
}

export function KenoGame() {
  const { user, activeCurrency, refreshMe } = useCasino()
  const [amount, setAmount] = useState(1)
  const [picks, setPicks] = useState<number[]>([])
  const [drawn, setDrawn] = useState<number[]>([])
  const [revealing, setRevealing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lastHit, setLastHit] = useState<number | null>(null)
  const [lastMult, setLastMult] = useState<number | null>(null)

  const toggle = (n: number) => {
    if (revealing) return
    sound.play('click')
    setPicks((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length >= 10 ? p : [...p, n]))
  }

  const autoPick = () => {
    const pool = Array.from({ length: 40 }, (_, i) => i)
    const picked: number[] = []
    const count = picks.length || 5
    while (picked.length < count) {
      const idx = Math.floor(Math.random() * pool.length)
      picked.push(pool.splice(idx, 1)[0])
    }
    setPicks(picked.sort((a, b) => a - b))
    sound.play('click')
  }

  const play = async () => {
    if (!user || picks.length === 0 || busy) return
    setBusy(true)
    setDrawn([])
    setLastHit(null)
    setLastMult(null)
    sound.play('bet')
    try {
      const res = await apiPost<KenoResponse>('/api/games/keno', {
        currency: activeCurrency,
        amount,
        picks,
      })
      // undi satu per satu (animasi berurutan)
      setRevealing(true)
      const order = [...res.state.drawn]
      for (let i = 0; i < order.length; i++) {
        await new Promise((r) => setTimeout(r, 170))
        const hit = picks.includes(order[i])
        setDrawn((d) => [...d, order[i]])
        sound.play(hit ? 'reveal' : 'tick')
      }
      setRevealing(false)
      setLastHit(res.state.hits)
      setLastMult(res.multiplier)
      if (res.win) {
        sound.play(res.multiplier >= 50 ? 'bigwin' : 'win')
        toast.success(`${res.state.hits} kena! ${res.multiplier}× — +${formatAmount(activeCurrency, res.payout)} ${activeCurrency}`)
      } else {
        sound.play('lose')
      }
      refreshMe()
    } catch (e) {
      setRevealing(false)
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const table = picks.length > 0 ? KENO_PAYTABLE[picks.length] : null

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
      {/* Papan */}
      <div className="flex min-h-[420px] flex-col rounded-3xl border border-white/[0.08] bg-surface-2 p-5 md:p-6">
        <div className="mx-auto grid w-full max-w-[480px] grid-cols-8 gap-1.5 sm:gap-2">
          {Array.from({ length: 40 }, (_, i) => {
            const picked = picks.includes(i)
            const isDrawn = drawn.includes(i)
            const isHit = picked && isDrawn
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                disabled={busy}
                className={`pop-result aspect-square rounded-xl font-mono text-[13.5px] font-semibold tabular-nums transition-all duration-150 ${
                  isHit
                    ? 'bg-[#30d158] text-black shadow-[0_0_18px_rgba(48,209,88,0.45)]'
                    : isDrawn
                      ? 'bg-[#ffd60a]/15 text-[#ffd60a] ring-1 ring-inset ring-[#ffd60a]/40'
                      : picked
                        ? 'bg-white text-black'
                        : 'bg-surface-3 text-[#6a6a73] hover:bg-surface-3/60 hover:text-white'
                } disabled:cursor-default`}
              >
                {i}
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[12px] font-medium text-[#9d9da6]">
          <span>
            Dipilih: <span className="font-semibold text-white">{picks.length}/10</span>
          </span>
          {drawn.length > 0 && (
            <span>
              Keluar: <span className="font-semibold text-[#ffd60a]">{drawn.length}</span>
              <span className="mx-1.5 text-[#3a3a42]">·</span>
              Kena: <span className="font-semibold text-[#30d158]">{lastHit ?? '…'}</span>
            </span>
          )}
          {lastMult !== null && (
            <span className={lastMult >= 1 ? 'font-semibold text-[#30d158]' : 'font-semibold text-[#ff453a]'}>
              Hasil: {lastMult}×
            </span>
          )}
        </div>

        {/* Paytable */}
        {table && (
          <div className="no-scrollbar mt-5 overflow-x-auto">
            <div className="flex justify-center gap-1.5">
              {table.map((m, hits) => (
                <div
                  key={hits}
                  className={`flex min-w-14 flex-col items-center rounded-xl px-2 py-2 text-[10px] font-semibold transition ${
                    lastHit === hits && m > 0
                      ? 'bg-[#30d158]/15 text-[#30d158] ring-1 ring-inset ring-[#30d158]/40'
                      : 'bg-surface-3/60 text-[#86868b]'
                  }`}
                >
                  <span>{hits} kena</span>
                  <span className="mt-0.5 font-mono">{m}×</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Panel */}
      <div className="rounded-3xl border border-white/[0.08] bg-surface-2 p-5">
        <BetPanel
          amount={amount}
          setAmount={setAmount}
          currency={activeCurrency}
          onBet={play}
          disabled={busy || picks.length === 0}
          betButtonText={busy ? 'Mengundi…' : 'Taruh'}
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={autoPick}
              disabled={busy}
              className="h-10 rounded-xl border border-white/[0.08] bg-surface-3 text-[12.5px] font-semibold text-[#9d9da6] transition hover:text-white disabled:opacity-50"
            >
              Pilih Otomatis
            </button>
            <button
              onClick={() => {
                setPicks([])
                setDrawn([])
                setLastHit(null)
                setLastMult(null)
                sound.play('click')
              }}
              disabled={busy}
              className="h-10 rounded-xl border border-white/[0.08] bg-surface-3 text-[12.5px] font-semibold text-[#9d9da6] transition hover:text-white disabled:opacity-50"
            >
              Bersihkan
            </button>
          </div>
        </BetPanel>
        <p className="mt-4 text-[11px] leading-relaxed text-[#6a6a73]">
          Pilih 1–10 angka dari 40. Server mengundi 10 angka provably fair dan membayar sesuai
          jumlah kecocokan.
        </p>
      </div>
    </div>
  )
}
