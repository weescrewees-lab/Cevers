export interface CurrencyConfig {
  code: string
  name: string
  symbol: string
  color: string
  usdRate: number
  decimals: number
  minBet: number
  maxBet: number
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USDT: { code: 'USDT', name: 'Tether', symbol: '₮', color: '#26A17B', usdRate: 1, decimals: 2, minBet: 0.1, maxBet: 10000 },
  BTC: { code: 'BTC', name: 'Bitcoin', symbol: '₿', color: '#F7931A', usdRate: 68240, decimals: 8, minBet: 0.000001, maxBet: 0.5 },
  ETH: { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', color: '#8A92B2', usdRate: 3520, decimals: 6, minBet: 0.00003, maxBet: 10 },
  SOL: { code: 'SOL', name: 'Solana', symbol: '◎', color: '#9945FF', usdRate: 162, decimals: 4, minBet: 0.001, maxBet: 200 },
  TRX: { code: 'TRX', name: 'Tron', symbol: 'T', color: '#EF0027', usdRate: 0.12, decimals: 2, minBet: 1, maxBet: 100000 },
  NOIR: { code: 'NOIR', name: 'Cevers Coin', symbol: 'C', color: '#8B7CFF', usdRate: 0.298, decimals: 2, minBet: 1, maxBet: 250000 },
}

export const CURRENCY_LIST = Object.keys(CURRENCIES)

export function usdValue(currency: string, amount: number): number {
  return amount * (CURRENCIES[currency]?.usdRate ?? 0)
}

export function fromUsd(currency: string, usd: number): number {
  return usd / (CURRENCIES[currency]?.usdRate ?? 1)
}

export function formatAmount(currency: string, amount: number): string {
  const cfg = CURRENCIES[currency]
  if (!cfg) return amount.toFixed(2)
  return amount.toLocaleString('id-ID', { maximumFractionDigits: cfg.decimals })
}

export function roundTo(currency: string, amount: number): number {
  const cfg = CURRENCIES[currency]
  if (!cfg) return amount
  const p = 10 ** cfg.decimals
  return Math.floor(amount * p) / p
}

/** Jumlah koin gratis yang diklaim per currency via faucet */
export const FAUCET_AMOUNTS: Record<string, number> = {
  USDT: 250,
  BTC: 0.002,
  ETH: 0.02,
  SOL: 1,
  TRX: 1500,
  NOIR: 1000,
}
export const FAUCET_COOLDOWN_MS = 30_000
