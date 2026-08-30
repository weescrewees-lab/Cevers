'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCasino } from '@/lib/store'
import { apiPost } from '@/lib/apiClient'
import { BetPanel, ResultChips, useAutoBet, AutoBetControls } from '@/components/casino/games/GameView'
import { sound } from '@/lib/sound'

interface DiceResponse {
  multiplier: number
  win: boolean
  state: { roll: number; target: number; direction: string; chance: number }
  balance: number
  payout: number
}

export function DiceGame() {
  const { user, activeCurrency, refreshMe } = useCasino()
  const [amount, setAmount] = useState(1)
  const [target, setTarget] = useState(50)
  const [direction, setDirection] = useState<'over' | 'under'>('over')
  const [roll, setRoll] = useState<number | null>(null)
  const [win, setWin] = useState<boolean | null>(null)
  const [rolling, setRolling] = useState(false)
  const [history, setHistory] = useState<number[]>([])
  const [mode, setMode] = useState<'manual' | 'auto'>('manual')
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const chance = direction === 'over' ? 100 - target : target
  const payoutMult = (99 * 100) / chance

  const stopAnim = () => {
    if (animRef.current) {
      clearInterval(animRef.current)
      animRef.current = null
    }
  }

  const play = async (): Promise<{ win: boolean; profit: number } | null> => {
    if (!user) return null
    setRolling(true)
    setWin(null)
    sound.play('bet')
    stopAnim()
    animRef.current = setInterval(() => setRoll(Math.random() * 100), 55)
    try {
      const res = await apiPost<DiceResponse>('/api/games/dice', {
        currency: activeCurrency,
        amount,
        target,
        direction,
      })
      await new Promise((r) => setTimeout(r, 520))
      stopAnim()
      setRoll(res.state.roll)
      setWin(res.win)
      setHistory((h) => [res.multiplier, ...h].slice(0, 14))
      if (res.win) {
        sound.play('win')
        toast.success(`Menang! +${res.payout.toFixed(4)} ${activeCurrency}`)
      } else {
        sound.play('lose')
      }
      void refreshMe()
      return { win: res.win, profit: res.win ? res.payout - amount : -amount }
    } catch (e) {
      stopAnim()
      toast.error((e as Error).message)
      return null
    } finally {
      setRolling(false)
    }
  }

  const auto = useAutoBet(play)
  const busy = rolling || (mode === 'auto' && auto.running)

  // Zona menang pada track
  const winLeft = direction === 'over' ? target : 0
  const winWidth = direction === 'over' ? 100 - target : target

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
      {/* Area game */}
      <div className="flex min-h-[400px] flex-col justify-center rounded-3xl border border-white/[0.08] bg-surface-2 p-6 md:p-8">
        {/* Slider target */}
        <div className="mb-12">
          <div className="mb-3 flex items-center justify-between text-[12px]">
            <span className="font-medium text-[#9d9da6]">
              Target <span className="ml-1 font-mono font-semibold text-white">{target.toFixed(0)}</span>
            </span>
            <span className="font-medium text-[#9d9da6]">
              Peluang <span className="font-mono font-semibold text-white">{chance.toFixed(2)}%</span>
              <span className="mx-2 text-[#3a3a42]">·</span>
              Bayaran <span className="font-mono font-semibold text-[#30d158]">{payoutMult.toFixed(4)}×</span>
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={98}
            step={1}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="apple-slider w-full"
            style={{
              background: `linear-gradient(90deg, #17171a 0%, #17171a ${winLeft}%, rgba(48,209,88,0.75) ${winLeft}%, rgba(48,209,88,0.75) ${winLeft + winWidth}%, #17171a ${winLeft + winWidth}%, #17171a 100%)`,
            }}
          />
          <div className="mt-2 flex justify-between font-mono text-[10px] text-[#5c5c66]">
            {[0, 25, 50, 75, 100].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </div>

        {/* Angka hasil */}
        <div className="mb-12 text-center">
          <div
            key={`${roll}-${win}`}
            className={`pop-result font-mono text-[clamp(44px,13vw,80px)] font-semibold leading-none tabular-nums tracking-[-0.03em] ${
              win === true ? 'text-[#30d158]' : win === false ? 'text-[#ff453a]' : 'text-white'
            }`}
          >
            {roll !== null ? roll.toFixed(2) : '0.00'}
          </div>
          <div className="mt-2 text-[11.5px] font-medium text-[#6a6a73]">
            {win === true ? 'MENANG' : win === false ? 'KALAH' : `Bertaruh ${direction === 'over' ? 'di atas' : 'di bawah'} ${target}`}
          </div>
        </div>

        {/* Marker di track */}
        <div className="relative">
          <div className="relative h-2 overflow-visible rounded-full bg-surface-3">
            <div
              className={`absolute top-0 h-2 rounded-full transition-all duration-300 ${
                win === true ? 'bg-[#30d158]/80 win-pulse' : win === false ? 'bg-[#ff453a]/80' : 'bg-white/25'
              }`}
              style={{
                left: `${winLeft}%`,
                width: `${winWidth}%`,
              }}
            />
            {roll !== null && (
              <div
                className="absolute -top-[5px] h-[18px] w-[5px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)] transition-all duration-200"
                style={{ left: `${roll}%` }}
              />
            )}
          </div>
        </div>

        {history.length > 0 && (
          <div className="mt-8">
            <ResultChips results={history} />
          </div>
        )}
      </div>

      {/* Panel taruhan */}
      <div className="rounded-3xl border border-white/[0.08] bg-surface-2 p-5">
        <div className="mb-4 flex gap-0.5 rounded-full bg-surface-3 p-1">
          {(['manual', 'auto'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                if (auto.running) return
                setMode(m)
                sound.play('click')
              }}
              className={`flex-1 rounded-full py-1.5 text-[12px] font-semibold capitalize transition ${
                mode === m ? 'bg-white text-black' : 'text-[#9d9da6] hover:text-white'
              }`}
            >
              {m === 'manual' ? 'Manual' : 'Auto'}
            </button>
          ))}
        </div>

        <BetPanel
          amount={amount}
          setAmount={setAmount}
          currency={activeCurrency}
          onBet={() => {
            if (mode === 'manual') void play()
            else if (auto.running) auto.stop()
            else void auto.start()
          }}
          disabled={mode === 'auto' && auto.running}
          betButtonText={mode === 'auto' ? (auto.running ? 'Hentikan Auto' : 'Mulai Auto') : 'Taruh'}
        >
          <div className="mb-3.5">
            <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wider text-[#86868b]">
              Arah
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setDirection('over')
                  sound.play('click')
                }}
                className={`h-10 rounded-xl text-[13px] font-semibold transition ${
                  direction === 'over' ? 'bg-white text-black' : 'bg-surface-3 text-[#9d9da6] hover:text-white'
                }`}
              >
                Di atas
              </button>
              <button
                onClick={() => {
                  setDirection('under')
                  sound.play('click')
                }}
                className={`h-10 rounded-xl text-[13px] font-semibold transition ${
                  direction === 'under' ? 'bg-white text-black' : 'bg-surface-3 text-[#9d9da6] hover:text-white'
                }`}
              >
                Di bawah
              </button>
            </div>
          </div>
        </BetPanel>

        {mode === 'auto' && (
          <div className="mt-4">
            <AutoBetControls auto={auto.auto} patch={auto.patch} running={auto.running} played={auto.played} profit={auto.profit} />
          </div>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-[#6a6a73]">
          Lempar dadu 0–100. Menang jika hasil {direction === 'over' ? 'di atas' : 'di bawah'} target.
          RTP 99% — hasil dari HMAC-SHA256 provably fair.
        </p>
      </div>
    </div>
  )
}
