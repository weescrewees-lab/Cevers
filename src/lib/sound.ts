'use client'

/**
 * Sound engine ringan berbasis WebAudio — tanpa aset audio eksternal.
 * Semua efek disintesis (oscillator + noise) agar instan & ukurannya kecil.
 */

type SoundName =
  | 'click'
  | 'tick'
  | 'bet'
  | 'win'
  | 'bigwin'
  | 'lose'
  | 'card'
  | 'chip'
  | 'reveal'
  | 'boom'
  | 'cashout'
  | 'spin'
  | 'levelup'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = true

if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('shf_sound')
  if (saved !== null) enabled = saved === '1'
}

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = 0.5
      master.connect(ctx.destination)
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {},
) {
  const c = ensureCtx()
  if (!c || !master) return
  const t0 = c.currentTime + (opts.delay ?? 0)
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(freq, t0)
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t0 + dur)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(opts.gain ?? 0.18, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

function noise(dur: number, opts: { gain?: number; delay?: number; freq?: number; q?: number } = {}) {
  const c = ensureCtx()
  if (!c || !master) return
  const t0 = c.currentTime + (opts.delay ?? 0)
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = opts.freq ?? 2200
  filter.Q.value = opts.q ?? 0.8
  const g = c.createGain()
  g.gain.setValueAtTime(opts.gain ?? 0.1, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filter)
  filter.connect(g)
  g.connect(master)
  src.start(t0)
}

export const sound = {
  isEnabled: () => enabled,
  setEnabled(v: boolean) {
    enabled = v
    if (typeof window !== 'undefined') localStorage.setItem('shf_sound', v ? '1' : '0')
  },
  play(name: SoundName) {
    if (!enabled) return
    switch (name) {
      case 'click':
        tone(1800, 0.05, { type: 'triangle', gain: 0.06 })
        break
      case 'tick':
        tone(1200, 0.03, { type: 'square', gain: 0.03 })
        break
      case 'bet':
        tone(520, 0.08, { type: 'triangle', gain: 0.1 })
        tone(780, 0.1, { type: 'triangle', gain: 0.08, delay: 0.05 })
        break
      case 'win':
        tone(660, 0.12, { gain: 0.12 })
        tone(830, 0.12, { gain: 0.12, delay: 0.09 })
        tone(990, 0.2, { gain: 0.14, delay: 0.18 })
        break
      case 'bigwin':
        tone(523, 0.14, { gain: 0.14 })
        tone(659, 0.14, { gain: 0.14, delay: 0.1 })
        tone(784, 0.14, { gain: 0.14, delay: 0.2 })
        tone(1047, 0.3, { gain: 0.16, delay: 0.3 })
        tone(1319, 0.4, { gain: 0.12, delay: 0.42 })
        break
      case 'lose':
        tone(220, 0.22, { type: 'sine', gain: 0.1, slideTo: 110 })
        break
      case 'card':
        noise(0.08, { gain: 0.14, freq: 3200, q: 1.2 })
        break
      case 'chip':
        tone(2600, 0.04, { type: 'triangle', gain: 0.07 })
        noise(0.04, { gain: 0.05, freq: 5000 })
        break
      case 'reveal':
        tone(880, 0.1, { type: 'triangle', gain: 0.09 })
        tone(1320, 0.12, { type: 'triangle', gain: 0.07, delay: 0.06 })
        break
      case 'boom':
        noise(0.4, { gain: 0.22, freq: 180, q: 0.5 })
        tone(90, 0.35, { type: 'sawtooth', gain: 0.12, slideTo: 40 })
        break
      case 'cashout':
        tone(784, 0.1, { gain: 0.12 })
        tone(1047, 0.1, { gain: 0.12, delay: 0.08 })
        tone(1319, 0.22, { gain: 0.14, delay: 0.16 })
        break
      case 'spin':
        noise(0.5, { gain: 0.06, freq: 1400, q: 0.4 })
        break
      case 'levelup':
        tone(440, 0.12, { gain: 0.12 })
        tone(554, 0.12, { gain: 0.12, delay: 0.1 })
        tone(659, 0.12, { gain: 0.12, delay: 0.2 })
        tone(880, 0.35, { gain: 0.15, delay: 0.3 })
        break
    }
  },
}
