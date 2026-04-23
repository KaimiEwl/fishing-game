import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { invokeEdgeFunctionHttp, supabase } from '@/integrations/supabase/client';
import { type GameProgressSnapshot, type PlayerState, XP_PER_LEVEL } from '@/types/game';
import {
  BAIT_BUCKETS_V2_ENABLED,
  DAILY_FREE_BAIT,
  MAX_REWARDED_REFERRALS_PER_INVITER,
  REFERRAL_BAIT_ENABLED,
} from '@/lib/baitEconomy';
import {
  applyServerBonusBaitSync,
  loadStoredPlayer,
  mergeSyncedPlayerState,
  normalizeLegacyStartingBait,
  normalizePlayerDailyFreeBait,
  storePlayerLocally,
} from '@/lib/playerStorage';
import {
  clearStoredWalletSession,
  getStoredWalletSession,
  storeWalletSession,
} from '@/lib/walletSession';
import { useToast } from '@/hooks/use-toast';

export interface PlayerRecord {
  wallet_address: string;
  coins: number;
  bait: number;
  daily_free_bait?: number;
  daily_free_bait_reset_at?: string | null;
  bonus_bait_granted_total?: number;
  level: number;
  xp: number;
  xp_to_next: number;
  rod_level: number;
  equipped_rod: number;
  inventory: unknown;
  cooked_dishes?: unknown;
  game_progress?: unknown;
  total_catches: number;
  login_streak: number;
  nft_rods: unknown;
  nickname: string | null;
  avatar_url: string | null;
  referrer_wallet_address?: string | null;
  rewarded_referral_count?: number;
  today_referral_attach_count?: number;
  updated_at?: string;
}

interface ReferralRewardNotification {
  invitedWalletAddress: string | null;
  invitedPlayerName: string | null;
  rewardBait: number;
  createdAt: string;
}

export interface ReferralSummary {
  rewardedReferralCount: number;
  todayReferralAttachCount: number;
  maxRewardedReferrals: number;
  referrerWalletAddress: string | null;
  referralLink: string | null;
}

const REFERRAL_STORAGE_KEY = 'hook_loot_pending_referrer_v1';
const LAST_REFERRAL_REWARD_STORAGE_KEY = 'hook_loot_last_referral_reward_v1';
const EDGE_FUNCTION_GENERIC_MESSAGES = [
  'Edge Function returned a non-2xx status code',
  'Failed to send a request to the Edge Function',
];

function normalizeWalletAddress(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? trimmed.toLowerCase() : null;
}

function getPendingReferrer(): string | null {
  try {
    return normalizeWalletAddress(localStorage.getItem(REFERRAL_STORAGE_KEY));
  } catch {
    return null;
  }
}

function storePendingReferrer(referrerWalletAddress: string) {
  localStorage.setItem(REFERRAL_STORAGE_KEY, referrerWalletAddress);
}

function clearPendingReferrer() {
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
}

const buildReferralRewardStorageKey = (walletAddress: string) => (
  `${LAST_REFERRAL_REWARD_STORAGE_KEY}:${walletAddress.toLowerCase()}`
);

function getReferralRewardKey(reward: ReferralRewardNotification | null | undefined) {
  if (!reward) return null;

  return [
    reward.createdAt ?? '',
    normalizeWalletAddress(reward.invitedWalletAddress) ?? '',
    String(reward.rewardBait ?? ''),
  ].join('|');
}

function wasReferralRewardToastShown(walletAddress: string, reward: ReferralRewardNotification | null | undefined) {
  const rewardKey = getReferralRewardKey(reward);
  if (!walletAddress || !rewardKey) return false;

  try {
    return localStorage.getItem(buildReferralRewardStorageKey(walletAddress)) === rewardKey;
  } catch {
    return false;
  }
}

function markReferralRewardToastShown(walletAddress: string, reward: ReferralRewardNotification | null | undefined) {
  const rewardKey = getReferralRewardKey(reward);
  if (!walletAddress || !rewardKey) return;

  try {
    localStorage.setItem(buildReferralRewardStorageKey(walletAddress), rewardKey);
  } catch {
    // ignore storage failures
  }
}

function buildReferralLink(walletAddress: string | null | undefined): string | null {
  const normalizedAddress = normalizeWalletAddress(walletAddress);
  if (!normalizedAddress) return null;

  const referralUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  referralUrl.searchParams.set('ref', normalizedAddress);
  referralUrl.searchParams.set('preview', '2');
  return referralUrl.toString();
}

