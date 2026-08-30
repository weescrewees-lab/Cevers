import { createFileRoute } from '@tanstack/react-router'
import { handleSimpleGame } from '@/lib/game-api'
import { playKeno } from '@/lib/games'
import { kenoSchema } from '@/lib/validation'

export const Route = createFileRoute('/api/games/keno')({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleSimpleGame(request, 'keno', kenoSchema, (d, rng) => playKeno(rng, Array.from(new Set(d.picks)))),
    },
  },
})
