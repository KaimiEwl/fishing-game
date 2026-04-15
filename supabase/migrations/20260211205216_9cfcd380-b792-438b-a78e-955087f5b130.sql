
-- Remove overly permissive policy - service_role bypasses RLS anyway
DROP POLICY "Service role full access" ON public.players;
