CREATE TABLE IF NOT EXISTS public.player_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by_wallet TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ NULL,
  CONSTRAINT player_messages_title_not_empty CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CONSTRAINT player_messages_body_not_empty CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS idx_player_messages_player_created_at
  ON public.player_messages (player_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_messages_player_unread
  ON public.player_messages (player_id, read_at, created_at DESC);

ALTER TABLE public.player_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'player_messages'
      AND policyname = 'Service role can manage player messages'
  ) THEN
    CREATE POLICY "Service role can manage player messages"
      ON public.player_messages
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
