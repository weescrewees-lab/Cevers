import { createFileRoute } from '@tanstack/react-router'
import { getSessionUser } from '@/lib/casino-auth'
import { hashSeed } from '@/lib/fair'
import { json } from '@/lib/http'
import { healAllMissingUsers } from '@/lib/serverHeal'

export const Route = createFileRoute('/api/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let user = await getSessionUser(request)
        if (!user) {
          await healAllMissingUsers()
          user = await getSessionUser(request)
        }
        if (!user) return json({ user: null }, 401)
        return json({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            totalWager: user.totalWager,
            totalBets: user.totalBets,
            lastFaucetAt: user.lastFaucetAt,
            avatarPath: user.avatarPath ? `/api/profile/avatar-file?pathname=${encodeURIComponent(user.avatarPath)}` : null,
            verification: user.username === 'cevs' ? 'blue' : user.verification,
            wallets: user.wallets.map((w) => ({ currency: w.currency, balance: w.balance })),
            fair: {
              serverSeedHashed: hashSeed(user.serverSeed),
              clientSeed: user.clientSeed,
              nonce: user.nonce,
            },
          },
        })
      },
    },
  },
})
