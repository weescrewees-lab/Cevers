import crypto from 'node:crypto'
import { dbSource, getPglite, getSql, type Sql } from '@/lib/db'
import { CURRENCY_LIST } from '@/lib/currencies'
import { generateSeed } from '@/lib/fair'

export function newId(): string {
  return crypto.randomBytes(16).toString('hex')
}

export type CasinoUser = {
  id: string
  username: string
  email: string | null
  passwordHash: string
  serverSeed: string
  clientSeed: string
  nonce: number
  totalWager: number
  totalBets: number
  lastFaucetAt: Date | null
  isBot: boolean
  createdAt: Date
  syncedAt: Date | null
  wallets: CasinoWallet[]
}

export type CasinoWallet = {
  id: string
  userId: string
  currency: string
  balance: number
}

export type CasinoBet = {
  id: string
  userId: string
  game: string
  currency: string
  amount: number
  multiplier: number
  payout: number
  win: boolean
  state: string | null
  nonce: number
  createdAt: Date
  username?: string
}

export type CasinoTx = {
  id: string
  userId: string
  type: string
  currency: string
  amount: number
  meta: string | null
  createdAt: Date
}

export type MinesRow = {
  id: string
  userId: string
  currency: string
  amount: number
  mines: number
  revealed: string
  mineSpots: string
  active: boolean
  nonce: number
}

export type BlackjackRow = {
  id: string
  userId: string
  currency: string
  baseAmount: number
  playerCards: string
  dealerCards: string
  phase: string
  doubled: boolean
}

type UserRaw = {
  id: string
  username: string
  email: string | null
  passwordHash: string
  serverSeed: string
  clientSeed: string
  nonce: number
  totalWager: number
  totalBets: number
  lastFaucetAt: Date | string | null
  isBot: boolean
  createdAt: Date | string
  syncedAt: Date | string | null
}

const USER_COLS = `id, username, email,
  password_hash as "passwordHash",
  server_seed as "serverSeed",
  client_seed as "clientSeed",
  nonce,
  total_wager as "totalWager",
  total_bets as "totalBets",
  last_faucet_at as "lastFaucetAt",
  is_bot as "isBot",
  created_at as "createdAt",
  synced_at as "syncedAt"`

function asDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function mapUser(row: UserRaw, wallets: CasinoWallet[] = []): CasinoUser {
  return {
    ...row,
    lastFaucetAt: asDate(row.lastFaucetAt),
    createdAt: asDate(row.createdAt) ?? new Date(0),
    syncedAt: asDate(row.syncedAt),
    wallets,
  }
}

const WALLET_COLS = `id, user_id as "userId", currency, balance`

const BET_COLS = `id, user_id as "userId", game, currency, amount, multiplier, payout, win, state, nonce, created_at as "createdAt"`

const TX_COLS = `id, user_id as "userId", type, currency, amount, meta, created_at as "createdAt"`

const globalRef = globalThis as typeof globalThis & {
  __casinoNeonPool__?: import('pg').Pool
}

