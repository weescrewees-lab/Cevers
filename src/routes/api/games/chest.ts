import { createFileRoute } from '@tanstack/react-router'
import { handleSimpleGame } from '@/lib/game-api'
import { playChest } from '@/lib/games'
import { chestSchema } from '@/lib/validation'

export const Route = createFileRoute('/api/games/chest')({
  server: { handlers: { POST: ({ request }) => handleSimpleGame(request, 'chest', chestSchema, (_d, rng) => playChest(rng)) } },
})
