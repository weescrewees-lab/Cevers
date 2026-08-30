import { z } from 'zod'
import { getSessionUser } from '@/lib/casino-auth'
import { executeBet, GameError } from '@/lib/betService'
import { json, readJson, tooMany } from '@/lib/http'
import { rateLimit } from '@/lib/rateLimit'
import { zodMessage } from '@/lib/validation'
import type { BetResult } from '@/lib/games'

export async function handleSimpleGame<T extends z.ZodType>(
  request: Request,
  game: string,
  schema: T,
  play: (data: z.infer<T>, rng: () => number) => BetResult,
): Promise<Response> {
  const user = await getSessionUser(request)
  if (!user) return json({ error: 'Silakan masuk dulu' }, 401)
  const rl = rateLimit(`game:${user.id}`, 120, 60_000)
  if (!rl.ok) return tooMany(rl.retryAfter)
  try {
    const parsed = schema.safeParse(await readJson(request))
    if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400)
    const data = parsed.data as z.infer<T> & { currency: string; amount: number }
    const { result, balance, payout } = await executeBet(user.id, game, data.currency, data.amount, (rng) =>
      play(data, rng),
    )
    return json({ ...result, balance, payout })
  } catch (e) {
    if (e instanceof GameError) return json({ error: e.message }, e.status)
    return json({ error: 'Terjadi kesalahan' }, 500)
  }
}