async function neonPool(): Promise<import('pg').Pool> {
  if (!globalRef.__casinoNeonPool__) {
    const { Pool, types } = await import('pg')
    types.setTypeParser(20, Number)
    globalRef.__casinoNeonPool__ = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return globalRef.__casinoNeonPool__
}

function clientSql(queryFn: (text: string, params: unknown[]) => Promise<unknown[]>): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0]
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`
    return queryFn(text, values) as Promise<T[]>
  }) as unknown as Sql
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    queryFn(text, params) as Promise<T[]>
  return sql
}

export async function withTx<T>(fn: (sql: Sql) => Promise<T>): Promise<T> {
  if (dbSource === 'pglite') {
    const pg = await getPglite()
    return pg.transaction(async (tx) => {
      const sql = clientSql(async (text, params) => {
        const result = await tx.query(text, params)
        return result.rows as unknown[]
      })
      return fn(sql)
    })
  }
  const pool = await neonPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const sql = clientSql(async (text, params) => {
      const result = await client.query(text, params)
      return result.rows as unknown[]
    })
    const out = await fn(sql)
    await client.query('COMMIT')
    return out
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // ignore
    }
    throw err
  } finally {
    client.release()
  }
}

export async function q(): Promise<Sql> {
  return getSql()
}

async function walletsOf(sql: Sql, userId: string): Promise<CasinoWallet[]> {
  return sql.query<CasinoWallet>(
    `select ${WALLET_COLS} from casino_wallets where user_id = $1 order by currency`,
    [userId],
  )
}

export async function findUserByUsername(username: string, sql?: Sql): Promise<CasinoUser | null> {
  const db = sql ?? (await q())
  const rows = await db.query<UserRaw>(
    `select ${USER_COLS} from casino_users where username = $1 limit 1`,
    [username],
  )
  if (!rows[0]) return null
  return mapUser(rows[0], await walletsOf(db, rows[0].id))
}

export async function findUserById(id: string, sql?: Sql): Promise<CasinoUser | null> {
  const db = sql ?? (await q())
  const rows = await db.query<UserRaw>(`select ${USER_COLS} from casino_users where id = $1 limit 1`, [id])
  if (!rows[0]) return null
  return mapUser(rows[0], await walletsOf(db, rows[0].id))
}

export async function findUserByIdOrUsername(id: string, username: string): Promise<CasinoUser | null> {
  const db = await q()
  const rows = await db.query<UserRaw>(
    `select ${USER_COLS} from casino_users where id = $1 or username = $2 limit 1`,
    [id, username],
  )
  if (!rows[0]) return null
  return mapUser(rows[0], await walletsOf(db, rows[0].id))
}

export async function createUser(input: {
  id?: string
  username: string
  email?: string | null
  passwordHash: string
  serverSeed: string
  clientSeed: string
  nonce?: number
  totalWager?: number
  totalBets?: number
  lastFaucetAt?: Date | null
  createdAt?: Date
  isBot?: boolean
  wallets?: { currency: string; balance: number }[]
}): Promise<CasinoUser> {
  const id = input.id ?? newId()
  const wallets = input.wallets ?? CURRENCY_LIST.map((c) => ({ currency: c, balance: c === 'USDT' ? 500 : 0 }))
  await withTx(async (sql) => {
    await sql.query(
      `insert into casino_users
        (id, username, email, password_hash, server_seed, client_seed, nonce, total_wager, total_bets, last_faucet_at, is_bot, created_at, synced_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,coalesce($12, now()), now())`,
      [
        id,
        input.username,
        input.email ?? null,
        input.passwordHash,
        input.serverSeed,
        input.clientSeed,
        input.nonce ?? 0,
        input.totalWager ?? 0,
        input.totalBets ?? 0,
        input.lastFaucetAt ?? null,
        input.isBot ?? false,
        input.createdAt ?? null,
      ],
    )
    for (const w of wallets) {
      await sql.query(
        `insert into casino_wallets (id, user_id, currency, balance) values ($1,$2,$3,$4)
         on conflict (user_id, currency) do update set balance = excluded.balance`,
        [newId(), id, w.currency, w.balance],
      )
    }
  })
  const user = await findUserById(id)
  if (!user) throw new Error('Gagal membuat akun')
  return user
}

export async function updateUser(
  id: string,
  data: Partial<{
    email: string | null
    passwordHash: string
    serverSeed: string
    clientSeed: string
    nonce: number
    totalWager: number
    totalBets: number
    lastFaucetAt: Date | null
    syncedAt: Date | null
  }>,
  sql?: Sql,
): Promise<void> {
  const db = sql ?? (await q())
  const sets: string[] = []
  const params: unknown[] = []
  const add = (col: string, val: unknown) => {
    params.push(val)
    sets.push(`${col} = $${params.length}`)
  }
  if (data.email !== undefined) add('email', data.email)
  if (data.passwordHash !== undefined) add('password_hash', data.passwordHash)
  if (data.serverSeed !== undefined) add('server_seed', data.serverSeed)
  if (data.clientSeed !== undefined) add('client_seed', data.clientSeed)
  if (data.nonce !== undefined) add('nonce', data.nonce)
  if (data.totalWager !== undefined) add('total_wager', data.totalWager)
  if (data.totalBets !== undefined) add('total_bets', data.totalBets)
  if (data.lastFaucetAt !== undefined) add('last_faucet_at', data.lastFaucetAt)
  if (data.syncedAt !== undefined) add('synced_at', data.syncedAt)
  if (sets.length === 0) return
  params.push(id)
  await db.query(`update casino_users set ${sets.join(', ')} where id = $${params.length}`, params)
}

export async function debitWallet(
  sql: Sql,
  userId: string,
  currency: string,
  amount: number,
): Promise<boolean> {
  const rows = await sql.query<{ id: string }>(
    `update casino_wallets set balance = balance - $3
     where user_id = $1 and currency = $2 and balance >= $3
     returning id`,
    [userId, currency, amount],
  )
  return rows.length > 0
}

export async function creditWallet(
  sql: Sql,
  userId: string,
  currency: string,
  amount: number,
): Promise<number> {
  const rows = await sql.query<{ balance: number }>(
    `insert into casino_wallets (id, user_id, currency, balance)
     values ($1,$2,$3,$4)
     on conflict (user_id, currency) do update set balance = casino_wallets.balance + excluded.balance
     returning balance`,
    [newId(), userId, currency, amount],
  )
  return rows[0]?.balance ?? 0
}

export async function getWalletBalance(
  sql: Sql,
  userId: string,
  currency: string,
): Promise<number> {
  const rows = await sql.query<{ balance: number }>(
    `select balance from casino_wallets where user_id = $1 and currency = $2`,
    [userId, currency],
  )
  return rows[0]?.balance ?? 0
}

export async function createBet(
  sql: Sql,
  data: {
    id?: string
    userId: string
    game: string
    currency: string
    amount: number
    multiplier: number
    payout: number
    win: boolean
    state?: string | null
    nonce: number
    createdAt?: Date
  },
): Promise<string> {
  const id = data.id ?? newId()
  await sql.query(
    `insert into casino_bets
      (id, user_id, game, currency, amount, multiplier, payout, win, state, nonce, created_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,coalesce($11, now()))
     on conflict (id) do nothing`,
    [
      id,
      data.userId,
      data.game,
      data.currency,
      data.amount,
      data.multiplier,
      data.payout,
      data.win,
      data.state ?? null,
      data.nonce,
      data.createdAt ?? null,
    ],
  )
  return id
}

export async function createTx(
  sql: Sql,
  data: {
    id?: string
    userId: string
    type: string
    currency: string
    amount: number
    meta?: string | null
    createdAt?: Date
  },
): Promise<string> {
  const id = data.id ?? newId()
  await sql.query(
    `insert into casino_transactions (id, user_id, type, currency, amount, meta, created_at)
     values ($1,$2,$3,$4,$5,$6,coalesce($7, now()))
     on conflict (id) do nothing`,
    [id, data.userId, data.type, data.currency, data.amount, data.meta ?? null, data.createdAt ?? null],
  )
  return id
}

export async function listWallets(userId: string): Promise<CasinoWallet[]> {
  return walletsOf(await q(), userId)
}

export async function listBets(userId: string, take = 50): Promise<CasinoBet[]> {
  const db = await q()
  const rows = await db.query<CasinoBet>(
    `select ${BET_COLS} from casino_bets where user_id = $1 order by created_at desc limit $2`,
    [userId, take],
  )
  return rows
}

export async function listTransactions(userId: string, take = 50): Promise<CasinoTx[]> {
  const db = await q()
  return db.query<CasinoTx>(
    `select ${TX_COLS} from casino_transactions where user_id = $1 order by created_at desc limit $2`,
    [userId, take],
  )
}

export async function listFeed(take = 25): Promise<(CasinoBet & { username: string })[]> {
  const db = await q()
  return db.query<CasinoBet & { username: string }>(
    `select b.id, b.user_id as "userId", b.game, b.currency, b.amount, b.multiplier, b.payout, b.win, b.state, b.nonce,
            b.created_at as "createdAt", u.username
            from casino_bets b
     join casino_users u on u.id = b.user_id
     where u.is_bot = false
     order by b.created_at desc
     limit $1`,
    [take],
  )
}

export async function listBots(): Promise<CasinoUser[]> {
  const db = await q()
  const rows = await db.query<UserRaw>(`select ${USER_COLS} from casino_users where is_bot = true`)
  const out: CasinoUser[] = []
  for (const r of rows) out.push(mapUser(r, await walletsOf(db, r.id)))
  return out
}

export async function countBets(userId: string): Promise<number> {
  const db = await q()
  const rows = await db.query<{ n: number }>(`select count(*)::int as n from casino_bets where user_id = $1`, [
    userId,
  ])
  return rows[0]?.n ?? 0
}

export async function countTx(userId: string): Promise<number> {
  const db = await q()
  const rows = await db.query<{ n: number }>(
    `select count(*)::int as n from casino_transactions where user_id = $1`,
    [userId],
  )
  return rows[0]?.n ?? 0
}

export async function claimReward(sql: Sql, userId: string, rewardKey: string): Promise<boolean> {
  const rows = await sql.query<{ user_id: string }>(
    `insert into casino_reward_claims (user_id, reward_key) values ($1, $2)
     on conflict (user_id, reward_key) do nothing returning user_id`,
    [userId, rewardKey],
  )
  return rows.length > 0
}

export async function hasRewardClaim(sql: Sql, userId: string, rewardKey: string): Promise<boolean> {
  const rows = await sql.query<{ user_id: string }>(`select user_id from casino_reward_claims where user_id = $1 and reward_key = $2 limit 1`, [userId, rewardKey])
  return rows.length > 0
}

export async function challengeClaims(userId: string): Promise<string[]> {
  const db = await q()
  const rows = await db.query<{ meta: string | null }>(
    `select meta from casino_transactions where user_id = $1 and type = 'CHALLENGE'`,
    [userId],
  )
  return rows.map((r) => r.meta).filter((m): m is string => !!m)
}

export async function findChallengeClaim(userId: string, id: string): Promise<boolean> {
  const db = await q()
  const rows = await db.query<{ id: string }>(
    `select id from casino_transactions where user_id = $1 and type = 'CHALLENGE' and meta = $2 limit 1`,
    [userId, id],
  )
  return rows.length > 0
}

export async function getMines(userId: string): Promise<MinesRow | null> {
  const db = await q()
  const rows = await db.query<MinesRow>(
    `select id, user_id as "userId", currency, amount, mines, revealed, mine_spots as "mineSpots", active, nonce
     from casino_mines where user_id = $1`,
    [userId],
  )
  return rows[0] ?? null
}

export async function upsertMines(data: {
  userId: string
  currency: string
  amount: number
  mines: number
  revealed: string
  mineSpots: string
  active: boolean
  nonce: number
}): Promise<void> {
  const db = await q()
  await db.query(
    `insert into casino_mines (id, user_id, currency, amount, mines, revealed, mine_spots, active, nonce)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (user_id) do update set
       currency = excluded.currency,
       amount = excluded.amount,
       mines = excluded.mines,
       revealed = excluded.revealed,
       mine_spots = excluded.mine_spots,
       active = excluded.active,
       nonce = excluded.nonce`,
    [newId(), data.userId, data.currency, data.amount, data.mines, data.revealed, data.mineSpots, data.active, data.nonce],
  )
}

export async function updateMines(
  userId: string,
  data: Partial<{ revealed: string; active: boolean }>,
  sql?: Sql,
): Promise<void> {
  const db = sql ?? (await q())
  if (data.revealed !== undefined && data.active !== undefined) {
    await db.query(`update casino_mines set revealed = $2, active = $3 where user_id = $1`, [
      userId,
      data.revealed,
      data.active,
    ])
  } else if (data.revealed !== undefined) {
    await db.query(`update casino_mines set revealed = $2 where user_id = $1`, [userId, data.revealed])
  } else if (data.active !== undefined) {
    await db.query(`update casino_mines set active = $2 where user_id = $1`, [userId, data.active])
  }
}

export async function getBlackjack(userId: string): Promise<BlackjackRow | null> {
  const db = await q()
  const rows = await db.query<BlackjackRow>(
    `select id, user_id as "userId", currency, base_amount as "baseAmount",
            player_cards as "playerCards", dealer_cards as "dealerCards", phase, doubled
     from casino_blackjack where user_id = $1`,
    [userId],
  )
  return rows[0] ?? null
}

export async function createBlackjack(data: {
  userId: string
  currency: string
  baseAmount: number
  playerCards: string
  dealerCards: string
  phase: string
  doubled?: boolean
}): Promise<void> {
  const db = await q()
  await db.query(
    `insert into casino_blackjack (id, user_id, currency, base_amount, player_cards, dealer_cards, phase, doubled)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      newId(),
      data.userId,
      data.currency,
      data.baseAmount,
      data.playerCards,
      data.dealerCards,
      data.phase,
      data.doubled ?? false,
    ],
  )
}

