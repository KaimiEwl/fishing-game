import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getStoredWalletSession } from '@/lib/walletSession';
import type { Tables } from '@/integrations/supabase/types';
import {
  type PremiumCastResult,
  type PremiumSessionState,
  type ReactionQuality,
  SOCIAL_TASKS,
  type SocialTaskId,
  type SocialTaskProgress,
  type TaskId,
  type WalletCheckInSummary,
  type WheelPrize,
} from '@/types/game';

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
  wallet_check_in_summary?: WalletCheckInSummary;
  premium_session?: PremiumSessionState | null;
  cast_result?: PremiumCastResult;
  verification?: PlayerSocialTaskVerificationRow;
  verifications?: PlayerSocialTaskVerificationRow[];
  leaderboard_entry?: {
    id: string;
    name: string;
    score: number;
    dishes: number;
    wallet_address?: string | null;
    updated_at?: string;
  };
}

interface PlayerSocialTaskVerificationRow {
  task_id: SocialTaskId;
  status: SocialTaskProgress['status'];
  proof_url: string | null;
  updated_at: string;
  verified_by_wallet: string | null;
}

const mapSocialTasks = (rows: PlayerSocialTaskVerificationRow[] = []): SocialTaskProgress[] => (
  SOCIAL_TASKS.map((task) => {
    const verification = rows.find((row) => row.task_id === task.id);
    const status = verification?.status ?? 'available';

    return {
      ...task,
      status,
      proofUrl: verification?.proof_url ?? null,
      updatedAt: verification?.updated_at ?? null,
      verifiedByWallet: verification?.verified_by_wallet ?? null,
      canClaim: status === 'verified',
    };
  })
);

const PLAYER_ACTION_FALLBACK_ERRORS: Record<string, string> = {
  get_wallet_check_in_summary: 'Daily wallet check-in is temporarily unavailable. Please try again in a minute.',
  verify_wallet_check_in: 'We could not verify your wallet check-in right now. Please try again in a minute.',
  claim_task_reward: 'Could not claim this task right now. Please try again.',
  roll_cube: 'Could not start the cube roll right now. Please try again.',
  apply_cube_reward: 'Could not apply the cube reward right now. Please try again.',
  cook_recipe: 'Could not cook this recipe right now. Please try again.',
  sell_cooked_dish: 'Could not sell this dish right now. Please try again.',
  update_grill_leaderboard: 'Could not update the grill leaderboard right now. Please try again.',
  list_social_tasks: 'Social task status is temporarily unavailable. Please try again later.',
  submit_social_task_verification: 'Could not submit this social task right now. Please try again later.',
  claim_social_task_reward: 'Could not claim this social reward right now. Please try again later.',
};

const EDGE_FUNCTION_GENERIC_MESSAGES = [
  'Edge Function returned a non-2xx status code',
  'Failed to send a request to the Edge Function',
];

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
      const fallbackMessage = PLAYER_ACTION_FALLBACK_ERRORS[action] ?? 'This action is temporarily unavailable. Please try again later.';
      const contextualError = error as { context?: { clone?: () => Response } };
      if (contextualError.context?.clone) {
        try {
          const responsePayload = await contextualError.context.clone().json() as { error?: string };
          if (typeof responsePayload.error === 'string' && responsePayload.error.trim()) {
            const serverMessage = responsePayload.error.trim();
            if (serverMessage === 'Unknown action') {
              throw new Error(fallbackMessage);
            }
            throw new Error(serverMessage);
          }
        } catch {
          // Fall back to original error.
        }
      }

      if (
        error instanceof Error
        && EDGE_FUNCTION_GENERIC_MESSAGES.some((message) => error.message.includes(message))
      ) {
        throw new Error(fallbackMessage);
      }

      throw error instanceof Error ? error : new Error(fallbackMessage);
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

  const getWalletCheckInSummary = useCallback(async () => {
    const data = await callPlayerActions<{ wallet_check_in_summary: WalletCheckInSummary }>('get_wallet_check_in_summary');
    return data.wallet_check_in_summary;
  }, [callPlayerActions]);

  const verifyWalletCheckIn = useCallback(async (txHash: string) => {
    const data = await callPlayerActions<{
      player: Tables<'players'>;
      wallet_check_in_summary: WalletCheckInSummary;
    }>('verify_wallet_check_in', {
      tx_hash: txHash,
    });

    return {
      player: data.player,
      walletCheckInSummary: data.wallet_check_in_summary,
    };
  }, [callPlayerActions]);

  const startPremiumSession = useCallback(async (txHash: string) => {
    const data = await callPlayerActions<{
      player: Tables<'players'>;
      premium_session: PremiumSessionState;
    }>('start_premium_session', {
      tx_hash: txHash,
    });

    return {
      player: data.player,
      premiumSession: data.premium_session,
    };
  }, [callPlayerActions]);

  const getPremiumSessionState = useCallback(async () => {
    const data = await callPlayerActions<{
      player: Tables<'players'>;
      premium_session: PremiumSessionState | null;
    }>('get_premium_session_state');

    return {
      player: data.player,
      premiumSession: data.premium_session,
    };
  }, [callPlayerActions]);

  const resolvePremiumCast = useCallback(async (reactionQuality: ReactionQuality) => {
    const data = await callPlayerActions<{
      player: Tables<'players'>;
      premium_session: PremiumSessionState;
      cast_result: PremiumCastResult;
    }>('resolve_premium_cast', {
      reaction_quality: reactionQuality,
    });

    return {
      player: data.player,
      premiumSession: data.premium_session,
      castResult: data.cast_result,
    };
  }, [callPlayerActions]);

  const completePremiumSession = useCallback(async (sessionId?: string) => {
    const data = await callPlayerActions<{
      player: Tables<'players'>;
      premium_session: PremiumSessionState;
    }>('complete_premium_session', {
      session_id: sessionId ?? null,
    });

    return {
      player: data.player,
      premiumSession: data.premium_session,
    };
  }, [callPlayerActions]);

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

  const listSocialTasks = useCallback(async () => {
    const data = await callPlayerActions<{ verifications: PlayerSocialTaskVerificationRow[] }>('list_social_tasks');
    return mapSocialTasks(data.verifications);
  }, [callPlayerActions]);

  const submitSocialTaskVerification = useCallback(async (taskId: SocialTaskId, proofUrl?: string) => {
    const data = await callPlayerActions<{ verification: PlayerSocialTaskVerificationRow }>('submit_social_task_verification', {
      task_id: taskId,
      proof_url: proofUrl?.trim() || null,
    });
    return mapSocialTasks([data.verification]);
  }, [callPlayerActions]);

  const claimSocialTaskReward = useCallback(async (taskId: SocialTaskId) => {
    const data = await callPlayerActions<{ player: Tables<'players'>; verification: PlayerSocialTaskVerificationRow }>('claim_social_task_reward', {
      task_id: taskId,
    });
    return {
      player: data.player,
      socialTasks: mapSocialTasks([data.verification]),
    };
  }, [callPlayerActions]);

  return {
    rollCube,
    applyCubeReward,
    claimTaskReward,
    getWalletCheckInSummary,
    verifyWalletCheckIn,
    startPremiumSession,
    getPremiumSessionState,
    resolvePremiumCast,
    completePremiumSession,
    cookRecipe,
    sellCookedDish,
    updateGrillLeaderboard,
    listSocialTasks,
    submitSocialTaskVerification,
    claimSocialTaskReward,
  };
}
