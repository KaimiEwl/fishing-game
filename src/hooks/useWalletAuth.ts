import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { invokeEdgeFunctionHttp, supabase } from '@/integrations/supabase/client';
import {
  DAILY_TASKS,
  FISH_DATA,
  SPECIAL_TASKS,
  type GameProgressSnapshot,
  type PlayerState,
  XP_PER_LEVEL,
} from '@/types/game';
import { COLLECTION_BOOK_PAGES } from '@/lib/collectionBook';
import {
  BAIT_BUCKETS_V2_ENABLED,
  DAILY_FREE_BAIT,
  MAX_REWARDED_REFERRALS_PER_INVITER,
  REFERRAL_BAIT_ENABLED,
  WEEKLY_MISSION_CONFIG,
} from '@/lib/baitEconomy';
import {
  applyServerBonusBaitSync,
  loadStoredPlayer,
  mergeLinkedGuestPlayerState,
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
const PENDING_WALLET_SAVE_STORAGE_KEY = 'hook_loot_pending_wallet_save_v1';
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

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const COLLECTION_FISH_IDS = FISH_DATA.map((fish) => fish.id);
const COLLECTION_PAGE_IDS = COLLECTION_BOOK_PAGES.map((page) => page.id);

const clampProgressInt = (value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
};

const normalizeIsoOrNull = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const normalizeDayOrNull = (value: unknown) => (
  typeof value === 'string' && DAY_KEY_PATTERN.test(value) ? value : null
);

const getCurrentWeekKey = () => {
  const now = new Date();
  const mondayBasedDay = (now.getUTCDay() + 6) % 7;
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - mondayBasedDay);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getTodayKey = () => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const normalizeTaskStateEntry = (value: unknown) => {
  const state = value && typeof value === 'object'
    ? value as { progress?: unknown; claimed?: unknown }
    : {};

  return {
    progress: clampProgressInt(state.progress, 0, 0, 1_000_000),
    claimed: Boolean(state.claimed),
  };
};

const applyDailyCheckInReadyState = <T extends Record<string, { progress: number; claimed: boolean }>>(tasks: T): T => {
  if (!('check_in' in tasks)) return tasks;

  const current = tasks.check_in;
  if (current.claimed || current.progress >= 1) return tasks;

  return {
    ...tasks,
    check_in: {
      ...current,
      progress: 1,
    },
  };
};

const createEmptyFishingNet = () => ({
  owned: false,
  dailyFishCount: 0,
  purchasedAt: null,
  readyDate: null,
  lastCollectedDate: null,
  lastNotificationDate: null,
  pendingCatch: [] as Array<{ fishId: string; quantity: number }>,
});

const normalizeFishingNetCatch = (value: unknown) => {
  if (!Array.isArray(value)) return [] as Array<{ fishId: string; quantity: number }>;

  const quantities = new Map<string, number>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const fishIdValue = (item as Record<string, unknown>).fishId;
    const fishId = typeof fishIdValue === 'string'
      ? fishIdValue.trim()
      : '';
    const quantity = clampProgressInt((item as Record<string, unknown>).quantity, 0, 0, 99_999);
    if (!fishId || quantity <= 0) continue;
    quantities.set(fishId, (quantities.get(fishId) ?? 0) + quantity);
  }

  return Array.from(quantities.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([fishId, quantity]) => ({ fishId, quantity }));
};

const normalizeFishingNet = (value: unknown) => {
  if (!value || typeof value !== 'object') return createEmptyFishingNet();

  const source = value as Record<string, unknown>;
  const owned = Boolean(source.owned);
  if (!owned) return createEmptyFishingNet();

  return {
    owned,
    dailyFishCount: Math.max(1, clampProgressInt(source.dailyFishCount, 10, 1, 999)),
    purchasedAt: normalizeIsoOrNull(source.purchasedAt),
    readyDate: normalizeDayOrNull(source.readyDate),
    lastCollectedDate: normalizeDayOrNull(source.lastCollectedDate),
    lastNotificationDate: normalizeDayOrNull(source.lastNotificationDate),
    pendingCatch: normalizeFishingNetCatch(source.pendingCatch),
  };
};

