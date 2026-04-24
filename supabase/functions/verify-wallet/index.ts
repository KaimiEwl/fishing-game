import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashMessage, recoverAddress } from "npm:viem@2.21.0";
import { createSessionToken, verifySessionToken } from "../_shared/session.ts";
import {
  insertPlayerAuditLog,
  sanitizeAuditSnapshot,
} from "../_shared/playerAudit.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DAILY_FREE_BAIT = 30;
const WALLET_BAIT_BONUS = 0;
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
const PLAYER_AUDIT_LOGS_ENABLED = readFlag(Deno.env.get('PLAYER_AUDIT_LOGS_ENABLED'), true);
const FULL_PLAYER_SELECT = 'wallet_address, coins, bait, daily_free_bait, daily_free_bait_reset_at, bonus_bait_granted_total, level, xp, xp_to_next, rod_level, equipped_rod, inventory, cooked_dishes, game_progress, total_catches, login_streak, nft_rods, nickname, avatar_url, wallet_bait_bonus_claimed, referrer_wallet_address, rewarded_referral_count, referral_reward_granted, updated_at';

const normalizeWalletAddress = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? trimmed.toLowerCase() : null;
};

interface PlayerLoginState {
  wallet_address: string;
  coins: number;
  bait: number;
  daily_free_bait: number;
  daily_free_bait_reset_at?: string | null;
  bonus_bait_granted_total?: number;
  level?: number;
  xp_to_next?: number;
  inventory?: unknown[];
  cooked_dishes: unknown[];
  game_progress?: Record<string, unknown> | null;
  xp: number;
  total_catches: number;
  login_streak?: number;
  nft_rods?: unknown;
  nickname?: string | null;
  avatar_url?: string | null;
  rod_level: number;
  equipped_rod: number;
  wallet_bait_bonus_claimed: boolean;
  referrer_wallet_address: string | null;
  rewarded_referral_count: number;
  referral_reward_granted: boolean;
  updated_at?: string;
}

interface ReferralRewardSummary {
  invitedWalletAddress: string | null;
  invitedPlayerName: string | null;
  rewardBait: number;
  createdAt: string;
}

