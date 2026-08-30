import { createFileRoute } from '@tanstack/react-router'
import { getSessionUser } from '@/lib/casino-auth'
import { challengeClaims, createTx, creditWallet, findChallengeClaim, withTx } from '@/lib/casino-db'
import { fromUsd } from '@/lib/currencies'
import { json, readJson } from '@/lib/http'

const CHALLENGES = [
  { id: 'wager-100', name: 'Pemula Berani', desc: 'Total wager $100', targetUsd: 100, reward: 500 },
  { id: 'wager-1k', name: 'Petarung Liganya', desc: 'Total wager $1.000', targetUsd: 1000, reward: 2500 },
  { id: 'wager-10k', name: 'Sultan Meja', desc: 'Total wager $10.000', targetUsd: 10000, reward: 10000 },
  { id: 'wager-100k', name: 'Legenda Kasino', desc: 'Total wager $100.000', targetUsd: 100000, reward: 50000 },
]

export const Route = createFileRoute('/api/challenges')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'Belum masuk' }, 401)
        const claimedIds = new Set(await challengeClaims(user.id))
        return json({
          totalWager: user.totalWager,
          challenges: CHALLENGES.map((c) => ({
            ...c,
            claimed: claimedIds.has(c.id),
            progress: Math.min(1, user.totalWager / c.targetUsd),
          })),
        })
      },
      POST: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'Belum masuk' }, 401)
        const body = (await readJson(request)) as { challengeId?: string }
        const ch = CHALLENGES.find((c) => c.id === body.challengeId)
        if (!ch) return json({ error: 'Tantangan tidak ditemukan' }, 404)
        if (user.totalWager < ch.targetUsd) return json({ error: 'Target wager belum tercapai' }, 400)
        if (await findChallengeClaim(user.id, ch.id)) return json({ error: 'Sudah diklaim' }, 409)
        const reward = fromUsd('NOIR', ch.reward)
        await withTx(async (sql) => {
          await creditWallet(sql, user.id, 'NOIR', reward)
          await createTx(sql, {
            userId: user.id,
            type: 'CHALLENGE',
            currency: 'NOIR',
            amount: reward,
            meta: ch.id,
          })
        })
        return json({ ok: true, reward, currency: 'NOIR', challenge: ch.name })
      },
    },
  },
})
