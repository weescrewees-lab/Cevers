import { createFileRoute } from '@tanstack/react-router'
import { findUserByUsername, ensureSeed } from '@/lib/casino-db'
import { sessionCookie, verifyPassword } from '@/lib/casino-auth'
import { clientIp, json, readJson, tooMany } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { healUser } from '@/lib/serverHeal'
import { loginSchema, zodMessage } from '@/lib/validation'

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = rateLimit(`login:${clientIp(request)}`, 10, 60_000)
        if (!rl.ok) return tooMany(rl.retryAfter)
        try {
          await ensureSeed()
          const parsed = loginSchema.safeParse(await readJson(request))
          if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400)
          const { username, password } = parsed.data
          const rlUser = rateLimit(`loginu:${username.toLowerCase()}`, 8, 300_000)
          if (!rlUser.ok) return tooMany(rlUser.retryAfter)

          let user = await findUserByUsername(username)
          if (!user) {
            const healed = await healUser(username)
            if (healed) user = await findUserByUsername(username)
          }
          if (!user || !verifyPassword(password, user.passwordHash)) {
            return json({ error: 'Nama pengguna atau kata sandi salah' }, 401)
          }
          return json(
            { id: user.id, username: user.username },
            200,
            { 'set-cookie': await sessionCookie(user.id) },
          )
        } catch {
          return json({ error: 'Gagal masuk. Coba lagi.' }, 500)
        }
      },
    },
  },
})
