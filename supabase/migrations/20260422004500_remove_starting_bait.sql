ALTER TABLE public.players
  ALTER COLUMN bait SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.process_wallet_login(
  _wallet_address TEXT,
  _daily_free_bait INTEGER,
  _wallet_bait_bonus INTEGER,
  _referral_bait_bonus INTEGER,
  _max_rewarded_referrals INTEGER,
  _apply_daily_reset BOOLEAN DEFAULT TRUE,
  _apply_wallet_bonus BOOLEAN DEFAULT TRUE,
  _apply_referral BOOLEAN DEFAULT TRUE,
  _referrer_wallet_address TEXT DEFAULT NULL
)
RETURNS public.players
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  player_row public.players%ROWTYPE;
  inviter_row public.players%ROWTYPE;
  utc_day_start TIMESTAMPTZ;
  normalized_wallet TEXT;
  normalized_referrer TEXT;
BEGIN
  normalized_wallet := lower(trim(_wallet_address));
  normalized_referrer := NULLIF(lower(trim(COALESCE(_referrer_wallet_address, ''))), '');
  utc_day_start := timezone('UTC', date_trunc('day', timezone('UTC', now())));

  SELECT *
  INTO player_row
  FROM public.players
  WHERE wallet_address = normalized_wallet
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.players (wallet_address, bait)
    VALUES (normalized_wallet, 0)
    RETURNING * INTO player_row;
  END IF;

  IF _apply_daily_reset AND (
    player_row.daily_free_bait_reset_at IS NULL
    OR player_row.daily_free_bait_reset_at < utc_day_start
  ) THEN
    UPDATE public.players
    SET daily_free_bait = _daily_free_bait,
        daily_free_bait_reset_at = utc_day_start
    WHERE id = player_row.id
    RETURNING * INTO player_row;
  END IF;

  IF _apply_wallet_bonus AND _wallet_bait_bonus > 0 AND NOT player_row.wallet_bait_bonus_claimed THEN
    UPDATE public.players
    SET bait = bait + _wallet_bait_bonus,
        wallet_bait_bonus_claimed = TRUE,
        bonus_bait_granted_total = bonus_bait_granted_total + _wallet_bait_bonus
    WHERE id = player_row.id
    RETURNING * INTO player_row;
  END IF;

  IF _apply_referral
    AND normalized_referrer IS NOT NULL
    AND normalized_referrer <> normalized_wallet
    AND player_row.referrer_wallet_address IS NULL
  THEN
    SELECT *
    INTO inviter_row
    FROM public.players
    WHERE wallet_address = normalized_referrer
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.players
      SET referrer_wallet_address = normalized_referrer
      WHERE id = player_row.id
      RETURNING * INTO player_row;

      IF NOT player_row.referral_reward_granted
        AND inviter_row.rewarded_referral_count < _max_rewarded_referrals
      THEN
        UPDATE public.players
        SET bait = bait + _referral_bait_bonus,
            rewarded_referral_count = rewarded_referral_count + 1,
            bonus_bait_granted_total = bonus_bait_granted_total + _referral_bait_bonus
        WHERE id = inviter_row.id;

        UPDATE public.players
        SET referral_reward_granted = TRUE
        WHERE id = player_row.id
        RETURNING * INTO player_row;
      END IF;
    END IF;
  END IF;

  UPDATE public.players
  SET last_login = now()
  WHERE id = player_row.id
  RETURNING * INTO player_row;

  RETURN player_row;
END;
$$;
