import { CURRENCIES, roundTo, usdValue } from '@/lib/currencies'
import { makeRng } from '@/lib/fair'
import { BetResult } from '@/lib/games'
import {
  createBet,
  creditWallet,
  debitWallet,
  findUserById,
  getWalletBalance,
  persistBackup,
  updateUser,
  withTx,
} from '@/lib/casino-db'
import { buildSnapshot } from '@/lib/snapshot'

export class GameError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

/**
 * Menaruh taruhan secara atomik:
 * 1. Debit wallet (dengan guard saldo cukup)
 * 2. Increment nonce + statistik user
 * 3. Hitung hasil via compute(rng, nonce)
 * 4. Credit payout jika menang
 * 5. Simpan row Bet
 */
export async function executeBet<T extends BetResult>(
  userId: string,
  game: string,
  currency: string,
  amount: number,
  compute: (rng: () => number, nonce: number) => T,
): Promise<{ result: T; betId: string; balance: number; payout: number }> {
  const cfg = CURRENCIES[currency]
  if (!cfg) throw new GameError('Mata uang tidak didukung')
  if (!Number.isFinite(amount) || amount <= 0) throw new GameError('Jumlah taruhan tidak valid')
  if (amount < cfg.minBet) throw new GameError(`Taruhan minimal ${cfg.minBet} ${currency}`)
  if (amount > cfg.maxBet) throw new GameError(`Taruhan maksimal ${cfg.maxBet} ${currency}`)

  const out = await withTx(async (sql) => {
    const ok = await debitWallet(sql, userId, currency, amount)
    if (!ok) throw new GameError('Saldo tidak cukup', 402)

    const user = await findUserById(userId, sql)
    if (!user) throw new GameError('Akun tidak ditemukan', 401)
    const nonce = user.nonce + 1
    await updateUser(
      userId,
      {
        nonce,
        totalBets: user.totalBets + 1,
        totalWager: user.totalWager + usdValue(currency, amount),
      },
      sql,
    )

    const result = compute(makeRng(user.serverSeed, user.clientSeed, nonce), nonce)
    const payout = roundTo(currency, amount * result.multiplier)

    if (payout > 0) {
      await creditWallet(sql, userId, currency, payout)
    }

    const betId = await createBet(sql, {
      userId,
      game,
      currency,
      amount,
      multiplier: result.multiplier,
      payout,
      win: result.win,
      state: JSON.stringify(result.state),
      nonce,
    })

    const balance = await getWalletBalance(sql, userId, currency)
    return { result, betId, balance, payout }
  })

  void persistAccount(userId)
  return out
}

export async function persistAccount(userId: string): Promise<void> {
  try {
    const snap = await buildSnapshot(userId)
    if (snap) await persistBackup(snap.user.username, snap)
  } catch {
    // best-effort
  }
}
