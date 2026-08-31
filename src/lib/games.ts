import { CURRENCIES, usdValue } from '@/lib/currencies'

export const HOUSE_EDGE = 0.99 // faktor RTP 99%

export interface BetResult {
  multiplier: number
  win: boolean
  state: Record<string, unknown>
}

type RNG = () => number

// ============ CHEST ============
export function playChest(rng: RNG): BetResult {
  const roll = rng()
  const tier = roll < 0.58 ? 'empty' : roll < 0.84 ? 'silver' : roll < 0.97 ? 'gold' : 'vault'
  const multiplier = tier === 'empty' ? 0 : tier === 'silver' ? 1.35 : tier === 'gold' ? 2.4 : 8
  return { multiplier, win: multiplier > 0, state: { tier, roll } }
}

// ============ DICE ============
export function playDice(rng: RNG, target: number, direction: 'over' | 'under'): BetResult {
  const roll = Math.floor(rng() * 10001) / 100 // 0.00 - 100.00
  const chance = direction === 'over' ? 100 - target : target
  const win = direction === 'over' ? roll > target : roll < target
  const multiplier = win ? (HOUSE_EDGE * 100) / chance : 0
  return { multiplier, win, state: { roll, target, direction, chance } }
}

// ============ LIMBO ============
export function playLimbo(rng: RNG, target: number): BetResult {
  const crash = Math.max(1, Math.floor((HOUSE_EDGE * 1e8) / (rng() * 1e8 + 1)) / 1e6)
  const win = crash >= target
  return { multiplier: win ? target : 0, win, state: { crash, target } }
}

// ============ MINES ============
export function generateMineSpots(rng: RNG, mines: number): number[] {
  const spots = new Set<number>()
  while (spots.size < mines) spots.add(Math.floor(rng() * 25))
  return [...spots].sort((a, b) => a - b)
}

function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return r
}

export function minesMultiplier(mines: number, revealed: number): number {
  if (revealed === 0) return 0
  const safe = 25 - mines
  return HOUSE_EDGE * (combinations(25, revealed) / combinations(safe, revealed))
}

// ============ PLINKO ============
export const PLINKO_ROWS = 16
export const PLINKO_MULTIPLIERS: Record<'low' | 'medium' | 'high', number[]> = {
  low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
}

export function playPlinko(rng: RNG, risk: 'low' | 'medium' | 'high'): BetResult {
  const path: number[] = []
  for (let i = 0; i < PLINKO_ROWS; i++) path.push(rng() < 0.5 ? 0 : 1)
  const bucket = path.reduce((a, b) => a + b, 0)
  const multiplier = PLINKO_MULTIPLIERS[risk][bucket]
  return { multiplier, win: multiplier >= 1, state: { path, bucket, risk } }
}

// ============ KENO ============
export const KENO_SIZE = 40
export const KENO_DRAWS = 10

export const KENO_PAYTABLE: Record<number, number[]> = {
  // picks: [hits0, hits1, ... hitsN]
  1: [0, 3.8],
  2: [0, 1.7, 5.2],
  3: [0, 1.0, 2.6, 22],
  4: [0, 0, 2.0, 6.5, 50],
  5: [0, 0, 1.5, 3, 12, 180],
  6: [0, 0, 1.1, 2, 6.5, 40, 400],
  7: [0, 0, 1.1, 1.6, 4, 15, 120, 900],
  8: [0, 0, 1.1, 1.4, 2.6, 7, 40, 300, 1500],
  9: [0, 0, 1.1, 1.3, 1.8, 4, 15, 90, 500, 2500],
  10: [0, 0, 1.1, 1.2, 1.5, 2.5, 6, 22, 120, 700, 3000],
}

export function playKeno(rng: RNG, picks: number[]): BetResult {
  const pool = Array.from({ length: KENO_SIZE }, (_, i) => i)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const drawn = pool.slice(0, KENO_DRAWS).sort((a, b) => a - b)
  const hits = picks.filter((p) => drawn.includes(p)).length
  const table = KENO_PAYTABLE[picks.length]
  const multiplier = table ? table[hits] : 0
  return { multiplier, win: multiplier >= 1, state: { drawn, hits, picks } }
}

// ============ ROULETTE (Eropa: 0-36) ============
export const ROULETTE_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

export interface RouletteBet {
  type: 'straight' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'dozen1' | 'dozen2' | 'dozen3'
  number?: number
}

