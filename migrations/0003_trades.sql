create table if not exists casino_trades (
  id text primary key,
  sender_id text not null references casino_users(id) on delete cascade,
  recipient_id text not null references casino_users(id) on delete cascade,
  currency text not null,
  amount double precision not null check (amount > 0),
  status text not null default 'pending',
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz
);

create index if not exists casino_bets_live_idx on casino_bets (created_at desc) where user_id is not null;
