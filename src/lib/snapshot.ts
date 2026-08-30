import { z } from 'zod'
import {
  countBets,
  countTx,
  createBet,
  createTx,
  createUser,
  creditWallet,
  findUserById,
  findUserByIdOrUsername,
  getWalletBalance,
  listBets,
  listTransactions,
  updateUser,
  withTx,
  type CasinoUser,
} from '@/lib/casino-db'

const CURRENCY_RE = /^[A-Z]{2,6}$/
const GAME_RE = /^[a-z0-9-]{2,24}$/
const HASH_RE = /^[a-f0-9]{32}:[a-f0-9]{64}$/
const MAX_BALANCE = 1e12
const MAX_BETS = 250
const MAX_TX = 200

export const snapshotSchema = z.object({
  v: z.literal(1),
  ts: z.number().int().positive(),
  user: z.object({
    id: z.string().min(10).max(40),
    username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_.]+$/),
    email: z.string().email().nullable().optional(),
    passwordHash: z.string().regex(HASH_RE),
    serverSeed: z.string().min(16).max(128),
    clientSeed: z.string().min(8).max(64),
    nonce: z.number().int().min(0).max(10_000_000),
    totalWager: z.number().min(0).max(MAX_BALANCE),
    totalBets: z.number().int().min(0).max(10_000_000),
    lastFaucetAt: z.string().nullable().optional(),
    createdAt: z.string().min(4).max(40),
  }),
  wallets: z
    .array(
      z.object({
        currency: z.string().regex(CURRENCY_RE),
        balance: z.number().min(0).max(MAX_BALANCE),
      }),
    )
    .max(12),
  bets: z
    .array(
      z.object({
        id: z.string().min(10).max(40),
        game: z.string().regex(GAME_RE),
        currency: z.string().regex(CURRENCY_RE),
        amount: z.number().min(0).max(MAX_BALANCE),
        multiplier: z.number().min(0).max(1e6),
        payout: z.number().min(0).max(MAX_BALANCE),
        win: z.boolean(),
        state: z.string().max(2000).nullable().optional(),
        nonce: z.number().int().min(0).max(10_000_000).default(0),
        createdAt: z.string().min(4).max(40),
      }),
    )
    .max(MAX_BETS),
  transactions: z
    .array(
      z.object({
        id: z.string().min(10).max(40),
        type: z.string().max(24),
        currency: z.string().regex(CURRENCY_RE),
        amount: z.number().min(-MAX_BALANCE).max(MAX_BALANCE),
        meta: z.string().max(200).nullable().optional(),
        createdAt: z.string().min(4).max(40),
      }),
    )
    .max(MAX_TX),
})

export type Snapshot = z.infer<typeof snapshotSchema>

export async function buildSnapshot(userId: string): Promise<Snapshot | null> {
  const user = await findUserById(userId)
  if (!user || user.isBot) return null

  const [bets, transactions] = await Promise.all([listBets(userId, MAX_BETS), listTransactions(userId, MAX_TX)])

  return {
    v: 1,
    ts: Date.now(),
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      serverSeed: user.serverSeed,
      clientSeed: user.clientSeed,
      nonce: user.nonce,
      totalWager: user.totalWager,
      totalBets: user.totalBets,
      lastFaucetAt: user.lastFaucetAt ? user.lastFaucetAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
    },
    wallets: user.wallets.map((w) => ({ currency: w.currency, balance: w.balance })),
    bets: bets.map((b) => ({
      id: b.id,
      game: b.game,
      currency: b.currency,
      amount: b.amount,
      multiplier: b.multiplier,
      payout: b.payout,
      win: b.win,
      state: b.state,
      nonce: b.nonce,
      createdAt: (b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)).toISOString(),
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      currency: t.currency,
      amount: t.amount,
      meta: t.meta,
      createdAt: (t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt)).toISOString(),
    })),
  }
}

function safeDate(s: string): Date {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}

