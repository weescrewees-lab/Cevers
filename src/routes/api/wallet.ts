import { createFileRoute } from '@tanstack/react-router'
import { getSessionUser } from '@/lib/casino-auth'
import { listTransactions, listWallets } from '@/lib/casino-db'
import { CURRENCIES } from '@/lib/currencies'
import { json } from '@/lib/http'

export const Route = createFileRoute('/api/wallet')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'Belum masuk' }, 401)
        const [wallets, transactions] = await Promise.all([
          listWallets(user.id),
          listTransactions(user.id, 50),
        ])
        return json({
          wallets: wallets.map((w) => ({
            currency: w.currency,
            balance: w.balance,
            usdValue: w.balance * (CURRENCIES[w.currency]?.usdRate ?? 0),
          })),
          transactions,
        })
      },
    },
  },
})
