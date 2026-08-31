'use client'

import { Dices, Bomb, TrendingUp, Triangle, Grid3X3, Bitcoin, Blocks, Network } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface GameDef {
  id: string
  name: string
  category: 'original' | 'crypto'
  icon: LucideIcon
  /** warna aksen halus per game (bukan gradasi norak) */
  tint: string
  edge: string
  players: number
  /** foto asli untuk latar kartu */
  photo: string
}

export const GAMES: GameDef[] = [
  { id: 'dice', name: 'Dadu', category: 'original', icon: Dices, tint: '#30d158', edge: 'RTP 99%', players: 0, photo: '/images/games/dice.jpg' },
  { id: 'mines', name: 'Ranjau', category: 'original', icon: Bomb, tint: '#ff453a', edge: 'RTP 99%', players: 0, photo: '/images/games/mines.jpg' },
  { id: 'limbo', name: 'Limbo', category: 'original', icon: TrendingUp, tint: '#ffd60a', edge: 'RTP 99%', players: 0, photo: '/images/games/limbo.jpg' },
  { id: 'plinko', name: 'Plinko', category: 'original', icon: Triangle, tint: '#bf5af2', edge: 'RTP 99%', players: 0, photo: '/images/games/plinko.jpg' },
  { id: 'keno', name: 'Keno', category: 'original', icon: Grid3X3, tint: '#ff9f0a', edge: 'RTP 99%', players: 0, photo: '/images/games/keno.jpg' },
  { id: 'btc-crash', name: 'BTC Crash', category: 'crypto', icon: Bitcoin, tint: '#f7931a', edge: 'RTP 99%', players: 0, photo: '/images/games/btc-crash.png' },
  { id: 'hash-run', name: 'Hash Run', category: 'crypto', icon: Blocks, tint: '#ffb340', edge: 'RTP 99%', players: 0, photo: '/images/games/hash-run.png' },
  { id: 'satoshi-grid', name: 'Satoshi Grid', category: 'crypto', icon: Network, tint: '#ffd60a', edge: 'RTP 99%', players: 0, photo: '/images/games/satoshi-grid.png' },
  { id: 'chest', name: 'Vault Chest', category: 'crypto', icon: Blocks, tint: '#d7a85b', edge: 'RTP 99%', players: 0, photo: '/images/games/hash-run.png' },
]

/** Foto hero (bukan bagian GAMES) */
export const PHOTOS = {
  hero: '/images/games/hero.jpg',
}

export function getGame(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id)
}

export function slotThemeOf(id: string): string {
  return id.replace('slots-', '')
}
