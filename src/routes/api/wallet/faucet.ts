import { createFileRoute } from '@tanstack/react-router'
import { persistAccount } from '@/lib/betService'
import { getSessionUser } from '@/lib/casino-auth'
import { claimReward, createTx, creditWallet, withTx } from '@/lib/casino-db'
import { FAUCET_AMOUNTS } from '@/lib/currencies'
import { json, readJson, tooMany } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { faucetSchema, zodMessage } from '@/lib/validation'

export const Route = createFileRoute('/api/wallet/faucet')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'Belum masuk' }, 401)
        const rl = rateLimit(`faucet:${user.id}`, 10, 60_000)
        if (!rl.ok) return tooMany(rl.retryAfter)
        const parsed = faucetSchema.safeParse(await readJson(request))
        if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400)
        const currency = parsed.data.currency
        const amount = FAUCET_AMOUNTS[currency]
        if (!amount) return json({ error: 'Mata uang tidak tersedia' }, 400)
        const txId = await withTx(async (sql) => {
          const claimed = await claimReward(sql, user.id, 'welcome-250')
          if (!claimed) throw new Error('Bonus 250 sudah pernah diklaim')
          await creditWallet(sql, user.id, currency, amount)
          return createTx(sql, {
            userId: user.id,
            type: 'FAUCET',
            currency,
            amount,
            meta: 'Bonus welcome 250 USDT — satu kali per akun',
          })
        })
        void persistAccount(user.id)
        return json({ ok: true, currency, amount, transactionId: txId })
      },
    },
  },
})
