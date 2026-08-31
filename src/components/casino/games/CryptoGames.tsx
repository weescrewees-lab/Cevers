'use client'

import { useState } from 'react'
import { apiPost } from '@/lib/apiClient'
import { useCasino } from '@/lib/store'
import { toast } from 'sonner'
import { BetPanel } from './GameView'
import { OpenSourceCryptoGame, type OpenGameKind } from './OpenSourceCryptoGames'

function OpenGame({ kind, endpoint, payload = {} }: { kind: OpenGameKind; endpoint: string; payload?: Record<string, unknown> }) {
  const { activeCurrency, refreshMe } = useCasino()
  const [amount, setAmount] = useState(1)
  const [busy, setBusy] = useState(false)
  const play = async () => {
    setBusy(true)
    try {
      await apiPost(endpoint, { currency: activeCurrency, amount, ...payload })
      await refreshMe()
      toast.success(`${kind} round settled`)
    } catch (error) { toast.error((error as Error).message) } finally { setBusy(false) }
  }
  return <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_320px]">
    <div className="min-w-0 rounded-3xl border border-white/10 bg-[#101012] p-3 sm:p-5"><OpenSourceCryptoGame kind={kind} onAction={() => void play()} /></div>
    <BetPanel amount={amount} setAmount={setAmount} currency={activeCurrency} onBet={() => void play()} disabled={busy} betButtonText={busy ? 'Settling...' : 'Play round'}>
      <p className="text-xs leading-5 text-white/55">Open-source arcade source: Phaser Labs examples, MIT licensed. CEVERS only connects the wager and fairness settlement.</p>
    </BetPanel>
  </div>
}

export function BtcCrashGame() { return <OpenGame kind="crash" endpoint="/api/games/limbo" payload={{ target: 2 }} /> }
export function HashRunGame() { return <OpenGame kind="hash" endpoint="/api/games/plinko" payload={{ risk: 'medium' }} /> }
export function SatoshiGridGame() { return <OpenGame kind="grid" endpoint="/api/games/keno" payload={{ picks: [1, 2, 3] }} /> }