function mapInventory(value: unknown): PlayerState['inventory'] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];

    const record = item as Record<string, unknown>;
    const fishIdRaw = record.fishId;
    const fishId = typeof fishIdRaw === 'string'
      ? fishIdRaw.trim()
      : '';
    const quantityRaw = record.quantity;
    const quantity = typeof quantityRaw === 'number'
      ? quantityRaw
      : Number(quantityRaw ?? 0);
    const caughtAtRaw = record.caughtAt;
    const caughtAt = caughtAtRaw instanceof Date ? caughtAtRaw : new Date(String(caughtAtRaw ?? ''));

    if (!fishId || !Number.isFinite(quantity) || quantity <= 0 || Number.isNaN(caughtAt.getTime())) {
      return [];
    }

    return [{
      fishId,
      quantity: Math.max(0, Math.floor(quantity)),
      caughtAt,
    }];
  });
}

function mapCookedDishes(value: unknown): PlayerState['cookedDishes'] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];

    const record = item as Record<string, unknown>;
    const recipeIdRaw = record.recipeId;
    const recipeId = typeof recipeIdRaw === 'string'
      ? recipeIdRaw.trim()
      : '';
    const quantityRaw = record.quantity;
    const quantity = typeof quantityRaw === 'number'
      ? quantityRaw
      : Number(quantityRaw ?? 0);
    const createdAtRaw = record.createdAt;
    const createdAt = createdAtRaw instanceof Date ? createdAtRaw : new Date(String(createdAtRaw ?? ''));

    if (!recipeId || !Number.isFinite(quantity) || quantity <= 0 || Number.isNaN(createdAt.getTime())) {
      return [];
    }

    return [{
      recipeId,
      quantity: Math.max(0, Math.floor(quantity)),
      createdAt,
    }];
  });
}

function mapPlayerRecord(p: PlayerRecord): PlayerState {
  const syncedProgress = p.game_progress && typeof p.game_progress === 'object'
    ? p.game_progress as GameProgressSnapshot
    : null;
  const nftRods = Array.isArray(p.nft_rods)
    ? p.nft_rods.flatMap((value) => (typeof value === 'number' && Number.isFinite(value) ? [value] : []))
    : [];

  return {
    coins: p.coins,
    bait: p.bait,
    dailyFreeBait: p.daily_free_bait ?? 0,
    dailyFreeBaitResetAt: p.daily_free_bait_reset_at ?? null,
    bonusBaitGrantedTotal: p.bonus_bait_granted_total ?? 0,
    level: p.level,
    xp: p.xp,
    xpToNextLevel: p.xp_to_next || p.level * XP_PER_LEVEL,
    rodLevel: p.rod_level,
    equippedRod: p.equipped_rod ?? p.rod_level,
    inventory: mapInventory(p.inventory),
    cookedDishes: mapCookedDishes(p.cooked_dishes),
    totalCatches: p.total_catches,
    dailyBonusClaimed: false,
    loginStreak: p.login_streak || 1,
    nftRods,
    nickname: p.nickname || null,
    avatarUrl: p.avatar_url || null,
    collectionBook: syncedProgress?.collectionBook ?? null,
    rodMastery: syncedProgress?.rodMastery ?? null,
  };
}

function serializePlayerProgress(player: PlayerState) {
  return {
    coins: player.coins,
    bait: player.bait,
    daily_free_bait: player.dailyFreeBait,
    daily_free_bait_reset_at: player.dailyFreeBaitResetAt,
    bonus_bait_granted_total: player.bonusBaitGrantedTotal,
    level: player.level,
    xp: player.xp,
    xp_to_next: player.xpToNextLevel,
    rod_level: player.rodLevel,
    equipped_rod: player.equippedRod,
    inventory: [...player.inventory]
      .map((item) => ({
        fishId: item.fishId,
        caughtAt: item.caughtAt instanceof Date ? item.caughtAt.toISOString() : new Date(item.caughtAt).toISOString(),
        quantity: item.quantity,
      }))
      .sort((a, b) => a.fishId.localeCompare(b.fishId)),
    cooked_dishes: [...player.cookedDishes]
      .map((item) => ({
        recipeId: item.recipeId,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date(item.createdAt).toISOString(),
        quantity: item.quantity,
      }))
      .sort((a, b) => a.recipeId.localeCompare(b.recipeId)),
    total_catches: player.totalCatches,
    login_streak: player.loginStreak,
    nft_rods: [...player.nftRods].sort((a, b) => a - b),
    nickname: player.nickname,
    avatar_url: player.avatarUrl,
    collection_book: player.collectionBook ?? null,
    rod_mastery: player.rodMastery ?? null,
  };
}

