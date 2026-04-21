import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  fetchPlayerAuditSnapshot,
  insertPlayerAuditLog,
  sanitizeAuditSnapshot,
} from './playerAudit.ts';
import {
  getMonHoldUntilIso,
  toMonAmount,
} from './monRewards.ts';

interface RewardPlayerRow {
  id: string;
  wallet_address: string;
  coins: number;
  bait: number;
  daily_free_bait: number;
  xp: number;
  total_catches: number;
  rod_level: number;
  equipped_rod: number;
}

interface GrantPlayerRewardInput {
  walletAddress: string;
  reward?: {
    coins?: number;
    bait?: number;
    mon?: number;
  };
  sourceType: string;
  sourceRef?: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
  createdByWallet?: string | null;
  adminNote?: string | null;
  holdUntil?: string | null;
}

const normalizeWallet = (walletAddress: string) => walletAddress.trim().toLowerCase();

export const fetchRewardPlayerRow = async (
  supabase: SupabaseClient,
  walletAddress: string,
) => {
  const normalizedWallet = normalizeWallet(walletAddress);
  const { data, error } = await supabase
    .from('players')
    .select('id, wallet_address, coins, bait, daily_free_bait, xp, total_catches, rod_level, equipped_rod')
    .eq('wallet_address', normalizedWallet)
    .single();

  if (error) throw error;
  return data as RewardPlayerRow;
};

export const grantPlayerReward = async (
  supabase: SupabaseClient,
  {
    walletAddress,
    reward = {},
    sourceType,
    sourceRef = null,
    eventType,
    metadata = {},
    createdByWallet = null,
    adminNote = null,
    holdUntil = null,
  }: GrantPlayerRewardInput,
) => {
  const normalizedWallet = normalizeWallet(walletAddress);
  const coins = Math.max(0, Number(reward.coins ?? 0));
  const bait = Math.max(0, Number(reward.bait ?? 0));
  const mon = toMonAmount(reward.mon ?? 0);

  const beforeState = await fetchPlayerAuditSnapshot(supabase, normalizedWallet);
  let playerRow = await fetchRewardPlayerRow(supabase, normalizedWallet);

  if (coins > 0 || bait > 0) {
    const { data, error } = await supabase
      .from('players')
      .update({
        coins: playerRow.coins + coins,
        bait: playerRow.bait + bait,
      })
      .eq('id', playerRow.id)
      .select('id, wallet_address, coins, bait, daily_free_bait, xp, total_catches, rod_level, equipped_rod')
      .single();

    if (error) throw error;
    playerRow = data as RewardPlayerRow;
  }

  let monRewardId: string | null = null;
  if (mon > 0) {
    const { data, error } = await supabase
      .from('player_mon_rewards')
      .insert({
        player_id: playerRow.id,
        wallet_address: normalizedWallet,
        amount_mon: mon,
        source_type: sourceType,
        source_ref: sourceRef,
        hold_until: holdUntil ?? getMonHoldUntilIso(),
        created_by_wallet: createdByWallet,
        admin_note: adminNote,
      })
      .select('id')
      .single();
    if (error) throw error;
    monRewardId = data.id as string;
  }

  const afterState = sanitizeAuditSnapshot(playerRow);
  await insertPlayerAuditLog(supabase, {
    walletAddress: normalizedWallet,
    eventType,
    eventSource: 'server',
    beforeState,
    afterState,
    metadata: {
      ...metadata,
      reward: {
        coins,
        bait,
        mon,
      },
      sourceType,
      sourceRef,
      adminNote,
      monRewardId,
    },
  });

  return {
    playerRow,
    monRewardId,
  };
};
