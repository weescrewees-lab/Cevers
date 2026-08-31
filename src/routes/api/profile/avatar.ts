import { put } from '@vercel/blob'
import { createFileRoute } from '@tanstack/react-router'
import { getSessionUser } from '@/lib/casino-auth'
import { q, updateUser } from '@/lib/casino-db'
import { json } from '@/lib/http'

export const Route = createFileRoute('/api/profile/avatar')({
  server: { handlers: { POST: async ({ request }) => {
    const user = await getSessionUser(request)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File) || !file.type.startsWith('image/') || file.size > 5_000_000) return json({ error: 'Foto harus berupa gambar maksimal 5MB' }, 400)
    const blob = await put(`cevers/avatars/${user.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, '-')}`, file, { access: 'private', addRandomSuffix: false })
    const sql = await q()
    await updateUser(user.id, { avatarPath: blob.pathname }, sql)
    return json({ pathname: blob.pathname })
  } } },
})
