CREATE TABLE IF NOT EXISTS public.premium_fishing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  price_mon NUMERIC(20, 8) NOT NULL DEFAULT 0,
  casts_total INTEGER NOT NULL,
  casts_used INTEGER NOT NULL DEFAULT 0,
  luck_meter_stacks INTEGER NOT NULL DEFAULT 0,
  zero_drop_streak INTEGER NOT NULL DEFAULT 0,
  rescue_eligible BOOLEAN NOT NULL DEFAULT false,
  recovered_mon_total NUMERIC(20, 8) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  CONSTRAINT premium_fishing_sessions_status_valid
    CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  CONSTRAINT premium_fishing_sessions_price_non_negative
    CHECK (price_mon >= 0),
  CONSTRAINT premium_fishing_sessions_casts_total_positive
    CHECK (casts_total > 0),
  CONSTRAINT premium_fishing_sessions_casts_used_valid
    CHECK (casts_used >= 0 AND casts_used <= casts_total),
  CONSTRAINT premium_fishing_sessions_luck_meter_non_negative
    CHECK (luck_meter_stacks >= 0),
  CONSTRAINT premium_fishing_sessions_zero_drop_non_negative
    CHECK (zero_drop_streak >= 0),
  CONSTRAINT premium_fishing_sessions_recovered_non_negative
    CHECK (recovered_mon_total >= 0),
  CONSTRAINT premium_fishing_sessions_wallet_not_empty
    CHECK (char_length(btrim(wallet_address)) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_premium_fishing_sessions_wallet_status_started
  ON public.premium_fishing_sessions (wallet_address, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_premium_fishing_sessions_player_started
  ON public.premium_fishing_sessions (player_id, started_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_fishing_sessions_active_per_player
  ON public.premium_fishing_sessions (player_id)
  WHERE status = 'active';

ALTER TABLE public.premium_fishing_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'premium_fishing_sessions'
      AND policyname = 'Service role can manage premium fishing sessions'
  ) THEN
    CREATE POLICY "Service role can manage premium fishing sessions"
      ON public.premium_fishing_sessions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.premium_fishing_casts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.premium_fishing_sessions(id) ON DELETE CASCADE,
  cast_index INTEGER NOT NULL,
  reaction_quality TEXT NOT NULL,
  fish_id TEXT NOT NULL,
  bonus_coins_awarded INTEGER NOT NULL DEFAULT 0,
  bonus_xp_awarded INTEGER NOT NULL DEFAULT 0,
  mon_drop_tier TEXT NOT NULL,
  mon_amount NUMERIC(20, 8) NOT NULL DEFAULT 0,
  luck_meter_before INTEGER NOT NULL DEFAULT 0,
  luck_meter_after INTEGER NOT NULL DEFAULT 0,
  zero_drop_streak_after INTEGER NOT NULL DEFAULT 0,
  pity_triggered BOOLEAN NOT NULL DEFAULT false,
  rescue_triggered BOOLEAN NOT NULL DEFAULT false,
  hot_streak_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT premium_fishing_casts_cast_index_positive
    CHECK (cast_index >= 1),
  CONSTRAINT premium_fishing_casts_reaction_quality_valid
    CHECK (reaction_quality IN ('miss', 'good', 'perfect')),
  CONSTRAINT premium_fishing_casts_fish_id_not_empty
    CHECK (char_length(btrim(fish_id)) >= 1),
  CONSTRAINT premium_fishing_casts_mon_drop_tier_valid
    CHECK (mon_drop_tier IN ('zero', 'small', 'medium', 'big', 'spike', 'jackpot')),
  CONSTRAINT premium_fishing_casts_bonus_coins_non_negative
    CHECK (bonus_coins_awarded >= 0),
  CONSTRAINT premium_fishing_casts_bonus_xp_non_negative
    CHECK (bonus_xp_awarded >= 0),
  CONSTRAINT premium_fishing_casts_mon_amount_non_negative
    CHECK (mon_amount >= 0),
  CONSTRAINT premium_fishing_casts_luck_meter_before_non_negative
    CHECK (luck_meter_before >= 0),
  CONSTRAINT premium_fishing_casts_luck_meter_after_non_negative
    CHECK (luck_meter_after >= 0),
  CONSTRAINT premium_fishing_casts_zero_drop_non_negative
    CHECK (zero_drop_streak_after >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_fishing_casts_session_cast
  ON public.premium_fishing_casts (session_id, cast_index);

CREATE INDEX IF NOT EXISTS idx_premium_fishing_casts_session_created
  ON public.premium_fishing_casts (session_id, created_at DESC);

ALTER TABLE public.premium_fishing_casts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'premium_fishing_casts'
      AND policyname = 'Service role can manage premium fishing casts'
  ) THEN
    CREATE POLICY "Service role can manage premium fishing casts"
      ON public.premium_fishing_casts
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
