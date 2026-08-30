'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCasino } from '@/lib/store'
import { apiPost } from '@/lib/apiClient'
import { BetPanel } from '@/components/casino/games/GameView'
import { sound } from '@/lib/sound'

const ROWS = 16
const MULTS: Record<string, number[]> = {
  low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
}

function bucketColor(m: number): string {
  if (m >= 100) return '#ff453a'
  if (m >= 10) return '#ff9f0a'
  if (m >= 2) return '#ffd60a'
  if (m >= 1) return '#30d158'
  return '#48484f'
}

interface PlinkoResponse {
  multiplier: number
  win: boolean
  state: { path: number[]; bucket: number; risk: string }
  balance: number
  payout: number
}

interface Ball {
  path: number[]
  bucket: number
  mult: number
  row: number // baris berikutnya yang dituju
  t: number // 0..1 progres antar baris
  x: number
  y: number
  done: boolean
  fade: number
  payout?: number
  currency?: string
}

export function PlinkoGame() {
  const { user, activeCurrency, refreshMe } = useCasino()
  const [amount, setAmount] = useState(1)
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium')
  const [busy, setBusy] = useState(false)
  const [hitBuckets, setHitBuckets] = useState<Record<number, number>>({}) // idx -> timestamp
  const [lastMult, setLastMult] = useState<number | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ballsRef = useRef<Ball[]>([])
  const rafRef = useRef<number | null>(null)
  const riskRef = useRef(risk)
  riskRef.current = risk

  /* ---------- Geometri ---------- */
  const geometry = (w: number, h: number) => {
    const topY = 26
    const bucketY = h - 34
    const spacing = Math.min(w / (ROWS + 2.4), (bucketY - topY) / (ROWS - 1.6))
    return { topY, bucketY, spacing }
  }

  const pegXY = (row: number, col: number, w: number, h: number) => {
    const { topY, spacing } = geometry(w, h)
    return {
      x: w / 2 + (col - row / 2) * spacing,
      y: topY + ((row - 2) / (ROWS - 2)) * ((h - 34) - topY - spacing),
    }
  }

  /* ---------- Render loop ---------- */
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== w * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const { spacing } = geometry(w, h)

    // paku
    for (let row = 2; row <= ROWS; row++) {
      for (let col = 0; col <= row; col++) {
        const { x, y } = pegXY(row, col, w, h)
        ctx.beginPath()
        ctx.arc(x, y, 2.4, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.22)'
        ctx.fill()
      }
    }

    // bola
    const now = performance.now()
    ballsRef.current = ballsRef.current.filter((b) => !(b.done && b.fade <= 0))
    for (const ball of ballsRef.current) {
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, 5.5, 0, Math.PI * 2)
      const alpha = ball.done ? Math.max(0, ball.fade) : 1
      ctx.fillStyle = `rgba(255,214,10,${alpha})`
      ctx.shadowColor = 'rgba(255,214,10,0.65)'
      ctx.shadowBlur = 10 * alpha
      ctx.fill()
      ctx.shadowBlur = 0
      if (ball.done) ball.fade -= 0.03
    }
    void now
    void spacing

    rafRef.current = requestAnimationFrame(draw)
  }, [])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [draw])

  /* ---------- Animasi jatuh (rAF) ---------- */
  const animateDrop = (path: number[], bucket: number, mult: number) =>
    new Promise<void>((resolve) => {
      const canvas = canvasRef.current
      if (!canvas) return resolve()
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const { topY, bucketY, spacing } = geometry(w, h)

      const ball: Ball = {
        path, bucket, mult, row: 0, t: 0,
        x: w / 2, y: topY - 12, done: false, fade: 1,
      }
      ballsRef.current.push(ball)

      let last = performance.now()
      const dur = 105 // ms per baris

      const step = (now: number) => {
        const dt = now - last
        last = now
        if (!ball.done) {
          ball.t += dt / dur
          while (ball.t >= 1 && !ball.done) {
            ball.t -= 1
            ball.row++
            if (ball.row >= ROWS) {
              ball.t = 0
              ball.done = true
              // posisi bucket
              const rights = path.reduce((a, b) => a + b, 0)
              ball.x = w / 2 + (rights - ROWS / 2) * spacing
              ball.y = bucketY + 6
              setHitBuckets((hb) => ({ ...hb, [bucket]: Date.now() }))
              setLastMult(mult)
              if (mult >= 10) sound.play('bigwin')
              else if (mult >= 1) sound.play('reveal')
              else sound.play('lose')
              setTimeout(resolve, 140)
              // hapus bola dari loop
              const fadeout = setInterval(() => {
                ball.fade -= 0.08
                if (ball.fade <= 0) clearInterval(fadeout)
              }, 50)
              return
            }
          }
          if (!ball.done) {
            // interpolasi antar paku dengan lompatan kecil
            const rightsBefore = path.slice(0, ball.row).reduce((a, b) => a + b, 0)
            const rightsAfter = rightsBefore + path[ball.row]
            const x0 = w / 2 + (rightsBefore - ball.row / 2) * spacing
            const x1 = w / 2 + (rightsAfter - (ball.row + 1) / 2) * spacing
            const yRow = (r: number) =>
              topY - 12 + ((r + 1) / ROWS) * (bucketY + 6 - (topY - 12))
            const y0 = yRow(ball.row - 1)
            const y1 = yRow(ball.row)
            const t = ball.t
            ball.x = x0 + (x1 - x0) * t
            ball.y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * spacing * 0.35
            if (ball.row > 0 && ball.t < 0.12) sound.play('tick')
          }
        }
        if (!ball.done || ball.fade > 0) requestAnimationFrame(step)
        else resolve()
      }
      requestAnimationFrame(step)
    })

  const play = async () => {
    if (!user || busy) return
    setBusy(true)
    try {
      const res = await apiPost<PlinkoResponse>('/api/games/plinko', {
        currency: activeCurrency,
        amount,
        risk,
      })
      sound.play('bet')
      const path = res.state?.path
      const bucket = res.state?.bucket
      if (!Array.isArray(path) || path.length !== 16 || typeof bucket !== 'number' || bucket < 0 || bucket > 16) {
        throw new Error('Respons permainan tidak valid')
      }
      await animateDrop(path, bucket, res.multiplier)
      setHistory((h) => [res.multiplier, ...h].slice(0, 14))
      if (res.multiplier >= 10) toast.success(`${res.multiplier}×! +${res.payout.toFixed(4)} ${activeCurrency}`)
      refreshMe()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const mults = MULTS[risk]
  const now = Date.now()

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
      {/* Papan */}
      <div className="flex min-h-[440px] flex-col rounded-3xl border border-white/[0.08] bg-surface-2 p-5">
        <div className="relative flex-1">
          <canvas ref={canvasRef} className="h-full min-h-[320px] w-full" />
        </div>
        <div className="mt-3 grid grid-cols-[repeat(17,minmax(0,1fr))] justify-center gap-0.5 sm:flex sm:gap-1">
          {mults.map((m, i) => {
            const hit = hitBuckets[i] && now - hitBuckets[i] < 900
            return (
              <span
                key={i}
                className="flex h-6 min-w-0 items-center justify-center rounded-md px-0.5 font-mono text-[8.5px] font-bold text-black transition-transform duration-150 sm:h-7 sm:min-w-9 sm:px-1 sm:text-[10px]"
                style={{
                  backgroundColor: bucketColor(m),
                  opacity: hit ? 1 : 0.85,
                  transform: hit ? 'scale(1.22)' : 'scale(1)',
                  boxShadow: hit ? '0 0 16px rgba(255,255,255,0.45)' : 'none',
                }}
              >
                {m}×
              </span>
            )
          })}
        </div>
        {history.length > 0 && (
          <div className="no-scrollbar mt-4 flex justify-center gap-1.5 overflow-x-auto">
            {history.slice(0, 8).map((r, i) => (
              <span
                key={i}
                className={`float-in flex h-7 min-w-10 shrink-0 items-center justify-center rounded-lg px-1.5 font-mono text-[11px] font-semibold tabular-nums ${
                  r >= 1 ? 'bg-[#30d158]/12 text-[#30d158]' : 'bg-white/[0.06] text-[#86868b]'
                }`}
              >
                {r}×
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Panel */}
      <div className="rounded-3xl border border-white/[0.08] bg-surface-2 p-5">
        <BetPanel amount={amount} setAmount={setAmount} currency={activeCurrency} onBet={play} disabled={busy}>
          <div>
            <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wider text-[#86868b]">
              Risiko
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['low', 'medium', 'high'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRisk(r)
                    sound.play('click')
                  }}
                  className={`h-10 rounded-xl text-[12.5px] font-semibold transition ${
                    risk === r ? 'bg-white text-black' : 'bg-surface-3 text-[#9d9da6] hover:text-white'
                  }`}
                >
                  {r === 'low' ? 'Rendah' : r === 'medium' ? 'Sedang' : 'Tinggi'}
                </button>
              ))}
            </div>
          </div>
        </BetPanel>
        <p className="mt-4 text-[11px] leading-relaxed text-[#6a6a73]">
          Bola dijatuhkan melalui 16 baris paku. Jalur ditentukan server secara provably fair — tabrakan
          kiri/kanan setiap paku berasal dari hasil HMAC.
        </p>
      </div>
    </div>
  )
}
