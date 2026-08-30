alter table casino_users add column if not exists luck_level integer not null default 0;
create index if not exists casino_reward_claims_user_key_idx on casino_reward_claims (user_id, reward_key);
