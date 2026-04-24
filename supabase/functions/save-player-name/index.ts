import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySessionToken } from "../_shared/session.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PLAYER_SELECT = 'wallet_address, coins, bait, daily_free_bait, daily_free_bait_reset_at, bonus_bait_granted_total, level, xp, xp_to_next, rod_level, equipped_rod, inventory, cooked_dishes, game_progress, total_catches, login_streak, nft_rods, nickname, avatar_url, referrer_wallet_address, rewarded_referral_count, updated_at';
const NICKNAME_REGEX = /^[a-zA-Z0-9а-яА-ЯёЁ_-]{2,20}$/u;

const normalizeWalletAddress = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? trimmed.toLowerCase() : null;
};

const normalizeNickname = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 20);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      wallet_address,
      session_token,
      nickname,
    } = await req.json();

    const normalizedWalletAddress = normalizeWalletAddress(wallet_address);
    const normalizedNickname = normalizeNickname(nickname);

    if (!normalizedWalletAddress || !session_token || !normalizedNickname) {
      return new Response(
        JSON.stringify({ error: 'Missing wallet address, session, or nickname' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!NICKNAME_REGEX.test(normalizedNickname)) {
      return new Response(
        JSON.stringify({ error: 'Use 2-20 letters, digits, _ or -.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!(await verifySessionToken(session_token, normalizedWalletAddress))) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    await enforceRateLimit(supabase, {
      actionKey: 'save_player_name',
      subjectKey: normalizedWalletAddress,
      windowSeconds: 60,
      maxHits: 20,
    });

    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update({ nickname: normalizedNickname })
      .eq('wallet_address', normalizedWalletAddress)
      .select(PLAYER_SELECT)
      .single();

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ player: updatedPlayer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Save player name error:', error);

    const message = error instanceof Error && error.message.trim()
      ? error.message
      : 'Could not save player name';

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
