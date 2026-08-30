'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ShieldCheck, RefreshCw, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useCasino } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/apiClient'
import { sound } from '@/lib/sound'

interface FairInfo {
  serverSeedHashed: string
  clientSeed: string
  nonce: number
}

export function FairnessModal() {
  const { fairnessOpen, setFairnessOpen, user } = useCasino()
  const [info, setInfo] = useState<FairInfo | null>(null)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [clientSeedInput, setClientSeedInput] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const d = await apiGet<FairInfo>('/api/fair')
      setInfo(d)
      setClientSeedInput(d.clientSeed)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const rotate = async () => {
    setBusy(true)
    try {
      const d = await apiPost<FairInfo & { revealedSeed: string }>('/api/fair', {
        clientSeed: clientSeedInput || undefined,
      })
      setRevealed(d.revealedSeed)
      setInfo(d)
      await useCasino.getState().refreshMe()
      sound.play('click')
      toast.success('Seed dirotasi — seed lama dibuka')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (user && fairnessOpen && !info && !busy) load()
  }, [user, fairnessOpen])

  return (
    <Dialog open={fairnessOpen} onOpenChange={setFairnessOpen}>
      <DialogContent className="max-w-lg rounded-3xl border-white/[0.1] bg-popover p-6 sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]">
            <ShieldCheck className="h-5 w-5 text-[#30d158]" strokeWidth={2} /> Provably Fair
          </DialogTitle>
          <DialogDescription className="text-[12.5px] leading-relaxed text-[#9d9da6]">
            Setiap hasil dihitung dari{' '}
            <code className="rounded-md border border-white/[0.08] bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-white">
              HMAC_SHA256(serverSeed, clientSeed:nonce:cursor)
            </code>
            . Hash server seed ditampilkan sebelum bertaruh; setelah rotasi, seed asli dibuka agar kamu bisa
            memverifikasi semua taruhan.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <p className="py-6 text-center text-[13px] text-[#86868b]">Masuk untuk melihat seed kamu.</p>
        ) : !info ? (
          <div className="flex justify-center py-8">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/15 border-t-white" />
          </div>
        ) : (
          <div className="space-y-3.5">
            <Field label="Server Seed (Hash SHA-256)" value={info.serverSeedHashed} mono />
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#86868b]">
                Client Seed (bisa diganti)
              </label>
              <div className="flex gap-2">
                <input
                  value={clientSeedInput}
                  onChange={(e) => setClientSeedInput(e.target.value)}
                  className="h-10 flex-1 rounded-xl border border-white/[0.08] bg-surface-2 px-3.5 font-mono text-xs outline-none transition focus:border-white/30"
                />
                <button
                  onClick={rotate}
                  disabled={busy}
                  className="flex h-10 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[12.5px] font-semibold text-black transition hover:bg-white/90 active:scale-[0.98] disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Rotasi
                </button>
              </div>
            </div>
            <Field label="Nonce berikutnya" value={String(info.nonce)} mono />
            {revealed && (
              <div className="rounded-2xl border border-[#30d158]/30 bg-[#30d158]/[0.07] p-3.5">
                <div className="mb-1 text-[11.5px] font-semibold text-[#30d158]">Server Seed Lama (terbuka)</div>
                <div className="break-all font-mono text-[10px] text-[#9fe8b8]">{revealed}</div>
              </div>
            )}
            <p className="text-[11.5px] leading-relaxed text-[#86868b]">
              Nonce bertambah 1 setiap taruhan sehingga hasil tidak bisa diprediksi maupun diulang.
              Rotasi seed mengembalikan nonce ke 0 dan membuka seed lama.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#86868b]">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-surface-2 px-3.5 py-2.5">
        <span className={`min-w-0 flex-1 break-all text-xs ${mono ? 'font-mono text-white/85' : 'font-semibold'}`}>
          {value}
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value)
            sound.play('click')
            toast.success('Disalin')
          }}
          className="text-[#6a6a73] transition hover:text-white"
          aria-label="Salin"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
