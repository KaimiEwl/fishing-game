import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  totalPlayers: number;
  totalCoins: number;
  totalCatches: number;
  avgLevel: number;
  maxLevel: number;
  activeToday: number;
  levelDistribution: Record<string, number>;
  rodDistribution: Record<number, number>;
  topByLevel: any[];
  topByCoins: any[];
  topByCatches: any[];
}

export function useAdmin(walletAddress: string | undefined) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const callAdmin = useCallback(async (action: string, params: Record<string, unknown> = {}) => {
    if (!walletAddress) throw new Error('No wallet');
    const { data, error } = await supabase.functions.invoke('admin', {
      body: { action, wallet_address: walletAddress.toLowerCase(), ...params }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, [walletAddress]);

  const checkAdmin = useCallback(async () => {
    if (!walletAddress) { setIsAdmin(false); return false; }
    try {
      setLoading(true);
      await callAdmin('check_admin');
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
    const data = await callAdmin('list_players', params);
    return data as { players: any[]; total: number };
  }, [callAdmin]);

  const updatePlayer = useCallback(async (playerId: string, updates: Record<string, unknown>) => {
    const data = await callAdmin('update_player', { player_id: playerId, updates });
    return data.player;
  }, [callAdmin]);

  const deletePlayer = useCallback(async (playerId: string) => {
    await callAdmin('delete_player', { player_id: playerId });
  }, [callAdmin]);

  const getStats = useCallback(async () => {
    const data = await callAdmin('get_stats');
    return data.stats as AdminStats;
  }, [callAdmin]);

  return { isAdmin, loading, checkAdmin, listPlayers, updatePlayer, deletePlayer, getStats };
}
