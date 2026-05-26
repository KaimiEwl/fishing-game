import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import MonadFishCanvas from './MonadFishCanvas';
import PlayerPanel from './PlayerPanel';
import GameControls from './GameControls';
import InventoryDialog from './InventoryDialog';
import BoostDialog from './BoostDialog';
import BottomNav from './BottomNav';
import PlayerNameDialog from './PlayerNameDialog';
import LevelUpCelebration from './LevelUpCelebration';
import GameLoadingScreen from './GameLoadingScreen';
import { useGameState } from '@/hooks/useGameState';
import { useGameProgress } from '@/hooks/useGameProgress';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useGuestSession } from '@/hooks/useGuestSession';
import { usePlayerMessages } from '@/hooks/usePlayerMessages';
import { usePlayerActions } from '@/hooks/usePlayerActions';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useIsMobile } from '@/hooks/use-mobile';
import type { MonBalanceSummary } from '@/hooks/usePlayerMon';
import {
  getEconomyFeatureAvailability,
  getVisibleBaitTotal,
  PREMIUM_SESSION_COST_MON,
} from '@/lib/baitEconomy';
import { MIN_WITHDRAW_MON, MON_HOLD_DAYS, normalizeMonAmount } from '@/lib/monRewards';
import {
  logPlayerAuditEvent,
  type PlayerAuditEventPayload,
  toPlayerAuditSnapshot,
} from '@/lib/playerAudit';
import {
  installTestActivityErrorLogging,
  logTestActivityEvent,
  serializeError,
} from '@/lib/testActivityLog';
import { MONAD_SHOP_TEST_MODE_ENABLED } from '@/lib/monadTestMode';
import { MISS_XP_REWARD } from '@/lib/economyConfig';
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
import { getSafeEquippedRodLevel } from '@/lib/rodMonadRewards';
import {
  getDefaultWalletCheckInSummary,
  normalizeWalletCheckInSummary,
  WALLET_CHECK_IN_REPEAT_TEST_MODE,
} from '@/lib/walletCheckIn';
import travelIconSrc from '@/assets/map_travel_icon_cutout.webp';
import {
  deleteGlobalLeaderboardEntry,
  getLeaderboardPlayerId,
  hasCustomLeaderboardName,
  loadLeaderboardEntries,
  loadGlobalLeaderboardEntries,
  mergeLeaderboardEntries,
  sanitizeLeaderboardName,
  saveGlobalLeaderboardEntry,
  upsertLeaderboardEntry,
} from '@/lib/leaderboard';
import {
  DAILY_TASKS,
  FISH_DATA,
  GRILL_RECIPES,
  NFT_ROD_DATA,
  ROD_DATA,
  SOCIAL_TASKS,
  SPECIAL_TASKS,
  type Fish,
  type FishingMonadReward,
  type FishingSpecialReward,
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
  XP_PER_LEVEL,
} from '@/types/game';
import { Button } from '@/components/ui/button';

const TRAVEL_ICON_SRC = travelIconSrc;
const TasksScreen = lazy(() => import('./TasksScreen'));
const ShopScreen = lazy(() => import('./ShopScreen'));
const GrillScreen = lazy(() => import('./GrillScreen'));
const WheelScreen = lazy(() => import('./WheelScreen'));
const LeaderboardScreen = lazy(() => import('./LeaderboardScreen'));
const MapScreen = lazy(() => import('./MapScreen'));
const PREMIUM_SESSION_STATUS_REFRESH_COOLDOWN_MS = 60_000;
const EMPTY_MON_SUMMARY: MonBalanceSummary = {
  totalEarnedMon: 0,
  pendingHoldMon: 0,
  withdrawableMon: 0,
  pendingRequestMon: 0,
  minWithdrawMon: MIN_WITHDRAW_MON,
  holdDays: MON_HOLD_DAYS,
};

const normalizeMonSummary = (summary: Partial<MonBalanceSummary> | null | undefined): MonBalanceSummary => ({
  totalEarnedMon: normalizeMonAmount(summary?.totalEarnedMon ?? 0),
  pendingHoldMon: normalizeMonAmount(summary?.pendingHoldMon ?? 0),
  withdrawableMon: normalizeMonAmount(summary?.withdrawableMon ?? 0),
  pendingRequestMon: normalizeMonAmount(summary?.pendingRequestMon ?? 0),
  minWithdrawMon: normalizeMonAmount(summary?.minWithdrawMon ?? MIN_WITHDRAW_MON),
  holdDays: summary?.holdDays ?? MON_HOLD_DAYS,
});

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

const TAB_SCREEN_RELOAD_GUARD_KEY = 'hookloot_tab_screen_reload_guard_at';
const TAB_SCREEN_RELOAD_GUARD_MS = 15000;
const RECOVERABLE_TAB_SCREEN_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'Failed to load module script',
  'Loading chunk',
  'ChunkLoadError',
];

const isRecoverableTabScreenError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return RECOVERABLE_TAB_SCREEN_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

interface TabScreenErrorBoundaryProps {
  screenKey: string;
  onBackToFish: () => void;
  children: React.ReactNode;
}

interface TabScreenErrorBoundaryState {
  error: Error | null;
}

class TabScreenErrorBoundary extends React.Component<TabScreenErrorBoundaryProps, TabScreenErrorBoundaryState> {
  state: TabScreenErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): TabScreenErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    void logTestActivityEvent({
      eventType: 'screen_error',
      metadata: {
        screen: this.props.screenKey,
        error: serializeError(error),
      },
    });

    if (typeof window === 'undefined' || !isRecoverableTabScreenError(error)) return;

    const now = Date.now();
    const previousAttempt = Number(window.sessionStorage.getItem(TAB_SCREEN_RELOAD_GUARD_KEY) ?? '0');
    if (Number.isFinite(previousAttempt) && now - previousAttempt < TAB_SCREEN_RELOAD_GUARD_MS) {
      return;
    }

    window.sessionStorage.setItem(TAB_SCREEN_RELOAD_GUARD_KEY, String(now));
    window.location.reload();
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="flex h-full items-center justify-center bg-[#05060b] px-6 text-center">
        <div className="w-full max-w-md rounded-2xl border border-red-300/20 bg-black/72 px-6 py-5 text-zinc-100 shadow-2xl backdrop-blur-md">
          <div className="text-sm font-black uppercase tracking-[0.18em] text-red-200/80">Screen error</div>
          <div className="mt-2 text-base font-semibold text-white/90">
            This screen did not load correctly. Reload the game or go back to fishing.
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={() => window.location.reload()}
              className="h-11 flex-1 rounded-xl border border-cyan-300/25 bg-black text-cyan-100 hover:bg-zinc-950"
            >
              Reload game
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={this.props.onBackToFish}
              className="h-11 flex-1 rounded-xl border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-black hover:text-white"
            >
              Back to fish
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

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

