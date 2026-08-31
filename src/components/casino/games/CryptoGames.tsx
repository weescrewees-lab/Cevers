'use client'

import { DiceGame } from './DiceGame'
import { LimboGame } from './LimboGame'
import { MinesGame } from './MinesGame'
import { PlinkoGame } from './PlinkoGame'

/**
 * Lightweight game adapters inspired by the open-source Laravel Social Gaming
 * reference. Cevers keeps its own UI, wallet, server-authoritative settlement,
 * currency selection, and fairness verification.
 */
export function BtcCrashGame() {
  return <LimboGame />
}

export function HashRunGame() {
  return <MinesGame />
}

export function SatoshiGridGame() {
  return <PlinkoGame />
}

export function CeversDiceGame() {
  return <DiceGame />
}

export function CryptoGameCollection() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <LimboGame />
      <MinesGame />
      <PlinkoGame />
      <DiceGame />
    </div>
  )
}
