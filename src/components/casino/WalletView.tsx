'use client'

import { useEffect, useState } from 'react'
import { Droplets, ArrowLeftRight, History, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useCasino } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/apiClient'
import { CURRENCIES, CURRENCY_LIST, FAUCET_AMOUNTS, formatAmount } from '@/lib/currencies'
import { vipOf } from '@/lib/vip'
import { sound } from '@/lib/sound'

interface Tx {
  id: string
  type: string
  currency: string
  amount: number
  meta: string | null
  createdAt: string
}

const TYPE_LABEL: Record<string, string> = {
  FAUCET: 'Bonus Satu Kali',
  BONUS: 'Bonus',
  SWAP: 'Swap',
  CHALLENGE: 'Tantangan',
}

export function WalletView() {
  const { user, refreshMe, setAuthOpen } = useCasino()
  const [wallets, setWallets] = useState<{ currency: string; balance: number; usdValue: number }[]>([])
  const [txs, setTxs] = useState<Tx[]>([])
  const [busy, setBusy] = useState(false)
  const [swapFrom, setSwapFrom] = useState('USDT')
  const [swapTo, setSwapTo] = useState('NOIR')
  const [swapAmount, setSwapAmount] = useState(10)
  const [tradeUsername, setTradeUsername] = useState('')
  const [tradeAmount, setTradeAmount] = useState(0)
  const [tradeCurrency, setTradeCurrency] = useState('USDT')

  const load = async () => {
    try {
      const d = await apiGet<{ wallets: typeof wallets; transactions: Tx[] }>('/api/wallet')
      setWallets(d.wallets)
      setTxs(d.transactions)
    } catch {
      /* belum login */
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-[17px] font-semibold">Masuk untuk mengakses dompet</p>
        <button onClick={() => setAuthOpen(true)} className="btn-primary h-10 px-5 text-[13.5px]">
          Masuk / Daftar
        </button>
      </div>
    )
  }

  const vip = vipOf(user.totalWager)
  const hasClaimedWelcome = txs.some((tx) => tx.type === 'FAUCET')
  const hasLuckyAsset = txs.some((tx) => tx.type === 'ASSET')

  const claim = async () => {
    setBusy(true)
    try {
      const res = await apiPost<{ currency: string; amount: number }>('/api/wallet/faucet', { currency: 'USDT' })
      sound.play('cashout')
      toast.success(`+${res.amount} ${res.currency} diklaim!`)
      await refreshMe()
      await load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const trade = async () => {
    setBusy(true)
    try {
      await apiPost('/api/trade', { username: tradeUsername, currency: tradeCurrency, amount: tradeAmount, idempotencyKey: crypto.randomUUID() })
      toast.success(`Trade ${tradeCurrency} berhasil dikirim`)
      setTradeUsername('')
      setTradeAmount(0)
      await refreshMe()
      await load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const swap = async () => {
    setBusy(true)
    try {
      const res = await apiPost<{ receive: number; currency: string }>('/api/wallet/swap', {
        from: swapFrom,
        to: swapTo,
        amount: swapAmount,
      })
      sound.play('cashout')
      toast.success(`Swap sukses: +${res.receive} ${res.currency}`)
      await refreshMe()
      await load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const totalUsd = wallets.reduce((a, w) => a + w.usdValue, 0)

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-5">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-semibold tracking-[-0.025em]">Dompet</h2>
          <p className="mt-0.5 text-[13px] text-[#9d9da6]">
            Total nilai portofolio:{' '}
            <span className="font-semibold text-[#30d158]">
              ${totalUsd.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
            </span>{' '}
            · Level <span style={{ color: vip.tier.color }}>{vip.tier.name}</span>
            {vip.faucetBonus > 1 && (
              <span className="ml-1 rounded-full bg-white/[0.07] px-2 py-0.5 text-[10.5px] font-semibold text-white/80">
                faucet ×{vip.faucetBonus}
              </span>
            )}
          </p>
        </div>
        {!hasClaimedWelcome && (
          <button onClick={claim} disabled={busy} className="btn-primary h-11 gap-2 px-5 text-[13.5px]">
            <Droplets className="h-4 w-4" />
            {busy ? 'Memproses...' : `Klaim bonus satu kali ${FAUCET_AMOUNTS.USDT} USDT`}
          </button>
        )}
      </div>

      {/* Kartu saldo */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {wallets.map((w) => {
          const c = CURRENCIES[w.currency]
          if (!c) return null
          return (
            <div
              key={w.currency}
              className="rounded-2xl border border-white/[0.08] bg-surface-2 p-4 transition hover:border-white/[0.16]"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold"
                  style={{ backgroundColor: `${c.color}1f`, color: c.color }}
                >
                  {c.symbol}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">{w.currency}</div>
                  <div className="truncate text-[10px] text-[#6a6a73]">{c.name}</div>
                </div>
              </div>
              <div className="mt-3 font-mono text-[17px] font-semibold tabular-nums">
                {formatAmount(w.currency, w.balance)}
              </div>
              <div className="text-[11px] tabular-nums text-[#6a6a73]">
                ${w.usdValue.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-3xl border border-[#7C5CFC]/25 bg-[#7C5CFC]/[0.07] p-5">
        <div><div className="flex items-center gap-2 text-[13.5px] font-semibold"><Sparkles className="h-4 w-4 text-[#7C5CFC]" /> CEVERS Lucky Asset</div><p className="mt-1 text-[12px] text-[#a9a2c9]">Asset premium seharga 750 USDT. Aktif permanen dan memberi bonus peluang kecil yang tetap dihitung dari seed fair server.</p></div>
        {hasLuckyAsset ? <span className="rounded-full bg-[#30d158]/15 px-3 py-1.5 text-[11px] font-semibold text-[#30d158]">Aktif</span> : <button onClick={async () => { setBusy(true); try { await apiPost('/api/wallet/luck', {}); toast.success('Lucky Asset aktif'); await refreshMe(); await load() } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) } }} disabled={busy} className="btn-primary shrink-0 px-4 text-[12px]">Beli 750 USDT</button>}
      </div>

      {/* Trade antar player */}
      <div className="mt-5 rounded-3xl border border-white/[0.08] bg-surface-2 p-5">
        <div className="mb-1 flex items-center gap-2 text-[13.5px] font-semibold">Trade antar player asli</div>
        <p className="mb-4 text-[12px] text-[#86868b]">Transfer langsung, tervalidasi server, dan tercatat aman di Neon.</p>
        <div className="grid gap-3 md:grid-cols-[1.4fr_0.7fr_0.8fr_auto] md:items-end">
          <label className="text-[10.5px] font-medium uppercase tracking-wider text-[#86868b]">Username penerima<input value={tradeUsername} onChange={(e) => setTradeUsername(e.target.value)} placeholder="username player" className="mt-1.5 h-11 w-full rounded-xl border border-white/[0.08] bg-surface-3 px-3 text-[13px] outline-none focus:border-white/30" /></label>
          <label className="text-[10.5px] font-medium uppercase tracking-wider text-[#86868b]">Koin<select value={tradeCurrency} onChange={(e) => setTradeCurrency(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-white/[0.08] bg-surface-3 px-3 text-[13px] font-semibold outline-none">{CURRENCY_LIST.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="text-[10.5px] font-medium uppercase tracking-wider text-[#86868b]">Jumlah<input type="number" min="0" step="any" value={tradeAmount || ''} onChange={(e) => setTradeAmount(Number(e.target.value) || 0)} className="mt-1.5 h-11 w-full rounded-xl border border-white/[0.08] bg-surface-3 px-3 font-mono text-[13px] outline-none focus:border-white/30" /></label>
          <button onClick={trade} disabled={busy || !tradeUsername || tradeAmount <= 0} className="btn-primary h-11 px-5 text-[13px]">Kirim trade</button>
        </div>
      </div>

      {/* Swap + transaksi */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/[0.08] bg-surface-2 p-5">
          <div className="mb-4 flex items-center gap-2 text-[13.5px] font-semibold">
            <ArrowLeftRight className="h-4 w-4 text-white/70" /> Konversi Koin <span className="text-[11px] font-normal text-[#6a6a73]">fee 0.5%</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div>
              <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wider text-[#86868b]">Dari</label>
              <select
                value={swapFrom}
                onChange={(e) => setSwapFrom(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-surface-3 px-3 text-[13px] font-semibold outline-none"
              >
                {CURRENCY_LIST.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step="any"
                value={swapAmount}
                onChange={(e) => setSwapAmount(parseFloat(e.target.value) || 0)}
                className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-surface-3 px-3.5 font-mono text-[13.5px] tabular-nums outline-none transition focus:border-white/30"
              />
            </div>
            <button
              onClick={() => {
                setSwapFrom(swapTo)
                setSwapTo(swapFrom)
                sound.play('click')
              }}
              className="mb-1 rounded-full border border-white/[0.08] bg-surface-3 p-2.5 text-[#9d9da6] transition hover:text-white"
              aria-label="Tukar arah"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
            <div>
              <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wider text-[#86868b]">Ke</label>
              <select
                value={swapTo}
                onChange={(e) => setSwapTo(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-surface-3 px-3 text-[13px] font-semibold outline-none"
              >
                {CURRENCY_LIST.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex h-11 items-center rounded-xl border border-white/[0.08] bg-surface-3 px-3.5 font-mono text-[13.5px] font-semibold text-[#30d158] tabular-nums">
                ≈{' '}
                {formatAmount(
                  swapTo,
                  (swapAmount * (CURRENCIES[swapFrom]?.usdRate ?? 0) * 0.995) / (CURRENCIES[swapTo]?.usdRate ?? 1),
                )}{' '}
                {swapTo}
              </div>
            </div>
          </div>
          <button
            onClick={swap}
            disabled={busy || swapAmount <= 0 || swapFrom === swapTo}
            className="btn-primary mt-4 h-11 w-full text-[14px]"
          >
            Konversi
          </button>
        </div>

        {/* Transaksi */}
        <div className="rounded-3xl border border-white/[0.08] bg-surface-2 p-5">
          <div className="mb-4 flex items-center gap-2 text-[13.5px] font-semibold">
            <History className="h-4 w-4 text-white/70" /> Transaksi Terakhir
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {txs.length === 0 && (
              <div className="py-8 text-center text-[12px] text-[#6a6a73]">Belum ada transaksi</div>
            )}
            {txs.map((t) => {
              const c = CURRENCIES[t.currency]
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.04]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[9.5px] font-bold uppercase text-white/70">
                    {TYPE_LABEL[t.type]?.slice(0, 2) || t.type.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold">{TYPE_LABEL[t.type] || t.type}</div>
                    <div className="truncate text-[10.5px] text-[#6a6a73]">{t.meta}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[12.5px] font-semibold tabular-nums" style={{ color: c?.color }}>
                      +{formatAmount(t.currency, t.amount)}
                    </div>
                    <div className="text-[10px] text-[#6a6a73]">
                      {new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
