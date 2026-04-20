import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
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
    updatePlayer,
    deletePlayer,
    getStats,
  };
}
