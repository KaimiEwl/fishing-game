
ALTER TABLE public.players ADD COLUMN nickname text DEFAULT NULL;

-- Add length constraint via trigger
CREATE OR REPLACE FUNCTION public.validate_nickname()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.nickname IS NOT NULL THEN
    IF length(NEW.nickname) < 2 OR length(NEW.nickname) > 20 THEN
      RAISE EXCEPTION 'Nickname must be 2-20 characters';
    END IF;
    IF NEW.nickname !~ '^[a-zA-Z0-9а-яА-ЯёЁ_\-]+$' THEN
      RAISE EXCEPTION 'Nickname contains invalid characters';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_player_nickname
BEFORE INSERT OR UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.validate_nickname();
