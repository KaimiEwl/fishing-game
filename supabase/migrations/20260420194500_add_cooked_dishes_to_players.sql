ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS cooked_dishes JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS game_progress JSONB NOT NULL DEFAULT '{}'::jsonb;
