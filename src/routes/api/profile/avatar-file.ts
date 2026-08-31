import { get } from '@vercel/blob'
import { createFileRoute } from '@tanstack/react-router'
import { getSessionUser } from '@/lib/casino-auth'

export const Route = createFileRoute('/api/profile/avatar-file')({
  server: { handlers: { GET: async ({ request }) => {
    const user = await getSessionUser(request)
    if (!user || !user.avatarPath) return new Response('Not found', { status: 404 })
    const result = await get(user.avatarPath, { access: 'private', ifNoneMatch: request.headers.get('if-none-match') ?? undefined })
    if (!result) return new Response('Not found', { status: 404 })
    if (result.statusCode === 304) return new Response(null, { status: 304, headers: { ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' } })
    return new Response(result.stream, { headers: { 'Content-Type': result.blob.contentType, ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' } })
  } } },
})
