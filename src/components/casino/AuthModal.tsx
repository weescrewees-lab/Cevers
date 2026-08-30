'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useCasino } from '@/lib/store'
import { apiPost, apiGet } from '@/lib/apiClient'
import { sound } from '@/lib/sound'
import {
  saveBlobWithPassword,
  openBlobWithPassword,
  hasBlob,
  parseRecoveryCode,
  importRecovery,
} from '@/lib/permaSync'

type Mode = 'login' | 'register' | 'recover'

export function AuthModal() {
  const { authOpen, setAuthOpen, refreshMe } = useCasino()
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const resetFields = () => {
    setUsername('')
    setPassword('')
    setCode('')
  }

  const submit = async () => {
    const uname = username.trim()
    if (!uname || !password) {
      toast.error('Lengkapi nama pengguna & kata sandi')
      return
    }
    setBusy(true)
    try {
      try {
        await apiPost(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
          username: uname,
          password,
        })
      } catch (err) {
        const msg = (err as Error).message
        // PermaSync — akun hilang karena redeploy: pulihkan dari cadangan perangkat.
        if (mode === 'login' && hasBlob(uname)) {
          const snapshot = await openBlobWithPassword(uname, password)
          if (snapshot) {
            try {
              await apiPost('/api/sync/restore', { snapshot })
              await refreshMe()
              await saveBlobWithPassword(uname, password, snapshot)
              sound.play('levelup')
              toast.success(`Akun ${uname} dipulihkan dari cadangan perangkat ini`)
              setAuthOpen(false)
              resetFields()
              return
            } catch {
              // snapshot usang / ditolak server — lanjut ke pesan error normal
            }
          }
        }
        throw err
      }
      // Sukses — simpan/perbarui cadangan akun terenkripsi di perangkat.
      try {
        const { snapshot } = await apiGet<{ snapshot: unknown }>('/api/sync/snapshot')
        await saveBlobWithPassword(uname, password, snapshot)
      } catch {
        // cadangan opsional — jangan blokir login
      }
      sessionStorage.removeItem('cevers-manual-logout')
      await refreshMe()
      sound.play('levelup')
      toast.success(
        mode === 'login' ? `Selamat datang kembali, ${uname}!` : `Akun dibuat — selamat datang, ${uname}!`
      )
      setAuthOpen(false)
      resetFields()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const submitRecover = async () => {
    const raw = code.trim()
    if (!raw) {
      toast.error('Tempel kode pemulihan Anda terlebih dahulu')
      return
    }
    setBusy(true)
    try {
      const parsed = await parseRecoveryCode(raw)
      if (!parsed) {
        toast.error('Kode pemulihan tidak valid')
        return
      }
      await apiPost('/api/sync/restore', { snapshot: parsed.snapshot })
      await importRecovery(parsed)
      await refreshMe()
      sound.play('levelup')
      toast.success(`Akun ${parsed.username} dipulihkan dari kode pemulihan`)
      setAuthOpen(false)
      resetFields()
      setMode('login')
    } catch (e) {
      toast.error((e as Error).message || 'Pemulihan gagal. Periksa kode Anda.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={authOpen} onOpenChange={setAuthOpen}>
      <DialogContent className="max-w-sm rounded-3xl border-white/[0.1] bg-popover p-6 sm:rounded-3xl">
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-[19px] font-semibold tracking-[-0.02em]">
            {mode === 'login' ? 'Masuk ke CEVERS' : mode === 'register' ? 'Buat akun CEVERS' : 'Pulihkan Akun'}
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#86868b]">
            {mode === 'recover'
              ? 'Tempel kode pemulihan untuk mengembalikan akun di perangkat apa pun.'
              : 'Koin virtual — tanpa uang sungguhan.'}
          </DialogDescription>
        </DialogHeader>

        {mode !== 'recover' && (
          <>
            <div className="mb-1 grid grid-cols-2 rounded-full bg-surface-2 p-1">
              <button
                onClick={() => setMode('login')}
                className={`rounded-full py-2 text-[13px] font-semibold transition-all ${
                  mode === 'login' ? 'bg-white text-black' : 'text-[#9d9da6] hover:text-white'
                }`}
              >
                Masuk
              </button>
              <button
                onClick={() => setMode('register')}
                className={`rounded-full py-2 text-[13px] font-semibold transition-all ${
                  mode === 'register' ? 'bg-white text-black' : 'text-[#9d9da6] hover:text-white'
                }`}
              >
                Daftar
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#86868b]">
                  Nama Pengguna
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="mis. pemain_gacor"
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-surface-2 px-3.5 text-[14px] outline-none transition placeholder:text-[#5c5c66] focus:border-white/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#86868b]">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder={mode === 'register' ? 'min. 8 huruf & angka' : 'kata sandi Anda'}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-surface-2 px-3.5 text-[14px] outline-none transition placeholder:text-[#5c5c66] focus:border-white/30"
                />
              </div>
              <button onClick={submit} disabled={busy} className="btn-primary h-11 w-full text-[14px]">
                {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Buat Akun + 500 USDT'}
              </button>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <p className="flex items-center gap-1.5 text-[#6a6a73]">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" strokeLinejoin="round" />
                    <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Akun permanen — pulih otomatis di perangkat ini
                </p>
                <button
                  data-testid="open-recover"
                  onClick={() => {
                    resetFields()
                    setMode('recover')
                  }}
                  className="shrink-0 font-medium text-white/45 underline-offset-2 transition hover:text-white hover:underline"
                >
                  Pulihkan akun?
                </button>
              </div>
            </div>
          </>
        )}

        {mode === 'recover' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#86868b]">
                Kode Pemulihan
              </label>
              <textarea
                data-testid="recover-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CEVERS1-…"
                rows={5}
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-surface-2 p-3.5 text-[12px] leading-relaxed outline-none transition placeholder:text-[#5c5c66] focus:border-white/30"
              />
            </div>
            <button onClick={submitRecover} disabled={busy} className="btn-primary h-11 w-full text-[14px]">
              {busy ? 'Memulihkan…' : 'Pulihkan Akun'}
            </button>
            <p className="text-center text-[11px] leading-relaxed text-[#6a6a73]">
              Kode memulihkan akun di browser atau perangkat mana pun. Simpannya di tempat aman — jangan bagikan
              kepada siapa pun.
            </p>
            <button
              onClick={() => {
                resetFields()
                setMode('login')
              }}
              className="w-full text-center text-[12px] font-medium text-white/45 transition hover:text-white"
            >
              ← Kembali masuk
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
