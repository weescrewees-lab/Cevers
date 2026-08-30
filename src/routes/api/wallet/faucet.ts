import { createFileRoute } from '@tanstack/react-router'
import { persistAccount } from '@/lib/betService'
import { getSessionUser } from '@/lib/casino-auth'
import { createTx, creditWallet, updateUser, withTx } from '@/lib/casino-db'
import { FAUCET_AMOUNTS, FAUCET_COOLDOWN_MS } from '@/lib/currencies'
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
        if (user.lastFaucetAt && Date.now() - user.lastFaucetAt.getTime() < FAUCET_COOLDOWN_MS) {
          const wait = Math.ceil((FAUCET_COOLDOWN_MS - (Date.now() - user.lastFaucetAt.getTime())) / 1000)
          return json({ error: `Tunggu ${wait} detik lagi untuk klaim berikutnya` }, 429)
        }
        const parsed = faucetSchema.safeParse(await readJson(request))
        if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400)
        const currency = parsed.data.currency
        const amount = FAUCET_AMOUNTS[currency]
        if (!amount) return json({ error: 'Mata uang tidak tersedia' }, 400)
        const txId = await withTx(async (sql) => {
          await creditWallet(sql, user.id, currency, amount)
          await updateUser(user.id, { lastFaucetAt: new Date() }, sql)
          return createTx(sql, {
            userId: user.id,
            type: 'FAUCET',
            currency,
            amount,
            meta: 'Klaim faucet gratis',
          })
        })
        void persistAccount(user.id)
        return json({ ok: true, currency, amount, transactionId: txId })
      },
    },
  },
})
