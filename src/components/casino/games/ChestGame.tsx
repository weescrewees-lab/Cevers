'use client'

import { useState } from 'react'
import { PackageOpen, LockKeyhole, ShieldCheck } from 'lucide-react'
import { BetPanel } from './GameView'
import { useCasino } from '@/lib/store'
import { apiPost } from '@/lib/apiClient'
import { toast } from 'sonner'

export function ChestGame() {
  const { refreshMe } = useCasino()
  const activeCurrency = 'BTC'
  const [amount, setAmount] = useState(10)
  const [busy, setBusy] = useState(false)
  const [opened, setOpened] = useState(false)
  const open = async () => {
    setBusy(true)
    try {
      const result = await apiPost<{ payout?: number; multiplier: number; win?: boolean }>('/api/games/chest', { currency: activeCurrency, amount })
      setOpened(true)
      await refreshMe()
      toast.success(`Chest terbuka · ${result.multiplier.toFixed(2)}x`)
    } catch (error) { toast.error((error as Error).message) } finally { setBusy(false) }
  }
  return <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-surface p-8 text-center">
      <div className={`mb-6 flex size-32 items-center justify-center rounded-[2rem] border ${opened ? 'border-amber-300/70 bg-amber-300/10' : 'border-white/10 bg-white/[0.04]'}`}><PackageOpen className="size-16 text-amber-300" strokeWidth={1.2} /></div>
      <h2 className="text-xl font-semibold">Vault Chest</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Satu peti, satu hasil dari engine server. Hasil payout ditampilkan setelah transaksi berhasil.</p>
      <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-4" /> Provably fair <ShieldCheck className="ml-2 size-4 text-[#30d158]" /> Secure</div>{opened && <div className="mt-4 rounded-2xl bg-white px-4 py-3 font-mono text-sm text-black">Chest terbuka — hasil sudah dikreditkan</div>}
    </div>
    <BetPanel amount={amount} setAmount={setAmount} currency={activeCurrency} onBet={open} disabled={busy} betButtonText="Buka Chest" extraHint="Peluang dan payout dihitung engine server." />
  </div>
}
