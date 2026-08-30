-- NOIR casino: durable per-account storage (coins, bets, seeds).
-- Survives deploys via Neon; preview uses PGLite + client PermaSync restore.

create table if not exists casino_users (
  id text primary key,
  username text not null unique,
  email text unique,
  password_hash text not null,
  server_seed text not null,
  client_seed text not null default '00000000000000000000000000000000',
  nonce integer not null default 0,
  total_wager double precision not null default 0,
  total_bets integer not null default 0,
  last_faucet_at timestamptz,
  is_bot boolean not null default false,
  created_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists casino_wallets (
  id text primary key,
  user_id text not null references casino_users(id) on delete cascade,
  currency text not null,
  balance double precision not null default 0,
  unique (user_id, currency)
);

create table if not exists casino_bets (
  id text primary key,
  user_id text not null references casino_users(id) on delete cascade,
  game text not null,
  currency text not null,
  amount double precision not null,
  multiplier double precision not null default 0,
  payout double precision not null default 0,
  win boolean not null default false,
  state text,
  nonce integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists casino_bets_created_idx on casino_bets (created_at desc);
create index if not exists casino_bets_user_created_idx on casino_bets (user_id, created_at desc);

create table if not exists casino_transactions (
  id text primary key,
  user_id text not null references casino_users(id) on delete cascade,
  type text not null,
  currency text not null,
  amount double precision not null,
  meta text,
  created_at timestamptz not null default now()
);
create index if not exists casino_tx_user_created_idx on casino_transactions (user_id, created_at desc);

create table if not exists casino_mines (
  id text primary key,
  user_id text not null unique references casino_users(id) on delete cascade,
  currency text not null,
  amount double precision not null,
  mines integer not null,
  revealed text not null default '[]',
  mine_spots text not null,
  active boolean not null default true,
  nonce integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists casino_blackjack (
  id text primary key,
  user_id text not null unique references casino_users(id) on delete cascade,
  currency text not null,
  base_amount double precision not null,
  player_cards text not null,
  dealer_cards text not null,
  phase text not null default 'PLAYER',
  doubled boolean not null default false,
  created_at timestamptz not null default now()
);

-- Server-side account snapshots. Replaces filesystem db/perma/*.json
-- which cannot persist on serverless deploys.
create table if not exists casino_account_backups (
  username text primary key,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists casino_app_meta (
  key text primary key,
  value text not null
);
