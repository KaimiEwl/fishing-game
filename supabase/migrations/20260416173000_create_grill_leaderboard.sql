CREATE TABLE IF NOT EXISTS public.grill_leaderboard (
  id text PRIMARY KEY,
  name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  dishes integer NOT NULL DEFAULT 0,
  wallet_address text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grill_leaderboard_score_idx
  ON public.grill_leaderboard (score DESC, updated_at DESC);

ALTER TABLE public.grill_leaderboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read grill leaderboard" ON public.grill_leaderboard;
CREATE POLICY "Public can read grill leaderboard"
  ON public.grill_leaderboard
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can insert grill leaderboard" ON public.grill_leaderboard;
CREATE POLICY "Public can insert grill leaderboard"
  ON public.grill_leaderboard
  FOR INSERT
  WITH CHECK (
    char_length(trim(name)) BETWEEN 1 AND 24
    AND score >= 0
    AND dishes >= 0
  );

DROP POLICY IF EXISTS "Public can update grill leaderboard" ON public.grill_leaderboard;
CREATE POLICY "Public can update grill leaderboard"
  ON public.grill_leaderboard
  FOR UPDATE
  USING (true)
  WITH CHECK (
    char_length(trim(name)) BETWEEN 1 AND 24
    AND score >= 0
    AND dishes >= 0
  );

CREATE OR REPLACE FUNCTION public.update_grill_leaderboard_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_grill_leaderboard_updated_at ON public.grill_leaderboard;
CREATE TRIGGER update_grill_leaderboard_updated_at
BEFORE UPDATE ON public.grill_leaderboard
FOR EACH ROW
EXECUTE FUNCTION public.update_grill_leaderboard_updated_at();
