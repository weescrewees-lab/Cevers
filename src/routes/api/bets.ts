import { createFileRoute } from '@tanstack/react-router'
import { getSessionUser } from '@/lib/casino-auth'
import { listBets } from '@/lib/casino-db'
import { json } from '@/lib/http'

export const Route = createFileRoute('/api/bets')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'Belum masuk' }, 401)
        const bets = await listBets(user.id, 50)
        return json({ bets })
      },
    },
  },
})
