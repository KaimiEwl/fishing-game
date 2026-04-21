ALTER TABLE public.player_mon_rewards
  ADD COLUMN IF NOT EXISTS created_by_wallet TEXT NULL,
  ADD COLUMN IF NOT EXISTS admin_note TEXT NULL;

CREATE TABLE IF NOT EXISTS public.player_cube_rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  cube_faces JSONB NOT NULL,
  target_face_index INTEGER NOT NULL,
  target_tile_index INTEGER NOT NULL,
  prize JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ NULL,
  CONSTRAINT player_cube_rolls_status_valid CHECK (status IN ('pending', 'applied', 'expired')),
  CONSTRAINT player_cube_rolls_face_index_valid CHECK (target_face_index BETWEEN 0 AND 5),
  CONSTRAINT player_cube_rolls_tile_index_valid CHECK (target_tile_index BETWEEN 0 AND 24)
);

CREATE INDEX IF NOT EXISTS idx_player_cube_rolls_wallet_status
  ON public.player_cube_rolls (wallet_address, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_player_cube_rolls_pending_per_player
  ON public.player_cube_rolls (player_id)
  WHERE status = 'pending';

ALTER TABLE public.player_cube_rolls ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'player_cube_rolls'
      AND policyname = 'Service role can manage player cube rolls'
  ) THEN
    CREATE POLICY "Service role can manage player cube rolls"
      ON public.player_cube_rolls
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.weekly_grill_payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_key TEXT NOT NULL UNIQUE,
  payouts JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount_mon NUMERIC(20, 8) NOT NULL DEFAULT 0,
  created_by_wallet TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT weekly_grill_payout_batches_total_non_negative CHECK (total_amount_mon >= 0),
  CONSTRAINT weekly_grill_payout_batches_week_key_not_empty CHECK (char_length(btrim(week_key)) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_weekly_grill_payout_batches_applied_at
  ON public.weekly_grill_payout_batches (applied_at DESC);

ALTER TABLE public.weekly_grill_payout_batches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'weekly_grill_payout_batches'
      AND policyname = 'Service role can manage weekly grill payout batches'
  ) THEN
    CREATE POLICY "Service role can manage weekly grill payout batches"
      ON public.weekly_grill_payout_batches
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.social_task_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  task_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  proof_url TEXT NULL,
  verified_by_wallet TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT social_task_verifications_status_valid
    CHECK (status IN ('available', 'pending_verification', 'verified', 'claimed')),
  CONSTRAINT social_task_verifications_task_id_not_empty CHECK (char_length(btrim(task_id)) >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_task_verifications_player_task
  ON public.social_task_verifications (player_id, task_id);

CREATE INDEX IF NOT EXISTS idx_social_task_verifications_wallet_status
  ON public.social_task_verifications (wallet_address, status, updated_at DESC);

ALTER TABLE public.social_task_verifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'social_task_verifications'
      AND policyname = 'Service role can manage social task verifications'
  ) THEN
    CREATE POLICY "Service role can manage social task verifications"
      ON public.social_task_verifications
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_social_task_verifications_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_social_task_verifications_updated_at
  ON public.social_task_verifications;

CREATE TRIGGER update_social_task_verifications_updated_at
BEFORE UPDATE ON public.social_task_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_social_task_verifications_updated_at();

CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  action_key TEXT NOT NULL,
  subject_key TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (action_key, subject_key, window_started_at),
  CONSTRAINT edge_rate_limits_hit_count_non_negative CHECK (hit_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_edge_rate_limits_subject_updated
  ON public.edge_rate_limits (subject_key, updated_at DESC);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'edge_rate_limits'
      AND policyname = 'Service role can manage edge rate limits'
  ) THEN
    CREATE POLICY "Service role can manage edge rate limits"
      ON public.edge_rate_limits
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  _action_key TEXT,
  _subject_key TEXT,
  _window_seconds INTEGER,
  _max_hits INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  hit_count INTEGER,
  window_started_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_started_at TIMESTAMPTZ;
  v_hit_count INTEGER;
BEGIN
  IF _window_seconds <= 0 THEN
    RAISE EXCEPTION 'window seconds must be positive';
  END IF;

  IF _max_hits <= 0 THEN
    RAISE EXCEPTION 'max hits must be positive';
  END IF;

  v_window_started_at := to_timestamp(
    floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds
  );

  INSERT INTO public.edge_rate_limits AS limits (
    action_key,
    subject_key,
    window_started_at,
    hit_count
  )
  VALUES (
    _action_key,
    _subject_key,
    v_window_started_at,
    1
  )
  ON CONFLICT (action_key, subject_key, window_started_at)
  DO UPDATE SET
    hit_count = limits.hit_count + 1,
    updated_at = now()
  RETURNING limits.hit_count INTO v_hit_count;

  RETURN QUERY
  SELECT
    v_hit_count <= _max_hits,
    v_hit_count,
    v_window_started_at;
END;
$$;

DROP POLICY IF EXISTS "Public can insert grill leaderboard" ON public.grill_leaderboard;
DROP POLICY IF EXISTS "Public can update grill leaderboard" ON public.grill_leaderboard;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'grill_leaderboard'
      AND policyname = 'Service role can manage grill leaderboard'
  ) THEN
    CREATE POLICY "Service role can manage grill leaderboard"
      ON public.grill_leaderboard
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
