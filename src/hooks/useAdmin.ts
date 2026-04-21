import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { normalizeMonAmount } from '@/lib/monRewards';
import { SOCIAL_TASKS, type SocialTaskId, type SocialTaskStatus } from '@/lib/taskRegistry';
import { getStoredWalletSession } from '@/lib/walletSession';

const ADMIN_INVOKE_TIMEOUT_MS = 12000;

export type AdminPlayer = Tables<'players'> & {
  is_admin?: boolean;
  admin_role?: string | null;
  display_total_catches?: number;
  catches_source?: 'player' | 'audit_fallback';
};
export type AdminPlayerMessage = Tables<'player_messages'>;

export interface AdminPlayerListResponse {
  players: AdminPlayer[];
  total: number;
}

export interface AdminStats {
  totalPlayers: number;
  totalCoins: number;
  totalCatches: number;
  avgLevel: number;
  maxLevel: number;
  activeToday: number;
  levelDistribution: Record<string, number>;
  rodDistribution: Record<number, number>;
  topByLevel: AdminPlayer[];
  topByCoins: AdminPlayer[];
  topByCatches: AdminPlayer[];
}

export interface AdminPlayerActivityEntry {
  id: string;
  event_type: string;
  event_source: string;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  delta_state: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminInventorySummaryEntry {
  fish_id: string;
  quantity: number;
}

export interface AdminPlayerGrillSummary {
  score: number;
  dishes: number;
  updated_at: string;
}

export interface AdminPlayerReferralSummary {
  referrer_wallet_address: string | null;
  rewarded_referral_count: number;
  wallet_bait_bonus_claimed: boolean;
}

export type WithdrawRequestStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface AdminWithdrawRequest {
  id: string;
  playerId: string;
  walletAddress: string;
  playerNickname: string | null;
  amountMon: number;
  status: WithdrawRequestStatus;
  requestedAt: string;
  processedAt: string | null;
  payoutTxHash: string | null;
  processedByWallet: string | null;
  adminNote: string | null;
}

export interface AdminWithdrawSummary {
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  paid_count: number;
  pending_amount_mon: number;
}

export interface AdminSuspiciousSummary {
  flaggedPlayers: number;
  highCoinGainPlayers: number;
  highBaitGainPlayers: number;
  highCubeRewardPlayers: number;
  withdrawSpamPlayers: number;
  rateLimitedSubjects: number;
  latestSignalAt: string | null;
}

export interface AdminSuspiciousPlayer {
  playerId: string | null;
  walletAddress: string;
  nickname: string | null;
  flags: string[];
  coinGain24h: number;
  baitGain24h: number;
  cubeRewards24h: number;
  withdrawRequests7d: number;
  rateLimitHits1h: number;
  latestSignalAt: string | null;
}

export interface AdminWeeklyPayoutPreviewEntry {
  rank: number;
  walletAddress: string;
  name: string;
  score: number;
  dishes: number;
  amountMon: number;
}

export interface AdminWeeklyPayoutBatch {
  id: string;
  weekKey: string;
  totalAmountMon: number;
  createdByWallet: string;
  createdAt: string;
  appliedAt: string;
  payouts: AdminWeeklyPayoutPreviewEntry[];
}

export interface AdminSocialTaskVerification {
  id: string;
  playerId: string;
  walletAddress: string;
  playerNickname: string | null;
  taskId: SocialTaskId;
  taskTitle: string;
  status: SocialTaskStatus;
  proofUrl: string | null;
  verifiedByWallet: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPlayerDetails {
  player: AdminPlayer;
  grill_summary: AdminPlayerGrillSummary | null;
  inventory_summary: AdminInventorySummaryEntry[];
  referral_summary: AdminPlayerReferralSummary;
  suspicious_flags: string[];
}

interface AdminCheckResponse {
  is_admin: boolean;
}

interface AdminPlayerResponse {
  player: AdminPlayer;
}

interface AdminDeleteResponse {
  success: boolean;
}

interface AdminStatsResponse {
  stats: AdminStats;
}

interface AdminPlayerDetailsResponse {
  player: AdminPlayer;
  grill_summary: AdminPlayerGrillSummary | null;
  inventory_summary: AdminInventorySummaryEntry[];
  referral_summary: AdminPlayerReferralSummary;
  suspicious_flags: string[];
}

interface AdminPlayerActivityResponse {
  activity: AdminPlayerActivityEntry[];
}

interface AdminPlayerMessagesResponse {
  messages: AdminPlayerMessage[];
}

interface AdminBroadcastMessageResponse {
  inserted_count: number;
}

interface AdminWithdrawRequestRow {
  id: string;
  player_id: string;
  wallet_address: string;
  player_nickname: string | null;
  amount_mon: string | number;
  status: WithdrawRequestStatus;
  requested_at: string;
  processed_at: string | null;
  payout_tx_hash: string | null;
  processed_by_wallet: string | null;
  admin_note: string | null;
}

interface AdminWithdrawRequestsResponse {
  requests: AdminWithdrawRequestRow[];
}

interface AdminWithdrawSummaryResponse {
  summary: AdminWithdrawSummary;
}

interface AdminSuspiciousSummaryRow {
  flagged_players: number;
  high_coin_gain_players: number;
  high_bait_gain_players: number;
  high_cube_reward_players: number;
  withdraw_spam_players: number;
  rate_limited_subjects: number;
  latest_signal_at: string | null;
}

interface AdminSuspiciousSummaryResponse {
  summary: AdminSuspiciousSummaryRow;
}

interface AdminSuspiciousPlayerRow {
  player_id: string | null;
  wallet_address: string;
  nickname: string | null;
  flags: string[];
  coin_gain_24h: number;
  bait_gain_24h: number;
  cube_rewards_24h: number;
  withdraw_requests_7d: number;
  rate_limit_hits_1h: number;
  latest_signal_at: string | null;
}

interface AdminSuspiciousPlayersResponse {
  players: AdminSuspiciousPlayerRow[];
}

interface AdminWeeklyPayoutPreviewRow {
  rank: number;
  wallet_address: string;
  name: string;
  score: number;
  dishes: number;
  amount_mon: string | number;
}

interface AdminWeeklyPayoutPreviewResponse {
  week_key: string;
  already_applied: boolean;
  preview: AdminWeeklyPayoutPreviewRow[];
  existing_batch: {
    id: string;
    week_key: string;
    total_amount_mon: string | number;
    created_at: string;
    applied_at: string;
  } | null;
}

interface AdminWeeklyPayoutBatchRow {
  id: string;
  week_key: string;
  payouts: AdminWeeklyPayoutPreviewRow[];
  total_amount_mon: string | number;
  created_by_wallet: string;
  created_at: string;
  applied_at: string;
}

interface AdminWeeklyPayoutBatchesResponse {
  batches: AdminWeeklyPayoutBatchRow[];
}

interface AdminWeeklyPayoutApplyResponse {
  batch: AdminWeeklyPayoutBatchRow;
}

interface AdminSocialTaskVerificationRow {
  id: string;
  player_id: string;
  wallet_address: string;
  player_nickname: string | null;
  task_id: SocialTaskId;
  status: SocialTaskStatus;
  proof_url: string | null;
  verified_by_wallet: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminSocialTaskVerificationListResponse {
  verifications: AdminSocialTaskVerificationRow[];
}

interface AdminSocialTaskVerificationUpdateResponse {
  verification: AdminSocialTaskVerificationRow;
}

const mapWeeklyPayoutPreviewEntry = (entry: AdminWeeklyPayoutPreviewRow): AdminWeeklyPayoutPreviewEntry => ({
  rank: entry.rank,
  walletAddress: entry.wallet_address,
  name: entry.name,
  score: entry.score,
  dishes: entry.dishes,
  amountMon: normalizeMonAmount(entry.amount_mon),
});

const mapWeeklyPayoutBatch = (batch: AdminWeeklyPayoutBatchRow): AdminWeeklyPayoutBatch => ({
  id: batch.id,
  weekKey: batch.week_key,
  totalAmountMon: normalizeMonAmount(batch.total_amount_mon),
  createdByWallet: batch.created_by_wallet,
  createdAt: batch.created_at,
  appliedAt: batch.applied_at,
  payouts: (batch.payouts ?? []).map(mapWeeklyPayoutPreviewEntry),
});

const mapSocialTaskVerification = (verification: AdminSocialTaskVerificationRow): AdminSocialTaskVerification => ({
  id: verification.id,
  playerId: verification.player_id,
  walletAddress: verification.wallet_address,
  playerNickname: verification.player_nickname,
  taskId: verification.task_id,
  taskTitle: SOCIAL_TASKS.find((task) => task.id === verification.task_id)?.title ?? verification.task_id,
  status: verification.status,
  proofUrl: verification.proof_url,
  verifiedByWallet: verification.verified_by_wallet,
  createdAt: verification.created_at,
  updatedAt: verification.updated_at,
});

const mapSuspiciousSummary = (summary: AdminSuspiciousSummaryRow): AdminSuspiciousSummary => ({
  flaggedPlayers: summary.flagged_players,
  highCoinGainPlayers: summary.high_coin_gain_players,
  highBaitGainPlayers: summary.high_bait_gain_players,
  highCubeRewardPlayers: summary.high_cube_reward_players,
  withdrawSpamPlayers: summary.withdraw_spam_players,
  rateLimitedSubjects: summary.rate_limited_subjects,
  latestSignalAt: summary.latest_signal_at,
});

const mapSuspiciousPlayer = (player: AdminSuspiciousPlayerRow): AdminSuspiciousPlayer => ({
  playerId: player.player_id,
  walletAddress: player.wallet_address,
  nickname: player.nickname,
  flags: player.flags ?? [],
  coinGain24h: player.coin_gain_24h,
  baitGain24h: player.bait_gain_24h,
  cubeRewards24h: player.cube_rewards_24h,
  withdrawRequests7d: player.withdraw_requests_7d,
  rateLimitHits1h: player.rate_limit_hits_1h,
  latestSignalAt: player.latest_signal_at,
});

export function useAdmin(walletAddress: string | undefined) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const storedSession = getStoredWalletSession();
  const effectiveWalletAddress = walletAddress ?? storedSession?.address;

