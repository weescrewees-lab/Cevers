import { createFileRoute } from '@tanstack/react-router'
import { listFeed } from '@/lib/casino-db'
import { json } from '@/lib/http'

export const Route = createFileRoute('/api/feed')({
  server: {
    handlers: {
      GET: async () => {
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
