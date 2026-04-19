import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashMessage, recoverAddress } from "npm:viem@2.21.0";
import { createSessionToken, verifySessionToken } from "../_shared/session.ts";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DAILY_FREE_BAIT = 30;
const WALLET_BAIT_BONUS = 10;
const REFERRAL_BAIT_BONUS = 10;
const MAX_REWARDED_REFERRALS = 10;

const readFlag = (value: string | undefined, fallback: boolean) => {
  if (!value) return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const BAIT_BUCKETS_V2_ENABLED = readFlag(Deno.env.get('BAIT_BUCKETS_V2_ENABLED'), true);
const WALLET_BAIT_BONUS_ENABLED = readFlag(Deno.env.get('WALLET_BAIT_BONUS_ENABLED'), true);
const REFERRAL_BAIT_ENABLED = readFlag(Deno.env.get('REFERRAL_BAIT_ENABLED'), true);

const normalizeWalletAddress = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? trimmed.toLowerCase() : null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      wallet_address,
      signature,
      message,
      player_data,
      session_token,
      referrer_wallet_address,
    } = await req.json();

    if (!wallet_address) {
      return new Response(
        JSON.stringify({ error: 'Missing wallet address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const normalizedAddress = normalizeWalletAddress(wallet_address);
    const normalizedReferrer = normalizeWalletAddress(referrer_wallet_address);
    if (!normalizedAddress) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const loadProcessedPlayer = async (referrer: string | null = null) => {
      const { data, error } = await supabase
        .rpc('process_wallet_login', {
          _wallet_address: normalizedAddress,
          _daily_free_bait: DAILY_FREE_BAIT,
          _wallet_bait_bonus: WALLET_BAIT_BONUS,
          _referral_bait_bonus: REFERRAL_BAIT_BONUS,
          _max_rewarded_referrals: MAX_REWARDED_REFERRALS,
          _apply_daily_reset: BAIT_BUCKETS_V2_ENABLED,
          _apply_wallet_bonus: WALLET_BAIT_BONUS_ENABLED,
          _apply_referral: REFERRAL_BAIT_ENABLED,
          _referrer_wallet_address: referrer,
        })
        .single();

      if (error) throw error;
      return data;
    };

    // This endpoint is auth/session-only. Economy state must not be accepted from the client.
    if (player_data) {
      return new Response(
        JSON.stringify({ error: 'Player progress updates are not accepted by this endpoint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (session_token && !signature) {
      if (!(await verifySessionToken(session_token, normalizedAddress))) {
        return new Response(
          JSON.stringify({ error: 'Invalid session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const player = await loadProcessedPlayer();

      if (!player) {
        return new Response(
          JSON.stringify({ error: 'Player not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const refreshedToken = await createSessionToken(normalizedAddress);

      return new Response(
        JSON.stringify({ player, isNew: false, session_token: refreshedToken }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!signature || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing signature or message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let recoveredAddress: string;
    try {
      recoveredAddress = await recoverAddress({
        hash: hashMessage(message),
        signature: signature as `0x${string}`,
      });
    } catch (error) {
      console.error('Signature recovery failed:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      return new Response(
        JSON.stringify({ error: 'Signature does not match wallet address' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('wallet_address', normalizedAddress)
      .maybeSingle();

    const newPlayer = await loadProcessedPlayer(normalizedReferrer);
    const sessionToken = await createSessionToken(normalizedAddress);

    return new Response(
      JSON.stringify({ player: newPlayer, isNew: !existing, session_token: sessionToken }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Verification error:', error);

    const message = error instanceof Error ? error.message : '';
    let userMessage = 'An error occurred during verification';

    if (message.includes('duplicate')) {
      userMessage = 'This wallet is already registered';
    } else if (message.includes('Invalid') || message.includes('missing')) {
      userMessage = 'Invalid data provided';
    }

    return new Response(
      JSON.stringify({ error: userMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
