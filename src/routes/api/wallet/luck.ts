import { createFileRoute } from '@tanstack/react-router'
import { persistAccount } from '@/lib/betService'
import { getSessionUser } from '@/lib/casino-auth'
import { claimReward, createTx, debitWallet, withTx } from '@/lib/casino-db'
import { json } from '@/lib/http'

const PRICE = 750

export const Route = createFileRoute('/api/wallet/luck')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'Belum masuk' }, 401)
        try {
          await withTx(async (sql) => {
            const claimed = await claimReward(sql, user.id, 'cevers-luck-1')
            if (!claimed) throw new Error('Asset Lucky sudah dimiliki')
            if (!(await debitWallet(sql, user.id, 'USDT', PRICE))) throw new Error(`Saldo USDT harus minimal ${PRICE}`)
            await createTx(sql, { userId: user.id, type: 'ASSET', currency: 'USDT', amount: -PRICE, meta: 'CEVERS Lucky Asset — peluang ekstra aktif' })
          })
          void persistAccount(user.id)
          return json({ ok: true, price: PRICE })
        } catch (error) {
          return json({ error: (error as Error).message }, 400)
        }
      },
    },
  },
})