export async function updateBlackjack(
  userId: string,
  data: Partial<{ playerCards: string; dealerCards: string; phase: string; doubled: boolean }>,
): Promise<void> {
  const db = await q()
  const sets: string[] = []
  const params: unknown[] = []
  const add = (col: string, val: unknown) => {
    params.push(val)
    sets.push(`${col} = $${params.length}`)
  }
  if (data.playerCards !== undefined) add('player_cards', data.playerCards)
  if (data.dealerCards !== undefined) add('dealer_cards', data.dealerCards)
  if (data.phase !== undefined) add('phase', data.phase)
  if (data.doubled !== undefined) add('doubled', data.doubled)
  if (sets.length === 0) return
  params.push(userId)
  await db.query(`update casino_blackjack set ${sets.join(', ')} where user_id = $${params.length}`, params)
}

export async function deleteBlackjack(userId: string, sql?: Sql): Promise<void> {
  const db = sql ?? (await q())
  await db.query(`delete from casino_blackjack where user_id = $1`, [userId])
}

export async function persistBackup(username: string, snapshot: unknown): Promise<void> {
  try {
    const db = await q()
    await db.query(
      `insert into casino_account_backups (username, snapshot, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (username) do update set snapshot = excluded.snapshot, updated_at = now()`,
      [username.toLowerCase(), JSON.stringify(snapshot)],
    )
  } catch {
    // best-effort
  }
}