function getWalletVerificationErrorMessage(error: unknown) {
  const fallbackMessage = 'Could not verify your wallet right now. Please try again.';
  const contextualError = error as {
    context?: { clone?: () => Response };
    responseData?: unknown;
    responseBody?: string;
    status?: number;
  };

  const pickMessageFromPayload = (payload: unknown) => {
    if (payload && typeof payload === 'object') {
      const payloadError = (payload as { error?: unknown }).error;
      if (typeof payloadError === 'string' && payloadError.trim()) {
        return payloadError.trim();
      }
    }

    if (typeof payload === 'string' && payload.trim() && !payload.trim().startsWith('<')) {
      return payload.trim();
    }

    return null;
  };

  const directMessage = pickMessageFromPayload(contextualError.responseData)
    ?? pickMessageFromPayload(contextualError.responseBody);
  if (directMessage) {
    return Promise.resolve(directMessage);
  }

  if (contextualError.context?.clone) {
    const clonedResponse = contextualError.context.clone();
    return clonedResponse.text()
      .then((body) => {
        const parsedBody = clonedResponse.headers.get('content-type')?.includes('application/json')
          ? (() => {
              try {
                return JSON.parse(body);
              } catch {
                return body;
              }
            })()
          : body;
        const contextMessage = pickMessageFromPayload(parsedBody);
        if (contextMessage) {
          return contextMessage;
        }
        return fallbackMessage;
      })
      .catch(() => fallbackMessage);
  }

  if (
    error instanceof Error
    && EDGE_FUNCTION_GENERIC_MESSAGES.some((message) => error.message.includes(message))
  ) {
    return Promise.resolve(fallbackMessage);
  }

  return Promise.resolve(error instanceof Error && error.message ? error.message : fallbackMessage);
}

function getPlayerProgressDigest(player: PlayerState) {
  return JSON.stringify(serializePlayerProgress(player));
}

function getGameProgressDigest(progress: GameProgressSnapshot) {
  return JSON.stringify(progress);
}

interface WalletSaveBundle {
  player?: PlayerState;
  gameProgress?: GameProgressSnapshot;
}

const mergeSaveBundle = (
  current: WalletSaveBundle | null,
  next: WalletSaveBundle,
): WalletSaveBundle => ({
  player: next.player ?? current?.player,
  gameProgress: next.gameProgress ?? current?.gameProgress,
});

