'use client'

import { useState } from 'react'
import { Cookie, ShieldCheck, BarChart3, Megaphone, Lock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useCasino } from '@/lib/store'
import { sound } from '@/lib/sound'

/**
 * Banner persetujuan cookie + modal preferensi.
 * Pilihan benar-benar disimpan sebagai cookie `shf_consent` (lihat lib/consent.ts)
 * dan tidak akan ditanyakan ulang sampai kedaluwarsa.
 */

function PrefRow({
  icon: Icon,
  title,
  desc,
  locked,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  desc: string
  locked?: boolean
  checked?: boolean
  onChange?: (v: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-surface-2 p-4">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
        <Icon className="h-4 w-4 text-white/70" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold tracking-[-0.01em]">{title}</div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#86868b]">{desc}</p>
      </div>
      {locked ? (
        <span className="mt-1 flex items-center gap-1 rounded-full bg-white/[0.07] px-2.5 py-1 text-[10.5px] font-semibold text-white/60">
          <Lock className="h-3 w-3" /> Wajib
        </span>
      ) : (
        <Switch checked={!!checked} onCheckedChange={onChange} className="mt-1" />
      )}
    </div>
  )
}

export function CookiePrefsDialog() {
  const { cookiePrefsOpen, setCookiePrefsOpen, saveConsent } = useCasino()
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  const open = cookiePrefsOpen
  // Sinkronkan switch dengan preferensi tersimpan setiap kali dialog dibuka.
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    const c = useCasino.getState().consent
    setAnalytics(!!c?.analytics)
    setMarketing(!!c?.marketing)
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => setCookiePrefsOpen(v)}>
      <DialogContent className="max-w-md rounded-3xl border-white/[0.1] bg-popover p-6 sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-semibold tracking-[-0.02em]">
            Preferensi Cookie
          </DialogTitle>
          <DialogDescription className="text-[12.5px] leading-relaxed text-[#86868b]">
            Kelola bagaimana situs ini boleh menyimpan informasi di perangkat Anda. Pilihan
            disimpan dalam cookie <span className="font-mono text-white/70">shf_consent</span>{' '}
            selama 12 bulan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          <PrefRow
            icon={ShieldCheck}
            title="Cookie Wajib"
            desc="Menjaga Anda tetap masuk (shf_session) dan mengingat persetujuan ini. Tanpa ini situs tidak dapat berfungsi."
            locked
          />
          <PrefRow
            icon={BarChart3}
            title="Statistik"
            desc="Mengukur kunjungan halaman secara agregat untuk memperbaiki pengalaman. Tanpa pelacak pihak ketiga."
            checked={analytics}
            onChange={(v) => {
              setAnalytics(v)
              sound.play('click')
            }}
          />
          <PrefRow
            icon={Megaphone}
            title="Pemasaran"
            desc="Mengizinkan pengukuran efektivitas kampanye promo di dalam situs ini saja."
            checked={marketing}
            onChange={(v) => {
              setMarketing(v)
              sound.play('click')
            }}
          />
        </div>

        <div className="mt-4 flex gap-2.5">
          <button
            onClick={() => {
              sound.play('click')
              saveConsent({ analytics, marketing })
            }}
            className="btn-primary h-10 flex-1 text-[13.5px]"
          >
            Simpan Pilihan
          </button>
          <button
            onClick={() => {
              sound.play('click')
              saveConsent({ analytics: true, marketing: true })
            }}
            className="h-10 flex-1 rounded-full border border-white/[0.12] text-[13.5px] font-semibold text-white transition hover:bg-white/[0.06]"
          >
            Terima Semua
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CookieBanner() {
  const { cookieBanner, acceptCookies, rejectCookies, setCookiePrefsOpen } = useCasino()
  if (!cookieBanner) return null

  return (
    <div className="float-in fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-3xl border border-white/[0.1] bg-[#121214]/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl md:bottom-5">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.07]">
          <Cookie className="h-5 w-5 text-[#ffd60a]" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold tracking-[-0.01em]">Kami menghargai privasi Anda</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#9d9da6]">
            Situs ini menggunakan cookie wajib untuk menjaga sesi Anda tetap masuk, serta cookie
            opsional untuk statistik &amp; pemasaran. Pilihan Anda disimpan selama 12 bulan dan
            dapat diubah kapan pun dari tautan <button data-testid="cookie-inline-manage" onClick={() => { sound.play('click'); setCookiePrefsOpen(true) }} className="underline decoration-white/30 underline-offset-2 transition hover:text-white">Kelola Cookie</button> di bagian bawah halaman.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          data-testid="cookie-accept"
          onClick={() => {
            sound.play('click')
            acceptCookies()
          }}
          className="btn-primary h-10 flex-1 text-[13px]"
        >
          Terima Semua
        </button>
        <button
          data-testid="cookie-reject"
          onClick={() => {
            sound.play('click')
            rejectCookies()
          }}
          className="h-10 flex-1 rounded-full border border-white/[0.12] text-[13px] font-semibold text-white transition hover:bg-white/[0.06]"
        >
          Hanya Wajib
        </button>
        <button
          data-testid="cookie-customize"
          onClick={() => {
            sound.play('click')
            setCookiePrefsOpen(true)
          }}
          className="h-10 flex-1 rounded-full text-[13px] font-semibold text-[#9d9da6] transition hover:text-white"
        >
          Sesuaikan…
        </button>
      </div>
    </div>
  )
}
