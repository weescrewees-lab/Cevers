import { createFileRoute } from '@tanstack/react-router'
import { persistAccount } from '@/lib/betService'
import { getSessionUser } from '@/lib/casino-auth'
import { createTx, creditWallet, debitWallet, withTx } from '@/lib/casino-db'
import { CURRENCIES, roundTo } from '@/lib/currencies'
import { json, readJson, tooMany } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { swapSchema, zodMessage } from '@/lib/validation'

export const Route = createFileRoute('/api/wallet/swap')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'Belum masuk' }, 401)
        const rl = rateLimit(`swap:${user.id}`, 20, 60_000)
        if (!rl.ok) return tooMany(rl.retryAfter)
        const parsed = swapSchema.safeParse(await readJson(request))
        if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400)
        const { from, to, amount } = parsed.data
        const fromCfg = CURRENCIES[from]
        const toCfg = CURRENCIES[to]
        if (!fromCfg || !toCfg || from === to) return json({ error: 'Pasangan swap tidak valid' }, 400)
        const usdIn = amount * fromCfg.usdRate
        const receive = roundTo(to, (usdIn * 0.995) / toCfg.usdRate)
        try {
          await withTx(async (sql) => {
            const ok = await debitWallet(sql, user.id, from, amount)
            if (!ok) throw new Error('INSUFFICIENT')
            await creditWallet(sql, user.id, to, receive)
            await createTx(sql, {
              userId: user.id,
              type: 'SWAP',
              currency: to,
              amount: receive,
              meta: `Swap ${amount} ${from} → ${receive} ${to}`,
            })
          })
        } catch (e) {
          if ((e as Error).message === 'INSUFFICIENT') return json({ error: 'Saldo tidak cukup' }, 402)
          throw e
        }
        void persistAccount(user.id)
        return json({ ok: true, receive, currency: to })
      },
    },
  },
})
