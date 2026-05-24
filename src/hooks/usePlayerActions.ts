import { useCallback } from 'react';
import { invokeHooklootEdge } from '@/lib/serverApi';
import { getStoredWalletSession } from '@/lib/walletSession';
import type { Tables } from '@/types/serverDatabase';
import {
  type FishingSpecialReward,
  type PremiumCastResult,
  type PremiumSessionState,
  type ReactionQuality,
  SOCIAL_TASKS,
  type SocialTaskId,
  type SocialTaskProgress,
  type TaskId,
  type WeeklyMissionId,
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
  fishing_cast?: ServerFishingCast;
  fishing_result?: ServerFishingResult;
  roll?: CubeRollPayload;
  prize?: WheelPrize;
  wallet_check_in_summary?: WalletCheckInSummary;
  premium_session?: PremiumSessionState | null;
  cast_result?: PremiumCastResult;
  mon_reward?: {
    amountMon: number;
    sourceRef: string;
    rodId: string;
    rodLevel: number;
  };
  leviathan_bonus?: {
    type: FishingSpecialReward['type'];
    sourceRef: string;
    bonusRodId: string;
    bonusRodLevel: number;
    compensationMon?: number;
    credited: boolean;
  };
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

interface ServerFishingCast {
  id: string;
  waitMs: number;
  biteWindowMs: number;
  startedAt: string;
  consumedBucket: 'daily_free_bait' | 'bait' | null;
  resolveToken?: string;
}

interface ServerFishingResult {
  success: boolean;
  fishId: string | null;
  xpGain?: number;
  firstCatchBonus?: number;
  levelUp?: { newLevel: number; coinsReward: number } | null;
  albumReward?: {
    fishId: string;
    fishName: string;
    bonusCoins: number;
    totalSpeciesCaught: number;
    pageCompletedIds: string[];
  } | null;
  monReward?: {
    amountMon: number;
    sourceRef: string;
    rodId: string;
    rodLevel: number;
  } | null;
  specialReward?: {
    type: FishingSpecialReward['type'];
    sourceRef: string;
    bonusRodId: string;
    bonusRodLevel: number;
    compensationMon?: number;
    credited: boolean;
  } | null;
  occurredAt?: string;
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
  start_fishing_cast: 'Could not start the cast right now. Please try again.',
  resolve_fishing_cast: 'Could not resolve the cast right now. Please try again.',
  sell_fish: 'Could not sell this fish right now. Please try again.',
  buy_bait: 'Could not buy bait right now. Please try again.',
  buy_rod: 'Could not buy this rod right now. Please try again.',
  buy_fishing_net: 'Could not deploy this fishing net right now. Please try again.',
  claim_fishing_net: 'Could not collect the fishing net right now. Please try again.',
  buy_cube_rolls: 'Could not add cube rolls right now. Please try again.',
  equip_rod: 'Could not equip this rod right now. Please try again.',
  get_wallet_check_in_summary: 'Daily wallet check-in is temporarily unavailable. Please try again in a minute.',
  verify_wallet_check_in: 'We could not verify your wallet check-in right now. Please try again in a minute.',
  get_premium_session_state: 'Premium fishing status is temporarily unavailable. Please try again in a minute.',
  start_premium_session: 'Could not start the premium fishing session right now. Please try again in a minute.',
  resolve_premium_cast: 'Could not resolve the premium cast right now. Please try again in a moment.',
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
  'Hook & Loot API returned a non-2xx status code',
  'Failed to send a request to the Edge Function',
];

export function usePlayerActions(walletAddress: string | undefined, enabled: boolean, sessionToken?: string | null) {
  const callPlayerActions = useCallback(async <T extends PlayerActionResponse>(
    action: string,
    payload: Record<string, unknown> = {},
  ) => {
    if (!enabled || !walletAddress) {
      throw new Error('Server actions are unavailable for this player.');
    }

    const session = sessionToken
      ? { address: walletAddress, token: sessionToken }
      : getStoredWalletSession();
    if (!session || session.address.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error('Player session expired. Reconnect in the game first.');
    }

    const { data, error } = await invokeHooklootEdge('player-actions', {
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
        let responsePayload: { error?: string } | null = null;
        try {
          responsePayload = await contextualError.context.clone().json() as { error?: string };
        } catch {
          responsePayload = null;
        }

        if (typeof responsePayload?.error === 'string' && responsePayload.error.trim()) {
          const serverMessage = responsePayload.error.trim();
          throw new Error(serverMessage === 'Unknown action' ? fallbackMessage : serverMessage);
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
    return data as unknown as T;
  }, [enabled, sessionToken, walletAddress]);

  const startFishingCast = useCallback(async () => {
    const data = await callPlayerActions<{
      player: Tables<'players'>;
      fishing_cast: ServerFishingCast;
    }>('start_fishing_cast');

    return {
      player: data.player,
      fishingCast: data.fishing_cast,
    };
  }, [callPlayerActions]);

  const resolveFishingCast = useCallback(async (castId: string, resolution: 'reel' | 'timeout', resolveToken?: string) => {
    const data = await callPlayerActions<{
      player: Tables<'players'>;
      fishing_result: ServerFishingResult;
    }>('resolve_fishing_cast', {
      cast_id: castId,
      resolution,
      resolve_token: resolveToken,
    });

    return {
      player: data.player,
      fishingResult: data.fishing_result,
    };
  }, [callPlayerActions]);

  const sellFish = useCallback(async (fishId: string) => (
    callPlayerActions<{ player: Tables<'players'>; sell_price: number }>('sell_fish', {
      fish_id: fishId,
    })
  ), [callPlayerActions]);

  const buyBait = useCallback(async (amount: number) => (
    callPlayerActions<{ player: Tables<'players'> }>('buy_bait', {
      amount,
    })
  ), [callPlayerActions]);

  const buyRod = useCallback(async (level: number) => (
    callPlayerActions<{ player: Tables<'players'> }>('buy_rod', {
      level,
    })
  ), [callPlayerActions]);

  const buyFishingNet = useCallback(async (dailyFishCount: number, txHash: string, _expectedMon: string) => (
    callPlayerActions<{ player: Tables<'players'>; fishing_net: unknown }>('buy_fishing_net', {
      daily_fish_count: dailyFishCount,
      tx_hash: txHash,
    })
  ), [callPlayerActions]);

  const claimFishingNet = useCallback(async () => (
    callPlayerActions<{ player: Tables<'players'>; claimed_catch: Array<{ fishId: string; quantity: number }> }>('claim_fishing_net')
  ), [callPlayerActions]);

  const buyCubeRolls = useCallback(async (rolls: number, txHash: string, _expectedMon: string) => (
    callPlayerActions<{ player: Tables<'players'>; rolls: number }>('buy_cube_rolls', {
      rolls,
      tx_hash: txHash,
    })
  ), [callPlayerActions]);

  const equipRod = useCallback(async (level: number) => (
    callPlayerActions<{ player: Tables<'players'> }>('equip_rod', {
      level,
    })
  ), [callPlayerActions]);

  const rollCube = useCallback(async () => (
    callPlayerActions<{ player: Tables<'players'>; roll: CubeRollPayload }>('roll_cube')
  ), [callPlayerActions]);

  const applyCubeReward = useCallback(async (rollId: string) => (
    callPlayerActions<{ player: Tables<'players'>; prize: WheelPrize }>('apply_cube_reward', {
      roll_id: rollId,
    })
  ), [callPlayerActions]);

  const claimTaskReward = useCallback(async (taskId: TaskId | WeeklyMissionId) => (
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

  const updateGrillLeaderboard = useCallback(async (name: string) => (
    callPlayerActions<{ leaderboard_entry: NonNullable<PlayerActionResponse['leaderboard_entry']> }>('update_grill_leaderboard', {
      name,
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
    startFishingCast,
    resolveFishingCast,
    sellFish,
    buyBait,
    buyRod,
    buyFishingNet,
    claimFishingNet,
    buyCubeRolls,
    equipRod,
    rollCube,
    applyCubeReward,
    claimTaskReward,
    getWalletCheckInSummary,
    verifyWalletCheckIn,
    startPremiumSession,
    getPremiumSessionState,
    resolvePremiumCast,
    cookRecipe,
    sellCookedDish,
    updateGrillLeaderboard,
    listSocialTasks,
    submitSocialTaskVerification,
    claimSocialTaskReward,
  };
}
