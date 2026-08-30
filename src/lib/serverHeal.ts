import { findUserByIdOrUsername, findUserByUsername, loadAllBackups, loadBackup, persistBackup } from '@/lib/casino-db'
import { restoreSnapshot, snapshotSchema, type Snapshot } from '@/lib/snapshot'

export async function persistSnapshotFile(snap: Snapshot): Promise<void> {
  await persistBackup(snap.user.username, snap)
}

function parseSnap(raw: unknown): Snapshot | null {
  const parsed = snapshotSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

const healedUsernames = new Set<string>()

export async function healUser(username: string): Promise<boolean> {
  const key = username.toLowerCase()
  if (healedUsernames.has(key)) return false
  healedUsernames.add(key)
  try {
    const exists = await findUserByUsername(username)
    if (exists) return false
    const snap = parseSnap(await loadBackup(username))
    if (!snap) return false
    await restoreSnapshot(snap)
    return true
  } catch {
    return false
  }
}

let healedAll = false

export async function healAllMissingUsers(): Promise<void> {
  if (healedAll) return
  healedAll = true
  try {
    const all = await loadAllBackups()
    for (const raw of all) {
      try {
        const snap = parseSnap(raw)
        if (!snap) continue
        const exists = await findUserByIdOrUsername(snap.user.id, snap.user.username)
        if (exists) continue
        await restoreSnapshot(snap)
      } catch {
        // satu cadangan bermasalah tidak boleh menghentikan yang lain
      }
    }
  } catch {
    // best-effort
  }
}
