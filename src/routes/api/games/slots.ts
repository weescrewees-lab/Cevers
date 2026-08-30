import { createFileRoute } from '@tanstack/react-router'
import { handleSimpleGame } from '@/lib/game-api'
import { SLOT_THEMES, spinSlots } from '@/lib/games'
import { slotsSchema } from '@/lib/validation'

export const Route = createFileRoute('/api/games/slots')({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleSimpleGame(request, 'slots', slotsSchema, (d, rng) => {
          const t = SLOT_THEMES.find((s) => s.id === d.theme) || SLOT_THEMES[0]
          return spinSlots(rng, t)
        }),
    },
  },
})
