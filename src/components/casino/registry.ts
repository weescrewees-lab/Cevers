'use client'

import { Dices, Bomb, TrendingUp, Triangle, Grid3X3, Spade, CircleDot, Cherry, Gem, Crown, Eye } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface GameDef {
  id: string
  name: string
  category: 'original' | 'slot' | 'table'
  icon: LucideIcon
  /** warna aksen halus per game (bukan gradasi norak) */
  tint: string
  edge: string
  players: number
  /** foto asli untuk latar kartu */
  photo: string
}

export const GAMES: GameDef[] = [
  { id: 'dice', name: 'Dadu', category: 'original', icon: Dices, tint: '#30d158', edge: 'RTP 99%', players: 1243, photo: '/images/games/dice.jpg' },
  { id: 'mines', name: 'Ranjau', category: 'original', icon: Bomb, tint: '#ff453a', edge: 'RTP 99%', players: 2101, photo: '/images/games/mines.jpg' },
  { id: 'limbo', name: 'Limbo', category: 'original', icon: TrendingUp, tint: '#ffd60a', edge: 'RTP 99%', players: 987, photo: '/images/games/limbo.jpg' },
  { id: 'plinko', name: 'Plinko', category: 'original', icon: Triangle, tint: '#bf5af2', edge: 'RTP 99%', players: 1876, photo: '/images/games/plinko.jpg' },
  { id: 'keno', name: 'Keno', category: 'original', icon: Grid3X3, tint: '#ff9f0a', edge: 'RTP 99%', players: 764, photo: '/images/games/keno.jpg' },
  { id: 'blackjack', name: 'Blackjack', category: 'table', icon: Spade, tint: '#0a84ff', edge: 'RTP 99.5%', players: 1532, photo: '/images/games/blackjack.jpg' },
  { id: 'roulette', name: 'Roulette', category: 'table', icon: CircleDot, tint: '#ff375f', edge: 'RTP 97.3%', players: 1720, photo: '/images/games/roulette.jpg' },
  { id: 'slots-lucky777', name: 'Lucky 7 Deluxe', category: 'slot', icon: Cherry, tint: '#ff453a', edge: 'RTP 96%', players: 2340, photo: '/images/games/slots-lucky777.jpg' },
  { id: 'slots-fruitparty', name: 'Fruit Fiesta', category: 'slot', icon: Gem, tint: '#bf5af2', edge: 'RTP 96%', players: 1985, photo: '/images/games/slots-fruitparty.jpg' },
  { id: 'slots-pharaoh', name: 'Rahasia Firaun', category: 'slot', icon: Eye, tint: '#ffd60a', edge: 'RTP 96%', players: 1502, photo: '/images/games/slots-pharaoh.jpg' },
  { id: 'slots-neon', name: 'Neon Nights', category: 'slot', icon: Crown, tint: '#64d2ff', edge: 'RTP 96%', players: 1111, photo: '/images/games/slots-neon.jpg' },
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
