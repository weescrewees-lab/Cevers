'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useCasino } from '@/lib/store'
import { apiPost } from '@/lib/apiClient'
import { handValue } from '@/lib/games'
import { formatAmount } from '@/lib/currencies'
import { BetPanel } from '@/components/casino/games/GameView'
import { sound } from '@/lib/sound'

interface BJResponse {
  playerCards: string[]
  dealerCards: string[]
  phase?: string
  balance?: number
  outcome?: string
  multiplier?: number
  payout?: number
  pv?: number
  dv?: number
}

const SUIT_GLYPH: Record<string, { s: string; red: boolean }> = {
  S: { s: '♠', red: false },
  H: { s: '♥', red: true },
  D: { s: '♦', red: true },
  C: { s: '♣', red: false },
}

function Card({ card, hidden, delay = 0 }: { card?: string; hidden?: boolean; delay?: number }) {
  if (hidden || !card) {
    return (
      <div
        className="card-deal flex h-[70px] w-[50px] items-center justify-center rounded-xl border border-white/[0.14] bg-[#15151a] shadow-lg sm:h-[92px] sm:w-[66px]"
        style={{ animationDelay: `${delay}ms` }}
      >
        <span className="text-xl text-white/25">✦</span>
      </div>
    )
  }
  const rank = card.slice(0, -1)
  const suit = card.slice(-1)
  const info = SUIT_GLYPH[suit] ?? { s: '✦', red: false }
  return (
    <div
      className={`card-deal flex h-[70px] w-[50px] flex-col justify-between rounded-xl bg-white p-1 shadow-[0_6px_20px_rgba(0,0,0,0.45)] sm:h-[92px] sm:w-[66px] sm:p-1.5 ${
        info.red ? 'text-[#ff453a]' : 'text-[#1c1c1e]'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="text-[11px] font-bold leading-none sm:text-[13px]">{rank}</span>
      <span className="self-center text-[20px] leading-none sm:text-[26px]">{info.s}</span>
      <span className="self-end rotate-180 text-[11px] font-bold leading-none sm:text-[13px]">{rank}</span>
    </div>
  )
}

const OUTCOME_TEXT: Record<string, { text: string; cls: string }> = {
  win: { text: 'Menang', cls: 'text-[#30d158]' },
  lose: { text: 'Kalah', cls: 'text-[#ff453a]' },
  bust: { text: 'Bust', cls: 'text-[#ff453a]' },
  push: { text: 'Seri (Push)', cls: 'text-[#ffd60a]' },
  blackjack: { text: 'Blackjack! 3:2', cls: 'text-[#30d158]' },
  dealer_bust: { text: 'Dealer Bust', cls: 'text-[#30d158]' },
  dealer_blackjack: { text: 'Dealer Blackjack', cls: 'text-[#ff453a]' },
}

export function BlackjackGame() {
  const { user, activeCurrency, refreshMe } = useCasino()
  const [amount, setAmount] = useState(1)
  const [playerCards, setPlayerCards] = useState<string[]>([])
  const [dealerCards, setDealerCards] = useState<string[]>([])
  const [phase, setPhase] = useState<'IDLE' | 'PLAYER' | 'DONE'>('IDLE')
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<string | null>(null)
  const [payout, setPayout] = useState(0)

  const act = async (action: string) => {
    setBusy(true)
    try {
      const res = await apiPost<BJResponse>(
        '/api/games/blackjack',
        action === 'start' ? { action, currency: activeCurrency, amount } : { action },
      )
      sound.play('card')
      if (res.playerCards) setPlayerCards(res.playerCards)
      if (res.dealerCards) setDealerCards(res.dealerCards)
      setPhase(res.outcome || res.phase === 'DONE' ? 'DONE' : 'PLAYER')
      if (res.outcome) {
        setOutcome(res.outcome)
        setPayout(res.payout || 0)
        const o = OUTCOME_TEXT[res.outcome]
        if (o) {
          if (res.multiplier && res.multiplier > 1) {
            sound.play(res.multiplier >= 2.4 ? 'bigwin' : 'win')
            toast.success(`${o.text} +${formatAmount(activeCurrency, res.payout || 0)} ${activeCurrency}`)
          } else if (res.multiplier === 1) {
            toast.info('Seri — taruhan dikembalikan')
          } else {
            sound.play('lose')
            toast.error(o.text)
          }
        }
      }
      refreshMe()
    } catch (e) {
      toast.error((e as Error).message)
      if ((e as Error).message.includes('tidak ada ronde')) {
        setPhase('IDLE')
        setPlayerCards([])
        setDealerCards([])
      }
    } finally {
      setBusy(false)
    }
  }

  const pv = handValue(playerCards)
  const showDealerHole = phase === 'DONE' || phase === 'IDLE'
  const oc = outcome ? OUTCOME_TEXT[outcome] : null

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
      {/* Meja */}
      <div
        className="relative flex min-h-[420px] flex-col overflow-hidden rounded-3xl border border-white/[0.08] p-6"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 0%, rgba(48,209,88,0.10), transparent 55%), linear-gradient(180deg, #0c1a10 0%, #070d09 100%)',
        }}
      >
        {/* busur meja halus */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#30d158]/[0.08]" />

        {/* Dealer */}
        <div className="flex flex-wrap items-start gap-2 sm:gap-4">
          <div className="rounded-xl bg-black/35 px-3 py-2 text-center backdrop-blur-sm">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">Dealer</div>
            <div className="font-mono text-[17px] font-semibold tabular-nums text-white">
              {dealerCards.length === 0 ? '—' : showDealerHole ? handValue(dealerCards) : handValue(dealerCards.slice(1)) + '+'}
            </div>
          </div>
          <div className="flex max-w-full flex-wrap gap-2">
            {dealerCards.map((c, i) => (
              <Card key={`${c}-${i}`} card={c} hidden={i === 0 && !showDealerHole} delay={i * 110} />
            ))}
          </div>
        </div>

        <div className="my-auto py-6 text-center">
          {oc ? (
            <div className={`float-in text-[28px] font-semibold tracking-[-0.02em] ${oc.cls}`}>{oc.text}</div>
          ) : phase === 'PLAYER' ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Giliranmu — Hit atau Stand
            </div>
          ) : (
            <div className="text-[13px] text-white/25">Pasang taruhan untuk memulai</div>
          )}
          {payout > 0 && phase === 'DONE' && (
            <div className="mt-2 font-mono text-[16px] font-semibold tabular-nums text-[#30d158]">
              +{formatAmount(activeCurrency, payout)} {activeCurrency}
            </div>
          )}
        </div>

        {/* Player */}
        <div className="flex items-end gap-4">
          <div className="rounded-xl bg-black/35 px-3 py-2 text-center backdrop-blur-sm">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">
              {user?.username || 'Kamu'}
            </div>
            <div className="font-mono text-[17px] font-semibold tabular-nums text-white">
              {playerCards.length ? pv : '—'}
            </div>
          </div>
          <div className="flex max-w-full flex-wrap gap-2">
            {playerCards.map((c, i) => (
              <Card key={`${c}-${i}`} card={c} delay={i * 110} />
            ))}
          </div>
        </div>
      </div>

      {/* Panel */}
      <div className="rounded-3xl border border-white/[0.08] bg-surface-2 p-5">
        {phase === 'PLAYER' ? (
          <div className="space-y-2.5">
            <div className="rounded-2xl border border-white/[0.07] bg-surface-3/50 p-3.5 text-center text-[13px]">
              <span className="text-[#86868b]">Taruhan:</span>{' '}
              <span className="font-mono font-semibold tabular-nums">
                {formatAmount(activeCurrency, amount)} {activeCurrency}
              </span>
            </div>
            <button onClick={() => act('hit')} disabled={busy} className="btn-primary h-12 w-full text-[15px]">
              Hit
            </button>
            <button
              onClick={() => act('stand')}
              disabled={busy}
              className="h-12 w-full rounded-[10px] border border-white/[0.12] bg-surface-3 text-[15px] font-semibold text-white transition hover:bg-surface-3/70 active:scale-[0.99] disabled:opacity-40"
            >
              Stand
            </button>
            <button
              onClick={() => act('double')}
              disabled={busy || playerCards.length !== 2}
              className="h-12 w-full rounded-[10px] border border-white/[0.12] bg-surface-3 text-[15px] font-semibold text-white transition hover:bg-surface-3/70 active:scale-[0.99] disabled:opacity-40"
            >
              Double
            </button>
          </div>
        ) : (
          <BetPanel amount={amount} setAmount={setAmount} currency={activeCurrency} onBet={() => act('start')} disabled={busy}>
            <p className="text-[11px] leading-relaxed text-[#6a6a73]">
              Blackjack membayar 3:2. Dealer wajib menarik sampai 17. Double diizinkan pada 2 kartu pertama.
            </p>
          </BetPanel>
        )}
        {phase === 'DONE' && (
          <button
            onClick={() => {
              setPhase('IDLE')
              setPlayerCards([])
              setDealerCards([])
              setOutcome(null)
              setPayout(0)
              sound.play('click')
            }}
            className="mt-3 h-10 w-full rounded-[10px] border border-white/[0.1] text-[13px] font-semibold text-[#9d9da6] transition hover:text-white"
          >
            Ronde Baru
          </button>
        )}
      </div>
    </div>
  )
}
