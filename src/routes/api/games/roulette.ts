import { createFileRoute } from '@tanstack/react-router'
import { handleSimpleGame } from '@/lib/game-api'
import { playRoulette, type RouletteBet } from '@/lib/games'
import { rouletteSchema } from '@/lib/validation'

export const Route = createFileRoute('/api/games/roulette')({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleSimpleGame(request, 'roulette', rouletteSchema, (d, rng) =>
          playRoulette(rng, d.bets as RouletteBet[]),
        ),
    },
  },
})
