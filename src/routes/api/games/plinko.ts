import { createFileRoute } from '@tanstack/react-router'
import { handleSimpleGame } from '@/lib/game-api'
import { playPlinko } from '@/lib/games'
import { plinkoSchema } from '@/lib/validation'

export const Route = createFileRoute('/api/games/plinko')({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleSimpleGame(request, 'plinko', plinkoSchema, (d, rng) => playPlinko(rng, d.risk)),
    },
  },
})
