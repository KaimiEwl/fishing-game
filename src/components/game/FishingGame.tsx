import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import MonadFishCanvas from './MonadFishCanvas';
import PlayerPanel from './PlayerPanel';
import GameControls from './GameControls';
import InventoryDialog from './InventoryDialog';
import BoostDialog from './BoostDialog';
import BottomNav from './BottomNav';
import LeaderboardNameDialog from './LeaderboardNameDialog';
import LevelUpCelebration from './LevelUpCelebration';
import GameLoadingScreen from './GameLoadingScreen';
import { useGameState } from '@/hooks/useGameState';
import { useGameProgress } from '@/hooks/useGameProgress';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { usePlayerMessages } from '@/hooks/usePlayerMessages';
import { usePlayerActions } from '@/hooks/usePlayerActions';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useIsMobile } from '@/hooks/use-mobile';
import { getVisibleBaitTotal } from '@/lib/baitEconomy';
import {
  logPlayerAuditEvent,
  type PlayerAuditEventPayload,
  toPlayerAuditSnapshot,
} from '@/lib/playerAudit';
import { cn } from '@/lib/utils';
import { publicAsset } from '@/lib/assets';
import {
  loadMainSceneAssets,
  warmPreloadAssets,
  WARM_PRELOAD_ASSET_URLS,
  type MainSceneAssets,
} from '@/lib/mainSceneAssets';
import {
  FISH_GOT_AWAY_PANEL_SRC,
} from '@/lib/rodAssets';
import {
  getDefaultWalletCheckInSummary,
  loadLocalWalletCheckInSummary,
  normalizeWalletCheckInSummary,
  WALLET_CHECK_IN_REPEAT_TEST_MODE,
  verifyLocalWalletCheckInTransaction,
} from '@/lib/walletCheckIn';
import travelIconSrc from '@/assets/map_travel_icon_cutout.webp';
import {
  deleteGlobalLeaderboardEntry,
  getLeaderboardPlayerId,
  hasCustomLeaderboardName,
  loadLeaderboardEntries,
  loadGlobalLeaderboardEntries,
  mergeLeaderboardEntries,
  saveGlobalLeaderboardEntry,
  upsertLeaderboardEntry,
} from '@/lib/leaderboard';
import {
  DAILY_TASKS,
  GRILL_RECIPES,
  NFT_ROD_DATA,
  SOCIAL_TASKS,
  SPECIAL_TASKS,
  type GameTab,
  type GrillLeaderboardEntry,
  type GrillRecipe,
  type SocialTaskId,
  type SocialTaskProgress,
  type TaskId,
  type WalletCheckInSummary,
  type WheelPrize,
} from '@/types/game';

const TRAVEL_ICON_SRC = travelIconSrc;
const TasksScreen = lazy(() => import('./TasksScreen'));
const ShopScreen = lazy(() => import('./ShopScreen'));
const GrillScreen = lazy(() => import('./GrillScreen'));
const WheelScreen = lazy(() => import('./WheelScreen'));
const LeaderboardScreen = lazy(() => import('./LeaderboardScreen'));
const MapScreen = lazy(() => import('./MapScreen'));

const setBootLoaderState = (progress: number, label?: string) => {
  const bootWindow = window as Window & {
    __setBootLoaderState?: (nextProgress: number, nextLabel?: string) => void;
  };

  bootWindow.__setBootLoaderState?.(progress, label);
};

const hideBootLoader = () => {
  const bootWindow = window as Window & {
    __hideBootLoader?: () => void;
  };

  bootWindow.__hideBootLoader?.();
};

const ScreenLoadingFallback: React.FC = () => (
  <div className="flex h-full items-center justify-center bg-[#05060b] px-6 text-center">
    <div className="rounded-2xl border border-cyan-300/15 bg-black/65 px-6 py-5 text-cyan-100 shadow-2xl backdrop-blur-md">
      <div className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200/80">Loading</div>
      <div className="mt-2 text-base font-semibold text-white/90">Preparing screen...</div>
    </div>
  </div>
);

const createDefaultSocialTasks = (): SocialTaskProgress[] => (
  SOCIAL_TASKS.map((task) => ({
    ...task,
    status: 'available',
    proofUrl: null,
    updatedAt: null,
    verifiedByWallet: null,
    canClaim: false,
  }))
);

