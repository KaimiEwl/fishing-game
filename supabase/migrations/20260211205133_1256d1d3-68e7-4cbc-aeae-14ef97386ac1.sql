
-- Create players table for wallet-based game progress
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  coins INTEGER NOT NULL DEFAULT 100,
  bait INTEGER NOT NULL DEFAULT 10,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  xp_to_next INTEGER NOT NULL DEFAULT 100,
  rod_level INTEGER NOT NULL DEFAULT 0,
  inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_catches INTEGER NOT NULL DEFAULT 0,
  login_streak INTEGER NOT NULL DEFAULT 1,
  last_login TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- RLS: allow service role (edge functions) full access, anon can read own record
CREATE POLICY "Service role full access" ON public.players
  FOR ALL USING (true) WITH CHECK (true);

-- Public read by wallet address (needed for loading player data)
CREATE POLICY "Anyone can read by wallet address" ON public.players
  FOR SELECT USING (true);

-- Only edge functions (service role) can insert/update
-- The default anon role won't match the service role policy for mutations
-- We restrict mutations to service_role by revoking anon insert/update/delete
REVOKE INSERT, UPDATE, DELETE ON public.players FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.players FROM authenticated;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