export const ROULETTE_PAYOUTS: Record<RouletteBet['type'], number> = {
  straight: 36, red: 2, black: 2, even: 2, odd: 2, low: 2, high: 2, dozen1: 3, dozen2: 3, dozen3: 3,
}

export function playRoulette(rng: RNG, bets: RouletteBet[]): BetResult {
  const number = Math.floor(rng() * 37)
  let totalMultiplier = 0
  for (const bet of bets) {
    if (betWon(bet, number)) totalMultiplier += ROULETTE_PAYOUTS[bet.type]
  }
  return { multiplier: totalMultiplier, win: totalMultiplier > 0, state: { number, color: number === 0 ? 'green' : ROULETTE_RED.has(number) ? 'red' : 'black' } }
}

function betWon(bet: RouletteBet, n: number): boolean {
  if (bet.type === 'straight') return bet.number === n
  if (n === 0) return false
  switch (bet.type) {
    case 'red': return ROULETTE_RED.has(n)
    case 'black': return !ROULETTE_RED.has(n)
    case 'even': return n % 2 === 0
    case 'odd': return n % 2 === 1
    case 'low': return n <= 18
    case 'high': return n >= 19
    case 'dozen1': return n <= 12
    case 'dozen2': return n >= 13 && n <= 24
    case 'dozen3': return n >= 25
  }
}

// ============ BLACKJACK ============
export const SUITS = ['S', 'H', 'D', 'C']
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export function drawCard(rng: RNG): string {
  const suit = SUITS[Math.floor(rng() * 4)]
  const rank = RANKS[Math.floor(rng() * 13)]
  return `${rank}${suit}`
}

export function handValue(cards: string[]): number {
  let total = 0
  let aces = 0
  for (const c of cards) {
    const rank = c.slice(0, -1)
    if (rank === 'A') { aces++; total += 11 }
    else if (['J', 'Q', 'K', '10'].includes(rank)) total += 10
    else total += Number(rank)
  }
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return total
}

export function isBlackjack(cards: string[]): boolean {
  return cards.length === 2 && handValue(cards) === 21
}

// ============ SLOTS (5 reel x 3 baris, 5 payline) ============
export interface SlotTheme {
  id: string
  name: string
  symbols: { id: string; weight: number; payout3: number; payout4: number; payout5: number; label: string }[]
  bg: string
  accent: string
}

export const SLOT_THEMES: SlotTheme[] = [
  {
    id: 'lucky777', name: 'Lucky 7 Deluxe', bg: 'from-red-950 via-red-900 to-amber-950', accent: '#f59e0b',
    symbols: [
      { id: '7', weight: 1, payout3: 50, payout4: 150, payout5: 777, label: '777' },
      { id: 'diamond', weight: 2, payout3: 25, payout4: 75, payout5: 250, label: 'Berlian' },
      { id: 'bell', weight: 4, payout3: 10, payout4: 30, payout5: 100, label: 'Bel' },
      { id: 'bar', weight: 6, payout3: 5, payout4: 15, payout5: 50, label: 'BAR' },
      { id: 'cherry', weight: 8, payout3: 2, payout4: 8, payout5: 25, label: 'Ceri' },
      { id: 'lemon', weight: 10, payout3: 1, payout4: 4, payout5: 15, label: 'Lemon' },
    ],
  },
  {
    id: 'fruitparty', name: 'Fruit Fiesta', bg: 'from-purple-950 via-fuchsia-900 to-pink-900', accent: '#ec4899',
    symbols: [
      { id: 'watermelon', weight: 2, payout3: 30, payout4: 100, payout5: 500, label: 'Semangka' },
      { id: 'grape', weight: 3, payout3: 20, payout4: 60, payout5: 250, label: 'Anggur' },
      { id: 'orange', weight: 5, payout3: 10, payout4: 30, payout5: 120, label: 'Jeruk' },
      { id: 'apple', weight: 7, payout3: 5, payout4: 18, payout5: 70, label: 'Apel' },
      { id: 'banana', weight: 9, payout3: 3, payout4: 10, payout5: 40, label: 'Pisang' },
      { id: 'star', weight: 12, payout3: 1, payout4: 5, payout5: 20, label: 'Bintang' },
    ],
  },
  {
    id: 'pharaoh', name: 'Rahasia Firaun', bg: 'from-amber-950 via-yellow-900 to-stone-900', accent: '#d4a017',
    symbols: [
      { id: 'pharaoh', weight: 1, payout3: 60, payout4: 200, payout5: 1000, label: 'Firaun' },
      { id: 'eye', weight: 2, payout3: 25, payout4: 90, payout5: 300, label: 'Mata' },
      { id: 'scarab', weight: 4, payout3: 12, payout4: 40, payout5: 150, label: 'Kumbang' },
      { id: 'ankh', weight: 6, payout3: 6, payout4: 20, payout5: 80, label: 'Ankh' },
      { id: 'pyramid', weight: 8, payout3: 3, payout4: 10, payout5: 40, label: 'Piramida' },
      { id: 'papyrus', weight: 10, payout3: 1.5, payout4: 5, payout5: 20, label: 'Papyrus' },
    ],
  },
  {
    id: 'neon', name: 'Neon Nights', bg: 'from-slate-950 via-indigo-950 to-purple-950', accent: '#22d3ee',
    symbols: [
      { id: 'crown', weight: 1, payout3: 55, payout4: 180, payout5: 888, label: 'Mahkota' },
      { id: 'bolt', weight: 3, payout3: 20, payout4: 70, payout5: 280, label: 'Kilat' },
      { id: 'rocket', weight: 5, payout3: 10, payout4: 35, payout5: 140, label: 'Roket' },
      { id: 'cube', weight: 7, payout3: 5, payout4: 16, payout5: 60, label: 'Kubus' },
      { id: 'wave', weight: 9, payout3: 2.5, payout4: 9, payout5: 35, label: 'Gelombang' },
      { id: 'dot', weight: 11, payout3: 1, payout4: 4, payout5: 16, label: 'Titik' },
    ],
  },
]

