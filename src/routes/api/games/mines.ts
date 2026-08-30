import { createFileRoute } from '@tanstack/react-router'
import { executeBet, GameError, persistAccount } from '@/lib/betService'
import { getSessionUser } from '@/lib/casino-auth'
import {
  createBet,
  creditWallet,
  getMines,
  getWalletBalance,
  updateMines,
  upsertMines,
  withTx,
} from '@/lib/casino-db'
import { roundTo } from '@/lib/currencies'
import { generateMineSpots, minesMultiplier } from '@/lib/games'
import { json, readJson, tooMany } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { minesActionSchema, minesStartSchema, zodMessage } from '@/lib/validation'

export const Route = createFileRoute('/api/games/mines')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'Silakan masuk dulu' }, 401)
        const rl = rateLimit(`game:${user.id}`, 120, 60_000)
        if (!rl.ok) return tooMany(rl.retryAfter)
        try {
          const body = (await readJson(request)) as { action?: string; tile?: number }

          if (body.action === 'start') {
            const parsed = minesStartSchema.safeParse(body)
            if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400)
            const { currency, amount, mines } = parsed.data
            const existing = await getMines(user.id)
            if (existing?.active) return json({ error: 'Selesaikan game yang sedang berjalan dulu' }, 409)

            const { result, balance } = await executeBet(user.id, 'mines', currency, amount, (rng, nonce) => {
              const spots = generateMineSpots(rng, mines)
              return { multiplier: 0, win: false, state: { mineSpots: spots, nonce } }
            })
            const mineSpots = (result.state.mineSpots as number[]) || []
            await upsertMines({
              userId: user.id,
              currency,
              amount,
              mines,
              revealed: '[]',
              mineSpots: JSON.stringify(mineSpots),
              active: true,
              nonce: (result.state.nonce as number) || 0,
            })
            return json({ started: true, mines, balance, multiplier: 0, revealed: [] })
          }

          const parsed = minesActionSchema.safeParse(body)
          if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400)
          const game = await getMines(user.id)
          if (!game || !game.active) return json({ error: 'Tidak ada game aktif' }, 404)
          const revealed: number[] = JSON.parse(game.revealed)
          const mineSpots: number[] = JSON.parse(game.mineSpots)

          if (parsed.data.action === 'reveal') {
            const tile = Number(body.tile)
            if (!Number.isInteger(tile) || tile < 0 || tile > 24) return json({ error: 'Tile tidak valid' }, 400)
            if (revealed.includes(tile)) return json({ error: 'Tile sudah dibuka' }, 409)

            if (mineSpots.includes(tile)) {
              await withTx(async (sql) => {
                await updateMines(user.id, { active: false, revealed: JSON.stringify([...revealed, tile]) }, sql)
                await createBet(sql, {
                  userId: user.id,
                  game: 'mines',
                  currency: game.currency,
                  amount: game.amount,
                  multiplier: 0,
                  payout: 0,
                  win: false,
                  state: JSON.stringify({ mines: game.mines, picks: revealed.length, boom: tile }),
                  nonce: game.nonce,
                })
              })
              void persistAccount(user.id)
              return json({ boom: true, tile, mineSpots, multiplier: 0, payout: 0, balance: null })
            }

            revealed.push(tile)
            const multiplier = minesMultiplier(game.mines, revealed.length)
            const safeTiles = 25 - game.mines

            if (revealed.length >= safeTiles) {
              const payout = roundTo(game.currency, game.amount * multiplier)
              const balance = await withTx(async (sql) => {
                await updateMines(user.id, { active: false, revealed: JSON.stringify(revealed) }, sql)
                await creditWallet(sql, user.id, game.currency, payout)
                await createBet(sql, {
                  userId: user.id,
                  game: 'mines',
                  currency: game.currency,
                  amount: game.amount,
                  multiplier,
                  payout,
                  win: true,
                  state: JSON.stringify({ mines: game.mines, picks: revealed.length, cashout: true }),
                  nonce: game.nonce,
                })
                return getWalletBalance(sql, user.id, game.currency)
              })
              void persistAccount(user.id)
              return json({ boom: false, tile, revealed, multiplier, payout, balance, cashout: true, mineSpots })
            }

            await updateMines(user.id, { revealed: JSON.stringify(revealed) })
            return json({ boom: false, tile, revealed, multiplier, payout: 0 })
          }

          if (revealed.length === 0) return json({ error: 'Buka minimal 1 tile dulu' }, 400)
          const multiplier = minesMultiplier(game.mines, revealed.length)
          const payout = roundTo(game.currency, game.amount * multiplier)
          const balance = await withTx(async (sql) => {
            await updateMines(user.id, { active: false }, sql)
            await creditWallet(sql, user.id, game.currency, payout)
            await createBet(sql, {
              userId: user.id,
              game: 'mines',
              currency: game.currency,
              amount: game.amount,
              multiplier,
              payout,
              win: true,
              state: JSON.stringify({ mines: game.mines, picks: revealed.length, cashout: true }),
              nonce: game.nonce,
            })
            return getWalletBalance(sql, user.id, game.currency)
          })
          void persistAccount(user.id)
          return json({ boom: false, cashout: true, multiplier, payout, balance, revealed, mineSpots })
        } catch (e) {
          if (e instanceof GameError) return json({ error: e.message }, e.status)
          return json({ error: 'Terjadi kesalahan' }, 500)
        }
      },
    },
  },
})