  const callAdmin = useCallback(async <T>(action: string, params: Record<string, unknown> = {}) => {
    if (!effectiveWalletAddress) throw new Error('No wallet');

    const session = getStoredWalletSession();
    if (!session || session.address.toLowerCase() !== effectiveWalletAddress.toLowerCase()) {
      throw new Error('Wallet session expired. Reconnect in the game first.');
    }

    const invokePromise = supabase.functions.invoke('admin', {
      body: {
        action,
        wallet_address: effectiveWalletAddress.toLowerCase(),
        session_token: session.token,
        ...params,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error('Admin request timed out. Reload the page and try again.'));
      }, ADMIN_INVOKE_TIMEOUT_MS);

      invokePromise.finally(() => window.clearTimeout(timeoutId));
    });

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);
    if (error) {
      const errorWithContext = error as { context?: { clone?: () => Response } };
      if (errorWithContext.context?.clone) {
        try {
          const payload = await errorWithContext.context.clone().json() as { error?: string };
          if (typeof payload.error === 'string' && payload.error.trim()) {
            throw new Error(payload.error);
          }
        } catch {
          // Keep the original error when the response body is not readable JSON.
        }
      }
      throw error;
    }
    if (data?.error) throw new Error(data.error);
    return data as T;
  }, [effectiveWalletAddress]);

  const checkAdmin = useCallback(async () => {
    if (!effectiveWalletAddress) {
      setIsAdmin(false);
      return false;
    }
    try {
      setLoading(true);
      await callAdmin<AdminCheckResponse>('check_admin');
      setIsAdmin(true);
      return true;
    } catch {
      setIsAdmin(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [callAdmin, effectiveWalletAddress]);

  const listPlayers = useCallback(async (
    params: { search?: string; sort_by?: string; sort_dir?: string; page?: number; per_page?: number } = {},
  ) => callAdmin<AdminPlayerListResponse>('list_players', params), [callAdmin]);

  const getPlayerDetails = useCallback(async (playerId: string) => {
    const data = await callAdmin<AdminPlayerDetailsResponse>('get_player_details', { player_id: playerId });
    return {
      player: data.player,
      grill_summary: data.grill_summary,
      inventory_summary: data.inventory_summary,
      referral_summary: data.referral_summary,
      suspicious_flags: data.suspicious_flags,
    } satisfies AdminPlayerDetails;
  }, [callAdmin]);

  const listPlayerActivity = useCallback(async (playerId: string, limit = 25) => {
    const data = await callAdmin<AdminPlayerActivityResponse>('list_player_activity', {
      player_id: playerId,
      limit,
    });
    return data.activity;
  }, [callAdmin]);

  const listPlayerMessages = useCallback(async (playerId: string, limit = 25) => {
    const data = await callAdmin<AdminPlayerMessagesResponse>('list_player_messages', {
      player_id: playerId,
      limit,
    });
    return data.messages;
  }, [callAdmin]);

  const sendPlayerMessage = useCallback(async (playerId: string, title: string, body: string) => {
    const data = await callAdmin<{ message: AdminPlayerMessage }>('send_player_message', {
      player_id: playerId,
      title,
      body,
    });
    return data.message;
  }, [callAdmin]);

  const sendBroadcastMessage = useCallback(async (title: string, body: string) => {
    const data = await callAdmin<AdminBroadcastMessageResponse>('send_broadcast_message', {
      title,
      body,
    });
    return data.inserted_count ?? 0;
  }, [callAdmin]);

  const listWithdrawRequests = useCallback(async (
    params: { status?: WithdrawRequestStatus | 'all'; limit?: number } = {},
  ) => {
    const data = await callAdmin<AdminWithdrawRequestsResponse>('list_withdraw_requests', params);
    return (data.requests ?? []).map((request): AdminWithdrawRequest => ({
      id: request.id,
      playerId: request.player_id,
      walletAddress: request.wallet_address,
      playerNickname: request.player_nickname,
      amountMon: normalizeMonAmount(request.amount_mon),
      status: request.status,
      requestedAt: request.requested_at,
      processedAt: request.processed_at,
      payoutTxHash: request.payout_tx_hash,
      processedByWallet: request.processed_by_wallet,
      adminNote: request.admin_note,
    }));
  }, [callAdmin]);

  const getAdminWithdrawSummary = useCallback(async () => {
    const data = await callAdmin<AdminWithdrawSummaryResponse>('get_admin_withdraw_summary');
    return data.summary;
  }, [callAdmin]);

  const getSuspiciousSummary = useCallback(async () => {
    const data = await callAdmin<AdminSuspiciousSummaryResponse>('get_suspicious_summary');
    return mapSuspiciousSummary(data.summary);
  }, [callAdmin]);

  const listSuspiciousPlayers = useCallback(async (limit = 20) => {
    const data = await callAdmin<AdminSuspiciousPlayersResponse>('list_suspicious_players', { limit });
    return (data.players ?? []).map(mapSuspiciousPlayer);
  }, [callAdmin]);

  const approveWithdrawRequest = useCallback(async (requestId: string) => {
    const data = await callAdmin<{ request: AdminWithdrawRequestRow }>('approve_withdraw_request', {
      request_id: requestId,
    });
    return data.request;
  }, [callAdmin]);

  const rejectWithdrawRequest = useCallback(async (requestId: string) => {
    const data = await callAdmin<{ request: AdminWithdrawRequestRow }>('reject_withdraw_request', {
      request_id: requestId,
    });
    return data.request;
  }, [callAdmin]);

  const markWithdrawPaid = useCallback(async (requestId: string, payoutTxHash: string) => {
    const data = await callAdmin<{ request: AdminWithdrawRequestRow }>('mark_withdraw_paid', {
      request_id: requestId,
      payout_tx_hash: payoutTxHash,
    });
    return data.request;
  }, [callAdmin]);

  const updatePlayer = useCallback(async (playerId: string, updates: Record<string, unknown>) => {
    const data = await callAdmin<AdminPlayerResponse>('update_player', { player_id: playerId, updates });
    return data.player;
  }, [callAdmin]);

  const deletePlayer = useCallback(async (playerId: string) => {
    await callAdmin<AdminDeleteResponse>('delete_player', { player_id: playerId });
  }, [callAdmin]);

  const getStats = useCallback(async () => {
    const data = await callAdmin<AdminStatsResponse>('get_stats');
    return data.stats;
  }, [callAdmin]);

  const grantMonReward = useCallback(async (
    playerId: string,
    amountMon: number,
    adminNote?: string,
    sourceRef?: string,
  ) => {
    await callAdmin<{ success: boolean }>('grant_mon_reward', {
      player_id: playerId,
      amount_mon: amountMon,
      admin_note: adminNote,
      source_ref: sourceRef,
    });
  }, [callAdmin]);

  const previewWeeklyPayouts = useCallback(async () => {
    const data = await callAdmin<AdminWeeklyPayoutPreviewResponse>('preview_weekly_payouts');
    return {
      weekKey: data.week_key,
      alreadyApplied: data.already_applied,
      preview: (data.preview ?? []).map(mapWeeklyPayoutPreviewEntry),
      existingBatch: data.existing_batch
        ? {
          id: data.existing_batch.id,
          weekKey: data.existing_batch.week_key,
          totalAmountMon: normalizeMonAmount(data.existing_batch.total_amount_mon),
          createdAt: data.existing_batch.created_at,
          appliedAt: data.existing_batch.applied_at,
        }
        : null,
    };
  }, [callAdmin]);

  const applyWeeklyPayouts = useCallback(async () => {
    const data = await callAdmin<AdminWeeklyPayoutApplyResponse>('apply_weekly_payouts');
    return mapWeeklyPayoutBatch(data.batch);
  }, [callAdmin]);

  const listWeeklyPayoutBatches = useCallback(async (limit = 12) => {
    const data = await callAdmin<AdminWeeklyPayoutBatchesResponse>('list_weekly_payout_batches', { limit });
    return (data.batches ?? []).map(mapWeeklyPayoutBatch);
  }, [callAdmin]);

  const listSocialTaskVerifications = useCallback(async (
    params: { status?: SocialTaskStatus | 'all'; limit?: number } = {},
  ) => {
    const data = await callAdmin<AdminSocialTaskVerificationListResponse>('list_social_task_verifications', params);
    return (data.verifications ?? []).map(mapSocialTaskVerification);
  }, [callAdmin]);

  const setSocialTaskVerification = useCallback(async (
    playerId: string,
    taskId: SocialTaskId,
    status: SocialTaskStatus,
    proofUrl?: string,
  ) => {
    const data = await callAdmin<AdminSocialTaskVerificationUpdateResponse>('set_social_task_verification', {
      player_id: playerId,
      task_id: taskId,
      status,
      proof_url: proofUrl,
    });
    return mapSocialTaskVerification(data.verification);
  }, [callAdmin]);

  return {
    isAdmin,
    loading,
    checkAdmin,
    listPlayers,
    getPlayerDetails,
    listPlayerActivity,
    listPlayerMessages,
    sendPlayerMessage,
    sendBroadcastMessage,
    listWithdrawRequests,
    getAdminWithdrawSummary,
    getSuspiciousSummary,
    listSuspiciousPlayers,
    approveWithdrawRequest,
    rejectWithdrawRequest,
    markWithdrawPaid,
    grantMonReward,
    previewWeeklyPayouts,
    applyWeeklyPayouts,
    listWeeklyPayoutBatches,
    listSocialTaskVerifications,
    setSocialTaskVerification,
    updatePlayer,
    deletePlayer,
    getStats,
  };
}
