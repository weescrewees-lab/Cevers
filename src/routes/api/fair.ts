import { createFileRoute } from '@tanstack/react-router'
import { getSessionUser } from '@/lib/casino-auth'
import { updateUser } from '@/lib/casino-db'
import { generateSeed, hashSeed } from '@/lib/fair'
import { json, readJson, tooMany } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { fairRotateSchema, zodMessage } from '@/lib/validation'

export const Route = createFileRoute('/api/fair')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'Belum masuk' }, 401)
        return json({
          serverSeedHashed: hashSeed(user.serverSeed),
          clientSeed: user.clientSeed,
          nonce: user.nonce,
        })
      },
      POST: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'Belum masuk' }, 401)
        const rl = rateLimit(`fair:${user.id}`, 10, 60_000)
        if (!rl.ok) return tooMany(rl.retryAfter)
        const parsed = fairRotateSchema.safeParse(await readJson(request))
        if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400)
        const newClientSeed = parsed.data.clientSeed ?? generateSeed(16)
        const serverSeed = generateSeed()
        await updateUser(user.id, { serverSeed, clientSeed: newClientSeed, nonce: 0 })
        return json({
          revealedSeed: user.serverSeed,
          serverSeedHashed: hashSeed(serverSeed),
          clientSeed: newClientSeed,
          nonce: 0,
        })
      },
    },
  },
})
