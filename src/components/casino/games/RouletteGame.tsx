'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useCasino } from '@/lib/store'
import { apiPost } from '@/lib/apiClient'
import { ROULETTE_RED, RouletteBet } from '@/lib/games'
import { formatAmount } from '@/lib/currencies'
import { BetPanel } from '@/components/casino/games/GameView'
import { sound } from '@/lib/sound'

interface RouletteResponse {
  multiplier: number
  win: boolean
  state: { number: number; color: string }
  balance: number
  payout: number
}

const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]

function hexOf(n: number): string {
  if (n === 0) return '#30d158'
  return ROULETTE_RED.has(n) ? '#ff453a' : '#1c1c1e'
}

function numColorClass(n: number): string {
  if (n === 0) return 'bg-[#30d158] text-black'
  return ROULETTE_RED.has(n) ? 'bg-[#ff453a] text-white' : 'bg-[#1c1c1e] text-white ring-1 ring-inset ring-white/[0.12]'
}

export function RouletteGame() {
  const { user, activeCurrency, refreshMe } = useCasino()
  const [amount, setAmount] = useState(1)
  const [selections, setSelections] = useState<RouletteBet[]>([{ type: 'red' }])
  const [result, setResult] = useState<{ number: number; color: string } | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [lastWin, setLastWin] = useState<number | null>(null)
  const [history, setHistory] = useState<{ number: number; color: string }[]>([])

  const toggleBet = (type: RouletteBet['type'], number?: number) => {
    sound.play('chip')
    setSelections((s) => {
      const exists = s.findIndex((b) => b.type === type && b.number === number)
      if (exists >= 0) return s.filter((_, i) => i !== exists)
      if (type === 'straight') return [...s.filter((b) => b.type !== 'straight'), { type, number }]
      return [...s.filter((b) => b.type !== type), { type }]
    })
  }

  const isPicked = (type: RouletteBet['type'], number?: number) =>
    selections.some((b) => b.type === type && b.number === number)

  const play = async () => {
    if (!user || spinning || selections.length === 0) return
    setSpinning(true)
    setLastWin(null)
    sound.play('spin')
    try {
      const res = await apiPost<RouletteResponse>('/api/games/roulette', {
        currency: activeCurrency,
        amount,
        bets: selections,
      })
      // animasi roda — putaran penuh lalu mendarat di nomor (ease-out kaya kasino)
      const targetIdx = WHEEL_ORDER.indexOf(res.state.number)
      if (targetIdx >= 0) {
        const seg = 360 / 37
        const current = rotation
        const baseSpin = 4 * 360
        const finalRot = current + baseSpin + ((360 - (targetIdx * seg)) % 360) - (current % 360)
        setRotation(finalRot)
      }
      // bunyi tik berkurang selama putaran
      for (let i = 0; i < 12; i++) {
        setTimeout(() => sound.play('tick'), i * (2600 / 12) * (1 - i * 0.06))
      }
      await new Promise((r) => setTimeout(r, 2650))
      setResult(res.state)
      setHistory((h) => [res.state, ...h].slice(0, 16))
      setLastWin(res.payout)
      if (res.win) {
        sound.play(res.multiplier >= 30 ? 'bigwin' : 'win')
        toast.success(`Nomor ${res.state.number} — menang ${res.multiplier.toFixed(2)}×!`)
      } else {
        sound.play('lose')
        toast.info(`Nomor ${res.state.number} — belum beruntung`)
      }
      refreshMe()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSpinning(false)
    }
  }

  const potentialMax =
    selections.length > 0
      ? Math.max(...selections.map((b) => (b.type === 'straight' ? 36 : b.type.startsWith('dozen') ? 3 : 2)))
      : 0

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
      {/* Roda + papan */}
      <div className="flex min-h-[420px] flex-col rounded-3xl border border-white/[0.08] bg-surface-2 p-5 md:p-6">
        {/* Roda */}
        <div className="mb-5 flex flex-wrap items-center justify-center gap-6">
          <div className="relative h-44 w-44 md:h-48 md:w-48">
            {/* penanda atas */}
            <div className="absolute left-1/2 top-[-2px] z-10 h-4 w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            <div
              className="absolute inset-0 rounded-full p-[5px] transition-transform"
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: spinning ? '2600ms' : '0ms',
                transitionTimingFunction: 'cubic-bezier(0.12, 0.6, 0.12, 1)',
                background: `conic-gradient(${WHEEL_ORDER.map((n, i) => {
                  const c = hexOf(n)
                  return `${c} ${(i * 360) / 37}deg ${((i + 1) * 360) / 37}deg`
                }).join(',')})`,
                boxShadow: '0 8px 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1)',
              }}
            >
              {/* hub tengah */}
              <div className="absolute inset-[26%] flex items-center justify-center rounded-full border border-white/[0.1] bg-black">
                <span className="font-mono text-[22px] font-semibold tabular-nums">
                  {result ? result.number : '—'}
                </span>
              </div>
            </div>
          </div>
          {result && (
            <div className={`pop-result flex h-20 w-16 flex-col items-center justify-center rounded-2xl ${numColorClass(result.number)}`}>
              <div className="font-mono text-[30px] font-semibold leading-none tabular-nums">{result.number}</div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] opacity-80">
                {result.color === 'green' ? 'Hijau' : result.color === 'red' ? 'Merah' : 'Hitam'}
              </div>
            </div>
          )}
        </div>

        {/* Riwayat */}
        {history.length > 0 && (
          <div className="no-scrollbar mb-4 flex justify-center gap-1.5 overflow-x-auto">
            {history.map((h, i) => (
              <span
                key={i}
                className={`float-in flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold ${numColorClass(h.number)}`}
              >
                {h.number}
              </span>
            ))}
          </div>
        )}

        {/* Papan taruhan — muat layar kecil, tanpa scroll di ≥360px */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-0 sm:min-w-[560px]">
            <div className="grid grid-cols-[repeat(13,1fr)] gap-1">
              <button
                onClick={() => toggleBet('straight', 0)}
                className={`rounded-l-xl text-[13px] font-semibold transition sm:text-[15px] ${numColorClass(0)} ${
                  isPicked('straight', 0) ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-2' : 'opacity-85 hover:opacity-100'
                }`}
                style={{ gridRow: 'span 3' }}
              >
                0
              </button>
              {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => toggleBet('straight', n)}
                  className={`h-8 rounded-[5px] font-mono text-[10px] font-semibold transition sm:h-9 sm:text-[11.5px] ${numColorClass(n)} ${
                    isPicked('straight', n) ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-2' : 'opacity-85 hover:opacity-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {(['dozen1', 'dozen2', 'dozen3'] as const).map((t, i) => (
                <button
                  key={t}
                  onClick={() => toggleBet(t)}
                  className={`rounded-lg py-2 text-[11px] font-semibold transition sm:text-[12px] ${
                    isPicked(t)
                      ? 'bg-white text-black'
                      : 'border border-white/[0.08] bg-surface-3 text-[#9d9da6] hover:text-white'
                  }`}
                >
                  {i === 0 ? '1–12' : i === 1 ? '13–24' : '25–36'}
                </button>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-6 gap-1.5">
              {(
                [
                  ['low', '1–18'],
                  ['even', 'Genap'],
                  ['red', 'Merah'],
                  ['black', 'Hitam'],
                  ['odd', 'Ganjil'],
                  ['high', '19–36'],
                ] as const
              ).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => toggleBet(t)}
                  className={`rounded-lg py-2 text-[10.5px] font-semibold transition sm:text-[12px] ${
                    isPicked(t)
                      ? 'bg-white text-black'
                      : t === 'red'
                        ? 'bg-[#ff453a]/70 text-white hover:bg-[#ff453a]/85'
                        : t === 'black'
                          ? 'bg-[#1c1c1e] text-white ring-1 ring-inset ring-white/[0.12] hover:bg-[#2c2c2e]'
                          : 'border border-white/[0.08] bg-surface-3 text-[#9d9da6] hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Panel */}
      <div className="rounded-3xl border border-white/[0.08] bg-surface-2 p-5">
        <BetPanel
          amount={amount}
          setAmount={setAmount}
          currency={activeCurrency}
          onBet={play}
          disabled={spinning}
          betLabel="Taruhan per pilihan"
          betButtonText={spinning ? 'Berputar…' : 'Putar'}
        >
          <div className="rounded-2xl border border-white/[0.07] bg-surface-3/50 p-3.5 text-[12px]">
            <div className="flex justify-between py-0.5">
              <span className="text-[#86868b]">Pilihan aktif</span>
              <span className="font-semibold tabular-nums">{selections.length}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-[#86868b]">Total dipertaruhkan</span>
              <span className="font-mono font-semibold tabular-nums">
                {formatAmount(activeCurrency, amount * selections.length)} {activeCurrency}
              </span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-[#86868b]">Bayaran tertinggi</span>
              <span className="font-mono font-semibold tabular-nums text-[#30d158]">{potentialMax}×</span>
            </div>
          </div>
          {lastWin !== null && (
            <div
              className={`float-in rounded-xl border px-3 py-2.5 text-center text-[13px] font-semibold ${
                lastWin > 0
                  ? 'border-[#30d158]/30 bg-[#30d158]/[0.08] text-[#30d158]'
                  : 'border-[#ff453a]/30 bg-[#ff453a]/[0.08] text-[#ff453a]'
              }`}
            >
              {lastWin > 0 ? `+${formatAmount(activeCurrency, lastWin)} ${activeCurrency}` : 'Tidak menang'}
            </div>
          )}
        </BetPanel>
        <p className="mt-4 text-[11px] leading-relaxed text-[#6a6a73]">
          Roda Eropa 0–36. Klik angka/kolom untuk memilih; tiap pilihan dikenakan taruhan penuh. Straight
          membayar 36×.
        </p>
      </div>
    </div>
  )
}