const buildNewPlayerBaseline = (walletAddress: string): PlayerLoginState => ({
  wallet_address: walletAddress,
  coins: 100,
  bait: 0,
  daily_free_bait: DAILY_FREE_BAIT,
  daily_free_bait_reset_at: null,
  bonus_bait_granted_total: 0,
  level: 1,
  xp_to_next: 100,
  inventory: [],
  cooked_dishes: [],
  game_progress: {},
  xp: 0,
  total_catches: 0,
  login_streak: 1,
  nft_rods: [],
  nickname: null,
  avatar_url: null,
  rod_level: 0,
  equipped_rod: 0,
  wallet_bait_bonus_claimed: false,
  referrer_wallet_address: null,
  rewarded_referral_count: 0,
  referral_reward_granted: false,
});

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

    await enforceRateLimit(supabase, {
      actionKey: 'verify_wallet',
      subjectKey: normalizedAddress,
      windowSeconds: 60,
      maxHits: 24,
    });

    const fetchPlayerLoginState = async (walletAddress: string) => {
      const { data, error } = await supabase
        .from('players')
        .select(FULL_PLAYER_SELECT)
        .eq('wallet_address', walletAddress)
        .maybeSingle();

      if (error) throw error;
      return (data as PlayerLoginState | null);
    };

    const fetchLatestReferralReward = async (
      walletAddress: string,
    ): Promise<ReferralRewardSummary | null> => {
      if (!REFERRAL_BAIT_ENABLED) return null;

      const { data, error } = await supabase
        .from('player_audit_logs')
        .select('created_at, metadata')
        .eq('wallet_address', walletAddress)
        .eq('event_type', 'referral_bait_reward')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const metadata = (data.metadata ?? {}) as Record<string, unknown>;
      const invitedWalletAddress = normalizeWalletAddress(
        typeof metadata.invitedWalletAddress === 'string'
          ? metadata.invitedWalletAddress
          : null,
      );

      let invitedPlayerName: string | null = null;
      if (invitedWalletAddress) {
        const { data: invitedPlayer, error: invitedError } = await supabase
          .from('players')
          .select('nickname')
          .eq('wallet_address', invitedWalletAddress)
          .maybeSingle();

        if (invitedError) {
          const details = typeof invitedError === 'object' && invitedError
            ? JSON.stringify(invitedError)
            : '';
          if (!details.includes('players.nickname')) {
            throw invitedError;
          }
        } else {
          invitedPlayerName = invitedPlayer?.nickname?.trim() || null;
        }
      }

      return {
        invitedWalletAddress,
        invitedPlayerName,
        rewardBait: typeof metadata.rewardBait === 'number'
          ? metadata.rewardBait
          : REFERRAL_BAIT_BONUS,
        createdAt: data.created_at,
      };
    };

    const fetchTodayReferralAttachCount = async (referrerWalletAddress: string) => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const { data, error } = await supabase
        .from('player_audit_logs')
        .select('metadata')
        .eq('event_type', 'referrer_attached')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      if (error) throw error;

      return (data ?? []).reduce((count, row) => {
        const metadata = row && typeof row === 'object'
          ? (row as Record<string, unknown>).metadata as Record<string, unknown> | null
          : null;
        const attachedReferrer = typeof metadata?.referrerWalletAddress === 'string'
          ? metadata.referrerWalletAddress.toLowerCase()
          : null;
        return attachedReferrer === referrerWalletAddress ? count + 1 : count;
      }, 0);
    };

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

    const fetchProcessedPlayer = async (walletAddress: string) => {
      const { data, error } = await supabase
        .from('players')
        .select(FULL_PLAYER_SELECT)
        .eq('wallet_address', walletAddress)
        .single();

      if (error) throw error;
      return data as PlayerLoginState;
    };

    const logWalletSideEffects = async ({
      beforePlayer,
      afterPlayer,
      beforeInviter,
      afterInviter,
    }: {
      beforePlayer: PlayerLoginState | null;
      afterPlayer: PlayerLoginState;
      beforeInviter: PlayerLoginState | null;
      afterInviter: PlayerLoginState | null;
    }) => {
      if (!PLAYER_AUDIT_LOGS_ENABLED) return;

      const playerBaseline = beforePlayer ?? buildNewPlayerBaseline(normalizedAddress);

      if (
        BAIT_BUCKETS_V2_ENABLED
        && afterPlayer.daily_free_bait === DAILY_FREE_BAIT
        && playerBaseline.daily_free_bait !== afterPlayer.daily_free_bait
      ) {
        await insertPlayerAuditLog(supabase, {
          walletAddress: normalizedAddress,
          eventType: 'daily_free_bait_reset',
          eventSource: 'server',
          beforeState: sanitizeAuditSnapshot(playerBaseline),
          afterState: sanitizeAuditSnapshot(afterPlayer),
          metadata: {
            resetBucket: 'daily_free_bait',
            resetValue: DAILY_FREE_BAIT,
          },
        });
      }

      if (
        WALLET_BAIT_BONUS_ENABLED
        && !playerBaseline.wallet_bait_bonus_claimed
        && afterPlayer.wallet_bait_bonus_claimed
      ) {
        await insertPlayerAuditLog(supabase, {
          walletAddress: normalizedAddress,
          eventType: 'wallet_connect_bait_bonus',
          eventSource: 'server',
          beforeState: sanitizeAuditSnapshot(playerBaseline),
          afterState: sanitizeAuditSnapshot(afterPlayer),
          metadata: {
            bonusBait: WALLET_BAIT_BONUS,
          },
        });
      }

      if (
        REFERRAL_BAIT_ENABLED
        && playerBaseline.referrer_wallet_address == null
        && afterPlayer.referrer_wallet_address != null
      ) {
        await insertPlayerAuditLog(supabase, {
          walletAddress: normalizedAddress,
          eventType: 'referrer_attached',
          eventSource: 'server',
          beforeState: sanitizeAuditSnapshot(playerBaseline),
          afterState: sanitizeAuditSnapshot(afterPlayer),
          metadata: {
            referrerWalletAddress: afterPlayer.referrer_wallet_address,
          },
        });
      }

      if (
        REFERRAL_BAIT_ENABLED
        && beforeInviter
        && afterInviter
        && afterInviter.bait > beforeInviter.bait
        && afterInviter.rewarded_referral_count > beforeInviter.rewarded_referral_count
      ) {
        await insertPlayerAuditLog(supabase, {
          walletAddress: beforeInviter.wallet_address,
          eventType: 'referral_bait_reward',
          eventSource: 'server',
          beforeState: sanitizeAuditSnapshot(beforeInviter),
          afterState: sanitizeAuditSnapshot(afterInviter),
          metadata: {
            invitedWalletAddress: normalizedAddress,
            rewardBait: REFERRAL_BAIT_BONUS,
            rewardedReferralCount: afterInviter.rewarded_referral_count,
          },
        });
      }
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

      const beforePlayer = await fetchPlayerLoginState(normalizedAddress);
      await loadProcessedPlayer();
      const player = await fetchProcessedPlayer(normalizedAddress);

      if (!player) {
        return new Response(
          JSON.stringify({ error: 'Player not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      await logWalletSideEffects({
        beforePlayer,
        afterPlayer: player as PlayerLoginState,
        beforeInviter: null,
        afterInviter: null,
      });
      const latestReferralReward = await fetchLatestReferralReward(normalizedAddress);
      const todayReferralAttachCount = await fetchTodayReferralAttachCount(normalizedAddress);

      const refreshedToken = await createSessionToken(normalizedAddress);

      return new Response(
        JSON.stringify({
          player: {
            ...player,
            today_referral_attach_count: todayReferralAttachCount,
          },
          isNew: false,
          session_token: refreshedToken,
          latest_referral_reward: latestReferralReward,
        }),
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

    const beforePlayer = await fetchPlayerLoginState(normalizedAddress);
    const beforeInviter = normalizedReferrer && normalizedReferrer !== normalizedAddress
      ? await fetchPlayerLoginState(normalizedReferrer)
      : null;

    await loadProcessedPlayer(normalizedReferrer);
    const newPlayer = await fetchProcessedPlayer(normalizedAddress);
    if (!newPlayer) {
      return new Response(
        JSON.stringify({ error: 'Player not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const afterInviter = beforeInviter
      ? await fetchPlayerLoginState(beforeInviter.wallet_address)
      : null;
    await logWalletSideEffects({
      beforePlayer,
      afterPlayer: newPlayer as PlayerLoginState,
      beforeInviter,
      afterInviter,
    });
    const latestReferralReward = await fetchLatestReferralReward(normalizedAddress);
    const todayReferralAttachCount = await fetchTodayReferralAttachCount(normalizedAddress);
    const sessionToken = await createSessionToken(normalizedAddress);

    return new Response(
      JSON.stringify({
        player: {
          ...newPlayer,
          today_referral_attach_count: todayReferralAttachCount,
        },
        isNew: !beforePlayer,
        session_token: sessionToken,
        latest_referral_reward: latestReferralReward,
      }),
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
