import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getStoredWalletSession } from '@/lib/walletSession';
import type { Tables } from '@/integrations/supabase/types';
import type { WheelPrize, TaskId } from '@/types/game';

export interface CubeRollPayload {
  id: string;
  cube_faces: WheelPrize[][];
  target_face_index: number;
  target_tile_index: number;
  prize: WheelPrize;
}

interface PlayerActionResponse {
  player?: Tables<'players'>;
  roll?: CubeRollPayload;
  prize?: WheelPrize;
  leaderboard_entry?: {
    id: string;
    name: string;
    score: number;
    dishes: number;
    wallet_address?: string | null;
    updated_at?: string;
  };
}

export function usePlayerActions(walletAddress: string | undefined, enabled: boolean) {
  const callPlayerActions = useCallback(async <T extends PlayerActionResponse>(
    action: string,
    payload: Record<string, unknown> = {},
  ) => {
    if (!enabled || !walletAddress) {
      throw new Error('Wallet actions are unavailable for this player.');
    }

    const session = getStoredWalletSession();
    if (!session || session.address.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error('Wallet session expired. Reconnect in the game first.');
    }

    const { data, error } = await supabase.functions.invoke('player-actions', {
      body: {
        action,
        wallet_address: walletAddress.toLowerCase(),
        session_token: session.token,
        ...payload,
      },
    });

    if (error) {
      const contextualError = error as { context?: { clone?: () => Response } };
      if (contextualError.context?.clone) {
        try {
          const responsePayload = await contextualError.context.clone().json() as { error?: string };
          if (typeof responsePayload.error === 'string' && responsePayload.error.trim()) {
            throw new Error(responsePayload.error);
          }
        } catch {
          // Fall back to original error.
        }
      }
      throw error;
    }

    if (data?.error) throw new Error(data.error);
    return data as T;
  }, [enabled, walletAddress]);

  const rollCube = useCallback(async () => (
    callPlayerActions<{ player: Tables<'players'>; roll: CubeRollPayload }>('roll_cube')
  ), [callPlayerActions]);

  const applyCubeReward = useCallback(async (rollId: string) => (
    callPlayerActions<{ player: Tables<'players'>; prize: WheelPrize }>('apply_cube_reward', {
      roll_id: rollId,
    })
  ), [callPlayerActions]);

  const claimTaskReward = useCallback(async (taskId: TaskId) => (
    callPlayerActions<{ player: Tables<'players'> }>('claim_task_reward', {
      task_id: taskId,
    })
  ), [callPlayerActions]);

  const cookRecipe = useCallback(async (recipeId: string) => (
    callPlayerActions<{
      player: Tables<'players'>;
      leaderboard_entry?: PlayerActionResponse['leaderboard_entry'];
    }>('cook_recipe', {
      recipe_id: recipeId,
    })
  ), [callPlayerActions]);

  const sellCookedDish = useCallback(async (recipeId: string) => (
    callPlayerActions<{ player: Tables<'players'> }>('sell_cooked_dish', {
      recipe_id: recipeId,
    })
  ), [callPlayerActions]);

  const updateGrillLeaderboard = useCallback(async (name: string, score: number, dishesDelta = 0) => (
    callPlayerActions<{ leaderboard_entry: NonNullable<PlayerActionResponse['leaderboard_entry']> }>('update_grill_leaderboard', {
      name,
      score,
      dishes_delta: dishesDelta,
    })
  ), [callPlayerActions]);

  return {
    rollCube,
    applyCubeReward,
    claimTaskReward,
    cookRecipe,
    sellCookedDish,
    updateGrillLeaderboard,
  };
}