export const SLOT_SYMBOL_GLYPHS: Record<string, string> = {
  '7': '7', diamond: '◆', bell: '🔔', bar: '▬', cherry: '🍒', lemon: '🍋',
  watermelon: '🍉', grape: '🍇', orange: '🍊', apple: '🍎', banana: '🍌', star: '★',
  pharaoh: '👤', eye: '👁', scarab: '🪲', ankh: '☥', pyramid: '🔺', papyrus: '📜',
  crown: '👑', bolt: '⚡', rocket: '🚀', cube: '🧊', wave: '〰', dot: '●',
}

// 5 paylines pada grid 5x3 (baris: 0,1,2)
export const SLOT_PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
]

export function spinSlots(rng: RNG, theme: SlotTheme): BetResult {
  const totalWeight = theme.symbols.reduce((a, s) => a + s.weight, 0)
  const grid: number[][] = [] // [reel][row]
  for (let r = 0; r < 5; r++) {
    const col: number[] = []
    for (let row = 0; row < 3; row++) {
      let roll = rng() * totalWeight
      let idx = 0
      for (let i = 0; i < theme.symbols.length; i++) {
        roll -= theme.symbols[i].weight
        if (roll <= 0) { idx = i; break }
      }
      col.push(idx)
    }
    grid.push(col)
  }
  let multiplier = 0
  const wins: { line: number; symbol: string; count: number; payout: number }[] = []
  SLOT_PAYLINES.forEach((line, li) => {
    const symbols = line.map((row, reel) => grid[reel][row])
    const first = symbols[0]
    let count = 1
    for (let i = 1; i < 5; i++) {
      if (symbols[i] === first) count++
      else break
    }
    if (count >= 3) {
      const sym = theme.symbols[first]
      const payout = count === 3 ? sym.payout3 : count === 4 ? sym.payout4 : sym.payout5
      if (payout > 0) {
        multiplier += payout
        wins.push({ line: li, symbol: sym.label, count, payout })
      }
    }
  })
  return { multiplier, win: multiplier > 0, state: { grid, wins, theme: theme.id } }
}

// ============ Validasi taruhan ============
export function validateBet(currency: string, amount: number): string | null {
  const cfg = CURRENCIES[currency]
  if (!cfg) return 'Mata uang tidak didukung'
  if (!Number.isFinite(amount) || amount <= 0) return 'Jumlah taruhan tidak valid'
  if (amount < cfg.minBet) return `Taruhan minimal ${cfg.minBet} ${currency}`
  if (amount > cfg.maxBet) return `Taruhan maksimal ${cfg.maxBet} ${currency}`
  return null
}

export function wagerUsd(currency: string, amount: number): number {
  return usdValue(currency, amount)
}
