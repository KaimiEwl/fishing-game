CREATE TABLE IF NOT EXISTS public.player_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL DEFAULT 'client',
  before_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  delta_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_audit_logs_wallet_created_at
  ON public.player_audit_logs (wallet_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_audit_logs_event_type_created_at
  ON public.player_audit_logs (event_type, created_at DESC);

ALTER TABLE public.player_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'player_audit_logs'
      AND policyname = 'Service role can manage player audit logs'
  ) THEN
    CREATE POLICY "Service role can manage player audit logs"
      ON public.player_audit_logs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