export async function restoreSnapshot(
  snap: Snapshot,
): Promise<{ id: string; username: string; created: boolean }> {
  for (const w of snap.wallets) if (w.currency === 'SHFL') w.currency = 'NOIR'
  for (const b of snap.bets) if (b.currency === 'SHFL') b.currency = 'NOIR'
  for (const t of snap.transactions) if (t.currency === 'SHFL') t.currency = 'NOIR'

  const existing = await findUserByIdOrUsername(snap.user.id, snap.user.username)

  if (existing && existing.isBot) throw new Error('Nama pengguna tidak tersedia')

  let overwriteIdentity = false
  if (existing && existing.passwordHash !== snap.user.passwordHash) {
    const [betCount, txCount] = await Promise.all([countBets(existing.id), countTx(existing.id)])
    if (betCount > 0 || txCount > 0) {
      throw new Error('Akun sudah ada di server dengan kata sandi berbeda — masuk dengan kata sandi server')
    }
    overwriteIdentity = true
  }

  if (existing) {
    const serverTs = existing.syncedAt ? existing.syncedAt.getTime() : existing.createdAt.getTime()
    if (snap.ts <= serverTs && !overwriteIdentity) {
      return { id: existing.id, username: existing.username, created: false }
    }

    await withTx(async (sql) => {
      await updateUser(
        existing.id,
        {
          email: snap.user.email ?? existing.email,
          ...(overwriteIdentity
            ? {
                passwordHash: snap.user.passwordHash,
                serverSeed: snap.user.serverSeed,
                clientSeed: snap.user.clientSeed,
              }
            : {}),
          nonce: Math.max(existing.nonce, snap.user.nonce),
          totalWager: Math.max(existing.totalWager, snap.user.totalWager),
          totalBets: Math.max(existing.totalBets, snap.user.totalBets),
          lastFaucetAt: snap.user.lastFaucetAt ? safeDate(snap.user.lastFaucetAt) : existing.lastFaucetAt,
          syncedAt: new Date(),
        },
        sql,
      )

      for (const w of snap.wallets) {
        const cur = existing.wallets.find((x) => x.currency === w.currency)
        const current = cur ? cur.balance : await getWalletBalance(sql, existing.id, w.currency)
        if (!cur) {
          await creditWallet(sql, existing.id, w.currency, w.balance)
        } else if (w.balance > current) {
          await creditWallet(sql, existing.id, w.currency, w.balance - current)
        }
      }

      for (const b of snap.bets) {
        await createBet(sql, {
          id: b.id,
          userId: existing.id,
          game: b.game,
          currency: b.currency,
          amount: b.amount,
          multiplier: b.multiplier,
          payout: b.payout,
          win: b.win,
          state: b.state ?? null,
          nonce: b.nonce,
          createdAt: safeDate(b.createdAt),
        })
      }
      for (const t of snap.transactions) {
        await createTx(sql, {
          id: t.id,
          userId: existing.id,
          type: t.type,
          currency: t.currency,
          amount: t.amount,
          meta: t.meta ?? null,
          createdAt: safeDate(t.createdAt),
        })
      }
    })

    return { id: existing.id, username: existing.username, created: false }
  }

  const created = await createUser({
    id: snap.user.id,
    username: snap.user.username,
    email: snap.user.email ?? null,
    passwordHash: snap.user.passwordHash,
    serverSeed: snap.user.serverSeed,
    clientSeed: snap.user.clientSeed,
    nonce: snap.user.nonce,
    totalWager: snap.user.totalWager,
    totalBets: snap.user.totalBets,
    lastFaucetAt: snap.user.lastFaucetAt ? safeDate(snap.user.lastFaucetAt) : null,
    createdAt: safeDate(snap.user.createdAt),
    wallets: snap.wallets,
  })

  await withTx(async (sql) => {
    await updateUser(created.id, { syncedAt: new Date() }, sql)
    for (const b of snap.bets) {
      await createBet(sql, {
        id: b.id,
        userId: created.id,
        game: b.game,
        currency: b.currency,
        amount: b.amount,
        multiplier: b.multiplier,
        payout: b.payout,
        win: b.win,
        state: b.state ?? null,
        nonce: b.nonce,
        createdAt: safeDate(b.createdAt),
      })
    }
    for (const t of snap.transactions) {
      await createTx(sql, {
        id: t.id,
        userId: created.id,
        type: t.type,
        currency: t.currency,
        amount: t.amount,
        meta: t.meta ?? null,
        createdAt: safeDate(t.createdAt),
      })
    }
  })

  return { id: created.id, username: created.username, created: true }
}

export type { CasinoUser }
