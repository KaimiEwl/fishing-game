import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { normalizeMonAmount } from '@/lib/monRewards';
import { getStoredWalletSession } from '@/lib/walletSession';

export type AdminPlayer = Tables<'players'>;
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

export function useAdmin(walletAddress: string | undefined) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const callAdmin = useCallback(async <T>(action: string, params: Record<string, unknown> = {}) => {
    if (!walletAddress) throw new Error('No wallet');
    const session = getStoredWalletSession();
    if (!session || session.address.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error('Wallet session expired. Reconnect in the game first.');
    }

    const { data, error } = await supabase.functions.invoke('admin', {
      body: {
        action,
        wallet_address: walletAddress.toLowerCase(),
        session_token: session.token,
        ...params,
      },
    });
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
  }, [walletAddress]);

  const checkAdmin = useCallback(async () => {
    if (!walletAddress) {
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
  }, [callAdmin, walletAddress]);

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

  return {
    isAdmin,
    loading,
    checkAdmin,
    listPlayers,
    getPlayerDetails,
    listPlayerActivity,
    listPlayerMessages,
    sendPlayerMessage,
    listWithdrawRequests,
    getAdminWithdrawSummary,
    approveWithdrawRequest,
    rejectWithdrawRequest,
    markWithdrawPaid,
    updatePlayer,
    deletePlayer,
    getStats,
  };
}