const normalizeWheelPrize = (value: unknown) => {
  if (!value || typeof value !== 'object') return null;

  const prize = value as Record<string, unknown>;
  const type = prize.type === 'fish'
    ? 'fish'
    : prize.type === 'coins'
      ? 'coins'
      : prize.type === 'mon'
        ? 'mon'
        : prize.type === 'bait'
          ? 'bait'
          : null;
  const id = typeof prize.id === 'string' ? prize.id.trim() : '';
  const label = typeof prize.label === 'string' ? prize.label.trim() : '';
  if (!type || !id || !label) return null;

  return {
    id,
    label,
    type,
    coins: type === 'coins' ? clampProgressInt(prize.coins, 0, 0, 1_000_000_000) : undefined,
    fishId: type === 'fish' && typeof prize.fishId === 'string' ? prize.fishId.trim() : undefined,
    quantity: prize.quantity == null ? undefined : clampProgressInt(prize.quantity, 1, 1, 99_999),
    mon: type === 'mon' ? Number(prize.mon ?? 0) : undefined,
    bait: type === 'bait' ? clampProgressInt(prize.bait, 0, 0, 99_999) : undefined,
    secret: Boolean(prize.secret),
  };
};

const normalizeCollectionBook = (value: unknown) => {
  if (!value || typeof value !== 'object') return null;

  const source = value as Record<string, unknown>;
  const speciesSource = source.species && typeof source.species === 'object'
    ? source.species as Record<string, unknown>
    : {};
  const species = Object.fromEntries(COLLECTION_FISH_IDS.map((fishId) => {
    const current = speciesSource[fishId] && typeof speciesSource[fishId] === 'object'
      ? speciesSource[fishId] as Record<string, unknown>
      : {};
    return [fishId, {
      fishId,
      discovered: Boolean(current.discovered),
      catches: clampProgressInt(current.catches, 0, 0, 1_000_000),
      firstCaughtAt: normalizeIsoOrNull(current.firstCaughtAt),
      lastCaughtAt: normalizeIsoOrNull(current.lastCaughtAt),
      firstCatchBonusClaimed: Boolean(current.firstCatchBonusClaimed),
    }];
  }));

  const pageSource = Array.isArray(source.pages) ? source.pages : [];
  const pages = COLLECTION_PAGE_IDS.map((pageId) => {
    const current = pageSource.find(
      (item) => item && typeof item === 'object' && (item as Record<string, unknown>).pageId === pageId,
    );
    return {
      pageId,
      completed: Boolean(current && (current as Record<string, unknown>).completed),
      claimed: Boolean(current && (current as Record<string, unknown>).claimed),
    };
  });

  return {
    species,
    pages,
    totalSpeciesCaught: Object.values(species).filter((entry) => entry.discovered).length,
    totalFirstCatchBonusesClaimed: Object.values(species).filter((entry) => entry.firstCatchBonusClaimed).length,
  };
};

const normalizeRodMastery = (value: unknown) => {
  if (!value || typeof value !== 'object') return null;

  const source = value as Record<string, unknown>;
  const tracksSource = source.tracks && typeof source.tracks === 'object'
    ? source.tracks as Record<string, unknown>
    : {};
  const tracks = Object.fromEntries(
    Object.entries(tracksSource)
      .filter(([trackKey]) => Boolean(trackKey.trim()))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([trackKey, rawTrack]) => {
        const current = rawTrack && typeof rawTrack === 'object'
          ? rawTrack as Record<string, unknown>
          : {};
        return [trackKey, {
          rodLevel: clampProgressInt(current.rodLevel, 0, 0, 99),
          masteryLevel: clampProgressInt(current.masteryLevel, 0, 0, 999),
          masteryPoints: clampProgressInt(current.masteryPoints, 0, 0, 1_000_000),
          lastUpdatedAt: normalizeIsoOrNull(current.lastUpdatedAt),
        }];
      }),
  );

  return {
    totalMasteryPoints: Math.max(
      clampProgressInt(source.totalMasteryPoints, 0, 0, 1_000_000),
      Object.values(tracks).reduce((sum, track) => sum + track.masteryPoints, 0),
    ),
    tracks,
  };
};

