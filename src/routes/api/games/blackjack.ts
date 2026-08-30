import { createFileRoute } from '@tanstack/react-router'
import { executeBet, GameError, persistAccount } from '@/lib/betService'
import { getSessionUser } from '@/lib/casino-auth'
import {
  createBet,
  createBlackjack,
  creditWallet,
  debitWallet,
  deleteBlackjack,
  findUserById,
  getBlackjack,
  getWalletBalance,
  q,
  updateBlackjack,
  withTx,
} from '@/lib/casino-db'
import { roundTo } from '@/lib/currencies'
import { drawCard, handValue, isBlackjack } from '@/lib/games'
import { makeRng } from '@/lib/fair'
import { json, readJson, tooMany } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { blackjackActionSchema, blackjackStartSchema, zodMessage } from '@/lib/validation'

type Body = { action: 'start' | 'hit' | 'stand' | 'double'; currency?: string; amount?: number }

export const Route = createFileRoute('/api/games/blackjack')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'Silakan masuk dulu' }, 401)
        const rl = rateLimit(`game:${user.id}`, 120, 60_000)
        if (!rl.ok) return tooMany(rl.retryAfter)
        try {
          const body = (await readJson(request)) as Body

          if (body.action === 'start') {
            const parsed = blackjackStartSchema.safeParse(body)
            if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400)
            const existing = await getBlackjack(user.id)
            if (existing) return json({ error: 'Selesaikan ronde yang sedang berjalan' }, 409)

            const dealt: { playerCards: string[]; dealerCards: string[] } = { playerCards: [], dealerCards: [] }
            const { balance } = await executeBet(
              user.id,
              'blackjack',
              String(body.currency),
              Number(body.amount),
              (rng) => {
                dealt.playerCards = [drawCard(rng), drawCard(rng)]
                dealt.dealerCards = [drawCard(rng)]
                return { multiplier: 0, win: false, state: dealt }
              },
            )

            await createBlackjack({
              userId: user.id,
              currency: String(body.currency),
              baseAmount: Number(body.amount),
              playerCards: JSON.stringify(dealt.playerCards),
              dealerCards: JSON.stringify(dealt.dealerCards),
              phase: 'PLAYER',
            })

            if (isBlackjack(dealt.playerCards)) {
              return dealerPlay(user.id, dealt.playerCards, dealt.dealerCards, Number(body.amount), String(body.currency), balance)
            }
            return json({ playerCards: dealt.playerCards, dealerCards: dealt.dealerCards, phase: 'PLAYER', balance })
          }

          const actionParsed = blackjackActionSchema.safeParse(body)
          if (!actionParsed.success) return json({ error: zodMessage(actionParsed.error) }, 400)
          const game = await getBlackjack(user.id)
          if (!game) return json({ error: 'Tidak ada ronde aktif' }, 404)

          const playerCards: string[] = JSON.parse(game.playerCards)
          const dealerCards: string[] = JSON.parse(game.dealerCards)
          const amount = game.baseAmount * (game.doubled ? 2 : 1)
          const balance = await getWalletBalance(await q(), user.id, game.currency)

          if (body.action === 'hit') {
            if (game.phase !== 'PLAYER') return json({ error: 'Ronde sudah selesai' }, 409)
            const rng = makeRng(user.serverSeed, user.clientSeed, user.nonce + 1_000_000)
            playerCards.push(drawCard(rng))
            const value = handValue(playerCards)
            await updateBlackjack(user.id, { playerCards: JSON.stringify(playerCards) })
            if (value > 21) return finishRound(user.id, playerCards, dealerCards, amount, game.currency, balance, true)
            if (value === 21) return dealerPlay(user.id, playerCards, dealerCards, amount, game.currency, balance)
            return json({ playerCards, dealerCards, phase: 'PLAYER', balance })
          }

          if (body.action === 'double') {
            if (game.phase !== 'PLAYER' || playerCards.length !== 2) {
              return json({ error: 'Double hanya di 2 kartu pertama' }, 409)
            }
            if (game.doubled) return json({ error: 'Sudah double' }, 409)
            const ok = await withTx(async (sql) => debitWallet(sql, user.id, game.currency, game.baseAmount))
            if (!ok) return json({ error: 'Saldo tidak cukup untuk double' }, 402)
            await updateBlackjack(user.id, { doubled: true })
            const rng = makeRng(user.serverSeed, user.clientSeed, user.nonce + 2_000_000)
            playerCards.push(drawCard(rng))
            const value = handValue(playerCards)
            await updateBlackjack(user.id, { playerCards: JSON.stringify(playerCards) })
            const nb = balance - game.baseAmount
            if (value > 21) return finishRound(user.id, playerCards, dealerCards, amount, game.currency, nb, true)
            return dealerPlay(user.id, playerCards, dealerCards, amount, game.currency, nb)
          }

          if (body.action === 'stand') {
            return dealerPlay(user.id, playerCards, dealerCards, amount, game.currency, balance)
          }

          return json({ error: 'Aksi tidak dikenal' }, 400)
        } catch (e) {
          if (e instanceof GameError) return json({ error: e.message }, e.status)
          console.error(e)
          return json({ error: 'Terjadi kesalahan' }, 500)
        }
      },
    },
  },
})