export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [walletSessionResolving, setWalletSessionResolving] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [savedPlayer, setSavedPlayer] = useState<PlayerState | null>(null);
  const [savedGameProgress, setSavedGameProgress] = useState<GameProgressSnapshot | null>(null);
  const [referralSummary, setReferralSummary] = useState<ReferralSummary | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const restoredRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const autoVerifyAttemptedForAddressRef = useRef<string | null>(null);
  const queuedSaveRef = useRef<WalletSaveBundle | null>(null);
  const lastSavedPlayerDigestRef = useRef<string | null>(null);
  const lastSavedGameProgressDigestRef = useRef<string | null>(null);
  const serverUpdatedAtRef = useRef<string | null>(null);
  const savedPlayerRef = useRef<PlayerState | null>(null);
  const referralSummaryRef = useRef<ReferralSummary | null>(null);

  useEffect(() => {
    savedPlayerRef.current = savedPlayer;
  }, [savedPlayer]);

  useEffect(() => {
    referralSummaryRef.current = referralSummary;
  }, [referralSummary]);

  const syncReferralSummary = useCallback((playerRecord: PlayerRecord) => {
    if (!REFERRAL_BAIT_ENABLED) {
      setReferralSummary(null);
      return;
    }

    const referralLink = buildReferralLink(playerRecord.wallet_address ?? address);
    setReferralSummary({
      rewardedReferralCount: playerRecord.rewarded_referral_count ?? 0,
      todayReferralAttachCount: playerRecord.today_referral_attach_count ?? 0,
      maxRewardedReferrals: MAX_REWARDED_REFERRALS_PER_INVITER,
      referrerWalletAddress: playerRecord.referrer_wallet_address ?? null,
      referralLink,
    });
  }, [address]);

  const syncLocalPlayerFromServer = useCallback((playerRecord: PlayerRecord) => {
    const mappedPlayer = normalizeLegacyStartingBait(normalizePlayerDailyFreeBait(
      mapPlayerRecord(playerRecord),
      BAIT_BUCKETS_V2_ENABLED,
      DAILY_FREE_BAIT,
    ), DAILY_FREE_BAIT);
    const localPlayer = loadStoredPlayer(mappedPlayer);
    const normalizedLocalPlayer = localPlayer
      ? normalizeLegacyStartingBait(
          normalizePlayerDailyFreeBait(localPlayer, BAIT_BUCKETS_V2_ENABLED, DAILY_FREE_BAIT),
          DAILY_FREE_BAIT,
        )
      : null;

    const mergedPlayer = normalizedLocalPlayer
      ? mergeSyncedPlayerState(mappedPlayer, normalizedLocalPlayer)
      : mappedPlayer;

    const nextStoredPlayer = applyServerBonusBaitSync(
      mergedPlayer,
      mappedPlayer.bonusBaitGrantedTotal,
    );

    storePlayerLocally(nextStoredPlayer);
    return nextStoredPlayer;
  }, []);

  const showReferralRewardToast = useCallback((reward: ReferralRewardNotification | null | undefined) => {
    if (!reward) return;

    const referralLabel = reward.invitedPlayerName?.trim()
      || (reward.invitedWalletAddress
        ? `${reward.invitedWalletAddress.slice(0, 6)}...${reward.invitedWalletAddress.slice(-4)}`
        : 'your referral');

    toast({
      title: `+${reward.rewardBait} bait received`,
      description: `You received +${reward.rewardBait} bait for referral ${referralLabel}.`,
    });
  }, [toast]);

  const applyVerifiedPlayerPayload = useCallback((
    playerRecord: PlayerRecord,
    latestReferralReward?: ReferralRewardNotification | null,
  ) => {
    const nextStoredPlayer = syncLocalPlayerFromServer(playerRecord);
    const nextSavedGameProgress = playerRecord.game_progress && typeof playerRecord.game_progress === 'object'
      ? playerRecord.game_progress as GameProgressSnapshot
      : null;
    serverUpdatedAtRef.current = playerRecord.updated_at ?? null;
    lastSavedPlayerDigestRef.current = getPlayerProgressDigest(nextStoredPlayer);
    lastSavedGameProgressDigestRef.current = nextSavedGameProgress
      ? getGameProgressDigest(nextSavedGameProgress)
      : null;
    setSavedPlayer(nextStoredPlayer);
    setSavedGameProgress(nextSavedGameProgress);
    syncReferralSummary(playerRecord);

    if (
      REFERRAL_BAIT_ENABLED
      && latestReferralReward
      && !wasReferralRewardToastShown(playerRecord.wallet_address, latestReferralReward)
    ) {
      markReferralRewardToastShown(playerRecord.wallet_address, latestReferralReward);
      showReferralRewardToast(latestReferralReward);
    }

    return nextStoredPlayer;
  }, [showReferralRewardToast, syncLocalPlayerFromServer, syncReferralSummary]);

  const invokeVerifyWallet = useCallback((payload: Record<string, unknown>) => (
    invokeEdgeFunctionHttp<{
      player?: PlayerRecord;
      session_token?: string;
      latest_referral_reward?: ReferralRewardNotification | null;
      error?: string;
    }>('verify-wallet', { body: payload })
  ), []);

  const persistWalletState = useCallback(async (bundle: WalletSaveBundle) => {
    if (!address || !isConnected || !isVerified || !sessionTokenRef.current) {
      return false;
    }

    const nextPlayerDigest = bundle.player ? getPlayerProgressDigest(bundle.player) : null;
    const nextGameProgressDigest = bundle.gameProgress ? getGameProgressDigest(bundle.gameProgress) : null;
    const shouldSavePlayer = !!bundle.player && nextPlayerDigest !== lastSavedPlayerDigestRef.current;
    const shouldSaveGameProgress = !!bundle.gameProgress && nextGameProgressDigest !== lastSavedGameProgressDigestRef.current;

    if (!shouldSavePlayer && !shouldSaveGameProgress) {
      return true;
    }

    if (saveInFlightRef.current) {
      queuedSaveRef.current = mergeSaveBundle(queuedSaveRef.current, bundle);
      return true;
    }

    saveInFlightRef.current = true;
    try {
      const { data, error } = await supabase.functions.invoke('save-player-progress', {
        body: {
          wallet_address: address,
          session_token: sessionTokenRef.current,
          base_updated_at: serverUpdatedAtRef.current,
          player_data: shouldSavePlayer && bundle.player ? serializePlayerProgress(bundle.player) : undefined,
          game_progress: shouldSaveGameProgress ? bundle.gameProgress : undefined,
        },
      });

      if (error) throw error;

      if (data?.player) {
        applyVerifiedPlayerPayload(data.player as PlayerRecord);
      } else {
        if (shouldSavePlayer && nextPlayerDigest) {
          lastSavedPlayerDigestRef.current = nextPlayerDigest;
        }
        if (shouldSaveGameProgress && nextGameProgressDigest) {
          lastSavedGameProgressDigestRef.current = nextGameProgressDigest;
          setSavedGameProgress(bundle.gameProgress ?? null);
        }
      }

      return true;
    } catch (error) {
      console.error('Wallet progress save failed:', error);
      queuedSaveRef.current = mergeSaveBundle(queuedSaveRef.current, bundle);
      return false;
    } finally {
      saveInFlightRef.current = false;

      const queuedBundle = queuedSaveRef.current;
      if (queuedBundle) {
        queuedSaveRef.current = null;
        if (
          (queuedBundle.player && getPlayerProgressDigest(queuedBundle.player) !== lastSavedPlayerDigestRef.current)
          || (queuedBundle.gameProgress && getGameProgressDigest(queuedBundle.gameProgress) !== lastSavedGameProgressDigestRef.current)
        ) {
          void persistWalletState(queuedBundle);
        }
      }
    }
  }, [address, applyVerifiedPlayerPayload, isConnected, isVerified]);

  const saveProgress = useCallback((player: PlayerState) => (
    persistWalletState({ player })
  ), [persistWalletState]);

  const saveGameProgress = useCallback((gameProgress: GameProgressSnapshot) => (
    persistWalletState({ gameProgress })
  ), [persistWalletState]);

  useEffect(() => {
    if (!REFERRAL_BAIT_ENABLED) return;

    const searchParams = new URLSearchParams(window.location.search);
    const pendingReferrer = normalizeWalletAddress(
      searchParams.get('ref') ?? searchParams.get('referrer'),
    );

    if (pendingReferrer) {
      storePendingReferrer(pendingReferrer);
    }
  }, []);

  // Try to restore session from localStorage on page refresh
  const tryRestoreSession = useCallback(async (addr: string) => {
    const stored = getStoredWalletSession();
    if (!stored || stored.address.toLowerCase() !== addr.toLowerCase()) return false;

    try {
      const data = await invokeVerifyWallet({ wallet_address: addr, session_token: stored.token });
      if (!data?.player) return false;

      const nextToken = data.session_token || stored.token;
      sessionTokenRef.current = nextToken;
      storeWalletSession(addr, nextToken);
      const playerRecord = data.player as PlayerRecord;
      applyVerifiedPlayerPayload(
        playerRecord,
        (data.latest_referral_reward as ReferralRewardNotification | null | undefined) ?? null,
      );
      setIsVerified(true);
      return true;
    } catch {
      return false;
    }
  }, [applyVerifiedPlayerPayload, invokeVerifyWallet]);

  const refreshVerifiedSession = useCallback(async () => {
    if (
      !address
      || !isConnected
      || !isVerified
      || isVerifying
      || refreshInFlightRef.current
      || !sessionTokenRef.current
    ) {
      return false;
    }

    refreshInFlightRef.current = true;
    try {
      const data = await invokeVerifyWallet({
        wallet_address: address,
        session_token: sessionTokenRef.current,
      });
      if (!data?.player) return false;

      const nextToken = data.session_token || sessionTokenRef.current;
      sessionTokenRef.current = nextToken;
      storeWalletSession(address, nextToken);
      applyVerifiedPlayerPayload(
        data.player as PlayerRecord,
        (data.latest_referral_reward as ReferralRewardNotification | null | undefined) ?? null,
      );
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [address, applyVerifiedPlayerPayload, invokeVerifyWallet, isConnected, isVerified, isVerifying]);

  const verifyWallet = useCallback(async (force = false) => {
    if (!address || isVerifying) return;

    const normalizedAddress = address.toLowerCase();
    if (!force && autoVerifyAttemptedForAddressRef.current === normalizedAddress) {
      return;
    }

    autoVerifyAttemptedForAddressRef.current = normalizedAddress;
    setVerificationError(null);
    setWalletSessionResolving(true);
    setIsVerifying(true);
    try {
      const pendingReferrer = REFERRAL_BAIT_ENABLED ? getPendingReferrer() : null;
      const message = `Hook & Loot: Sign to verify your wallet\nAddress: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ account: address, message });

      const data = await invokeVerifyWallet({
        wallet_address: address,
        signature,
        message,
        referrer_wallet_address: pendingReferrer,
      });

      const token = data.session_token || address.toLowerCase();
      setVerificationError(null);
      sessionTokenRef.current = token;
      storeWalletSession(address, token);
      
      if (data.player) {
        const playerRecord = data.player as PlayerRecord;
        applyVerifiedPlayerPayload(
          playerRecord,
          (data.latest_referral_reward as ReferralRewardNotification | null | undefined) ?? null,
        );

        if (
          pendingReferrer
          && (playerRecord.referrer_wallet_address != null || pendingReferrer === address.toLowerCase())
        ) {
          clearPendingReferrer();
        }
      }
      setIsVerified(true);
    } catch (err) {
      const contextualError = err as {
        status?: number;
        responseBody?: string;
        responseData?: unknown;
      };
      console.error('Wallet verification failed:', {
        error: err,
        status: contextualError.status ?? null,
        responseData: contextualError.responseData ?? null,
        responseBody: contextualError.responseBody ?? null,
      });
      const description = await getWalletVerificationErrorMessage(err);
      setIsVerified(false);
      setVerificationError(description);
      toast({
        title: 'Wallet verification failed',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
      setWalletSessionResolving(false);
    }
  }, [address, applyVerifiedPlayerPayload, invokeVerifyWallet, isVerifying, signMessageAsync, toast]);

  useEffect(() => {
    if (!isConnected || !address || !isVerified) return;

    const handleWindowFocus = () => {
      void refreshVerifiedSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshVerifiedSession();
      }
    };

    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshVerifiedSession();
      }
    }, 30000);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(pollInterval);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [address, isConnected, isVerified, refreshVerifiedSession]);

  // Auto-restore or auto-verify when wallet connects
  useEffect(() => {
    let cancelled = false;

    if (isConnected && address && !isVerified && !isVerifying) {
      if (!restoredRef.current) {
        restoredRef.current = true;
        autoVerifyAttemptedForAddressRef.current = null;
        setWalletSessionResolving(true);
        tryRestoreSession(address).then((restored) => {
          if (cancelled) return;
          if (!restored) {
            void verifyWallet();
            return;
          }
          setWalletSessionResolving(false);
        });
      } else if (autoVerifyAttemptedForAddressRef.current !== address.toLowerCase()) {
        void verifyWallet();
      }
    }
    if (isConnected && (isVerified || isVerifying)) {
      if (isVerified) {
        setWalletSessionResolving(false);
      }
    }
    if (!isConnected) {
      setIsVerified(false);
      setSavedPlayer(null);
      setSavedGameProgress(null);
      setReferralSummary(null);
      setWalletSessionResolving(false);
      sessionTokenRef.current = null;
      serverUpdatedAtRef.current = null;
      lastSavedPlayerDigestRef.current = null;
      lastSavedGameProgressDigestRef.current = null;
      queuedSaveRef.current = null;
      saveInFlightRef.current = false;
      restoredRef.current = false;
      autoVerifyAttemptedForAddressRef.current = null;
      setVerificationError(null);
      clearStoredWalletSession();
    }

    return () => { cancelled = true; };
  }, [isConnected, address, isVerified, isVerifying, verifyWallet, tryRestoreSession]);

  return {
    address,
    isConnected,
    isVerified,
    isVerifying,
    savedPlayer,
    savedGameProgress,
    walletSessionResolving,
    verificationError,
    referralSummary,
    saveProgress,
    saveGameProgress,
    syncServerPlayerRecord: (playerRecord: PlayerRecord) => applyVerifiedPlayerPayload(playerRecord),
    retryVerifyWallet: () => {
      autoVerifyAttemptedForAddressRef.current = null;
      return verifyWallet(true);
    },
    disconnect,
  };
}
