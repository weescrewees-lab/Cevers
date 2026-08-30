import { createFileRoute } from '@tanstack/react-router'
import { getSessionUser } from '@/lib/casino-auth'
import { clientIp, json, tooMany } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { persistSnapshotFile } from '@/lib/serverHeal'
import { buildSnapshot } from '@/lib/snapshot'

export const Route = createFileRoute('/api/sync/snapshot')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const rl = rateLimit(`syncs:${clientIp(request)}`, 30, 60_000)
        if (!rl.ok) return tooMany(rl.retryAfter)
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'Tidak terautentikasi' }, 401)
        const snapshot = await buildSnapshot(user.id)
        if (!snapshot) return json({ error: 'Snapshot tidak tersedia' }, 404)
        await persistSnapshotFile(snapshot)
        return json({ snapshot })
      },
    },
  },
})
