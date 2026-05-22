# Grill Leaderboard Backend Plan

Status: superseded by the owned Hook & Loot API.

The leaderboard now belongs on the Node API under `server/`, with data stored in the same SQLite volume as player state. The game frontend should call same-origin `/api/leaderboard/grill` and `/api/edge/player-actions`, not a third-party backend.

## Table

```sql
create table if not exists public.grill_leaderboard (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  nickname text,
  avatar_url text,
  grill_score integer not null default 0,
  daily_score integer not null default 0,
  weekly_score integer not null default 0,
  last_daily_key text,
  last_weekly_key text,
  updated_at timestamptz not null default now()
);
```

## Indexes

```sql
create index if not exists grill_leaderboard_score_idx
  on public.grill_leaderboard (grill_score desc);

create index if not exists grill_leaderboard_daily_idx
  on public.grill_leaderboard (daily_score desc);

create index if not exists grill_leaderboard_weekly_idx
  on public.grill_leaderboard (weekly_score desc);
```

## Sync Rule

Only verified wallets can publish score.

The owned API should verify the wallet session token and upsert:

- `wallet_address`
- `nickname`
- `avatar_url`
- `grill_score`
- `daily_score`
- `weekly_score`
- `updated_at`

Daily and weekly reset should happen server-side from date keys, not from browser time.
