import { createFileRoute } from '@tanstack/react-router'
import { createTx, createUser, findUserByUsername, q, ensureSeed } from '@/lib/casino-db'
import { hashPassword, sessionCookie } from '@/lib/casino-auth'
import { CURRENCY_LIST, FAUCET_AMOUNTS } from '@/lib/currencies'
import { generateSeed } from '@/lib/fair'
import { clientIp, json, readJson, tooMany } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { registerSchema, zodMessage } from '@/lib/validation'

export const Route = createFileRoute('/api/auth/register')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = rateLimit(`register:${clientIp(request)}`, 5, 60_000)
        if (!rl.ok) return tooMany(rl.retryAfter)
        try {
          await ensureSeed()
          const parsed = registerSchema.safeParse(await readJson(request))
          if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400)
          const { username, password, email } = parsed.data
          const exists = await findUserByUsername(username)
          if (exists) return json({ error: 'Nama pengguna sudah dipakai' }, 409)

          const user = await createUser({
            username,
            email: email ?? null,
            passwordHash: hashPassword(password),
            serverSeed: generateSeed(),
            clientSeed: generateSeed(16),
            wallets: CURRENCY_LIST.map((c) => ({ currency: c, balance: c === 'USDT' ? 100 : 0 })),
          })
          await createTx(await q(), {
            userId: user.id,
            type: 'BONUS',
            currency: 'USDT',
            amount: FAUCET_AMOUNTS.USDT,
            meta: 'Bonus pendaftaran',
          })
          return json(
            { id: user.id, username: user.username },
            200,
            { 'set-cookie': await sessionCookie(user.id) },
          )
        } catch {
          return json({ error: 'Gagal mendaftar. Coba lagi.' }, 500)
        }
      },
    },
  },
})
