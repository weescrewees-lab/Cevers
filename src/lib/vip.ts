/** Sistem level VIP berbasis total wager (USD) — koin virtual */

export interface VipTier {
  name: string
  minWager: number
  color: string
  /** bonus faucet multiplier saat mencapai tier ini */
  perk: string
}

export const VIP_TIERS: VipTier[] = [
  { name: 'Bronze', minWager: 0, color: '#c2936b', perk: 'Faucet dasar' },
  { name: 'Silver', minWager: 1_000, color: '#c8cdd6', perk: 'Faucet +10%' },
  { name: 'Gold', minWager: 5_000, color: '#e8c15a', perk: 'Faucet +20%' },
  { name: 'Platinum', minWager: 25_000, color: '#9fd8e8', perk: 'Faucet +35%' },
  { name: 'Diamond', minWager: 100_000, color: '#7cc4ff', perk: 'Faucet +50%' },
  { name: 'CEVERS Elite', minWager: 500_000, color: '#b28dff', perk: 'Faucet +100%' },
]

export function vipOf(totalWagerUsd: number): {
  tier: VipTier
  next: VipTier | null
  progress: number // 0..1 menuju tier berikutnya
  faucetBonus: number
} {
  let idx = 0
  for (let i = 0; i < VIP_TIERS.length; i++) {
    if (totalWagerUsd >= VIP_TIERS[i].minWager) idx = i
  }
  const tier = VIP_TIERS[idx]
  const next = VIP_TIERS[idx + 1] ?? null
  const progress = next
    ? Math.min(1, (totalWagerUsd - tier.minWager) / (next.minWager - tier.minWager))
    : 1
  const bonus = [1, 1.1, 1.2, 1.35, 1.5, 2][idx] ?? 1
  return { tier, next, progress, faucetBonus: bonus }
}