async function dealerPlay(
  userId: string,
  playerCards: string[],
  dealerCards: string[],
  amount: number,
  currency: string,
  balance: number,
) {
  const user = await findUserById(userId)
  if (!user) throw new Error('user hilang')
  const rng = makeRng(user.serverSeed, user.clientSeed, user.nonce + 3_000_000)
  while (handValue(dealerCards) < 17) dealerCards.push(drawCard(rng))
  await updateBlackjack(userId, { dealerCards: JSON.stringify(dealerCards), phase: 'DONE' })
  return settle(userId, playerCards, dealerCards, amount, currency, balance)
}

async function finishRound(
  userId: string,
  playerCards: string[],
  dealerCards: string[],
  amount: number,
  currency: string,
  balance: number,
  bust = false,
) {
  await updateBlackjack(userId, { phase: 'DONE' })
  return settle(userId, playerCards, dealerCards, amount, currency, balance, bust ? { busted: true } : {})
}

async function settle(
  userId: string,
  playerCards: string[],
  dealerCards: string[],
  amount: number,
  currency: string,
  _balance: number,
  extra: Record<string, unknown> = {},
) {
  const pv = handValue(playerCards)
  const dv = handValue(dealerCards)
  const playerBJ = isBlackjack(playerCards)
  const dealerBJ = isBlackjack(dealerCards)

  let multiplier = 0
  let outcome: string
  if (pv > 21) {
    multiplier = 0
    outcome = 'bust'
  } else if (playerBJ && !dealerBJ) {
    multiplier = 2.5
    outcome = 'blackjack'
  } else if (dealerBJ && !playerBJ) {
    multiplier = 0
    outcome = 'dealer_blackjack'
  } else if (playerBJ && dealerBJ) {
    multiplier = 1
    outcome = 'push'
  } else if (dv > 21) {
    multiplier = 2
    outcome = 'dealer_bust'
  } else if (pv > dv) {
    multiplier = 2
    outcome = 'win'
  } else if (pv < dv) {
    multiplier = 0
    outcome = 'lose'
  } else {
    multiplier = 1
    outcome = 'push'
  }

  const payout = roundTo(currency, amount * multiplier)
  const walletBalance = await withTx(async (sql) => {
    if (payout > 0) await creditWallet(sql, userId, currency, payout)
    await createBet(sql, {
      userId,
      game: 'blackjack',
      currency,
      amount,
      multiplier,
      payout,
      win: payout > amount,
      state: JSON.stringify({ outcome, pv, dv, ...extra }),
      nonce: 0,
    })
    await deleteBlackjack(userId, sql)
    return getWalletBalance(sql, userId, currency)
  })
  void persistAccount(userId)
  return json({
    playerCards,
    dealerCards,
    pv,
    dv,
    outcome,
    multiplier,
    payout,
    balance: walletBalance,
    phase: 'DONE',
  })
}
