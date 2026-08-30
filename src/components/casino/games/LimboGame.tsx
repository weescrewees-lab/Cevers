'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCasino } from '@/lib/store'
import { apiPost } from '@/lib/apiClient'
import { BetPanel, ResultChips, useAutoBet, AutoBetControls } from '@/components/casino/games/GameView'
import { sound } from '@/lib/sound'

interface LimboResponse {
  multiplier: number
  win: boolean
  state: { crash: number; target: number }
  payout: number
}

export function LimboGame() {
  const { user, activeCurrency, refreshMe } = useCasino()
  const [amount, setAmount] = useState(1)
  const [target, setTarget] = useState(2)
  const [display, setDisplay] = useState<number | null>(null)
  const [win, setWin] = useState<boolean | null>(null)
  const [rolling, setRolling] = useState(false)
  const [history, setHistory] = useState<number[]>([])
  const [mode, setMode] = useState<'manual' | 'auto'>('manual')
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const chance = Math.min(99, (99 / target))

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
    // animasi angka melompat-lompat mengecil menuju hasil
    animRef.current = setInterval(() => setDisplay(1 + Math.random() * 12), 60)
    try {
      const res = await apiPost<LimboResponse>('/api/games/limbo', {
        currency: activeCurrency,
        amount,
        target,
      })
      await new Promise((r) => setTimeout(r, 540))
      stopAnim()
      setDisplay(typeof res.state.crash === 'number' ? res.state.crash : 1)
      setWin(res.win)
      setHistory((h) => [res.multiplier, ...h].slice(0, 14))
      if (res.win) {
        sound.play(res.multiplier >= 10 ? 'bigwin' : 'win')
        toast.success(`Menang! ×${res.multiplier.toFixed(2)} — +${res.payout.toFixed(4)} ${activeCurrency}`)
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

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
      {/* Area game */}
      <div className="relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/[0.08] bg-surface-2 p-8">
        {/* garis target */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/[0.09] to-transparent" />
        <div
          key={`${display}-${win}`}
          className={`pop-result font-mono text-[clamp(46px,15vw,104px)] font-semibold leading-none tabular-nums tracking-[-0.03em] ${
            win === true ? 'text-[#30d158]' : win === false ? 'text-[#ff453a]' : 'text-white'
          }`}
        >
          {display !== null ? `${display.toFixed(2)}×` : '0.00×'}
        </div>
        <div className="mt-3 text-[12px] font-medium text-[#6a6a73]">
          {win === true
            ? `Melewati target ×${target}`
            : win === false
              ? `Di bawah target ×${target}`
              : `Menang jika hasil ≥ ×${target}`}
        </div>
        {history.length > 0 && (
          <div className="mt-10 w-full max-w-md">
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
              className={`flex-1 rounded-full py-1.5 text-[12px] font-semibold transition ${
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
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[10.5px] font-medium uppercase tracking-wider text-[#86868b]">
                Target Multiplier
              </label>
              <span className="font-mono text-[11px] text-[#6a6a73]">
                Peluang {chance.toFixed(2)}%
              </span>
            </div>
            <div className="flex overflow-hidden rounded-xl border border-white/[0.08] bg-surface-2 transition focus-within:border-white/30">
              <input
                type="number"
                min={1.01}
                max={1000}
                step="any"
                value={target}
                onChange={(e) => setTarget(Math.max(1.01, parseFloat(e.target.value) || 1.01))}
                className="h-11 min-w-0 flex-1 bg-transparent px-3.5 font-mono text-[14px] tabular-nums outline-none"
              />
              <div className="flex items-center gap-1 border-l border-white/[0.06] px-1.5">
                {[1.5, 2, 10].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTarget(t)
                      sound.play('click')
                    }}
                    className="rounded-lg px-2 py-1.5 font-mono text-[11.5px] font-semibold text-[#9d9da6] transition hover:bg-white/[0.06] hover:text-white"
                  >
                    {t}×
                  </button>
                ))}
              </div>
            </div>
          </div>
        </BetPanel>

        {mode === 'auto' && (
          <div className="mt-4">
            <AutoBetControls auto={auto.auto} patch={auto.patch} running={auto.running} played={auto.played} profit={auto.profit} />
          </div>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-[#6a6a73]">
          Limbo memilih hasil acak dengan distribusi berat ekor — semakin tinggi target, semakin kecil
          peluang. RTP 99% provably fair.
        </p>
      </div>
    </div>
  )
}
