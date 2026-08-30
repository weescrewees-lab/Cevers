import { createFileRoute } from '@tanstack/react-router'
import { handleSimpleGame } from '@/lib/game-api'
import { playLimbo } from '@/lib/games'
import { limboSchema } from '@/lib/validation'

export const Route = createFileRoute('/api/games/limbo')({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleSimpleGame(request, 'limbo', limboSchema, (d, rng) => playLimbo(rng, d.target)),
    },
  },
})
