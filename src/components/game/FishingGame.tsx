import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import MonadFishCanvas from './MonadFishCanvas';
import PlayerPanel from './PlayerPanel';
import GameControls from './GameControls';
import InventoryDialog from './InventoryDialog';
import BoostDialog from './BoostDialog';
import BottomNav from './BottomNav';
import LeaderboardNameDialog from './LeaderboardNameDialog';
import PlayerNameDialog from './PlayerNameDialog';
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
import {
  FISHING_NET_DAILY_FISH_COUNT,
  FISHING_NET_PRICE_COINS,
  getEconomyFeatureAvailability,
  getVisibleBaitTotal,
  PREMIUM_SESSION_COST_MON,
} from '@/lib/baitEconomy';
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
  FISH_DATA,
  GRILL_RECIPES,
  NFT_ROD_DATA,
  SOCIAL_TASKS,
  SPECIAL_TASKS,
  type GameTab,
  type GrillLeaderboardEntry,
  type GrillRecipe,
  type PremiumSessionState,
  type ReactionQuality,
  type SocialTaskId,
  type SocialTaskProgress,
  type TaskId,
  type WalletCheckInSummary,
  type WeeklyMissionId,
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
    walletSessionResolving,
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
  const [playerNameDialogOpen, setPlayerNameDialogOpen] = useState(false);
  const [pendingLeaderboardScore, setPendingLeaderboardScore] = useState(0);
  const [pendingLeaderboardDishes, setPendingLeaderboardDishes] = useState(0);
  const economyFeatures = useMemo(() => getEconomyFeatureAvailability(address), [address]);
  const gameProgress = useGameProgress({
    savedProgress: isVerified ? savedGameProgress : undefined,
    onSave: isVerified ? saveGameProgress : undefined,
    weeklyMissionsEnabled: economyFeatures.weeklyMissions,
    cubeRebalanceEnabled: economyFeatures.cubeRebalance,
  });
  const {
    rollCube,
    applyCubeReward,
    claimTaskReward,
    getWalletCheckInSummary,
    verifyWalletCheckIn,
    startPremiumSession,
    getPremiumSessionState,
    resolvePremiumCast,
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
  const [premiumSession, setPremiumSession] = useState<PremiumSessionState | null>(null);
  const [premiumSessionLoading, setPremiumSessionLoading] = useState(false);
  const premiumBiteTimeoutHandlerRef = useRef<(() => void) | null>(null);
  const premiumCastResolveInFlightRef = useRef(false);
  const backgroundErrorToastRef = useRef<Record<string, number>>({});
  const showBackgroundActionError = useCallback((key: string, message: string) => {
    const now = Date.now();
    const lastShownAt = backgroundErrorToastRef.current[key] ?? 0;

    if (now - lastShownAt < 5000) return;

    backgroundErrorToastRef.current[key] = now;
    toast.error(message);
  }, []);
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
  const refreshPremiumSession = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!economyFeatures.premiumSessions || !isVerified) {
      setPremiumSession(null);
      setPremiumSessionLoading(false);
      return;
    }

    setPremiumSessionLoading(true);
    try {
      const result = await getPremiumSessionState();
      applyServerPlayerSnapshot(result.player);
      setPremiumSession(result.premiumSession);
    } catch (error) {
      if (!silent) {
        showBackgroundActionError(
          'premium-session-refresh',
          error instanceof Error ? error.message : 'Could not refresh premium session state.',
        );
      } else {
        console.error('Premium session refresh failed:', error);
      }
    } finally {
      setPremiumSessionLoading(false);
    }
  }, [applyServerPlayerSnapshot, economyFeatures.premiumSessions, getPremiumSessionState, isVerified, showBackgroundActionError]);

  const {
    player,
    gameState,
    lastResult,
    levelUpInfo,
    albumRewardInfo,
    biteTimeLeft,
    biteTimeTotal,
    castRod,
    castPremiumRod,
    reelIn,
    presentPremiumCastResult,
    resetPremiumCastState,
    sellFish,
    cookRecipe,
    sellCookedDish,
    buyBait,
    buyRod,
    buyFishingNet,
    unlockRodWithMon,
    equipRod,
    addCoins,
    addBait,
    grantFishReward,
    dismissLevelUp,
    dismissAlbumReward,
    mintNftRod,
    setNickname,
    setAvatarUrl,
  } = useGameState({
    savedPlayer: isVerified ? savedPlayer : undefined,
    onSave: isVerified ? saveProgress : undefined,
    onFishCaught: gameProgress.recordFishCatch,
    onAuditEvent: logAuditEvent,
    collectionBookEnabled: economyFeatures.collectionBook,
    onPremiumBiteTimeout: () => {
      premiumBiteTimeoutHandlerRef.current?.();
    },
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
  const fishingNet = gameProgress.fishingNet;
  const fishingNetPendingCount = gameProgress.fishingNetPendingCount;
  const pendingTaskCount = useMemo(() => (
    [
      ...gameProgress.dailyTasks,
      ...gameProgress.specialTasks,
      ...(economyFeatures.weeklyMissions ? gameProgress.weeklyMissions : []),
    ].filter((task) => !task.claimed).length
  ), [economyFeatures.weeklyMissions, gameProgress.dailyTasks, gameProgress.specialTasks, gameProgress.weeklyMissions]);
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
      showBackgroundActionError(
        'social-tasks-refresh',
        error instanceof Error ? error.message : 'Could not refresh social task status.',
      );
    } finally {
      setSocialTasksLoading(false);
    }
  }, [isVerified, listSocialTasks, showBackgroundActionError]);

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
    if (!albumRewardInfo) return;

    const completedPagesNote = albumRewardInfo.pageCompletedIds.length > 0
      ? ` Page complete: ${albumRewardInfo.pageCompletedIds.length}.`
      : '';

    toast.success(`Album updated: ${albumRewardInfo.fishName}`, {
      description: `First catch bonus +${albumRewardInfo.bonusCoins} coins. Species discovered: ${albumRewardInfo.totalSpeciesCaught}.${completedPagesNote}`,
      duration: 3200,
    });
    dismissAlbumReward();
  }, [albumRewardInfo, dismissAlbumReward]);

  useEffect(() => {
    if (!assetsReady) return;
    if (walletSessionResolving || isVerifying) return;
    if (leaderboardNameOpen) return;

    setPlayerNameDialogOpen(!player.nickname?.trim());
  }, [assetsReady, isVerifying, leaderboardNameOpen, player.nickname, walletSessionResolving]);

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
      setPremiumSession(null);
      setPremiumSessionLoading(false);
      return;
    }
  }, [isVerified]);

  useEffect(() => {
    if (activeTab === 'tasks' && isVerified) {
      void refreshSocialTasks();
      void refreshWalletCheckInSummary();
    }
  }, [activeTab, isVerified, refreshSocialTasks, refreshWalletCheckInSummary]);

  useEffect(() => {
    if (activeTab === 'fish' && economyFeatures.premiumSessions && isVerified) {
      void refreshPremiumSession({ silent: true });
      return;
    }

    if (!economyFeatures.premiumSessions || !isVerified) {
      setPremiumSession(null);
      setPremiumSessionLoading(false);
    }
  }, [activeTab, economyFeatures.premiumSessions, isVerified, refreshPremiumSession]);

  useEffect(() => {
    if (
      !fishingNet.owned
      || !fishingNet.readyDate
      || fishingNetPendingCount <= 0
      || fishingNet.lastNotificationDate === fishingNet.readyDate
    ) {
      return;
    }

    gameProgress.markFishingNetNotified();
    sounds.playSuccessSound();
    toast.success(`Your fishing net is full. ${FISHING_NET_DAILY_FISH_COUNT} fish are waiting in the shop.`);
  }, [
    fishingNet,
    fishingNetPendingCount,
    gameProgress,
    sounds,
  ]);

  const handleBuyBait = (amount: number, cost: number) => {
    const purchased = buyBait(amount, cost);
    if (!purchased) return;
    gameProgress.recordCoinsSpent(cost);
    sounds.playBuySound();
  };

  const handleBuyFishingNet = (cost: number) => {
    if (player.coins < cost || fishingNet.owned) return;

    const purchased = buyFishingNet(cost);
    if (!purchased) return;

    if (!gameProgress.purchaseFishingNet()) {
      return;
    }

    gameProgress.recordCoinsSpent(cost);
    sounds.playBuySound();
    toast.success('Auto Fishing Net deployed. It will keep filling with fish for you.');
  };

  const handleBuyRod = (level: number, cost: number) => {
    const purchased = buyRod(level, cost);
    if (!purchased) return;
    gameProgress.recordCoinsSpent(cost);
    sounds.playBuySound();
  };

  const handleUnlockRodWithMon = (level: number, monAmount: string) => {
    const unlocked = unlockRodWithMon(level, monAmount);
    if (!unlocked) return;
    sounds.playBuySound();
  };

  const handleSellFish = (fishId: string) => {
    const sellPrice = sellFish(fishId);
    sounds.playSellSound();
  };

  const handleClaimFishingNet = () => {
    const claimedCatch = gameProgress.claimFishingNet();
    if (!claimedCatch || claimedCatch.length === 0) {
      toast.error('Your fishing net is empty right now.');
      return;
    }

    claimedCatch.forEach((entry) => {
      grantFishReward(entry.fishId, entry.quantity);
    });

    const summary = claimedCatch
      .map((entry) => {
        const fish = FISH_DATA.find((item) => item.id === entry.fishId);
        return fish ? `${fish.name} x${entry.quantity}` : null;
      })
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');

    sounds.playSuccessSound();
    toast.success(summary ? `Net collected: ${summary}.` : `Net collected: ${FISHING_NET_DAILY_FISH_COUNT} fish added.`);
  };

  const handleSellCookedDish = async (recipeId: string) => {
    if (isVerified) {
      try {
        const result = await requestSellCookedDish(recipeId);
        applyServerPlayerSnapshot(result.player);
        gameProgress.recordDishSold();
        sounds.playSellSound();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not sell dish.');
      }
      return;
    }

    const sellPrice = sellCookedDish(recipeId);
    if (sellPrice <= 0) return;
    gameProgress.recordDishSold();
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

  const handleClaimWeeklyMission = useCallback(async (missionId: WeeklyMissionId) => {
    if (isVerified) {
      try {
        const result = await claimTaskReward(missionId);
        applyServerPlayerSnapshot(result.player);
        sounds.playBuySound();
        if (missionId !== 'cube_3_days') {
          toast.success('Weekly mission claimed.');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not claim weekly mission reward.');
      }
      return;
    }

    const claimed = gameProgress.claimWeeklyMission(missionId, ({ coins = 0, bait = 0, cubeCharge = 0 }) => {
      if (coins > 0) addCoins(coins);
      if (bait > 0) addBait(bait);
      if (cubeCharge > 0) {
        toast.success(`Weekly mission claimed. +${cubeCharge} cube roll ready.`);
      }
    });

    if (!claimed) {
      toast.error('Could not claim weekly mission reward.');
      return;
    }

    if (!economyFeatures.weeklyMissions) return;
    sounds.playBuySound();
    if (missionId !== 'cube_3_days') {
      toast.success('Weekly mission claimed.');
    }
  }, [addBait, addCoins, applyServerPlayerSnapshot, claimTaskReward, economyFeatures.weeklyMissions, gameProgress, isVerified, sounds]);

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
      if (reward.type === 'bait') {
        addBait(reward.bait ?? 0);
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
      } else if (prize.type === 'bait') {
        metadata.bait = prize.bait ?? 0;
        afterState = {
          ...beforeState,
          bait: beforeState.bait + (prize.bait ?? 0),
        };
      } else {
        metadata.coins = prize.coins ?? 0;
        afterState = {
          ...beforeState,
          coins: beforeState.coins + (prize.coins ?? 0),
        };
      }

      void logPlayerAuditEvent({
        walletAddress: address,
        eventType: prize.type === 'fish'
          ? 'cube_fish_reward'
          : prize.type === 'mon'
            ? 'cube_mon_reward'
            : prize.type === 'bait'
              ? 'cube_bait_reward'
              : 'cube_coin_reward',
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
        gameProgress.recordGrillDish(recipe.score);
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

  const handleSavePlayerName = useCallback((name: string) => {
    setNickname(name);
    setPlayerNameDialogOpen(false);
  }, [setNickname]);

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
  const activePremiumSession = premiumSession?.status === 'active' ? premiumSession : null;

  const handleStartPremiumSession = useCallback(async (txHash: string) => {
    setPremiumSessionLoading(true);
    try {
      const result = await startPremiumSession(txHash);
      applyServerPlayerSnapshot(result.player);
      setPremiumSession(result.premiumSession);
    } finally {
      setPremiumSessionLoading(false);
    }
  }, [applyServerPlayerSnapshot, startPremiumSession]);

  const handlePremiumCastResolution = useCallback(async (reactionQuality: ReactionQuality) => {
    if (!activePremiumSession || premiumCastResolveInFlightRef.current) return;

    premiumCastResolveInFlightRef.current = true;
    try {
      const result = await resolvePremiumCast(reactionQuality);
      applyServerPlayerSnapshot(result.player);
      setPremiumSession(result.premiumSession);
      if (result.premiumSession.status === 'completed') {
        gameProgress.recordPremiumSessionCompleted();
      }

      const caughtFish = FISH_DATA.find((fish) => fish.id === result.castResult.fishId) ?? null;
      await presentPremiumCastResult(caughtFish);
    } catch (error) {
      resetPremiumCastState();
      toast.error(error instanceof Error ? error.message : 'Could not resolve premium cast.');
      void refreshPremiumSession({ silent: true });
    } finally {
      premiumCastResolveInFlightRef.current = false;
    }
  }, [
    activePremiumSession,
    applyServerPlayerSnapshot,
    gameProgress,
    presentPremiumCastResult,
    refreshPremiumSession,
    resolvePremiumCast,
    resetPremiumCastState,
  ]);

  useEffect(() => {
    premiumBiteTimeoutHandlerRef.current = () => {
      void handlePremiumCastResolution('miss');
    };

    return () => {
      premiumBiteTimeoutHandlerRef.current = null;
    };
  }, [handlePremiumCastResolution]);

  const handleCastAction = useCallback(() => {
    if (activePremiumSession && isVerified) {
      void castPremiumRod();
      return;
    }

    void castRod();
  }, [activePremiumSession, castPremiumRod, castRod, isVerified]);

  const handleReelAction = useCallback(() => {
    if (activePremiumSession && isVerified) {
      void handlePremiumCastResolution('good');
      return;
    }

    void reelIn();
  }, [activePremiumSession, handlePremiumCastResolution, isVerified, reelIn]);

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
              onCast={handleCastAction}
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
                  weeklyMissions={gameProgress.weeklyMissions}
                  weeklyMissionsEnabled={economyFeatures.weeklyMissions}
                  socialTasks={socialTasks}
                  walletCheckInSummary={walletCheckInSummary}
                  walletCheckInLoading={walletCheckInLoading}
                  dailyTaskClaimsMet={gameProgress.dailyTaskClaimsMet}
                  availableWheelRolls={gameProgress.availableWheelRolls}
                  socialTasksLoading={socialTasksLoading}
                  isWalletVerified={isVerified}
                  referralSummary={referralSummary}
                  onClaimTask={handleClaimTask}
                  onClaimWeeklyMission={handleClaimWeeklyMission}
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
                  fishingNet={fishingNet}
                  nftRods={player.nftRods}
                  onBuyBait={handleBuyBait}
                  onBuyFishingNet={handleBuyFishingNet}
                  onClaimFishingNet={handleClaimFishingNet}
                  onBuyRod={handleBuyRod}
                  onBuyRodWithMon={handleUnlockRodWithMon}
                  onCoinsAdded={addCoins}
                  onNftMinted={mintNftRod}
                />
              ) : activeTab === 'grill' ? (
                  <GrillScreen
                    inventory={player.inventory}
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
              <BoostDialog
                walletAddress={address}
                premiumSession={premiumSession}
                onStartPremiumSession={handleStartPremiumSession}
                premiumSessionLoading={premiumSessionLoading}
                premiumSessionsEnabled={economyFeatures.premiumSessions}
              />
              <InventoryDialog
                inventory={player.inventory}
                cookedDishes={player.cookedDishes}
                collectionBook={player.collectionBook}
                collectionBookEnabled={economyFeatures.collectionBook}
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

          {isFishingScreen && economyFeatures.premiumSessions && activePremiumSession && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3 sm:top-4">
              <div className="pointer-events-auto flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-emerald-300/20 bg-black/65 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300/85">
                      MON Expedition Active
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white/90">
                      {activePremiumSession.castsRemaining} premium casts left
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-300/20 bg-emerald-950/35 px-3 py-2 text-right">
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200/80">
                      Recovered
                    </div>
                    <div className="text-sm font-bold text-emerald-100">
                      {activePremiumSession.recoveredMon.toFixed(2)} / {PREMIUM_SESSION_COST_MON} MON
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-zinc-200/90">
                  <span className="rounded-lg border border-zinc-700 bg-zinc-950/80 px-2 py-1">
                    Casts used {activePremiumSession.castsUsed}/{activePremiumSession.castsTotal}
                  </span>
                  <span className="rounded-lg border border-zinc-700 bg-zinc-950/80 px-2 py-1">
                    Luck Meter {activePremiumSession.luckMeterStacks}
                  </span>
                  <span className="rounded-lg border border-zinc-700 bg-zinc-950/80 px-2 py-1">
                    Zero streak {activePremiumSession.zeroDropStreak}
                  </span>
                  {activePremiumSession.guaranteedRewardTier ? (
                    <span className="rounded-lg border border-amber-300/30 bg-amber-950/35 px-2 py-1 text-amber-100">
                      Guaranteed {activePremiumSession.guaranteedRewardTier} reward incoming
                    </span>
                  ) : null}
                </div>
              </div>
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
              hasBait={Boolean(activePremiumSession) || totalBait > 0}
              totalBait={totalBait}
              onCast={handleCastAction}
              onReelIn={handleReelAction}
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
          <PlayerNameDialog
            open={playerNameDialogOpen}
            walletLinked={isConnected && isVerified}
            onSave={handleSavePlayerName}
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