function serializeGameProgress(progress: GameProgressSnapshot) {
  const currentWeekKey = getCurrentWeekKey();
  const parsedWeekKey = typeof progress.weekKey === 'string' && DAY_KEY_PATTERN.test(progress.weekKey)
    ? progress.weekKey
    : currentWeekKey;

  return {
    date: typeof progress.date === 'string' && DAY_KEY_PATTERN.test(progress.date)
      ? progress.date
      : getTodayKey(),
    weekKey: parsedWeekKey,
    tasks: applyDailyCheckInReadyState(Object.fromEntries(
      DAILY_TASKS.map((task) => [task.id, normalizeTaskStateEntry(progress.tasks?.[task.id])]),
    )),
    specialTasks: Object.fromEntries(
      SPECIAL_TASKS.map((task) => [task.id, normalizeTaskStateEntry(progress.specialTasks?.[task.id])]),
    ),
    weeklyMissions: parsedWeekKey === currentWeekKey
      ? Object.fromEntries(
          WEEKLY_MISSION_CONFIG.map((mission) => [
            mission.id,
            normalizeTaskStateEntry(progress.weeklyMissions?.[mission.id]),
          ]),
        )
      : Object.fromEntries(
          WEEKLY_MISSION_CONFIG.map((mission) => [
            mission.id,
            normalizeTaskStateEntry(undefined),
          ]),
        ),
    lastWeeklyCubeUnlockDate: parsedWeekKey === currentWeekKey
      ? normalizeDayOrNull(progress.lastWeeklyCubeUnlockDate)
      : null,
    collectionBook: normalizeCollectionBook(progress.collectionBook),
    rodMastery: normalizeRodMastery(progress.rodMastery),
    fishingNet: normalizeFishingNet(progress.fishingNet),
    wheelSpun: Boolean(progress.wheelSpun),
    wheelPrize: normalizeWheelPrize(progress.wheelPrize),
    dailyWheelRolls: clampProgressInt(progress.dailyWheelRolls, 0, 0, 99_999),
    dailyRollRewardGranted: Boolean(progress.dailyRollRewardGranted),
    paidWheelRolls: clampProgressInt(progress.paidWheelRolls, 0, 0, 99_999),
    grillScore: clampProgressInt(progress.grillScore, 0, 0, 1_000_000_000),
    dishesToday: clampProgressInt(progress.dishesToday, 0, 0, 1_000_000),
  };
}

function getGameProgressDigest(progress: GameProgressSnapshot) {
  return JSON.stringify(serializeGameProgress(progress));
}

interface WalletSaveBundle {
  player?: PlayerState;
  gameProgress?: GameProgressSnapshot;
}

type PlayerSnapshotMergeMode = 'optimistic' | 'server' | 'link';

const mergeSaveBundle = (
  current: WalletSaveBundle | null,
  next: WalletSaveBundle,
): WalletSaveBundle => ({
  player: next.player ?? current?.player,
  gameProgress: next.gameProgress ?? current?.gameProgress,
});

const buildPendingWalletSaveStorageKey = (walletAddress: string) => (
  `${PENDING_WALLET_SAVE_STORAGE_KEY}:${walletAddress.toLowerCase()}`
);

const normalizeStoredPendingWalletSaveBundle = (value: unknown): WalletSaveBundle | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const source = value as {
    player?: unknown;
    gameProgress?: unknown;
  };
  const player = source.player && typeof source.player === 'object' && !Array.isArray(source.player)
    ? source.player as PlayerState
    : undefined;
  const gameProgress = source.gameProgress && typeof source.gameProgress === 'object' && !Array.isArray(source.gameProgress)
    ? source.gameProgress as GameProgressSnapshot
    : undefined;

  return player || gameProgress ? { player, gameProgress } : null;
};

const loadPendingWalletSaveBundle = (walletAddress: string): WalletSaveBundle | null => {
  try {
    const raw = localStorage.getItem(buildPendingWalletSaveStorageKey(walletAddress));
    if (!raw) return null;
    return normalizeStoredPendingWalletSaveBundle(JSON.parse(raw));
  } catch {
    return null;
  }
};

const storePendingWalletSaveBundle = (walletAddress: string, bundle: WalletSaveBundle) => {
  try {
    const nextBundle = mergeSaveBundle(loadPendingWalletSaveBundle(walletAddress), bundle);
    if (!nextBundle.player && !nextBundle.gameProgress) return;

    localStorage.setItem(
      buildPendingWalletSaveStorageKey(walletAddress),
      JSON.stringify(nextBundle),
    );
  } catch {
    // Local pending sync is a resilience layer; network save still remains the source of truth.
  }
};