const PREMIUM_PERFECT_SWEET_SPOT_START = 42;
const PREMIUM_PERFECT_SWEET_SPOT_END = 58;

const getPremiumReactionQuality = (
  biteTimeLeft: number,
  biteTimeTotal: number,
): ReactionQuality => {
  if (biteTimeTotal <= 0) return 'good';

  const progress = Math.max(0, Math.min(100, (biteTimeLeft / biteTimeTotal) * 100));
  return progress >= PREMIUM_PERFECT_SWEET_SPOT_START && progress <= PREMIUM_PERFECT_SWEET_SPOT_END
    ? 'perfect'
    : 'good';
};

const normalizeWalletNickname = (value: string | null | undefined) => value?.trim() ?? '';

const hasRequiredFishForRecipe = (
  inventory: { fishId: string; quantity: number }[],
  recipe: GrillRecipe,
) => (
  Object.entries(recipe.ingredients).every(([fishId, amount]) => (
    (inventory.find((item) => item.fishId === fishId)?.quantity ?? 0) >= amount
  ))
);

const FishingGame: React.FC = () => {
  const {
    isConnected,
    isVerified,
    isVerifying,
    verificationError,
    savedPlayer,
    savedPlayerSyncMode,
    savedGameProgress,
    hasPendingPlayerSave,
    walletSessionResolving,
    address,
    referralSummary,
    saveVerifiedNickname,
    syncServerPlayerRecord,
    retryVerifyWallet,
  } = useWalletAuth();
  const walletServerReady = Boolean(isConnected && isVerified && address);
  const guestSession = useGuestSession(!walletServerReady);
  const guestServerReady = guestSession.ready;
  const serverEconomyReady = walletServerReady || guestServerReady;
  const activeServerAddress = walletServerReady ? address : guestSession.guestId ?? undefined;
  const monadPaymentAddress = walletServerReady || MONAD_SHOP_TEST_MODE_ENABLED ? activeServerAddress : undefined;
  const activeServerSessionToken = walletServerReady ? null : guestSession.sessionToken;
  const activeSavedPlayer = walletServerReady ? savedPlayer : guestSession.savedPlayer;
  const activeSavedGameProgress = walletServerReady ? savedGameProgress : guestSession.savedGameProgress;
  const activeSavedPlayerSyncMode = walletServerReady ? savedPlayerSyncMode : guestSession.savedPlayerSyncMode;
  const {
    messages: inboxMessages,
    unreadCount: unreadMessageCount,
    loading: inboxLoading,
    markMessageRead,
  } = usePlayerMessages(address, walletServerReady);
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<GameTab>('fish');
  const [assetsReady, setAssetsReady] = useState(false);
  const [assetsProgress, setAssetsProgress] = useState(0);
  const [mainSceneAssets, setMainSceneAssets] = useState<MainSceneAssets | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<GrillLeaderboardEntry[]>(() => loadLeaderboardEntries());
  const [leaderboardPlayerId, setLeaderboardPlayerId] = useState(() => getLeaderboardPlayerId(address));
  const [playerNameDialogOpen, setPlayerNameDialogOpen] = useState(false);
  const [playerNameSyncPending, setPlayerNameSyncPending] = useState(false);
  const [claimingTaskId, setClaimingTaskId] = useState<TaskId | null>(null);
  const [claimingWeeklyMissionId, setClaimingWeeklyMissionId] = useState<WeeklyMissionId | null>(null);
  const economyFeatures = useMemo(() => getEconomyFeatureAvailability(address), [address]);
  const gameProgress = useGameProgress({
    savedProgress: serverEconomyReady ? activeSavedGameProgress : undefined,
    savedProgressMode: serverEconomyReady && activeSavedPlayerSyncMode !== 'link' ? 'replace' : 'merge',
    localClientStateEnabled: false,
    onSave: undefined,
    weeklyMissionsEnabled: economyFeatures.weeklyMissions,
    cubeRebalanceEnabled: economyFeatures.cubeRebalance,
  });
  const {
    startFishingCast: requestStartFishingCast,
    resolveFishingCast: requestResolveFishingCast,
    sellFish: requestSellFish,
    buyBait: requestBuyBait,
    buyRod: requestBuyRod,
    buyFishingNet: requestBuyFishingNet,
    claimFishingNet: requestClaimFishingNet,
    markFishingNetNotified: requestMarkFishingNetNotified,
    buyCubeRolls: requestBuyCubeRolls,
    equipRod: requestEquipRod,
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
    getMonSummary,
    submitSocialTaskVerification,
    claimSocialTaskReward,
  } = usePlayerActions(activeServerAddress, serverEconomyReady, activeServerSessionToken);
  const { syncReferralTask, syncWalletCheckInTask } = gameProgress;
  const [socialTasks, setSocialTasks] = useState<SocialTaskProgress[]>(() => createDefaultSocialTasks());
  const [socialTasksLoading, setSocialTasksLoading] = useState(false);
  const [walletCheckInSummary, setWalletCheckInSummary] = useState<WalletCheckInSummary | null>(null);
  const [walletCheckInLoading, setWalletCheckInLoading] = useState(false);
  const [monSummary, setMonSummary] = useState<MonBalanceSummary>(EMPTY_MON_SUMMARY);
  const [premiumSession, setPremiumSession] = useState<PremiumSessionState | null>(null);
  const [premiumSessionLoading, setPremiumSessionLoading] = useState(false);
  const premiumBiteTimeoutHandlerRef = useRef<(() => void) | null>(null);
  const premiumCastResolveInFlightRef = useRef(false);
  const premiumSessionRefreshInFlightRef = useRef(false);
  const monSummaryRefreshInFlightRef = useRef(false);
  const monSummaryRefreshQueuedRef = useRef(false);
  const premiumSessionRefreshKeyRef = useRef<string | null>(null);
  const premiumSessionLastRefreshAtRef = useRef(0);
  const backgroundErrorToastRef = useRef<Record<string, number>>({});
  const fishingNetNotificationKeyRef = useRef<string | null>(null);
  const activityContextRef = useRef<Record<string, unknown>>({});
  const activitySessionKeyRef = useRef<string | null>(null);
  const lastLoggedTabKeyRef = useRef<string | null>(null);
  const unverifiedWalletLoggedRef = useRef<string | null>(null);
  activityContextRef.current = {
    activeTab,
    activeServerAddress: activeServerAddress ?? null,
    connectedWalletAddress: address?.toLowerCase() ?? null,
    sessionType: walletServerReady ? 'wallet' : guestServerReady ? 'guest' : 'none',
    isConnected,
    isVerified,
    serverEconomyReady,
  };

  useEffect(() => (
    installTestActivityErrorLogging(() => activityContextRef.current)
  ), []);

  useEffect(() => {
    if (!serverEconomyReady || !activeServerAddress) return;

    const sessionType = walletServerReady ? 'wallet' : 'guest';
    const sessionKey = `${sessionType}:${activeServerAddress.toLowerCase()}`;
    if (activitySessionKeyRef.current === sessionKey) return;
    activitySessionKeyRef.current = sessionKey;

    void logTestActivityEvent({
      eventType: 'app_session_started',
      walletAddress: activeServerAddress,
      sessionToken: activeServerSessionToken,
      metadata: {
        sessionType,
        activeServerAddress,
        connectedWalletAddress: address?.toLowerCase() ?? null,
        isConnected,
        isVerified,
        nickname: activeSavedPlayer?.nickname ?? null,
        level: activeSavedPlayer?.level ?? null,
        coins: activeSavedPlayer?.coins ?? null,
        bait: activeSavedPlayer ? activeSavedPlayer.bait + activeSavedPlayer.dailyFreeBait : null,
      },
    });
  }, [
    activeSavedPlayer,
    activeServerAddress,
    activeServerSessionToken,
    address,
    isConnected,
    isVerified,
    serverEconomyReady,
    walletServerReady,
  ]);

  useEffect(() => {
    const connectedWalletAddress = address?.toLowerCase() ?? null;
    if (!connectedWalletAddress || !isConnected || walletServerReady) {
      unverifiedWalletLoggedRef.current = null;
      return;
    }

    if (!guestServerReady || !guestSession.guestId || !guestSession.sessionToken) return;

    const logKey = `${guestSession.guestId}:${connectedWalletAddress}`;
    if (unverifiedWalletLoggedRef.current === logKey) return;
    unverifiedWalletLoggedRef.current = logKey;

    void logTestActivityEvent({
      eventType: 'connected_wallet_unverified_guest_mode',
      walletAddress: guestSession.guestId,
      sessionToken: guestSession.sessionToken,
      metadata: {
        connectedWalletAddress,
        guestId: guestSession.guestId,
        isConnected,
        isVerified,
        verificationError: verificationError ?? null,
      },
    });
  }, [
    address,
    guestServerReady,
    guestSession.guestId,
    guestSession.sessionToken,
    isConnected,
    isVerified,
    verificationError,
    walletServerReady,
  ]);

  useEffect(() => {
    const sessionType = walletServerReady ? 'wallet' : guestServerReady ? 'guest' : 'none';
    const tabKey = `${sessionType}:${activeServerAddress ?? 'anonymous'}:${activeTab}`;
    if (lastLoggedTabKeyRef.current === tabKey) return;
    lastLoggedTabKeyRef.current = tabKey;

    void logTestActivityEvent({
      eventType: 'screen_opened',
      walletAddress: activeServerAddress,
      sessionToken: activeServerSessionToken,
      metadata: {
        screen: activeTab,
        sessionType,
        activeServerAddress,
        connectedWalletAddress: address?.toLowerCase() ?? null,
        serverEconomyReady,
      },
    });
  }, [
    activeServerAddress,
    activeServerSessionToken,
    activeTab,
    address,
    guestServerReady,
    serverEconomyReady,
    walletServerReady,
  ]);

  const showBackgroundActionError = useCallback((key: string, message: string) => {
    const now = Date.now();
    const lastShownAt = backgroundErrorToastRef.current[key] ?? 0;

    if (now - lastShownAt < 5000) return;

    backgroundErrorToastRef.current[key] = now;
    toast.error(message);
  }, []);
  const refreshMonSummary = useCallback(async ({ silent = true }: { silent?: boolean } = {}) => {
    if (!serverEconomyReady || !activeServerAddress) {
      setMonSummary(EMPTY_MON_SUMMARY);
      return false;
    }

    if (monSummaryRefreshInFlightRef.current) {
      monSummaryRefreshQueuedRef.current = true;
      return false;
    }

    monSummaryRefreshInFlightRef.current = true;
    try {
      const summary = await getMonSummary();
      setMonSummary(normalizeMonSummary(summary));
      return true;
    } catch (error) {
      console.error('MON summary refresh failed:', error);
      if (!silent) {
        showBackgroundActionError(
          'mon-summary-refresh',
          error instanceof Error ? error.message : 'Could not refresh MON balance.',
        );
      }
      return false;
    } finally {
      monSummaryRefreshInFlightRef.current = false;
      if (monSummaryRefreshQueuedRef.current) {
        monSummaryRefreshQueuedRef.current = false;
        void refreshMonSummary({ silent: true });
      }
    }
  }, [activeServerAddress, getMonSummary, serverEconomyReady, showBackgroundActionError]);

  useEffect(() => {
    if (!serverEconomyReady || !activeServerAddress) {
      setMonSummary(EMPTY_MON_SUMMARY);
      return;
    }

    void refreshMonSummary({ silent: true });
  }, [activeServerAddress, refreshMonSummary, serverEconomyReady]);

  useEffect(() => {
    const handleMonReward = () => {
      void refreshMonSummary({ silent: true });
    };

    window.addEventListener('hookloot:mon-reward', handleMonReward);
    return () => {
      window.removeEventListener('hookloot:mon-reward', handleMonReward);
    };
  }, [refreshMonSummary]);

  const requireServerEconomy = useCallback(() => {
    if (serverEconomyReady) return true;

    void logTestActivityEvent({
      eventType: 'action_blocked',
      walletAddress: activeServerAddress,
      sessionToken: activeServerSessionToken,
      metadata: {
        reason: 'server_economy_not_ready',
        screen: activeTab,
        guestError: guestSession.error,
      },
    });
    toast.error(guestSession.error || 'Starting guest profile. Please try again in a moment.');
    return false;
  }, [activeServerAddress, activeServerSessionToken, activeTab, guestSession.error, serverEconomyReady]);
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
  const applyServerPlayerSnapshot = useCallback((
    playerRecord: Parameters<typeof syncServerPlayerRecord>[0],
    options?: Parameters<typeof syncServerPlayerRecord>[1],
  ) => {
    if (walletServerReady) {
      syncServerPlayerRecord(playerRecord, options);
      return;
    }

    guestSession.syncServerPlayerRecord(playerRecord, options);
  }, [guestSession, syncServerPlayerRecord, walletServerReady]);
  const handleStartServerFishingCast = useCallback(async () => {
    const result = await requestStartFishingCast();
    applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });
    return {
      castId: result.fishingCast.id,
      waitMs: result.fishingCast.waitMs,
      biteWindowMs: result.fishingCast.biteWindowMs,
      resolveToken: result.fishingCast.resolveToken,
    };
  }, [applyServerPlayerSnapshot, requestStartFishingCast]);
  const handleResolveServerFishingCast = useCallback(async (castId: string, resolution: 'reel' | 'timeout', resolveToken?: string) => {
    const result = await requestResolveFishingCast(castId, resolution, resolveToken);
    applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });

    const fish = result.fishingResult.fishId
      ? FISH_DATA.find((entry) => entry.id === result.fishingResult.fishId) ?? null
      : null;
    const serverMonReward = result.fishingResult.monReward;
    const monRod = serverMonReward
      ? ROD_DATA.find((rod) => rod.id === serverMonReward.rodId) ?? ROD_DATA[serverMonReward.rodLevel] ?? ROD_DATA[0]
      : null;
    const monReward: FishingMonadReward | undefined = serverMonReward && monRod
      ? {
        sourceRef: serverMonReward.sourceRef,
        amount: serverMonReward.amountMon,
        rodId: serverMonReward.rodId,
        rodLevel: serverMonReward.rodLevel,
        rodName: monRod.name,
        rarity: monRod.rarity,
        dropChance: monRod.monadDropChance,
        minReward: monRod.monadMinReward,
        maxReward: monRod.monadMaxReward,
        credited: true,
      }
      : undefined;
    const serverSpecialReward = result.fishingResult.specialReward;
    const bonusRod = serverSpecialReward
      ? ROD_DATA.find((rod) => rod.id === serverSpecialReward.bonusRodId) ?? ROD_DATA[serverSpecialReward.bonusRodLevel] ?? ROD_DATA[2]
      : null;
    const requiredRod = ROD_DATA[0];
    const specialReward: FishingSpecialReward | undefined = serverSpecialReward && bonusRod
      ? {
        sourceRef: serverSpecialReward.sourceRef,
        reason: 'leviathan_common_rod_bonus',
        type: serverSpecialReward.type,
        fishId: 'leviathan',
        fishName: 'Cosmic Leviathan',
        requiredRodId: requiredRod.id,
        requiredRodLevel: requiredRod.level,
        requiredRodName: requiredRod.name,
        bonusRodId: bonusRod.id,
        bonusRodLevel: bonusRod.level,
        bonusRodName: bonusRod.name,
        bonusRodRarity: bonusRod.rarity,
        compensationMon: serverSpecialReward.compensationMon,
        credited: serverSpecialReward.credited,
      }
      : undefined;

    if (monReward || specialReward?.type === 'mon_compensation') {
      window.dispatchEvent(new CustomEvent('hookloot:mon-reward'));
    }

    return {
      fish,
      monReward,
      specialReward,
      levelUpInfo: result.fishingResult.levelUp ?? null,
      albumRewardInfo: result.fishingResult.albumReward ?? null,
    };
  }, [applyServerPlayerSnapshot, requestResolveFishingCast]);
  const refreshPremiumSession = useCallback(async ({
    silent = false,
    force = false,
  }: {
    silent?: boolean;
    force?: boolean;
  } = {}) => {
    if (!economyFeatures.premiumSessions || !walletServerReady) {
      setPremiumSession(null);
      setPremiumSessionLoading(false);
      return;
    }
    if (premiumSessionRefreshInFlightRef.current) {
      return;
    }

    const now = Date.now();
    if (!force && now - premiumSessionLastRefreshAtRef.current < PREMIUM_SESSION_STATUS_REFRESH_COOLDOWN_MS) {
      return;
    }

    premiumSessionLastRefreshAtRef.current = now;
    premiumSessionRefreshInFlightRef.current = true;
    setPremiumSessionLoading(true);
    try {
      const result = await getPremiumSessionState();
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
      premiumSessionRefreshInFlightRef.current = false;
      setPremiumSessionLoading(false);
    }
  }, [economyFeatures.premiumSessions, getPremiumSessionState, showBackgroundActionError, walletServerReady]);

  const handleServerFishingError = useCallback((message: string) => {
    void logTestActivityEvent({
      eventType: 'server_fishing_error',
      walletAddress: activeServerAddress,
      sessionToken: activeServerSessionToken,
      metadata: {
        screen: activeTab,
        message,
      },
    });
    toast.error(message);
  }, [activeServerAddress, activeServerSessionToken, activeTab]);

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
    dismissLevelUp,
    dismissAlbumReward,
    setNickname,
    setAvatarUrl,
  } = useGameState({
    savedPlayer: serverEconomyReady ? activeSavedPlayer : undefined,
    savedPlayerSyncMode: serverEconomyReady ? activeSavedPlayerSyncMode : undefined,
    localClientStateEnabled: false,
    onSave: undefined,
    onFishCaught: undefined,
    onFishingMonReward: undefined,
    onLeviathanCommonRodBonus: undefined,
    onStartServerFishingCast: serverEconomyReady ? handleStartServerFishingCast : undefined,
    onResolveServerFishingCast: serverEconomyReady ? handleResolveServerFishingCast : undefined,
    onServerFishingError: handleServerFishingError,
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
  const verifiedLeaderboardNameSyncRef = useRef<string | null>(null);
  const savedPlayerSnapshotRef = useRef(savedPlayer);
  const currentLeaderboardEntry = useMemo(() => (
    leaderboardEntries.find((entry) => entry.id === leaderboardPlayerId)
  ), [leaderboardEntries, leaderboardPlayerId]);
  const activeRodLevel = useMemo(
    () => getSafeEquippedRodLevel(player.equippedRod, player.rodLevel),
    [player.equippedRod, player.rodLevel],
  );
  const missXpReward = useMemo(() => {
    const nftBonus = player.nftRods.includes(activeRodLevel)
      ? NFT_ROD_DATA.find((rod) => rod.rodLevel === activeRodLevel)?.xpBonus ?? 0
      : 0;

    return Math.floor(MISS_XP_REWARD * (1 + nftBonus / 100));
  }, [activeRodLevel, player.nftRods]);
  const verifiedWalletNickname = useMemo(() => (
    walletServerReady ? normalizeWalletNickname(savedPlayer?.nickname) : ''
  ), [savedPlayer?.nickname, walletServerReady]);
  const displayPlayer = useMemo(() => {
    if (!serverEconomyReady) {
      return {
        ...player,
        coins: 0,
        bait: 0,
        dailyFreeBait: 0,
        level: 1,
        xp: 0,
        xpToNextLevel: XP_PER_LEVEL,
        rodLevel: 0,
        equippedRod: 0,
        inventory: [],
        cookedDishes: [],
        totalCatches: 0,
        nftRods: [],
      };
    }

    if (!activeSavedPlayer) {
      return player;
    }

    return {
      ...player,
      nickname: walletServerReady ? verifiedWalletNickname || null : player.nickname,
      avatarUrl: activeSavedPlayer.avatarUrl ?? player.avatarUrl,
    };
  }, [activeSavedPlayer, player, serverEconomyReady, verifiedWalletNickname, walletServerReady]);
  const totalBait = useMemo(() => (
    serverEconomyReady ? getVisibleBaitTotal(player) : 0
  ), [player, serverEconomyReady]);
  const grillInventory = useMemo(() => (
    serverEconomyReady && !hasPendingPlayerSave
      ? (activeSavedPlayer?.inventory ?? player.inventory)
      : []
  ), [activeSavedPlayer, hasPendingPlayerSave, player.inventory, serverEconomyReady]);
  const fishingNet = gameProgress.fishingNet;
  const fishingNetPendingCount = gameProgress.fishingNetPendingCount;
  const pendingTaskCount = useMemo(() => (
    !serverEconomyReady ? 0 : [
      ...gameProgress.dailyTasks,
      ...gameProgress.specialTasks,
      ...(economyFeatures.weeklyMissions ? gameProgress.weeklyMissions : []),
    ].filter((task) => !task.claimed && task.progress >= task.target).length
    + socialTasks.filter((task) => task.canClaim).length
  ), [economyFeatures.weeklyMissions, gameProgress.dailyTasks, gameProgress.specialTasks, gameProgress.weeklyMissions, serverEconomyReady, socialTasks]);
  const availableGrillCount = useMemo(() => (
    GRILL_RECIPES.filter((recipe) => (
      Object.entries(recipe.ingredients).every(([fishId, amount]) => (
        (grillInventory.find((item) => item.fishId === fishId)?.quantity ?? 0) >= amount
      ))
    )).length
  ), [grillInventory]);
  const refreshSocialTasks = useCallback(async () => {
    setSocialTasks(createDefaultSocialTasks());
    setSocialTasksLoading(false);
  }, []);

  const refreshWalletCheckInSummary = useCallback(async () => {
    if (!walletServerReady) {
      setWalletCheckInSummary(null);
      setWalletCheckInLoading(false);
      return;
    }

    setWalletCheckInLoading(true);
    try {
      const summary = await getWalletCheckInSummary();
      setWalletCheckInSummary(normalizeWalletCheckInSummary(summary, 'server'));
    } catch {
      setWalletCheckInSummary(normalizeWalletCheckInSummary(getDefaultWalletCheckInSummary(), 'server'));
    } finally {
      setWalletCheckInLoading(false);
    }
  }, [getWalletCheckInSummary, walletServerReady]);

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
          fallbackName: displayPlayer.nickname || 'Guest griller',
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
  }, [address, displayPlayer.nickname]);

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
    savedPlayerSnapshotRef.current = activeSavedPlayer;
  }, [activeSavedPlayer]);

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

    toast.success(`Achievements updated: ${albumRewardInfo.fishName}`, {
      description: `First catch bonus +${albumRewardInfo.bonusCoins} coins. Achievements discovered: ${albumRewardInfo.totalSpeciesCaught}.${completedPagesNote}`,
      duration: 3200,
    });
    dismissAlbumReward();
  }, [albumRewardInfo, dismissAlbumReward]);

  useEffect(() => {
    const walletNickname = normalizeWalletNickname(savedPlayer?.nickname);
    const shouldRequireWalletName = (
      assetsReady
      && savedPlayer !== null
      && !walletSessionResolving
      && !isVerifying
      && isVerified
      && !walletNickname
    );

    setPlayerNameDialogOpen(shouldRequireWalletName);
  }, [assetsReady, isVerified, isVerifying, savedPlayer, walletSessionResolving]);

  useEffect(() => {
    if (!isVerified || !address) {
      verifiedLeaderboardNameSyncRef.current = null;
      return;
    }

    const canonicalName = sanitizeLeaderboardName(displayPlayer.nickname ?? '');
    if (!canonicalName) return;

    const effectiveScore = Math.max(currentLeaderboardEntry?.score ?? 0, gameProgress.grillScore);
    if (effectiveScore <= 0) {
      verifiedLeaderboardNameSyncRef.current = null;
      return;
    }

    const currentName = sanitizeLeaderboardName(currentLeaderboardEntry?.name ?? '');
    if (currentLeaderboardEntry && currentName === canonicalName) {
      verifiedLeaderboardNameSyncRef.current = `${leaderboardPlayerId}:${canonicalName}:${effectiveScore}`;
      return;
    }

    const syncKey = `${leaderboardPlayerId}:${canonicalName}:${effectiveScore}:${currentLeaderboardEntry?.dishes ?? 0}`;
    if (verifiedLeaderboardNameSyncRef.current === syncKey) return;
    verifiedLeaderboardNameSyncRef.current = syncKey;

    setLeaderboardEntries((entries) => upsertLeaderboardEntry({
      entries,
      id: leaderboardPlayerId,
      name: canonicalName,
      score: effectiveScore,
      dishesDelta: 0,
      walletAddress: address,
    }));

    void updateGrillLeaderboard(canonicalName)
      .then((result) => {
        syncServerLeaderboardEntry(result.leaderboard_entry);
      })
      .catch((error) => {
        console.error('Verified leaderboard name sync failed, trying direct fallback:', error);

        const fallbackEntry = {
          id: leaderboardPlayerId,
          name: canonicalName,
          score: effectiveScore,
          dishes: currentLeaderboardEntry?.dishes ?? 0,
          walletAddress: address,
          updatedAt: new Date().toISOString(),
        };

        void saveGlobalLeaderboardEntry(fallbackEntry)
          .then(() => {
            syncServerLeaderboardEntry({
              id: fallbackEntry.id,
              name: fallbackEntry.name,
              score: fallbackEntry.score,
              dishes: fallbackEntry.dishes,
              wallet_address: fallbackEntry.walletAddress ?? null,
              updated_at: fallbackEntry.updatedAt,
            });
          })
          .catch((fallbackError) => {
            console.error('Verified leaderboard name fallback sync failed:', fallbackError);
          });
      });
  }, [
    address,
    currentLeaderboardEntry,
    gameProgress.grillScore,
    isVerified,
    leaderboardPlayerId,
    displayPlayer.nickname,
    syncServerLeaderboardEntry,
    updateGrillLeaderboard,
  ]);

  useEffect(() => {
    syncReferralTask(referralSummary?.todayReferralAttachCount ?? 0);
  }, [syncReferralTask, referralSummary?.todayReferralAttachCount]);

  useEffect(() => {
    const walletCheckInRepeatActive = WALLET_CHECK_IN_REPEAT_TEST_MODE
      || Boolean(walletCheckInSummary?.repeatTestMode);
    const walletCheckInCooldownActive = Boolean(walletCheckInSummary?.todayCheckedIn)
      && !walletCheckInRepeatActive;
    syncWalletCheckInTask(
      walletCheckInCooldownActive,
      walletCheckInSummary?.lastCheckInTxHash ?? null,
    );
  }, [
    syncWalletCheckInTask,
    walletCheckInSummary?.todayCheckedIn,
    walletCheckInSummary?.repeatTestMode,
    walletCheckInSummary?.lastCheckInTxHash,
  ]);

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
    if (activeTab === 'tasks' && walletServerReady) {
      void refreshWalletCheckInSummary();
    }
  }, [activeTab, refreshSocialTasks, refreshWalletCheckInSummary, walletServerReady]);

  useEffect(() => {
    if (activeTab !== 'tasks' || !walletServerReady) return undefined;

    const intervalId = window.setInterval(() => {
      void refreshWalletCheckInSummary();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [activeTab, refreshWalletCheckInSummary, walletServerReady]);

  useEffect(() => {
    if (activeTab === 'fish' && economyFeatures.premiumSessions && walletServerReady) {
      const refreshKey = address?.toLowerCase() ?? 'verified';
      if (premiumSessionRefreshKeyRef.current !== refreshKey) {
        premiumSessionRefreshKeyRef.current = refreshKey;
        void refreshPremiumSession({ silent: true });
      }
      return;
    }

    premiumSessionRefreshKeyRef.current = null;
    if (!economyFeatures.premiumSessions || !walletServerReady) {
      setPremiumSession(null);
      setPremiumSessionLoading(false);
    }
  }, [activeTab, address, economyFeatures.premiumSessions, refreshPremiumSession, walletServerReady]);

  useEffect(() => {
    if (
      !fishingNet.owned
      || !serverEconomyReady
      || !fishingNet.readyDate
      || fishingNetPendingCount <= 0
      || fishingNet.lastNotificationDate === fishingNet.readyDate
    ) {
      return;
    }

    const notificationKey = [
      activeServerAddress?.toLowerCase() ?? 'unknown',
      fishingNet.readyDate,
      fishingNetPendingCount,
    ].join(':');
    if (fishingNetNotificationKeyRef.current === notificationKey) {
      return;
    }
    fishingNetNotificationKeyRef.current = notificationKey;

    gameProgress.markFishingNetNotified();
    void requestMarkFishingNetNotified()
      .then((result) => {
        applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });
      })
      .catch((error) => {
        console.error('Could not mark fishing net notification:', error);
      });
    sounds.playSuccessSound();
    toast.success(`Your fishing net is full. Open Inventory -> Gear to review and collect ${fishingNetPendingCount} fish.`, {
      id: `fishing-net-full-${notificationKey}`,
    });
  }, [
    activeServerAddress,
    applyServerPlayerSnapshot,
    fishingNet,
    fishingNetPendingCount,
    gameProgress,
    requestMarkFishingNetNotified,
    serverEconomyReady,
    sounds,
  ]);

  const handleBuyBait = async (amount: number, _cost: number) => {
    if (!requireServerEconomy()) return;

    try {
      const result = await requestBuyBait(amount);
      applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });
      sounds.playBuySound();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not buy bait.');
    }
  };

  const handleBuyRod = async (level: number, _cost: number) => {
    if (!requireServerEconomy()) return;

    try {
      const result = await requestBuyRod(level);
      applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });
      sounds.playBuySound();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not buy rod.');
    }
  };

  const handleEquipRod = useCallback((level: number) => {
    if (!requireServerEconomy()) {
      return;
    }

    void requestEquipRod(level)
      .then((result) => {
        applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Could not equip rod.');
      });
  }, [applyServerPlayerSnapshot, requestEquipRod, requireServerEconomy]);

  const handleBuyFishingNetWithMon = useCallback(async (dailyFishCount: number, monAmount: string, txHash?: string) => {
    if (!requireServerEconomy()) return false;

    if (!txHash) throw new Error('Missing fishing net transaction hash.');
    const result = await requestBuyFishingNet(dailyFishCount, txHash, monAmount);
    applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });
    sounds.playBuySound();
    return true;
  }, [applyServerPlayerSnapshot, requestBuyFishingNet, requireServerEconomy, sounds]);

  const handleUnlockRodWithMon = (level: number, monAmount: string) => {
    if (!requireServerEconomy()) return;
    sounds.playBuySound();
  };

  const handleNftRodMinted = useCallback((rodLevel: number) => {
    if (!requireServerEconomy()) return;
    sounds.playBuySound();
  }, [requireServerEconomy, sounds]);

  const handleBuyCubeRollsWithMon = useCallback(async (amount: number, monAmount: string, txHash?: string) => {
    if (!requireServerEconomy()) return false;

    if (!txHash) throw new Error('Missing cube-roll transaction hash.');
    const result = await requestBuyCubeRolls(amount, txHash, monAmount);
    applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });
    sounds.playBuySound();
    return true;
  }, [applyServerPlayerSnapshot, requestBuyCubeRolls, requireServerEconomy, sounds]);

  const handleSellFish = (fishId: string) => {
    if (!requireServerEconomy()) {
      return;
    }

    void requestSellFish(fishId)
      .then((result) => {
        applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });
        sounds.playSellSound();
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Could not sell fish.');
      });
  };

  const handleClaimFishingNet = () => {
    if (!requireServerEconomy()) {
      return;
    }

    void requestClaimFishingNet()
      .then((result) => {
        applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });
        const summary = result.claimed_catch
          .map((entry) => {
            const fish = FISH_DATA.find((item) => item.id === entry.fishId);
            return fish ? `${fish.name} x${entry.quantity}` : null;
          })
          .filter(Boolean)
          .slice(0, 3)
          .join(', ');
        sounds.playSuccessSound();
        toast.success(summary ? `Net collected: ${summary}.` : 'Net collected.');
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Your fishing net is empty right now.');
      });
  };

  const handleSellCookedDish = async (recipeId: string) => {
    if (!requireServerEconomy()) return;

    try {
      const result = await requestSellCookedDish(recipeId);
      applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });
      sounds.playSellSound();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sell dish.');
      return;
    }
  };

  const claimVerifiedTaskRewardWithRetry = useCallback(async (taskId: TaskId | WeeklyMissionId) => {
    return claimTaskReward(taskId);
  }, [claimTaskReward]);

  const handleClaimTask = async (taskId: TaskId) => {
    if (claimingTaskId === taskId) return;

    setClaimingTaskId(taskId);
    if (!requireServerEconomy()) {
      setClaimingTaskId((current) => (current === taskId ? null : current));
      return;
    }

    try {
      const result = await claimVerifiedTaskRewardWithRetry(taskId);
      applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });
      sounds.playBuySound();
      toast.success('Task reward claimed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not claim task reward.');
    } finally {
      setClaimingTaskId((current) => (current === taskId ? null : current));
    }
  };

  const handleClaimWeeklyMission = useCallback(async (missionId: WeeklyMissionId) => {
    if (claimingWeeklyMissionId === missionId) return;
    setClaimingWeeklyMissionId(missionId);

    if (!requireServerEconomy()) {
      setClaimingWeeklyMissionId((current) => (current === missionId ? null : current));
      return;
    }

    try {
      const result = await claimVerifiedTaskRewardWithRetry(missionId);
      applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });
      sounds.playBuySound();
      if (missionId !== 'cube_3_days') {
        toast.success('Weekly mission claimed.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not claim weekly mission reward.');
    } finally {
      setClaimingWeeklyMissionId((current) => (current === missionId ? null : current));
    }
  }, [applyServerPlayerSnapshot, claimVerifiedTaskRewardWithRetry, claimingWeeklyMissionId, requireServerEconomy, sounds]);

  const handleRequestCubeRoll = async () => {
    if (!requireServerEconomy()) return null;

    const result = await rollCube();
    applyServerPlayerSnapshot(result.player);
    return result.roll;
  };

  const handleResolveCubeReward = async (selectedPrize: WheelPrize, rollId?: string): Promise<WheelPrize | null> => {
    if (!requireServerEconomy()) return null;
    if (!rollId) throw new Error('Missing cube roll id.');

    const result = await applyCubeReward(rollId);
    applyServerPlayerSnapshot(result.player);
    if (result.prize.type === 'mon' || result.prize.duplicateCompensationApplied) {
      window.dispatchEvent(new CustomEvent('hookloot:mon-reward'));
    }
    sounds.playLevelUpSound();
    return result.prize;
  };

  const syncVerifiedInventoryForRecipe = useCallback(async (recipe: GrillRecipe) => {
    if (!serverEconomyReady) return false;
    const syncedPlayer = savedPlayerSnapshotRef.current;
    if (!syncedPlayer) return false;
    return hasRequiredFishForRecipe(syncedPlayer.inventory, recipe);
  }, [serverEconomyReady]);
  const handleCookRecipe = async (recipe: GrillRecipe) => {
    if (!requireServerEconomy()) return false;

    try {
      const syncedInventoryReady = await syncVerifiedInventoryForRecipe(recipe);
      if (!syncedInventoryReady) {
        throw new Error('Your wallet inventory is still syncing. Wait a second and try again.');
      }

      const result = await requestCookRecipe(recipe.id);
      applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });
      if (result.leaderboard_entry) {
        syncServerLeaderboardEntry(result.leaderboard_entry);
      }
      sounds.playSellSound();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not cook recipe.');
      return false;
    }
  };

  const handleSavePlayerName = useCallback(async (name: string) => {
    const previousNickname = normalizeWalletNickname(savedPlayerSnapshotRef.current?.nickname)
      || normalizeWalletNickname(player.nickname);
    const normalizedName = name.trim();
    const nextPlayerSnapshot = {
      ...player,
      nickname: normalizedName,
    };

    if (!serverEconomyReady || !address) {
      throw new Error('Connect a verified wallet before saving a player name.');
    }

    setPlayerNameSyncPending(true);
    const verifiedPlayer = await saveVerifiedNickname(nextPlayerSnapshot, normalizedName);
    setPlayerNameSyncPending(false);

    if (!verifiedPlayer) {
      const fallbackNickname = previousNickname || null;
      setNickname(fallbackNickname);
      setPlayerNameDialogOpen(!previousNickname);
      throw new Error('Could not save wallet name right now. Please try again.');
    }

    const savedNickname = normalizeWalletNickname(verifiedPlayer.nickname) || normalizedName;
    setNickname(savedNickname);
    setPlayerNameDialogOpen(false);

    const effectiveScore = Math.max(currentLeaderboardEntry?.score ?? 0, gameProgress.grillScore);
    if (effectiveScore > 0) {
      setLeaderboardEntries((entries) => upsertLeaderboardEntry({
        entries,
        id: leaderboardPlayerId,
        name: savedNickname,
        score: effectiveScore,
        dishesDelta: 0,
        walletAddress: address,
      }));
    }
  }, [
    address,
    currentLeaderboardEntry?.score,
    gameProgress.grillScore,
    leaderboardPlayerId,
    player,
    saveVerifiedNickname,
    serverEconomyReady,
    setNickname,
  ]);

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

    const result = await verifyWalletCheckIn(txHash);
    applyServerPlayerSnapshot(result.player, { mergeMode: 'server' });
    setWalletCheckInSummary(normalizeWalletCheckInSummary(result.walletCheckInSummary, 'server'));
    sounds.playBuySound();
  };

  const isFishingScreen = activeTab === 'fish';
  const activePremiumSession = premiumSession?.status === 'active' ? premiumSession : null;
  const premiumCastActive = Boolean(activePremiumSession && serverEconomyReady);
  const handleTabChange = useCallback((tab: GameTab) => {
    if (tab === 'fish' || tab === 'map' || tab === 'leaderboard') {
      setActiveTab(tab);
      return;
    }

    if (!requireServerEconomy()) return;
    setActiveTab(tab);
  }, [requireServerEconomy]);

  useEffect(() => {
    if (serverEconomyReady) return;
    if (activeTab === 'tasks' || activeTab === 'shop' || activeTab === 'grill' || activeTab === 'wheel') {
      setActiveTab('fish');
    }
  }, [activeTab, serverEconomyReady]);

  const handleStartPremiumSession = useCallback(async (txHash: string) => {
    if (!requireServerEconomy()) return;

    setPremiumSessionLoading(true);
    try {
      const result = await startPremiumSession(txHash);
      applyServerPlayerSnapshot(result.player);
      setPremiumSession(result.premiumSession);
    } finally {
      setPremiumSessionLoading(false);
    }
  }, [applyServerPlayerSnapshot, requireServerEconomy, startPremiumSession]);

  const handlePremiumCastResolution = useCallback(async (reactionQuality: ReactionQuality) => {
    if (!activePremiumSession || !serverEconomyReady || premiumCastResolveInFlightRef.current) return;

    premiumCastResolveInFlightRef.current = true;
    try {
      const result = await resolvePremiumCast(reactionQuality);
      applyServerPlayerSnapshot(result.player);
      setPremiumSession(result.premiumSession);
      const caughtFish = FISH_DATA.find((fish) => fish.id === result.castResult.fishId) ?? null;
      await presentPremiumCastResult(caughtFish);
    } catch (error) {
      resetPremiumCastState();
      toast.error(error instanceof Error ? error.message : 'Could not resolve premium cast.');
      void refreshPremiumSession({ silent: true, force: true });
    } finally {
      premiumCastResolveInFlightRef.current = false;
    }
  }, [
    activePremiumSession,
    applyServerPlayerSnapshot,
    presentPremiumCastResult,
    refreshPremiumSession,
    resolvePremiumCast,
    resetPremiumCastState,
    serverEconomyReady,
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
    if (!requireServerEconomy()) return;

    if (activePremiumSession) {
      void castPremiumRod();
      return;
    }

    void castRod();
  }, [activePremiumSession, castPremiumRod, castRod, requireServerEconomy]);

  const handleReelAction = useCallback(() => {
    if (!requireServerEconomy()) return;

    if (activePremiumSession) {
      void handlePremiumCastResolution(getPremiumReactionQuality(biteTimeLeft, biteTimeTotal));
      return;
    }

    void reelIn();
  }, [activePremiumSession, biteTimeLeft, biteTimeTotal, handlePremiumCastResolution, reelIn, requireServerEconomy]);

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
              rodLevel={activeRodLevel}
              assets={mainSceneAssets}
            />
          ) : (
            <TabScreenErrorBoundary key={activeTab} screenKey={activeTab} onBackToFish={() => setActiveTab('fish')}>
              <Suspense fallback={<ScreenLoadingFallback />}>
                {activeTab === 'tasks' ? (
                  <TasksScreen
                    coins={player.coins}
                    walletAddress={monadPaymentAddress}
                    rodLevel={player.rodLevel}
                    equippedRod={activeRodLevel}
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
                    isWalletConnected={isConnected}
                    isWalletVerified={walletServerReady}
                    isWalletVerifying={isVerifying || walletSessionResolving}
                    referralSummary={referralSummary}
                    onClaimTask={handleClaimTask}
                    onClaimWeeklyMission={handleClaimWeeklyMission}
                    claimingTaskId={claimingTaskId}
                    claimingWeeklyMissionId={claimingWeeklyMissionId}
                    onWalletCheckIn={handleWalletCheckIn}
                    onVerifyWallet={retryVerifyWallet}
                    onEquipRod={handleEquipRod}
                    onOpenFish={() => handleTabChange('fish')}
                    onSubmitSocialTask={handleSubmitSocialTask}
                    onClaimSocialTask={handleClaimSocialTask}
                    onRefreshSocialTasks={() => void refreshSocialTasks()}
                    onOpenWheel={() => handleTabChange('wheel')}
                  />
                ) : activeTab === 'shop' ? (
                  <ShopScreen
                    coins={player.coins}
                    bait={totalBait}
                    dailyFreeBait={player.dailyFreeBait}
                    walletAddress={monadPaymentAddress}
                    monSummary={monSummary}
                    rodLevel={player.rodLevel}
                    fishingNet={fishingNet}
                    nftRods={player.nftRods}
                    onBuyBait={handleBuyBait}
                    onBuyFishingNetWithMon={handleBuyFishingNetWithMon}
                    onBuyRod={handleBuyRod}
                    onBuyRodWithMon={handleUnlockRodWithMon}
                    onBuyCubeRollsWithMon={handleBuyCubeRollsWithMon}
                    onCoinsAdded={() => undefined}
                    onNftMinted={handleNftRodMinted}
                    onServerPlayerUpdated={(playerRecord) => {
                      applyServerPlayerSnapshot(playerRecord as Parameters<typeof syncServerPlayerRecord>[0], { mergeMode: 'server' });
                    }}
                  />
                ) : activeTab === 'grill' ? (
                    <GrillScreen
                      inventory={grillInventory}
                      onCook={handleCookRecipe}
                      onCookStartSound={sounds.playGrillCookSound}
                    />
                ) : activeTab === 'wheel' ? (
                  <WheelScreen
                    coins={player.coins}
                    rodLevel={player.rodLevel}
                    availableRolls={gameProgress.availableWheelRolls}
                    dailyWheelRolls={gameProgress.dailyWheelRolls}
                    paidWheelRolls={gameProgress.paidWheelRolls}
                    dailyTaskClaimsMet={gameProgress.dailyTaskClaimsMet}
                    walletAddress={monadPaymentAddress}
                    onRequestRoll={handleRequestCubeRoll}
                    onResolveReward={handleResolveCubeReward}
                    onBuySpin={(amount, txHash) => handleBuyCubeRollsWithMon(amount, '1', txHash)}
                    onOpenTasks={() => handleTabChange('tasks')}
                    onSpinStartSound={sounds.playCubeSpinSound}
                    onRevealSound={sounds.playCubeRevealSound}
                    onRewardSound={sounds.playCubeRewardSound}
                  />
                ) : activeTab === 'map' ? (
                  <MapScreen
                    onBack={() => handleTabChange('fish')}
                  />
                ) : (
                  <LeaderboardScreen
                    coins={player.coins}
                    grillScore={gameProgress.grillScore}
                    entries={leaderboardEntries}
                    currentPlayerId={leaderboardPlayerId}
                    isConnected={isConnected}
                    walletAddress={address}
                    nickname={displayPlayer.nickname}
                  />
                )}
              </Suspense>
            </TabScreenErrorBoundary>
          )}

          {isFishingScreen && (
            <div className="absolute right-[2.5%] top-[12.5%] z-20 flex flex-col items-center gap-3 sm:right-[2.25%] sm:top-[13.5%]">
              <BoostDialog
                walletAddress={monadPaymentAddress}
                premiumSession={premiumSession}
                onStartPremiumSession={handleStartPremiumSession}
                premiumSessionLoading={premiumSessionLoading}
                premiumSessionsEnabled={economyFeatures.premiumSessions}
              />
              <InventoryDialog
                inventory={serverEconomyReady ? player.inventory : []}
                cookedDishes={serverEconomyReady ? player.cookedDishes : []}
                collectionBook={serverEconomyReady ? player.collectionBook : null}
                collectionBookEnabled={economyFeatures.collectionBook}
                rodLevel={serverEconomyReady ? player.rodLevel : 0}
                equippedRod={serverEconomyReady ? player.equippedRod : 0}
                nftRods={serverEconomyReady ? player.nftRods : []}
                fishingNet={serverEconomyReady ? fishingNet : null}
                onEquipRod={handleEquipRod}
                onSellFish={handleSellFish}
                onSellCookedDish={handleSellCookedDish}
                onClaimFishingNet={handleClaimFishingNet}
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
              player={displayPlayer}
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
              hasBait={serverEconomyReady && totalBait > 0}
              premiumCastActive={premiumCastActive}
              totalBait={totalBait}
              onCast={handleCastAction}
              onReelIn={handleReelAction}
              onEquipRod={handleEquipRod}
              rodLevel={serverEconomyReady ? activeRodLevel : 0}
              ownedRodLevel={serverEconomyReady ? player.rodLevel : 0}
              nftRods={serverEconomyReady ? player.nftRods : []}
              biteTimeLeft={biteTimeLeft}
              biteTimeTotal={biteTimeTotal}
              premiumSweetSpotStart={PREMIUM_PERFECT_SWEET_SPOT_START}
              premiumSweetSpotEnd={PREMIUM_PERFECT_SWEET_SPOT_END}
              missXpReward={missXpReward}
              isMobile={isMobile}
            />
          )}

          {isFishingScreen && !serverEconomyReady && assetsReady && (
            <div className="pointer-events-none absolute inset-x-3 top-[44%] z-30 flex -translate-y-1/2 justify-center sm:top-[46%]">
              <div className="pointer-events-auto w-full max-w-[24rem] rounded-lg border border-cyan-200/25 bg-black/82 px-4 py-3 text-center text-cyan-50 shadow-2xl backdrop-blur-md">
                <div className="text-sm font-black uppercase tracking-[0.16em] text-cyan-200">
                  Starting guest profile
                </div>
                <div className="mt-1 text-sm font-semibold text-white/86">
                  {guestSession.error || 'Connecting to the game server...'}
                </div>
              </div>
            </div>
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
                onClick={() => handleTabChange('map')}
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

          <PlayerNameDialog
            open={playerNameDialogOpen}
            walletLinked={walletServerReady}
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
              onTabChange={handleTabChange}
              wheelReady={serverEconomyReady && gameProgress.wheelReady}
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
