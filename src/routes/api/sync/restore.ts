import { createFileRoute } from '@tanstack/react-router'
import { sessionCookie } from '@/lib/casino-auth'
import { ensureSeed } from '@/lib/casino-db'
import { clientIp, json, readJson, tooMany } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { persistSnapshotFile } from '@/lib/serverHeal'
import { restoreSnapshot, snapshotSchema, type Snapshot } from '@/lib/snapshot'

export const Route = createFileRoute('/api/sync/restore')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = rateLimit(`syncr:${clientIp(request)}`, 6, 60_000)
        if (!rl.ok) return tooMany(rl.retryAfter)
        try {
          await ensureSeed()
          const raw = (await readJson(request)) as { snapshot?: unknown }
          const parsed = snapshotSchema.safeParse(raw?.snapshot)
          if (!parsed.success) return json({ error: 'Snapshot tidak valid' }, 400)
          const snap: Snapshot = parsed.data
          let merged
          try {
            merged = await restoreSnapshot(snap)
          } catch (e) {
            return json({ error: (e as Error).message }, 409)
          }
          await persistSnapshotFile(snap)
          return json(
            { id: merged.id, username: merged.username, restored: true, created: merged.created },
            200,
            { 'set-cookie': await sessionCookie(merged.id) },
          )
        } catch {
          return json({ error: 'Pemulihan gagal. Coba lagi.' }, 500)
        }
      },
    },
  },
})
