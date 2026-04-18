import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

const SESSION_KEY = 'monadfish_session';

export type AdminPlayer = Tables<'players'>;

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

const getStoredSessionToken = (walletAddress: string) => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { address?: string; token?: string };
    if (!parsed.address || !parsed.token) return null;
    return parsed.address.toLowerCase() === walletAddress.toLowerCase() ? parsed.token : null;
  } catch {
    return null;
  }
};

export function useAdmin(walletAddress: string | undefined) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const callAdmin = useCallback(async <T>(action: string, params: Record<string, unknown> = {}) => {
    if (!walletAddress) throw new Error('No wallet');
    const sessionToken = getStoredSessionToken(walletAddress);
    if (!sessionToken) throw new Error('Wallet session expired. Reconnect in the game first.');
    const { data, error } = await supabase.functions.invoke('admin', {
      body: {
        action,
        wallet_address: walletAddress.toLowerCase(),
        session_token: sessionToken,
        ...params,
      }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as T;
  }, [walletAddress]);

  const checkAdmin = useCallback(async () => {
    if (!walletAddress) { setIsAdmin(false); return false; }
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
  }, [walletAddress, callAdmin]);

  const listPlayers = useCallback(async (params: { search?: string; sort_by?: string; sort_dir?: string; page?: number; per_page?: number } = {}) => {
    return callAdmin<AdminPlayerListResponse>('list_players', params);
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

  return { isAdmin, loading, checkAdmin, listPlayers, updatePlayer, deletePlayer, getStats };
}
