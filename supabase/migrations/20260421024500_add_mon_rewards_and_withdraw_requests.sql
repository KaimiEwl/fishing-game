CREATE TABLE IF NOT EXISTS public.player_mon_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  amount_mon NUMERIC(20, 8) NOT NULL,
  source_type TEXT NOT NULL,
  source_ref TEXT NULL,
  hold_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT player_mon_rewards_amount_positive CHECK (amount_mon > 0),
  CONSTRAINT player_mon_rewards_source_type_not_empty CHECK (char_length(btrim(source_type)) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_player_mon_rewards_wallet_hold
  ON public.player_mon_rewards (wallet_address, hold_until DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_mon_rewards_player_created
  ON public.player_mon_rewards (player_id, created_at DESC);

ALTER TABLE public.player_mon_rewards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'player_mon_rewards'
      AND policyname = 'Service role can manage player mon rewards'
  ) THEN
    CREATE POLICY "Service role can manage player mon rewards"
      ON public.player_mon_rewards
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.mon_withdraw_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  amount_mon NUMERIC(20, 8) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NULL,
  payout_tx_hash TEXT NULL,
  processed_by_wallet TEXT NULL,
  admin_note TEXT NULL,
  CONSTRAINT mon_withdraw_requests_amount_positive CHECK (amount_mon > 0),
  CONSTRAINT mon_withdraw_requests_status_valid CHECK (status IN ('pending', 'approved', 'rejected', 'paid'))
);

CREATE INDEX IF NOT EXISTS idx_mon_withdraw_requests_wallet_status
  ON public.mon_withdraw_requests (wallet_address, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_mon_withdraw_requests_player_requested
  ON public.mon_withdraw_requests (player_id, requested_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mon_withdraw_requests_active_per_player
  ON public.mon_withdraw_requests (player_id)
  WHERE status IN ('pending', 'approved');

ALTER TABLE public.mon_withdraw_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mon_withdraw_requests'
      AND policyname = 'Service role can manage mon withdraw requests'
  ) THEN
    CREATE POLICY "Service role can manage mon withdraw requests"
      ON public.mon_withdraw_requests
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
