import { createFileRoute } from '@tanstack/react-router'
import { clearSessionCookie } from '@/lib/casino-auth'
import { json } from '@/lib/http'

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: async () => json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() }),
    },
  },
})
