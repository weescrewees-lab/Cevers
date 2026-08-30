import { createFileRoute } from '@tanstack/react-router'
import { handleSimpleGame } from '@/lib/game-api'
import { playDice } from '@/lib/games'
import { diceSchema } from '@/lib/validation'

export const Route = createFileRoute('/api/games/dice')({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleSimpleGame(request, 'dice', diceSchema, (d, rng) => playDice(rng, d.target, d.direction)),
    },
  },
})