export async function loadBackup(username: string): Promise<unknown | null> {
  try {
    const db = await q()
    const rows = await db.query<{ snapshot: unknown }>(
      `select snapshot from casino_account_backups where username = $1`,
      [username.toLowerCase()],
    )
    return rows[0]?.snapshot ?? null
  } catch {
    return null
  }
}

export async function loadAllBackups(): Promise<unknown[]> {
  try {
    const db = await q()
    const rows = await db.query<{ snapshot: unknown }>(`select snapshot from casino_account_backups`)
    return rows.map((r) => r.snapshot)
  } catch {
    return []
  }
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await q()
  const rows = await db.query<{ value: string }>(`select value from casino_app_meta where key = $1`, [key])
  return rows[0]?.value ?? null
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await q()
  await db.query(
    `insert into casino_app_meta (key, value) values ($1,$2)
     on conflict (key) do update set value = excluded.value`,
    [key, value],
  )
}

function hashPasswordLocal(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

const BOTS: { username: string; cur: string; bal: number }[] = [
  { username: 'DragonRaja88', cur: 'BTC', bal: 0.412 },
  { username: 'MacanBet', cur: 'USDT', bal: 8420 },
  { username: 'Sultan_MAXWIN', cur: 'SOL', bal: 96.5 },
  { username: 'Untung777', cur: 'ETH', bal: 2.31 },
  { username: 'ZeusGacor', cur: 'USDT', bal: 15320 },
  { username: 'PetirMerah_x', cur: 'NOIR', bal: 92100 },
  { username: 'KsatriaCrypto', cur: 'BTC', bal: 0.158 },
  { username: 'RajaKoi_99', cur: 'SOL', bal: 212.4 },
]

let seedPromise: Promise<void> | null = null

export async function ensureSeed(): Promise<void> {
  if (seedPromise) return seedPromise
  seedPromise = (async () => {
    const db = await q()
    const existing = await db.query<{ n: number }>(`select count(*)::int as n from casino_users`)
    if ((existing[0]?.n ?? 0) > 0) return

    for (const b of BOTS) {
      await createUser({
        username: b.username,
        passwordHash: hashPasswordLocal(crypto.randomBytes(12).toString('hex')),
        serverSeed: generateSeed(),
        clientSeed: generateSeed(16),
        isBot: true,
        totalWager: Math.floor(Math.random() * 500000) + 50000,
        totalBets: Math.floor(Math.random() * 9000) + 1000,
        wallets: [{ currency: b.cur, balance: b.bal }],
      })
    }

    await createUser({
      username: 'demo',
      email: 'demo@noir.local',
      passwordHash: hashPasswordLocal('demo1234'),
      serverSeed: generateSeed(),
      clientSeed: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      wallets: [
        { currency: 'USDT', balance: 10000 },
        { currency: 'BTC', balance: 0.5 },
        { currency: 'ETH', balance: 5 },
        { currency: 'SOL', balance: 100 },
        { currency: 'NOIR', balance: 50000 },
        { currency: 'TRX', balance: 25000 },
      ],
    })

    const bots = await listBots()
    const games = ['dice', 'limbo', 'mines', 'plinko', 'keno', 'blackjack', 'roulette', 'slots']
    const sql = await q()
    for (let i = 0; i < 40; i++) {
      const u = bots[Math.floor(Math.random() * bots.length)]
      if (!u) continue
      const game = games[Math.floor(Math.random() * games.length)]
      const mult = [0, 0, 0.5, 1.2, 1.96, 2.4, 8.5, 24.7][Math.floor(Math.random() * 8)]
      const amount = Math.floor(Math.random() * 500) + 10
      await createBet(sql, {
        userId: u.id,
        game,
        currency: 'USDT',
        amount,
        multiplier: mult,
        payout: 0,
        win: mult >= 1,
        state: '{}',
        nonce: i + 1,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 3600) * 1000),
      })
    }
  })().catch((err) => {
    seedPromise = null
    throw err
  })
  return seedPromise
}
