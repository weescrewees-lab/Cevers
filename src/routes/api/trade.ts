import { createFileRoute } from '@tanstack/react-router'
import { getSessionUser } from '@/lib/casino-auth'
import { creditWallet, createTx, debitWallet, findUserByUsername, newId, withTx } from '@/lib/casino-db'
import { CURRENCIES } from '@/lib/currencies'
import { json } from '@/lib/http'

export const Route = createFileRoute('/api/trade')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sender = await getSessionUser(request)
        if (!sender) return json({ error: 'Belum masuk' }, 401)
        const body = (await request.json().catch(() => null)) as { username?: string; currency?: string; amount?: number; idempotencyKey?: string } | null
        const username = body?.username?.trim()
        const currency = body?.currency?.toUpperCase()
        const amount = Number(body?.amount)
        const key = body?.idempotencyKey?.trim() || newId()
        const cfg = currency ? CURRENCIES[currency] : null
        if (!username || !currency || !cfg || !Number.isFinite(amount) || amount <= 0 || amount > 1000000000) return json({ error: 'Data trade tidak valid' }, 400)
        if (username.toLowerCase() === sender.username.toLowerCase()) return json({ error: 'Tidak bisa trade ke akun sendiri' }, 400)
        const recipient = await findUserByUsername(username)
        if (!recipient || recipient.isBot) return json({ error: 'Player asli tidak ditemukan' }, 404)
        try {
          const result = await withTx(async (sql) => {
            const existing = await sql.query<{ id: string; status: string }>('select id, status from casino_trades where idempotency_key = $1 limit 1', [key])
            if (existing[0]) return existing[0]
            const debited = await debitWallet(sql, sender.id, currency, amount)
            if (!debited) throw new Error('Saldo tidak mencukupi')
            await creditWallet(sql, recipient.id, currency, amount)
            const id = newId()
            await sql.query('insert into casino_trades (id, sender_id, recipient_id, currency, amount, status, idempotency_key, expires_at, completed_at) values ($1,$2,$3,$4,$5,$6,$7,now() + interval \'1 day\',now())', [id, sender.id, recipient.id, currency, amount, 'completed', key])
            await createTx(sql, { userId: sender.id, type: 'TRADE_SENT', currency, amount: -amount, meta: `Kirim ke ${recipient.username}` })
            await createTx(sql, { userId: recipient.id, type: 'TRADE_RECEIVED', currency, amount, meta: `Diterima dari ${sender.username}` })
            return { id, status: 'completed' }
          })
          return json({ ok: true, ...result, recipient: recipient.username, currency, amount })
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : 'Trade gagal' }, 400)
        }
      },
    },
  },
})
