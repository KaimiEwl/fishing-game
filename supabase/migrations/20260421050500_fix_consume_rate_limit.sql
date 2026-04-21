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
  ON CONFLICT ON CONSTRAINT edge_rate_limits_pkey
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