const FishingGame: React.FC = () => {
  const {
    isConnected,
    isVerified,
    isVerifying,
    verificationError,
    savedPlayer,
    savedGameProgress,
    address,
    referralSummary,
    saveProgress,
    saveGameProgress,
    syncServerPlayerRecord,
    retryVerifyWallet,
  } = useWalletAuth();
  const {
    messages: inboxMessages,
    unreadCount: unreadMessageCount,
    loading: inboxLoading,
    markMessageRead,
  } = usePlayerMessages(address, isConnected && isVerified);
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<GameTab>('fish');
  const [assetsReady, setAssetsReady] = useState(false);
  const [assetsProgress, setAssetsProgress] = useState(0);
  const [mainSceneAssets, setMainSceneAssets] = useState<MainSceneAssets | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<GrillLeaderboardEntry[]>(() => loadLeaderboardEntries());
  const [leaderboardPlayerId, setLeaderboardPlayerId] = useState(() => getLeaderboardPlayerId(address));
  const [leaderboardNameOpen, setLeaderboardNameOpen] = useState(false);
  const [pendingLeaderboardScore, setPendingLeaderboardScore] = useState(0);
  const [pendingLeaderboardDishes, setPendingLeaderboardDishes] = useState(0);
  const gameProgress = useGameProgress({
    savedProgress: isVerified ? savedGameProgress : undefined,
    onSave: isVerified ? saveGameProgress : undefined,
  });
  const {
    rollCube,
    applyCubeReward,
    claimTaskReward,
    getWalletCheckInSummary,
    verifyWalletCheckIn,
    cookRecipe: requestCookRecipe,
    sellCookedDish: requestSellCookedDish,
    updateGrillLeaderboard,
    listSocialTasks,
    submitSocialTaskVerification,
    claimSocialTaskReward,
  } = usePlayerActions(address, isConnected && isVerified);
  const { syncReferralTask, syncWalletCheckInTask } = gameProgress;
  const [socialTasks, setSocialTasks] = useState<SocialTaskProgress[]>(() => createDefaultSocialTasks());
  const [socialTasksLoading, setSocialTasksLoading] = useState(false);
  const [walletCheckInSummary, setWalletCheckInSummary] = useState<WalletCheckInSummary | null>(null);
  const [walletCheckInLoading, setWalletCheckInLoading] = useState(false);
  const logAuditEvent = useCallback((event: PlayerAuditEventPayload) => {
    if (!address || !isVerified) return;

    void logPlayerAuditEvent({
      walletAddress: address,
      eventType: event.eventType,
      beforeState: event.beforeState,
      afterState: event.afterState,
      metadata: event.metadata,
    });
  }, [address, isVerified]);
  const applyServerPlayerSnapshot = useCallback((playerRecord: Parameters<typeof syncServerPlayerRecord>[0]) => {
    syncServerPlayerRecord(playerRecord);
  }, [syncServerPlayerRecord]);

  const {
    player,
    gameState,
    lastResult,
    levelUpInfo,
    biteTimeLeft,
    biteTimeTotal,
    castRod,
    reelIn,
    sellFish,
    cookRecipe,
    sellCookedDish,
    buyBait,
    buyRod,
    equipRod,
    addCoins,
    addBait,
    grantFishReward,
    dismissLevelUp,
    mintNftRod,
    setNickname,
    setAvatarUrl,
  } = useGameState({
    savedPlayer: isVerified ? savedPlayer : undefined,
    onSave: isVerified ? saveProgress : undefined,
    onFishCaught: gameProgress.recordFishCatch,
    onAuditEvent: logAuditEvent,
  });

  const sounds = useSoundEffects();
  useBackgroundMusic();
  const prevGameState = useRef(gameState);
  const prevLevel = useRef(player.level);
  const prevLeaderboardPlayerId = useRef(leaderboardPlayerId);
  const currentLeaderboardEntry = useMemo(() => (
    leaderboardEntries.find((entry) => entry.id === leaderboardPlayerId)
  ), [leaderboardEntries, leaderboardPlayerId]);
  const missXpReward = useMemo(() => {
    const nftBonus = player.nftRods.includes(player.equippedRod)
      ? NFT_ROD_DATA.find((rod) => rod.rodLevel === player.equippedRod)?.xpBonus ?? 0
      : 0;

    return Math.floor(5 * (1 + nftBonus / 100));
  }, [player.equippedRod, player.nftRods]);
  const totalBait = useMemo(() => getVisibleBaitTotal(player), [player]);
  const pendingTaskCount = useMemo(() => (
    [...gameProgress.dailyTasks, ...gameProgress.specialTasks].filter((task) => !task.claimed).length
  ), [gameProgress.dailyTasks, gameProgress.specialTasks]);
  const availableGrillCount = useMemo(() => (
    GRILL_RECIPES.filter((recipe) => (
      Object.entries(recipe.ingredients).every(([fishId, amount]) => (
        (player.inventory.find((item) => item.fishId === fishId)?.quantity ?? 0) >= amount
      ))
    )).length
  ), [player.inventory]);

  const refreshSocialTasks = useCallback(async () => {
    if (!isVerified) {
      setSocialTasks(createDefaultSocialTasks());
      setSocialTasksLoading(false);
      return;
    }

    setSocialTasksLoading(true);
    try {
      const nextTasks = await listSocialTasks();
      setSocialTasks(nextTasks);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not refresh social task status.');
    } finally {
      setSocialTasksLoading(false);
    }
  }, [isVerified, listSocialTasks]);

  const refreshWalletCheckInSummary = useCallback(async () => {
    if (!isVerified) {
      setWalletCheckInSummary(null);
      setWalletCheckInLoading(false);
      return;
    }

    setWalletCheckInLoading(true);
    try {
      const summary = await getWalletCheckInSummary();
      setWalletCheckInSummary(normalizeWalletCheckInSummary(summary, 'server'));
    } catch {
      const localSummary = loadLocalWalletCheckInSummary(address);
      setWalletCheckInSummary(localSummary ?? getDefaultWalletCheckInSummary());
    } finally {
      setWalletCheckInLoading(false);
    }
  }, [address, getWalletCheckInSummary, isVerified]);

  const saveCurrentLeaderboardEntry = useCallback((name: string, score: number, dishesDelta = 0) => {
    setLeaderboardEntries((entries) => {
      const nextEntries = upsertLeaderboardEntry({
        entries,
        id: leaderboardPlayerId,
        name,
        score,
        dishesDelta,
        walletAddress: address,
      });
      const updatedEntry = nextEntries.find((entry) => entry.id === leaderboardPlayerId);
      if (updatedEntry) {
        void saveGlobalLeaderboardEntry(updatedEntry);
      }
      return nextEntries;
    });
  }, [address, leaderboardPlayerId]);
  const syncServerLeaderboardEntry = useCallback((entry: {
    id: string;
    name: string;
    score: number;
    dishes: number;
    wallet_address?: string | null;
    updated_at?: string;
  }) => {
    setLeaderboardEntries((entries) => upsertLeaderboardEntry({
      entries,
      id: entry.id,
      name: entry.name,
      score: entry.score,
      dishesDelta: Math.max(0, entry.dishes - (entries.find((item) => item.id === entry.id)?.dishes ?? 0)),
      walletAddress: entry.wallet_address ?? address,
    }).map((item) => (
      item.id === entry.id
        ? {
          ...item,
          updatedAt: entry.updated_at ?? item.updatedAt,
          dishes: entry.dishes,
          score: entry.score,
        }
        : item
    )));
  }, [address]);

  const refreshLeaderboard = useCallback(async () => {
    const remoteEntries = await loadGlobalLeaderboardEntries();
    if (!remoteEntries) return;

    setLeaderboardEntries(remoteEntries);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAssetsProgress(0.04);
    setBootLoaderState(0.04, 'Loading the lake...');

    void loadMainSceneAssets((loaded, total) => {
      if (cancelled) return;
      const nextProgress = Math.min(0.96, loaded / total);
      setAssetsProgress(nextProgress);
      setBootLoaderState(nextProgress, 'Loading the lake...');
    }).then((assets) => {
      if (cancelled) return;
      setMainSceneAssets(assets);
      warmPreloadAssets(WARM_PRELOAD_ASSET_URLS);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!cancelled) {
            setAssetsProgress(1);
            setBootLoaderState(1, 'Ready to fish...');
            setAssetsReady(true);
          }
        });
      });
    }).catch(() => {
      if (cancelled) return;
      setAssetsProgress(1);
      setBootLoaderState(1, 'Ready to fish...');
      setAssetsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refreshLeaderboard().then(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [refreshLeaderboard]);

  useEffect(() => {
    if (activeTab !== 'leaderboard') return;
    void refreshLeaderboard();
  }, [activeTab, refreshLeaderboard]);

  useEffect(() => {
    if (activeTab !== 'leaderboard') return;

    const handleWindowFocus = () => {
      void refreshLeaderboard();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshLeaderboard();
      }
    };

    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshLeaderboard();
      }
    }, 15000);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(pollInterval);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab, refreshLeaderboard]);

  useEffect(() => {
    if (!assetsReady) return;

    const timer = window.setTimeout(() => {
      hideBootLoader();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [assetsReady]);

  useEffect(() => {
    const nextId = getLeaderboardPlayerId(address);
    const previousId = prevLeaderboardPlayerId.current;

    if (address && previousId !== nextId && previousId.startsWith('guest:')) {
      setLeaderboardEntries((entries) => {
        const nextEntries = mergeLeaderboardEntries({
          entries,
          fromId: previousId,
          toId: nextId,
          fallbackName: player.nickname || 'Guest griller',
          walletAddress: address,
        });
        const mergedEntry = nextEntries.find((entry) => entry.id === nextId);
        if (mergedEntry) {
          if (hasCustomLeaderboardName(mergedEntry.name)) {
            void saveGlobalLeaderboardEntry(mergedEntry);
          }
          void deleteGlobalLeaderboardEntry(previousId);
        }
        return nextEntries;
      });
    }

    prevLeaderboardPlayerId.current = nextId;
    setLeaderboardPlayerId(nextId);
  }, [address, player.nickname]);

  useEffect(() => {
    const prev = prevGameState.current;
    prevGameState.current = gameState;

    if (prev !== gameState) {
      if (gameState === 'casting') {
        sounds.playCastSound();
      } else if (gameState === 'waiting' && prev === 'casting') {
        sounds.playSplashSound();
      } else if (gameState === 'biting') {
        sounds.playBiteSound();
      } else if (gameState === 'result') {
        if (lastResult?.success) {
          sounds.playSuccessSound();
        } else {
          sounds.playFailSound();
        }
      }
    }
  }, [gameState, lastResult, sounds]);

  useEffect(() => {
    if (player.level > prevLevel.current) {
      sounds.playLevelUpSound();
    }
    prevLevel.current = player.level;
  }, [player.level, sounds]);

  useEffect(() => {
    if (
      gameProgress.grillScore > 0
      && !hasCustomLeaderboardName(currentLeaderboardEntry?.name)
      && !leaderboardNameOpen
    ) {
      setPendingLeaderboardScore(gameProgress.grillScore);
      setPendingLeaderboardDishes(0);
      setLeaderboardNameOpen(true);
    }
  }, [currentLeaderboardEntry?.name, gameProgress.grillScore, leaderboardNameOpen]);

  useEffect(() => {
    syncReferralTask(referralSummary?.todayReferralAttachCount ?? 0);
  }, [syncReferralTask, referralSummary?.todayReferralAttachCount]);

  useEffect(() => {
    syncWalletCheckInTask(
      walletCheckInSummary?.todayCheckedIn ?? false,
      walletCheckInSummary?.lastCheckInTxHash ?? null,
    );
  }, [syncWalletCheckInTask, walletCheckInSummary?.todayCheckedIn, walletCheckInSummary?.lastCheckInTxHash]);

  useEffect(() => {
    if (!isVerified) {
      setSocialTasks(createDefaultSocialTasks());
      setSocialTasksLoading(false);
      setWalletCheckInSummary(null);
      setWalletCheckInLoading(false);
      return;
    }

    void refreshSocialTasks();
  }, [address, isVerified, refreshSocialTasks]);

  useEffect(() => {
    if (activeTab === 'tasks' && isVerified) {
      void refreshSocialTasks();
      void refreshWalletCheckInSummary();
    }
  }, [activeTab, isVerified, refreshSocialTasks, refreshWalletCheckInSummary]);

  const handleBuyBait = (amount: number, cost: number) => {
    const purchased = buyBait(amount, cost);
    if (!purchased) return;
    gameProgress.recordCoinsSpent(cost);
    sounds.playBuySound();
  };

  const handleBuyRod = (level: number, cost: number) => {
    const purchased = buyRod(level, cost);
    if (!purchased) return;
    gameProgress.recordCoinsSpent(cost);
    sounds.playBuySound();
  };

  const handleSellFish = (fishId: string) => {
    const sellPrice = sellFish(fishId);
    sounds.playSellSound();
  };

  const handleSellCookedDish = async (recipeId: string) => {
    if (isVerified) {
      try {
        const result = await requestSellCookedDish(recipeId);
        applyServerPlayerSnapshot(result.player);
        sounds.playSellSound();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not sell dish.');
      }
      return;
    }

    const sellPrice = sellCookedDish(recipeId);
    if (sellPrice <= 0) return;
    sounds.playSellSound();
  };

  const handleClaimTask = async (taskId: TaskId) => {
    const task = DAILY_TASKS.find((item) => item.id === taskId) ?? SPECIAL_TASKS.find((item) => item.id === taskId);

    if (taskId === 'wallet_check_in' && (WALLET_CHECK_IN_REPEAT_TEST_MODE || walletCheckInSummary?.source === 'local')) {
      const claimed = gameProgress.claimTask(taskId, ({ coins = 0, bait = 0 }) => {
        if (coins > 0) addCoins(coins);
        if (bait > 0) addBait(bait);
      });

      if (!claimed) {
        toast.error('Could not claim wallet streak reward.');
        return;
      }

      sounds.playBuySound();
      toast.success(WALLET_CHECK_IN_REPEAT_TEST_MODE ? 'Wallet check-in reward claimed. You can test it again with another check-in.' : 'Wallet streak reward claimed.');
      return;
    }

    if (isVerified) {
      try {
        const result = await claimTaskReward(taskId);
        applyServerPlayerSnapshot(result.player);
        sounds.playBuySound();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not claim task reward.');
      }
      return;
    }

    const beforeState = toPlayerAuditSnapshot(player);
    if (gameProgress.claimTask(taskId, ({ coins = 0, bait = 0 }) => {
      if (coins > 0) addCoins(coins);
      if (bait > 0) addBait(bait);
    })) {
      if (task && address && isVerified) {
        void logPlayerAuditEvent({
          walletAddress: address,
          eventType: 'daily_task_claimed',
          beforeState,
          afterState: {
            ...beforeState,
            coins: beforeState.coins + (task.rewardCoins ?? 0),
            bait: beforeState.bait + (task.rewardBait ?? 0),
          },
          metadata: {
            taskId,
            rewardCoins: task.rewardCoins ?? 0,
            rewardBait: task.rewardBait ?? 0,
          },
        });
      }
      sounds.playBuySound();
    }
  };

  const handleRequestCubeRoll = async () => {
    if (!isVerified) return null;

    const result = await rollCube();
    applyServerPlayerSnapshot(result.player);
    return result.roll;
  };

  const handleResolveCubeReward = async (selectedPrize: WheelPrize, rollId?: string): Promise<WheelPrize | null> => {
    if (isVerified) {
      if (!rollId) throw new Error('Missing cube roll id.');
      const result = await applyCubeReward(rollId);
      applyServerPlayerSnapshot(result.player);
      sounds.playLevelUpSound();
      return result.prize;
    }

    const beforeState = toPlayerAuditSnapshot(player);
    const applyCubeRewardLocal = (reward: WheelPrize) => {
      if (reward.type === 'fish' && reward.fishId) {
        grantFishReward(reward.fishId, reward.quantity ?? 1);
        return;
      }
      if (reward.type === 'mon') {
        return;
      }

      addCoins(reward.coins ?? 0);
    };

    const prize = gameProgress.spinWheel(applyCubeRewardLocal, selectedPrize);
    if (prize && address && isVerified) {
      const metadata: Record<string, unknown> = {
        prizeId: prize.id,
        prizeType: prize.type,
      };
      let afterState = beforeState;

      if (prize.type === 'fish') {
        metadata.fishId = prize.fishId;
        metadata.quantity = prize.quantity ?? 1;
      } else if (prize.type === 'mon') {
        metadata.mon = prize.mon ?? 0;
      } else {
        metadata.coins = prize.coins ?? 0;
        afterState = {
          ...beforeState,
          coins: beforeState.coins + (prize.coins ?? 0),
        };
      }

      void logPlayerAuditEvent({
        walletAddress: address,
        eventType: prize.type === 'fish' ? 'cube_fish_reward' : prize.type === 'mon' ? 'cube_mon_reward' : 'cube_coin_reward',
        beforeState,
        afterState,
        metadata,
      });
    }

    if (prize) {
      sounds.playLevelUpSound();
    }

    return prize;
  };

  const handleCookRecipe = async (recipe: GrillRecipe) => {
    if (isVerified) {
      try {
        const result = await requestCookRecipe(recipe.id);
        applyServerPlayerSnapshot(result.player);
        if (result.leaderboard_entry) {
          syncServerLeaderboardEntry(result.leaderboard_entry);
        }
        sounds.playSellSound();
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not cook recipe.');
        return false;
      }
    }

    const beforeState = toPlayerAuditSnapshot(player);
    if (!cookRecipe(recipe)) return false;
    const nextGrillScore = gameProgress.grillScore + recipe.score;
    gameProgress.recordGrillDish(recipe.score);
    if (address && isVerified) {
      void logPlayerAuditEvent({
        walletAddress: address,
        eventType: 'grill_recipe_cooked',
        beforeState,
        afterState: beforeState,
        metadata: {
          recipeId: recipe.id,
          score: recipe.score,
          ingredients: recipe.ingredients,
        },
      });
    }
    if (hasCustomLeaderboardName(currentLeaderboardEntry?.name)) {
      saveCurrentLeaderboardEntry(currentLeaderboardEntry.name, nextGrillScore, 1);
    } else {
      setPendingLeaderboardScore(nextGrillScore);
      setPendingLeaderboardDishes(1);
      setLeaderboardNameOpen(true);
    }
    sounds.playSellSound();
    return true;
  };

  const handleSaveLeaderboardName = (name: string) => {
    const score = Math.max(pendingLeaderboardScore, gameProgress.grillScore);
    if (isVerified) {
      void updateGrillLeaderboard(name, score, pendingLeaderboardDishes)
        .then((result) => {
          syncServerLeaderboardEntry(result.leaderboard_entry);
          setLeaderboardNameOpen(false);
          setPendingLeaderboardDishes(0);
          setPendingLeaderboardScore(0);
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : 'Could not save leaderboard name.');
        });
      return;
    }

    saveCurrentLeaderboardEntry(name, score, pendingLeaderboardDishes);
    setLeaderboardNameOpen(false);
    setPendingLeaderboardDishes(0);
    setPendingLeaderboardScore(0);
  };

  const handleSubmitSocialTask = async (taskId: SocialTaskId, proofUrl?: string) => {
    if (!isVerified) {
      toast.error('Connect a verified wallet first.');
      return;
    }

    try {
      await submitSocialTaskVerification(taskId, proofUrl);
      await refreshSocialTasks();
      sounds.playBuySound();
      toast.success('Social task sent for review.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit social task.');
    }
  };

  const handleClaimSocialTask = async (taskId: SocialTaskId) => {
    if (!isVerified) {
      toast.error('Connect a verified wallet first.');
      return;
    }

    try {
      const result = await claimSocialTaskReward(taskId);
      applyServerPlayerSnapshot(result.player);
      await refreshSocialTasks();
      sounds.playBuySound();
      toast.success('Social task claimed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not claim social task.');
    }
  };

  const handleWalletCheckIn = async (txHash: string) => {
    if (!isVerified) {
      throw new Error('Connect a verified wallet first.');
    }

    try {
      const result = await verifyWalletCheckIn(txHash);
      applyServerPlayerSnapshot(result.player);
      setWalletCheckInSummary(normalizeWalletCheckInSummary(result.walletCheckInSummary, 'server'));
      sounds.playBuySound();
      return;
    } catch (serverError) {
      try {
        const localSummary = await verifyLocalWalletCheckInTransaction({
          walletAddress: address!,
          txHash,
          receiverAddress: walletCheckInSummary?.receiverAddress,
          amountMon: walletCheckInSummary?.amountMon,
        });

        const auditState = toPlayerAuditSnapshot(player);
        logAuditEvent({
          eventType: 'wallet_daily_check_in',
          beforeState: auditState,
          afterState: auditState,
          metadata: {
            txHash,
            receiverAddress: localSummary.receiverAddress,
            amountMon: localSummary.amountMon,
            streakDays: localSummary.streakDays,
            verificationSource: 'client_rpc_fallback',
          },
        });

        setWalletCheckInSummary(localSummary);
        sounds.playBuySound();
        return;
      } catch (localError) {
        throw localError instanceof Error
          ? localError
          : serverError instanceof Error
            ? serverError
            : new Error('Could not verify wallet check-in.');
      }
    }
  };

  const isFishingScreen = activeTab === 'fish';

  return (
    <main className="fixed inset-0 flex flex-col bg-[#05060b]">
      <div
        data-device={isMobile ? 'mobile' : 'desktop'}
        className="relative mx-auto flex h-full w-full flex-col overflow-hidden bg-black shadow-2xl"
        style={{
          maxWidth: isMobile ? '100vw' : '1920px',
          ['--bottom-nav-clearance' as string]: isMobile ? '5.25rem' : '6.25rem',
        }}
      >
        <div className={cn('relative flex-1 overflow-hidden transition-opacity duration-300', assetsReady ? 'opacity-100' : 'opacity-0')}>
          {isFishingScreen ? (
            <MonadFishCanvas
              onCast={castRod}
              gameState={gameState}
              lastResult={lastResult}
              rodLevel={player.equippedRod}
              assets={mainSceneAssets}
            />
          ) : (
            <Suspense fallback={<ScreenLoadingFallback />}>
              {activeTab === 'tasks' ? (
                <TasksScreen
                  coins={player.coins}
                  walletAddress={address}
                  dailyTasks={gameProgress.dailyTasks}
                  specialTasks={gameProgress.specialTasks}
                  socialTasks={socialTasks}
                  walletCheckInSummary={walletCheckInSummary}
                  walletCheckInLoading={walletCheckInLoading}
                  dailyTaskClaimsMet={gameProgress.dailyTaskClaimsMet}
                  availableWheelRolls={gameProgress.availableWheelRolls}
                  socialTasksLoading={socialTasksLoading}
                  isWalletVerified={isVerified}
                  onClaimTask={handleClaimTask}
                  onWalletCheckIn={handleWalletCheckIn}
                  onSubmitSocialTask={handleSubmitSocialTask}
                  onClaimSocialTask={handleClaimSocialTask}
                  onRefreshSocialTasks={() => void refreshSocialTasks()}
                  onOpenWheel={() => setActiveTab('wheel')}
                />
              ) : activeTab === 'shop' ? (
                <ShopScreen
                  coins={player.coins}
                  bait={totalBait}
                  dailyFreeBait={player.dailyFreeBait}
                  walletAddress={address}
                  rodLevel={player.rodLevel}
                  nftRods={player.nftRods}
                  onBuyBait={handleBuyBait}
                  onBuyRod={handleBuyRod}
                  onCoinsAdded={addCoins}
                  onNftMinted={mintNftRod}
                />
              ) : activeTab === 'grill' ? (
                  <GrillScreen
                    inventory={player.inventory}
                    coins={player.coins}
                    grillScore={gameProgress.grillScore}
                    onCook={handleCookRecipe}
                    onCookStartSound={sounds.playGrillCookSound}
                  />
              ) : activeTab === 'wheel' ? (
                <WheelScreen
                  coins={player.coins}
                  availableRolls={gameProgress.availableWheelRolls}
                  dailyWheelRolls={gameProgress.dailyWheelRolls}
                  paidWheelRolls={gameProgress.paidWheelRolls}
                  dailyTaskClaimsMet={gameProgress.dailyTaskClaimsMet}
                  walletAddress={address}
                  onRequestRoll={handleRequestCubeRoll}
                  onResolveReward={handleResolveCubeReward}
                  onBuySpin={gameProgress.addPaidWheelRolls}
                  onOpenTasks={() => setActiveTab('tasks')}
                  onSpinStartSound={sounds.playCubeSpinSound}
                  onRevealSound={sounds.playCubeRevealSound}
                  onRewardSound={sounds.playCubeRewardSound}
                />
              ) : activeTab === 'map' ? (
                <MapScreen
                  coins={player.coins}
                  onBack={() => setActiveTab('fish')}
                />
              ) : (
                <LeaderboardScreen
                  coins={player.coins}
                  grillScore={gameProgress.grillScore}
                  entries={leaderboardEntries}
                  currentPlayerId={leaderboardPlayerId}
                  isConnected={isConnected}
                  walletAddress={address}
                  nickname={player.nickname}
                />
              )}
            </Suspense>
          )}

          {isFishingScreen && (
            <div className="absolute right-[2.5%] top-[12.5%] z-20 flex flex-col items-center gap-3 sm:right-[2.25%] sm:top-[13.5%]">
              <BoostDialog walletAddress={address} />
              <InventoryDialog
                inventory={player.inventory}
                cookedDishes={player.cookedDishes}
                rodLevel={player.rodLevel}
                equippedRod={player.equippedRod}
                nftRods={player.nftRods}
                onEquipRod={equipRod}
                onSellFish={handleSellFish}
                onSellCookedDish={handleSellCookedDish}
                triggerVariant="shortcut"
              />
            </div>
          )}

          {isFishingScreen && (
            <PlayerPanel
              player={player}
              onSetNickname={isConnected ? setNickname : undefined}
              isConnected={isConnected}
              isVerified={isVerified}
              isVerifying={isVerifying}
              verificationError={verificationError}
              onRetryWalletVerification={retryVerifyWallet}
              walletAddress={address}
              onAvatarUploaded={setAvatarUrl}
              referralSummary={referralSummary}
              inboxMessages={inboxMessages}
              unreadMessageCount={unreadMessageCount}
              inboxLoading={inboxLoading}
              onMarkMessageRead={(messageId) => {
                void markMessageRead(messageId);
              }}
            />
          )}

          {isFishingScreen && (
            <GameControls
              gameState={gameState}
              lastResult={lastResult}
              hasBait={totalBait > 0}
              totalBait={totalBait}
              onCast={castRod}
              onReelIn={reelIn}
              rodLevel={player.equippedRod}
              ownedRodLevel={player.rodLevel}
              nftRods={player.nftRods}
              biteTimeLeft={biteTimeLeft}
              biteTimeTotal={biteTimeTotal}
              missXpReward={missXpReward}
              isMobile={isMobile}
            />
          )}

          {isFishingScreen && (
            <div
              className="absolute right-3 z-20 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 sm:right-5 sm:flex-row"
              style={{
                bottom: isMobile
                  ? 'calc(var(--bottom-nav-clearance,0px) + 4rem)'
                  : 'calc(var(--bottom-nav-clearance,0px) + 1.1rem)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className="group relative w-20 overflow-visible bg-transparent outline-none transition-all duration-200 hover:scale-105 focus-visible:scale-105 active:scale-95 sm:w-24"
                aria-label="Open travel map"
              >
                <img
                  src={TRAVEL_ICON_SRC}
                  alt=""
                  className="block w-full scale-[1.12] object-contain drop-shadow-[0_16px_30px_rgba(0,0,0,0.42)] transition-transform duration-300 group-hover:scale-[1.15]"
                />
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-lg border border-yellow-200/75 bg-yellow-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-normal text-black shadow-lg sm:bottom-2 sm:text-[10px]">
                  Travel
                </span>
              </button>
            </div>
          )}

          <LeaderboardNameDialog
            open={leaderboardNameOpen}
            defaultName={hasCustomLeaderboardName(currentLeaderboardEntry?.name)
              ? currentLeaderboardEntry?.name
              : player.nickname}
            score={Math.max(pendingLeaderboardScore, gameProgress.grillScore)}
            onSave={handleSaveLeaderboardName}
          />
          {levelUpInfo && (
            <LevelUpCelebration
              newLevel={levelUpInfo.newLevel}
              coinsReward={levelUpInfo.coinsReward}
              onDismiss={dismissLevelUp}
            />
          )}

        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
          <div className="pointer-events-auto">
            <BottomNav
              activeTab={activeTab}
              onTabChange={setActiveTab}
              wheelReady={gameProgress.wheelReady}
              tasksBadgeCount={pendingTaskCount}
              grillBadgeCount={availableGrillCount}
            />
          </div>
        </div>

        <GameLoadingScreen visible={!assetsReady} progress={assetsProgress} />
      </div>
    </main>
  );
};

export default FishingGame;