const clearPendingWalletSaveBundle = (walletAddress: string) => {
  try {
    localStorage.removeItem(buildPendingWalletSaveStorageKey(walletAddress));
  } catch {
    // Ignore storage failures; the next successful save can still clear server-side drift.
  }
};

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
  const [savedPlayerSyncMode, setSavedPlayerSyncMode] = useState<PlayerSnapshotMergeMode>('optimistic');
  const [savedGameProgress, setSavedGameProgress] = useState<GameProgressSnapshot | null>(null);
  const [referralSummary, setReferralSummary] = useState<ReferralSummary | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const restoredRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const pendingLinkedPlayerSaveRef = useRef<PlayerState | null>(null);
  const autoVerifyAttemptedForAddressRef = useRef<string | null>(null);
  const queuedSaveRef = useRef<WalletSaveBundle | null>(null);
  const pendingWalletSaveRestoredForAddressRef = useRef<string | null>(null);
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

  const syncLocalPlayerFromServer = useCallback((
    playerRecord: PlayerRecord,
    mergeMode: PlayerSnapshotMergeMode = 'optimistic',
  ) => {
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

    const mergedPlayer = mergeMode === 'server'
      ? mappedPlayer
      : normalizedLocalPlayer
        ? mergeMode === 'link'
          ? mergeLinkedGuestPlayerState(mappedPlayer, normalizedLocalPlayer)
          : mergeSyncedPlayerState(mappedPlayer, normalizedLocalPlayer)
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
    options?: { mergeMode?: PlayerSnapshotMergeMode },
  ) => {
    const mergeMode = options?.mergeMode ?? 'optimistic';
    const nextStoredPlayer = syncLocalPlayerFromServer(playerRecord, mergeMode);
    const nextServerPlayer = normalizeLegacyStartingBait(normalizePlayerDailyFreeBait(
      mapPlayerRecord(playerRecord),
      BAIT_BUCKETS_V2_ENABLED,
      DAILY_FREE_BAIT,
    ), DAILY_FREE_BAIT);
    const nextSavedGameProgress = playerRecord.game_progress && typeof playerRecord.game_progress === 'object'
      ? playerRecord.game_progress as GameProgressSnapshot
      : null;
    serverUpdatedAtRef.current = playerRecord.updated_at ?? null;
    lastSavedPlayerDigestRef.current = getPlayerProgressDigest(
      mergeMode === 'link' ? nextServerPlayer : nextStoredPlayer,
    );
    lastSavedGameProgressDigestRef.current = nextSavedGameProgress
      ? getGameProgressDigest(nextSavedGameProgress)
      : null;
    setSavedPlayerSyncMode(mergeMode);
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

  const syncQueuedNickname = useCallback((nickname: string) => {
    const normalizedNickname = nickname.trim();
    const queuedBundle = queuedSaveRef.current;

    if (!queuedBundle?.player) return;

    queuedSaveRef.current = {
      ...queuedBundle,
      player: {
        ...queuedBundle.player,
        nickname: normalizedNickname,
      },
    };
  }, []);

  const waitForActiveWalletSaveToFinish = useCallback(async (timeoutMs = 8000) => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (!saveInFlightRef.current) {
        return true;
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 120);
      });
    }

    return !saveInFlightRef.current;
  }, []);

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

    const pendingBundle: WalletSaveBundle = {
      player: shouldSavePlayer ? bundle.player : undefined,
      gameProgress: shouldSaveGameProgress ? bundle.gameProgress : undefined,
    };

    if (saveInFlightRef.current) {
      queuedSaveRef.current = mergeSaveBundle(queuedSaveRef.current, pendingBundle);
      storePendingWalletSaveBundle(address, pendingBundle);
      return true;
    }

    saveInFlightRef.current = true;
    let saveSucceeded = false;
    try {
      const serializedGameProgress = shouldSaveGameProgress && bundle.gameProgress
        ? serializeGameProgress(bundle.gameProgress)
        : undefined;
      storePendingWalletSaveBundle(address, pendingBundle);

      const { data, error } = await supabase.functions.invoke('save-player-progress', {
        body: {
          wallet_address: address,
          session_token: sessionTokenRef.current,
          base_updated_at: serverUpdatedAtRef.current,
          player_data: shouldSavePlayer && bundle.player ? serializePlayerProgress(bundle.player) : undefined,
          game_progress: serializedGameProgress,
        },
      });

      if (error) throw error;

      if (data?.player) {
        const playerRecord = data.player as PlayerRecord;

        if (shouldSavePlayer) {
          applyVerifiedPlayerPayload(
            playerRecord,
            null,
            { mergeMode: queuedSaveRef.current?.player ? 'optimistic' : 'server' },
          );
        } else {
          serverUpdatedAtRef.current = playerRecord.updated_at ?? serverUpdatedAtRef.current;

          const nextSavedGameProgress = playerRecord.game_progress && typeof playerRecord.game_progress === 'object'
            ? playerRecord.game_progress as GameProgressSnapshot
            : bundle.gameProgress ?? null;

          if (nextSavedGameProgress) {
            lastSavedGameProgressDigestRef.current = getGameProgressDigest(nextSavedGameProgress);
            setSavedGameProgress(nextSavedGameProgress);
          } else if (shouldSaveGameProgress && nextGameProgressDigest) {
            lastSavedGameProgressDigestRef.current = nextGameProgressDigest;
            setSavedGameProgress(bundle.gameProgress ?? null);
          }
        }
      } else {
        if (shouldSavePlayer && nextPlayerDigest) {
          lastSavedPlayerDigestRef.current = nextPlayerDigest;
        }
        if (shouldSaveGameProgress && nextGameProgressDigest) {
          lastSavedGameProgressDigestRef.current = nextGameProgressDigest;
          setSavedGameProgress(bundle.gameProgress ?? null);
        }
      }

      saveSucceeded = true;
      return true;
    } catch (error) {
      console.error('Wallet progress save failed:', error);
      queuedSaveRef.current = mergeSaveBundle(queuedSaveRef.current, pendingBundle);
      storePendingWalletSaveBundle(address, pendingBundle);
      return false;
    } finally {
      saveInFlightRef.current = false;

      const queuedBundle = queuedSaveRef.current;
      if (queuedBundle) {
        queuedSaveRef.current = null;
        storePendingWalletSaveBundle(address, queuedBundle);
        if (
          (queuedBundle.player && getPlayerProgressDigest(queuedBundle.player) !== lastSavedPlayerDigestRef.current)
          || (queuedBundle.gameProgress && getGameProgressDigest(queuedBundle.gameProgress) !== lastSavedGameProgressDigestRef.current)
        ) {
          void persistWalletState(queuedBundle);
        } else if (saveSucceeded) {
          clearPendingWalletSaveBundle(address);
        }
      } else if (saveSucceeded) {
        clearPendingWalletSaveBundle(address);
      }
    }
  }, [address, applyVerifiedPlayerPayload, isConnected, isVerified]);

  const saveProgress = useCallback((player: PlayerState) => (
    persistWalletState({ player })
  ), [persistWalletState]);

  const saveWalletSnapshot = useCallback((bundle: WalletSaveBundle) => (
    persistWalletState(bundle)
  ), [persistWalletState]);

  useEffect(() => {
    if (!isVerified) return;

    const linkedPlayer = pendingLinkedPlayerSaveRef.current;
    if (!linkedPlayer) return;

    pendingLinkedPlayerSaveRef.current = null;
    void persistWalletState({ player: linkedPlayer });
  }, [isVerified, persistWalletState]);

  useEffect(() => {
    if (!address || !isVerified) return;

    const normalizedAddress = address.toLowerCase();
    if (pendingWalletSaveRestoredForAddressRef.current === normalizedAddress) return;
    pendingWalletSaveRestoredForAddressRef.current = normalizedAddress;

    const pendingBundle = loadPendingWalletSaveBundle(address);
    if (!pendingBundle) return;

    queuedSaveRef.current = mergeSaveBundle(queuedSaveRef.current, pendingBundle);
    if (!saveInFlightRef.current) {
      const queuedBundle = queuedSaveRef.current;
      queuedSaveRef.current = null;
      if (queuedBundle) {
        void persistWalletState(queuedBundle);
      }
    }
  }, [address, isVerified, persistWalletState]);

  const saveGameProgress = useCallback((gameProgress: GameProgressSnapshot) => (
    persistWalletState({ gameProgress })
  ), [persistWalletState]);

  const flushPlayerSave = useCallback(async (player: PlayerState, timeoutMs = 8000) => {
    const targetDigest = getPlayerProgressDigest(player);
    const saveQueued = await persistWalletState({ player });
    if (!saveQueued) return false;

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (
        lastSavedPlayerDigestRef.current === targetDigest
        && !saveInFlightRef.current
        && !queuedSaveRef.current
      ) {
        return true;
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 120);
      });
    }

    return lastSavedPlayerDigestRef.current === targetDigest;
  }, [persistWalletState]);

  const flushGameProgressSave = useCallback(async (gameProgress: GameProgressSnapshot, timeoutMs = 8000) => {
    const targetDigest = getGameProgressDigest(gameProgress);
    const saveQueued = await persistWalletState({ gameProgress });
    if (!saveQueued) return false;

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (lastSavedGameProgressDigestRef.current === targetDigest) {
        return true;
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 120);
      });
    }

    return lastSavedGameProgressDigestRef.current === targetDigest;
  }, [persistWalletState]);

  const flushWalletSnapshot = useCallback(async (bundle: WalletSaveBundle, timeoutMs = 8000) => {
    const targetPlayerDigest = bundle.player ? getPlayerProgressDigest(bundle.player) : null;
    const targetGameProgressDigest = bundle.gameProgress ? getGameProgressDigest(bundle.gameProgress) : null;
    const saveQueued = await persistWalletState(bundle);
    if (!saveQueued) return false;

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const playerSynced = !targetPlayerDigest || lastSavedPlayerDigestRef.current === targetPlayerDigest;
      const gameProgressSynced = !targetGameProgressDigest || lastSavedGameProgressDigestRef.current === targetGameProgressDigest;

      if (playerSynced && gameProgressSynced && !saveInFlightRef.current && !queuedSaveRef.current) {
        return true;
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 120);
      });
    }

    return (
      (!targetPlayerDigest || lastSavedPlayerDigestRef.current === targetPlayerDigest)
      && (!targetGameProgressDigest || lastSavedGameProgressDigestRef.current === targetGameProgressDigest)
    );
  }, [persistWalletState]);

  const saveVerifiedNickname = useCallback(async (_player: PlayerState, nickname: string, timeoutMs = 10000) => {
    const normalizedNickname = nickname.trim();
    if (!normalizedNickname || !address || !isConnected || !isVerified || !sessionTokenRef.current) {
      return null;
    }

    syncQueuedNickname(normalizedNickname);

    const activeSaveFinished = await waitForActiveWalletSaveToFinish(timeoutMs);
    if (!activeSaveFinished) {
      return null;
    }

    saveInFlightRef.current = true;
    try {
      const { data, error } = await supabase.functions.invoke('save-player-name', {
        body: {
          wallet_address: address,
          session_token: sessionTokenRef.current,
          nickname: normalizedNickname,
        },
      });

      if (error) throw error;
      if (!data?.player) return null;

      const nextSavedPlayer = applyVerifiedPlayerPayload(
        data.player as PlayerRecord,
        null,
        { mergeMode: 'server' },
      );

      return nextSavedPlayer.nickname?.trim() === normalizedNickname
        ? nextSavedPlayer
        : null;
    } catch (error) {
      console.error('Wallet nickname save failed:', error);
      return null;
    } finally {
      saveInFlightRef.current = false;
      syncQueuedNickname(normalizedNickname);

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
  }, [address, applyVerifiedPlayerPayload, isConnected, isVerified, persistWalletState, syncQueuedNickname, waitForActiveWalletSaveToFinish]);

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
        const nextStoredPlayer = applyVerifiedPlayerPayload(
          playerRecord,
          (data.latest_referral_reward as ReferralRewardNotification | null | undefined) ?? null,
          { mergeMode: 'link' },
        );
        pendingLinkedPlayerSaveRef.current = nextStoredPlayer;

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
      setSavedPlayerSyncMode('optimistic');
      setSavedGameProgress(null);
      setReferralSummary(null);
      setWalletSessionResolving(false);
      sessionTokenRef.current = null;
      serverUpdatedAtRef.current = null;
      lastSavedPlayerDigestRef.current = null;
      lastSavedGameProgressDigestRef.current = null;
      queuedSaveRef.current = null;
      pendingWalletSaveRestoredForAddressRef.current = null;
      pendingLinkedPlayerSaveRef.current = null;
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
    savedPlayerSyncMode,
    savedGameProgress,
    walletSessionResolving,
    verificationError,
    referralSummary,
    saveProgress,
    saveWalletSnapshot,
    flushPlayerSave,
    flushGameProgressSave,
    flushWalletSnapshot,
    saveGameProgress,
    saveVerifiedNickname,
    syncServerPlayerRecord: (
      playerRecord: PlayerRecord,
      options?: { mergeMode?: PlayerSnapshotMergeMode },
    ) => applyVerifiedPlayerPayload(playerRecord, null, options),
    retryVerifyWallet: () => {
      autoVerifyAttemptedForAddressRef.current = null;
      return verifyWallet(true);
    },
    disconnect,
  };
}
