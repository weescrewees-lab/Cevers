'use client'

import { useCasino } from '@/lib/store'
import { sound } from '@/lib/sound'

/**
 * Footer minimal — satu baris tenang: identitas, status koin virtual,
 * dan akses ulang preferensi cookie. Tanpa sponsor, tanpa badge.
 */
export function SiteFooter() {
  const setCookiePrefsOpen = useCasino((s) => s.setCookiePrefsOpen)

  return (
    <footer className="hairline-t mt-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-5 py-5 text-center sm:flex-row sm:justify-between sm:gap-4 sm:px-6 sm:text-left">
        <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-2.5">
          <span className="text-[12.5px] font-black tracking-[-0.02em] text-white/85">CEVERS</span>
          <span className="hidden h-3 w-px bg-white/15 sm:block" />
          <span className="text-[10.5px] leading-relaxed text-white/30">
            © 2026 — Hiburan sosial berbasis koin virtual
          </span>
        </div>

        <button
          data-testid="footer-cookie"
          onClick={() => {
            sound.play('click')
            setCookiePrefsOpen(true)
          }}
          className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] text-white/25 transition hover:bg-white/[0.04] hover:text-white/60"
        >
          Kelola Cookie
        </button>
      </div>
    </footer>
  )
}
