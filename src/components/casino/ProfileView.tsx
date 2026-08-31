'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, Copy, Download, EyeOff, Camera, BadgeCheck, BadgeX } from 'lucide-react'
import { useCasino } from '@/lib/store'
import { apiGet } from '@/lib/apiClient'
import { CURRENCIES, formatAmount } from '@/lib/currencies'
import { vipOf, VIP_TIERS } from '@/lib/vip'
import { sound } from '@/lib/sound'
import { buildRecoveryCode } from '@/lib/permaSync'

interface BetRow {
  id: string
  game: string
  currency: string
  amount: number
  multiplier: number
  payout: number
  win: boolean
  createdAt: string
}

const gameNames: Record<string, string> = {
  dice: 'Dadu', mines: 'Ranjau', limbo: 'Limbo', plinko: 'Plinko', keno: 'Keno',
  blackjack: 'Blackjack', roulette: 'Roulette', slots: 'Slot',
}

export function ProfileView() {
  const { user, setAuthOpen, setRoute, favorites } = useCasino()
  const [bets, setBets] = useState<BetRow[]>([])
  const [filter, setFilter] = useState<'all' | 'win' | 'lose'>('all')
  const [recCode, setRecCode] = useState<string | null>(null)
  const [recBusy, setRecBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)

  const uploadAvatar = async (file: File) => {
    setAvatarBusy(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/profile/avatar', { method: 'POST', body, credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Upload gagal')
      await useCasino.getState().refreshMe()
      toast.success('Foto profil tersimpan aman')
    } catch (error) {
      toast.error((error as Error).message)
    } finally { setAvatarBusy(false) }
  }

  useEffect(() => {
    if (!user) return
    apiGet<{ bets: BetRow[] }>('/api/bets')
      .then((d) => setBets(d.bets))
      .catch(() => {})
  }, [user])

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-[17px] font-semibold">Masuk untuk melihat profil</p>
        <button onClick={() => setAuthOpen(true)} className="btn-primary h-10 px-5 text-[13.5px]">
          Masuk / Daftar
        </button>
      </div>
    )
  }

  const winRate = bets.length > 0 ? (bets.filter((b) => b.win).length / bets.length) * 100 : 0
  const vip = vipOf(user.totalWager)
  const filtered = filter === 'all' ? bets : bets.filter((b) => (filter === 'win' ? b.win : !b.win))

  const showRecoveryCode = async () => {
    setRecBusy(true)
    try {
      const c = await buildRecoveryCode(user.username)
      if (!c) {
        toast.error('Cadangan belum siap — buka satu halaman lagi lalu coba')
        return
      }
      setRecCode(c)
      sound.play('click')
    } finally {
      setRecBusy(false)
    }
  }

  const copyRecoveryCode = async () => {
    if (!recCode) return
    try {
      await navigator.clipboard.writeText(recCode)
      toast.success('Kode pemulihan disalin — simpan di tempat aman')
    } catch {
      toast.error('Gagal menyalin — salin manual dari kotak di bawah')
    }
  }

  const downloadRecoveryCode = () => {
    if (!recCode) return
    const blob = new Blob([recCode], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `noir-pemulihan-${user.username}.txt`
    a.click()
    URL.revokeObjectURL(url)
    sound.play('click')
    toast.success('Berkas pemulihan diunduh')
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-5">
      {/* Kartu profil */}
      <div className="hero-soft mb-6 rounded-3xl border border-white/[0.08] p-6 md:p-7">
        <div className="flex flex-wrap items-center gap-5">
          <label className="group relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white text-xl font-black uppercase text-black">
            {user.avatarPath ? <img src={user.avatarPath} alt="Foto profil" className="h-full w-full object-cover" /> : user.username.slice(0, 2)}
            <span className="absolute inset-0 hidden items-center justify-center bg-black/60 text-white group-hover:flex"><Camera className="h-4 w-4" /></span>
            <input type="file" accept="image/*" className="sr-only" disabled={avatarBusy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadAvatar(file) }} />
          </label>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="flex items-center gap-1.5 text-[24px] font-semibold tracking-[-0.025em]">{user.username}{user.verification === 'blue' ? <BadgeCheck className="h-5 w-5 text-sky-400" aria-label="Terverifikasi biru" /> : user.verification === 'red' ? <BadgeX className="h-5 w-5 text-rose-400" aria-label="Terverifikasi merah" /> : null}</h2>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: `${vip.tier.color}1c`, color: vip.tier.color }}>{vip.tier.name}</span>
              {user.username === 'cevs' && <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/15 px-2.5 py-1 text-[11px] font-bold text-sky-300"><BadgeCheck className="h-3.5 w-3.5" /> Blue verified</span>}
              {user.username === 'cevs' && <span className="inline-flex items-center gap-1 rounded-full bg-rose-400/15 px-2.5 py-1 text-[11px] font-bold text-rose-300"><BadgeX className="h-3.5 w-3.5" /> Red verified</span>}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-4 text-[13px]">
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-[#6a6a73]">Wager Total</div>
                <div className="font-semibold tabular-nums">${Math.round(user.totalWager).toLocaleString('id-ID')}</div>
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-[#6a6a73]">Total Taruhan</div>
                <div className="font-semibold tabular-nums">{user.totalBets.toLocaleString('id-ID')}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[10.5px] uppercase tracking-wider text-[#6a6a73]">
                  Win Rate <span className="hidden sm:inline">(50 terakhir)</span>
                </div>
                <div className="font-semibold tabular-nums text-[#30d158]">{winRate.toFixed(0)}%</div>
              </div>
            </div>
          </div>
          <button onClick={() => setRoute('wallet')} className="btn-primary h-10 px-5 text-[13.5px]">
            Dompet
          </button>
        </div>

        {/* Progres VIP */}
        {vip.next && (
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-[11px] font-medium text-[#86868b]">
              <span style={{ color: vip.tier.color }}>{vip.tier.name}</span>
              <span>
                ${Math.round(user.totalWager).toLocaleString('id-ID')} / $
                {vip.next.minWager.toLocaleString('id-ID')} menuju {vip.next.name}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.round(vip.progress * 100)}%`, backgroundColor: vip.tier.color }}
              />
            </div>
            {/* Peta tier */}
            <div className="mt-4 hidden gap-2 md:flex">
              {VIP_TIERS.map((t) => {
                const reached = user.totalWager >= t.minWager
                return (
                  <div
                    key={t.name}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-center transition ${
                      reached ? 'border-white/[0.14] bg-white/[0.05]' : 'border-white/[0.05] bg-transparent opacity-45'
                    }`}
                  >
                    <div className="text-[11px] font-bold" style={{ color: reached ? t.color : '#6a6a73' }}>
                      {t.name}
                    </div>
                    <div className="mt-0.5 text-[9.5px] text-[#6a6a73]">
                      ${t.minWager >= 1000 ? `${t.minWager / 1000}k` : t.minWager}+
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Keamanan — kode pemulihan */}
      <div className="mb-6">
        <h3 className="mb-3.5 text-[17px] font-semibold tracking-[-0.02em]">Keamanan</h3>
        <div className="rounded-2xl border border-white/[0.08] bg-surface p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                <KeyRound className="h-4.5 w-4.5 text-white/70" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold">Kode Pemulihan Akun</div>
                <p className="mt-0.5 max-w-md text-[12px] leading-relaxed text-[#86868b]">
                  Satu-satunya cara memulihkan akun di perangkat atau browser lain. Simpan di tempat aman — jangan
                  bagikan kepada siapa pun.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 max-sm:pl-[54px]">
              {!recCode ? (
                <button
                  onClick={showRecoveryCode}
                  disabled={recBusy}
                  className="btn-primary h-9 px-4 text-[12.5px] disabled:opacity-50"
                >
                  {recBusy ? 'Menyiapkan…' : 'Tampilkan Kode'}
                </button>
              ) : (
                <>
                  <button
                    onClick={copyRecoveryCode}
                    className="flex h-9 items-center gap-1.5 rounded-full border border-white/[0.12] px-4 text-[12.5px] font-medium transition hover:bg-white/[0.06]"
                  >
                    <Copy className="h-3.5 w-3.5" strokeWidth={1.8} /> Salin
                  </button>
                  <button
                    onClick={downloadRecoveryCode}
                    className="flex h-9 items-center gap-1.5 rounded-full border border-white/[0.12] px-4 text-[12.5px] font-medium transition hover:bg-white/[0.06]"
                  >
                    <Download className="h-3.5 w-3.5" strokeWidth={1.8} /> Unduh
                  </button>
                  <button
                    onClick={() => setRecCode(null)}
                    aria-label="Sembunyikan kode"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] text-white/50 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <EyeOff className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </button>
                </>
              )}
            </div>
          </div>
          {recCode && (
            <pre
              data-testid="recovery-code"
              className="mt-4 max-h-36 select-all overflow-y-auto whitespace-pre-wrap break-all rounded-xl border border-white/[0.08] bg-surface-2 p-3.5 text-[10.5px] leading-relaxed text-white/50"
            >
              {recCode}
            </pre>
          )}
        </div>
      </div>

      {/* Favorit */}
      {favorites.length > 0 && (
        <>
          <h3 className="mb-3.5 text-[17px] font-semibold tracking-[-0.02em]">Favorit</h3>
          <p className="mb-3 text-[12px] text-[#86868b]">Kelola favorit di lobi — {favorites.length} game ditandai.</p>
        </>
      )}

      {/* Riwayat taruhan */}
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="text-[17px] font-semibold tracking-[-0.02em]">Riwayat Taruhan</h3>
        <div className="flex gap-0.5 rounded-full bg-surface-2 p-1">
          {(['all', 'win', 'lose'] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f)
                sound.play('click')
              }}
              className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition ${
                filter === f ? 'bg-white text-black' : 'text-[#9d9da6] hover:text-white'
              }`}
            >
              {f === 'all' ? 'Semua' : f === 'win' ? 'Menang' : 'Kalah'}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead className="bg-surface-2 text-left text-[10.5px] uppercase tracking-wider text-[#6a6a73]">
            <tr>
              <th className="px-4 py-3 font-semibold">Permainan</th>
              <th className="px-4 py-3 font-semibold">Waktu</th>
              <th className="px-4 py-3 text-right font-semibold">Taruhan</th>
              <th className="px-4 py-3 text-right font-semibold">Multiplier</th>
              <th className="px-4 py-3 text-right font-semibold">Hasil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] bg-surface">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[12.5px] text-[#6a6a73]">
                  Belum ada taruhan — mulai main di lobi!
                </td>
              </tr>
            )}
            {filtered.map((b) => {
              const c = CURRENCIES[b.currency]
              return (
                <tr key={b.id} className="transition hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium">{gameNames[b.game] || b.game}</td>
                  <td className="px-4 py-3 text-[11.5px] text-[#6a6a73]">
                    {new Date(b.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums" style={{ color: c?.color }}>
                    {formatAmount(b.currency, b.amount)} {b.currency}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {b.multiplier > 0 ? `${b.multiplier.toFixed(2)}×` : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${b.win ? 'text-[#30d158]' : 'text-[#ff453a]'}`}>
                    {b.win ? `+${formatAmount(b.currency, b.payout)}` : `-${formatAmount(b.currency, b.amount)}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
