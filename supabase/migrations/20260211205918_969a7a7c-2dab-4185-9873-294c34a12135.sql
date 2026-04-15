
-- Remove public SELECT policy - edge function uses service role anyway
DROP POLICY IF EXISTS "Anyone can read by wallet address" ON public.players;
