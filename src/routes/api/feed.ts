import { createFileRoute } from '@tanstack/react-router'
import { createBet, listBots, listFeed, q, updateUser, ensureSeed } from '@/lib/casino-db'
import { CURRENCIES, roundTo } from '@/lib/currencies'
import { makeRng } from '@/lib/fair'
import { playDice, playLimbo, playPlinko, playRoulette, spinSlots, SLOT_THEMES } from '@/lib/games'
import { json } from '@/lib/http'

const BOT_GAMES = ['dice', 'limbo', 'mines', 'plinko', 'keno', 'blackjack', 'roulette', 'slots', 'dice', 'slots']

export const Route = createFileRoute('/api/feed')({
  server: {
    handlers: {
      GET: async () => {
        await ensureSeed()
        const bots = await listBots()
        if (bots.length > 0 && Math.random() < 0.75) {
          const n = 1 + Math.floor(Math.random() * 2)
          const sql = await q()
          for (let i = 0; i < n; i++) {
            const bot = bots[Math.floor(Math.random() * bots.length)]
            const game = BOT_GAMES[Math.floor(Math.random() * BOT_GAMES.length)]
            const wallet = bot.wallets[Math.floor(Math.random() * bot.wallets.length)]
            if (!wallet) continue
            const cfg = CURRENCIES[wallet.currency]
            if (!cfg) continue
            const usdTarget = [1, 5, 20, 50, 100, 250, 500, 1000][Math.floor(Math.random() * 8)]
            const amount = Math.min(roundTo(wallet.currency, usdTarget / cfg.usdRate), wallet.balance)
            if (amount < cfg.minBet) continue
            const nonce = bot.nonce + 1
            await updateUser(bot.id, { nonce })
            bot.nonce = nonce
            const rng = makeRng(bot.serverSeed, bot.clientSeed, nonce)
            let multiplier = 0
            let state: Record<string, unknown> = {}
            switch (game) {
              case 'dice': {
                const r = playDice(rng, 50.5, Math.random() < 0.5 ? 'over' : 'under')
                multiplier = r.multiplier
                state = r.state
                break
              }
              case 'limbo': {
                const r = playLimbo(rng, 2)
                multiplier = r.multiplier
                state = r.state
                break
              }
              case 'plinko': {
                const r = playPlinko(rng, 'medium')
                multiplier = r.multiplier
                state = r.state
                break
              }
              case 'roulette': {
                const r = playRoulette(rng, [{ type: Math.random() < 0.5 ? 'red' : 'black' }])
                multiplier = r.multiplier
                state = r.state
                break
              }
              case 'slots': {
                const r = spinSlots(rng, SLOT_THEMES[Math.floor(Math.random() * SLOT_THEMES.length)])
                multiplier = r.multiplier
                state = r.state
                break
              }
              default: {
                const r = playLimbo(rng, 1.5)
                multiplier = r.multiplier
                state = r.state
                break
              }
            }
            const payout = roundTo(wallet.currency, amount * multiplier)
            await createBet(sql, {
              userId: bot.id,
              game,
              currency: wallet.currency,
              amount,
              multiplier,
              payout,
              win: multiplier >= 1,
              state: JSON.stringify(state),
              nonce,
            })
          }
        }

        const feed = await listFeed(25)
        return json({
          feed: feed.map((b) => ({
            id: b.id,
            user: b.username,
            game: b.game,
            currency: b.currency,
            amount: b.amount,
            multiplier: b.multiplier,
            payout: b.payout,
            win: b.win,
            createdAt: b.createdAt,
          })),
        })
      },
    },
  },
})
