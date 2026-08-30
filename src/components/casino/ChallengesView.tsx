'use client'

import { useEffect, useState } from 'react'
import { Trophy, Gift } from 'lucide-react'
import { toast } from 'sonner'
import { useCasino } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/apiClient'
import { sound } from '@/lib/sound'

interface Challenge {
  id: string
  name: string
  desc: string
  targetUsd: number
  reward: number
  claimed: boolean
  progress: number
}

export function ChallengesView() {
  const { user, setAuthOpen, refreshMe } = useCasino()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [totalWager, setTotalWager] = useState(0)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const d = await apiGet<{ totalWager: number; challenges: Challenge[] }>('/api/challenges')
      setChallenges(d.challenges)
      setTotalWager(d.totalWager)
    } catch {
      /* belum login */
    }
  }

  useEffect(() => {
    if (user) load()
  }, [user])

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-[17px] font-semibold">Masuk untuk melihat tantangan</p>
        <button onClick={() => setAuthOpen(true)} className="btn-primary h-10 px-5 text-[13.5px]">
          Masuk / Daftar
        </button>
      </div>
    )
  }

  const claim = async (id: string) => {
    setBusy(true)
    try {
      const res = await apiPost<{ challenge: string; reward: number }>('/api/challenges', { challengeId: id })
      sound.play('levelup')
      toast.success(`${res.challenge} diklaim! +$${res.reward} dalam CEVERS`)
      await Promise.all([load(), refreshMe()])
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-5">
      <div className="mb-1 flex items-center gap-2.5">
        <Trophy className="h-5 w-5 text-[#ffd60a]" strokeWidth={2} />
        <h2 className="text-[26px] font-semibold tracking-[-0.025em]">Misi Harian</h2>
      </div>
      <p className="mb-6 text-[13.5px] text-[#9d9da6]">
        Total wager kamu:{' '}
        <span className="font-semibold text-white tabular-nums">
          ${Math.round(totalWager).toLocaleString('id-ID')}
        </span>{' '}
        — selesaikan misi untuk hadiah CEVERS. Progress dan klaim diproses aman di server.
      </p>

      <div className="space-y-3">
        {challenges.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-white/[0.08] bg-surface-2 p-5 transition hover:border-white/[0.14]"
          >
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-48 flex-1">
                <div className="flex items-center justify-between gap-2 text-[13.5px]">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-[11.5px] text-[#6a6a73]">{c.desc}</span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      c.claimed ? 'bg-[#30d158]' : 'bg-white'
                    }`}
                    style={{ width: `${Math.min(100, c.progress * 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-[#6a6a73]">
                  <span>
                    ${Math.round(Math.min(totalWager, c.targetUsd)).toLocaleString('id-ID')} / $
                    {c.targetUsd.toLocaleString('id-ID')}
                  </span>
                  <span>{Math.floor(c.progress * 100)}%</span>
                </div>
              </div>
              <button
                onClick={() => claim(c.id)}
                disabled={busy || c.claimed || c.progress < 1}
                className={`flex h-10 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold transition active:scale-[0.98] ${
                  c.claimed
                    ? 'bg-[#30d158]/12 text-[#30d158]'
                    : c.progress >= 1
                      ? 'btn-primary'
                      : 'bg-white/[0.06] text-[#6a6a73]'
                } disabled:cursor-not-allowed`}
              >
                <Gift className="h-4 w-4" />
                {c.claimed ? 'Diklaim' : c.progress >= 1 ? `Klaim $${c.reward}` : 'Terkunci'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
