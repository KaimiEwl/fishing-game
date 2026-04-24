import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySessionToken } from "../_shared/session.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DAILY_FREE_BAIT = 30;
const BAIT_BUCKETS_V2_ENABLED = true;
const MAX_PROGRESS_SAVE_COINS_DELTA = 100000;
const MAX_PROGRESS_SAVE_BAIT_DELTA = 1000;
const MAX_PROGRESS_SAVE_CATCH_DELTA = 500;
const MAX_PROGRESS_SAVE_INVENTORY_DELTA = 500;
const MAX_PROGRESS_SAVE_COOKED_DISH_DELTA = 200;
const MAX_PROGRESS_SAVE_GRILL_SCORE_DELTA = 20000;
const MAX_PROGRESS_SAVE_PAID_ROLL_DELTA = 50;
const DAILY_TASK_IDS = ['check_in', 'catch_10', 'rare_1', 'grill_1', 'spend_1000'] as const;
const SPECIAL_TASK_IDS = ['invite_friend', 'wallet_check_in'] as const;
const WEEKLY_MISSION_IDS = ['catch_60_fish', 'catch_6_rare', 'cook_5_dishes', 'sell_3_dishes', 'cube_3_days', 'complete_1_premium_session'] as const;
const COLLECTION_FISH_IDS = ['carp', 'perch', 'bream', 'catfish', 'goldfish', 'mutant', 'pike', 'leviathan'] as const;
const COLLECTION_PAGE_IDS = ['lake_basics', 'deepwater_odds', 'trophy_legends'] as const;
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface InventoryEntry {
  fishId: string;
  caughtAt: string;
  quantity: number;
}

interface CookedDishEntry {
  recipeId: string;
  createdAt: string;
  quantity: number;
}

interface PlayerProgressPayload {
  coins: number;
  bait: number;
  daily_free_bait: number;
  daily_free_bait_reset_at: string | null;
  bonus_bait_granted_total: number;
  level: number;
  xp: number;
  xp_to_next: number;
  rod_level: number;
  equipped_rod: number;
  inventory: InventoryEntry[];
  cooked_dishes: CookedDishEntry[];
  total_catches: number;
  login_streak: number;
  nft_rods: number[];
  nickname: string | null;
  avatar_url: string | null;
  collection_book?: unknown;
  rod_mastery?: unknown;
}

interface CollectionSpeciesPayload {
  fishId: string;
  discovered: boolean;
  catches: number;
  firstCaughtAt: string | null;
  lastCaughtAt: string | null;
  firstCatchBonusClaimed: boolean;
}

interface CollectionPagePayload {
  pageId: string;
  completed: boolean;
  claimed: boolean;
}

interface CollectionBookPayload {
  species: Record<string, CollectionSpeciesPayload>;
  pages: CollectionPagePayload[];
  totalSpeciesCaught: number;
  totalFirstCatchBonusesClaimed: number;
}

interface RodMasteryTrackPayload {
  rodLevel: number;
  masteryLevel: number;
  masteryPoints: number;
  lastUpdatedAt: string | null;
}

interface RodMasteryPayload {
  totalMasteryPoints: number;
  tracks: Record<string, RodMasteryTrackPayload>;
}

interface FishingNetCatchPayload {
  fishId: string;
  quantity: number;
}

interface FishingNetPayload {
  owned: boolean;
  dailyFishCount: number;
  purchasedAt: string | null;
  readyDate: string | null;
  lastCollectedDate: string | null;
  lastNotificationDate: string | null;
  pendingCatch: FishingNetCatchPayload[];
}

interface GameProgressPayload {
  date: string;
  weekKey?: string;
  tasks: Record<string, { progress: number; claimed: boolean }>;
  specialTasks: Record<string, { progress: number; claimed: boolean }>;
  weeklyMissions?: Record<string, { progress: number; claimed: boolean }>;
  lastWeeklyCubeUnlockDate?: string | null;
  collectionBook?: CollectionBookPayload | null;
  rodMastery?: RodMasteryPayload | null;
  fishingNet?: FishingNetPayload | null;
  wheelSpun: boolean;
  wheelPrize: Record<string, unknown> | null;
  dailyWheelRolls: number;
  dailyRollRewardGranted: boolean;
  paidWheelRolls: number;
  grillScore: number;
  dishesToday: number;
}

interface PlayerRow extends PlayerProgressPayload {
  wallet_address: string;
  game_progress: GameProgressPayload | null;
  updated_at: string;
}

const clampInt = (value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
};

const normalizeIso = (value: unknown, fallback: string) => {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
};

const normalizeUtcResetIso = (value: unknown, fallback: string) => {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())).toISOString();
};

const normalizeNullableText = (value: unknown, maxLength = 512) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

const normalizeWalletAddress = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? trimmed.toLowerCase() : null;
};

const getUtcResetIso = (date = new Date()) => (
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString()
);

const getWeekKey = (date = new Date()) => {
  const current = new Date(date);
  const mondayBasedDay = (current.getUTCDay() + 6) % 7;
  current.setUTCHours(0, 0, 0, 0);
  current.setUTCDate(current.getUTCDate() - mondayBasedDay);
  const y = current.getUTCFullYear();
  const m = String(current.getUTCMonth() + 1).padStart(2, '0');
  const d = String(current.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const sanitizeInventory = (value: unknown): InventoryEntry[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const fishId = typeof (item as Record<string, unknown>).fishId === 'string'
      ? (item as Record<string, unknown>).fishId.trim()
      : '';
    if (!fishId) return [];

    return [{
      fishId,
      caughtAt: normalizeIso((item as Record<string, unknown>).caughtAt, new Date().toISOString()),
      quantity: clampInt((item as Record<string, unknown>).quantity, 0, 0, 99999),
    }];
  }).filter((item) => item.quantity > 0);
};

const sanitizeCookedDishes = (value: unknown): CookedDishEntry[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const recipeId = typeof (item as Record<string, unknown>).recipeId === 'string'
      ? (item as Record<string, unknown>).recipeId.trim()
      : '';
    if (!recipeId) return [];

    return [{
      recipeId,
      createdAt: normalizeIso((item as Record<string, unknown>).createdAt, new Date().toISOString()),
      quantity: clampInt((item as Record<string, unknown>).quantity, 0, 0, 99999),
    }];
  }).filter((item) => item.quantity > 0);
};

const sanitizeNftRods = (value: unknown) => {
  if (!Array.isArray(value)) return [] as number[];
  return Array.from(
    new Set(
      value
        .map((item) => clampInt(item, -1, 0, 99))
        .filter((item) => item >= 0),
    ),
  ).sort((a, b) => a - b);
};

const sanitizeTaskStateMap = (value: unknown, ids: readonly string[]) => {
  const source = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};

  return Object.fromEntries(ids.map((id) => {
    const current = source[id] && typeof source[id] === 'object'
      ? source[id] as Record<string, unknown>
      : {};
    return [id, {
      progress: clampInt(current.progress, 0, 0, 1_000_000),
      claimed: Boolean(current.claimed),
    }];
  })) as Record<string, { progress: number; claimed: boolean }>;
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

const sanitizeWheelPrize = (value: unknown) => {
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
    coins: type === 'coins' ? clampInt(prize.coins, 0, 0, 1_000_000_000) : undefined,
    fishId: type === 'fish' && typeof prize.fishId === 'string' ? prize.fishId.trim() : undefined,
    quantity: prize.quantity == null ? undefined : clampInt(prize.quantity, 1, 1, 99999),
    mon: type === 'mon' ? Number(prize.mon ?? 0) : undefined,
    bait: type === 'bait' ? clampInt(prize.bait, 0, 0, 99999) : undefined,
    secret: Boolean(prize.secret),
  };
};

const sanitizeIsoOrNull = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const sanitizeDayOrNull = (value: unknown) => (
  typeof value === 'string' && DAY_KEY_PATTERN.test(value) ? value : null
);

const createFishingNet = (): FishingNetPayload => ({
  owned: false,
  dailyFishCount: 0,
  purchasedAt: null,
  readyDate: null,
  lastCollectedDate: null,
  lastNotificationDate: null,
  pendingCatch: [],
});

const sanitizeFishingNetCatch = (value: unknown): FishingNetCatchPayload[] => {
  if (!Array.isArray(value)) return [];

  const quantities = new Map<string, number>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const fishId = typeof (item as Record<string, unknown>).fishId === 'string'
      ? (item as Record<string, unknown>).fishId.trim()
      : '';
    const quantity = clampInt((item as Record<string, unknown>).quantity, 0, 0, 99999);
    if (!fishId || quantity <= 0) continue;

    quantities.set(fishId, (quantities.get(fishId) ?? 0) + quantity);
  }

  return Array.from(quantities.entries()).map(([fishId, quantity]) => ({ fishId, quantity }));
};

const sanitizeFishingNet = (value: unknown): FishingNetPayload => {
  if (!value || typeof value !== 'object') return createFishingNet();

  const source = value as Record<string, unknown>;
  const owned = Boolean(source.owned);
  if (!owned) return createFishingNet();

  return {
    owned,
    dailyFishCount: Math.max(1, clampInt(source.dailyFishCount, 10, 1, 999)),
    purchasedAt: sanitizeIsoOrNull(source.purchasedAt),
    readyDate: sanitizeDayOrNull(source.readyDate),
    lastCollectedDate: sanitizeDayOrNull(source.lastCollectedDate),
    lastNotificationDate: sanitizeDayOrNull(source.lastNotificationDate),
    pendingCatch: sanitizeFishingNetCatch(source.pendingCatch),
  };
};

const getFishingNetCatchCount = (fishingNet: FishingNetPayload | null | undefined) => (
  fishingNet?.pendingCatch.reduce((sum, entry) => sum + entry.quantity, 0) ?? 0
);

const mergeFishingNet = (
  currentNet: FishingNetPayload | null | undefined,
  nextNet: FishingNetPayload | null | undefined,
): FishingNetPayload => {
  const sanitizedCurrent = sanitizeFishingNet(currentNet);
  const sanitizedNext = sanitizeFishingNet(nextNet);
  const currentPendingCount = getFishingNetCatchCount(sanitizedCurrent);
  const nextPendingCount = getFishingNetCatchCount(sanitizedNext);

  let pendingSource = sanitizedCurrent;
  if (nextPendingCount > 0 && currentPendingCount === 0) {
    pendingSource = sanitizedNext;
  } else if (nextPendingCount > 0 && currentPendingCount > 0) {
    pendingSource = (sanitizedNext.readyDate ?? '') >= (sanitizedCurrent.readyDate ?? '')
      ? sanitizedNext
      : sanitizedCurrent;
  }

  return {
    owned: sanitizedCurrent.owned || sanitizedNext.owned,
    dailyFishCount: Math.max(sanitizedCurrent.dailyFishCount, sanitizedNext.dailyFishCount),
    purchasedAt: [sanitizedCurrent.purchasedAt, sanitizedNext.purchasedAt]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(0) ?? null,
    readyDate: getFishingNetCatchCount(pendingSource) > 0
      ? pendingSource.readyDate
      : [sanitizedCurrent.readyDate, sanitizedNext.readyDate]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null,
    lastCollectedDate: [sanitizedCurrent.lastCollectedDate, sanitizedNext.lastCollectedDate]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null,
    lastNotificationDate: [sanitizedCurrent.lastNotificationDate, sanitizedNext.lastNotificationDate]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null,
    pendingCatch: getFishingNetCatchCount(pendingSource) > 0 ? pendingSource.pendingCatch : [],
  };
};

const pickEarlierIso = (current: string | null, next: string | null) => {
  if (!current) return next;
  if (!next) return current;
  return new Date(current).getTime() <= new Date(next).getTime() ? current : next;
};

const pickLaterIso = (current: string | null, next: string | null) => {
  if (!current) return next;
  if (!next) return current;
  return new Date(current).getTime() >= new Date(next).getTime() ? current : next;
};

const sanitizeCollectionBook = (value: unknown): CollectionBookPayload | null => {
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
      catches: clampInt(current.catches, 0, 0, 1_000_000),
      firstCaughtAt: sanitizeIsoOrNull(current.firstCaughtAt),
      lastCaughtAt: sanitizeIsoOrNull(current.lastCaughtAt),
      firstCatchBonusClaimed: Boolean(current.firstCatchBonusClaimed),
    }];
  })) as Record<string, CollectionSpeciesPayload>;

  const pageSource = Array.isArray(source.pages) ? source.pages : [];
  const pages = COLLECTION_PAGE_IDS.map((pageId) => {
    const current = pageSource.find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).pageId === pageId);
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

const mergeCollectionBook = (
  currentBook: CollectionBookPayload | null | undefined,
  nextBook: CollectionBookPayload | null | undefined,
): CollectionBookPayload | null => {
  if (!currentBook && !nextBook) return null;
  const sanitizedCurrent = sanitizeCollectionBook(currentBook);
  const sanitizedNext = sanitizeCollectionBook(nextBook);
  if (!sanitizedCurrent) return sanitizedNext;
  if (!sanitizedNext) return sanitizedCurrent;

  const species = Object.fromEntries(COLLECTION_FISH_IDS.map((fishId) => {
    const currentSpecies = sanitizedCurrent.species[fishId];
    const nextSpecies = sanitizedNext.species[fishId];
    return [fishId, {
      fishId,
      discovered: currentSpecies.discovered || nextSpecies.discovered,
      catches: Math.max(currentSpecies.catches, nextSpecies.catches),
      firstCaughtAt: pickEarlierIso(currentSpecies.firstCaughtAt, nextSpecies.firstCaughtAt),
      lastCaughtAt: pickLaterIso(currentSpecies.lastCaughtAt, nextSpecies.lastCaughtAt),
      firstCatchBonusClaimed: currentSpecies.firstCatchBonusClaimed || nextSpecies.firstCatchBonusClaimed,
    }];
  })) as Record<string, CollectionSpeciesPayload>;

  const pages = COLLECTION_PAGE_IDS.map((pageId) => {
    const currentPage = sanitizedCurrent.pages.find((page) => page.pageId === pageId);
    const nextPage = sanitizedNext.pages.find((page) => page.pageId === pageId);
    return {
      pageId,
      completed: Boolean(currentPage?.completed || nextPage?.completed),
      claimed: Boolean(currentPage?.claimed || nextPage?.claimed),
    };
  });

  return {
    species,
    pages,
    totalSpeciesCaught: Object.values(species).filter((entry) => entry.discovered).length,
    totalFirstCatchBonusesClaimed: Object.values(species).filter((entry) => entry.firstCatchBonusClaimed).length,
  };
};

const sanitizeRodMastery = (value: unknown): RodMasteryPayload | null => {
  if (!value || typeof value !== 'object') return null;

  const source = value as Record<string, unknown>;
  const tracksSource = source.tracks && typeof source.tracks === 'object'
    ? source.tracks as Record<string, unknown>
    : {};
  const tracks = Object.fromEntries(
    Object.entries(tracksSource)
      .filter(([trackKey]) => Boolean(trackKey.trim()))
      .map(([trackKey, rawTrack]) => {
        const current = rawTrack && typeof rawTrack === 'object'
          ? rawTrack as Record<string, unknown>
          : {};
        return [trackKey, {
          rodLevel: clampInt(current.rodLevel, 0, 0, 99),
          masteryLevel: clampInt(current.masteryLevel, 0, 0, 999),
          masteryPoints: clampInt(current.masteryPoints, 0, 0, 1_000_000),
          lastUpdatedAt: sanitizeIsoOrNull(current.lastUpdatedAt),
        }];
      }),
  ) as Record<string, RodMasteryTrackPayload>;

  return {
    totalMasteryPoints: Math.max(
      clampInt(source.totalMasteryPoints, 0, 0, 1_000_000),
      Object.values(tracks).reduce((sum, track) => sum + track.masteryPoints, 0),
    ),
    tracks,
  };
};

const mergeRodMastery = (
  currentMastery: RodMasteryPayload | null | undefined,
  nextMastery: RodMasteryPayload | null | undefined,
): RodMasteryPayload | null => {
  if (!currentMastery && !nextMastery) return null;
  const sanitizedCurrent = sanitizeRodMastery(currentMastery);
  const sanitizedNext = sanitizeRodMastery(nextMastery);
  if (!sanitizedCurrent) return sanitizedNext;
  if (!sanitizedNext) return sanitizedCurrent;

  const trackKeys = new Set([
    ...Object.keys(sanitizedCurrent.tracks),
    ...Object.keys(sanitizedNext.tracks),
  ]);
  const tracks = Object.fromEntries(
    Array.from(trackKeys).map((trackKey) => {
      const currentTrack = sanitizedCurrent.tracks[trackKey];
      const nextTrack = sanitizedNext.tracks[trackKey];
      if (!currentTrack) return [trackKey, nextTrack];
      if (!nextTrack) return [trackKey, currentTrack];

      return [trackKey, {
        rodLevel: Math.max(currentTrack.rodLevel, nextTrack.rodLevel),
        masteryLevel: Math.max(currentTrack.masteryLevel, nextTrack.masteryLevel),
        masteryPoints: Math.max(currentTrack.masteryPoints, nextTrack.masteryPoints),
        lastUpdatedAt: pickLaterIso(currentTrack.lastUpdatedAt, nextTrack.lastUpdatedAt),
      }];
    }),
  ) as Record<string, RodMasteryTrackPayload>;

  return {
    totalMasteryPoints: Math.max(
      sanitizedCurrent.totalMasteryPoints,
      sanitizedNext.totalMasteryPoints,
      Object.values(tracks).reduce((sum, track) => sum + track.masteryPoints, 0),
    ),
    tracks,
  };
};

const sanitizeGameProgress = (value: unknown, fallbackDate: string): GameProgressPayload => {
  const source = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  const currentWeekKey = getWeekKey();
  const parsedWeekKey = typeof source.weekKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.weekKey)
    ? source.weekKey
    : currentWeekKey;

  return {
    date: typeof source.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.date)
      ? source.date
      : fallbackDate,
    weekKey: parsedWeekKey,
    tasks: applyDailyCheckInReadyState(sanitizeTaskStateMap(source.tasks, DAILY_TASK_IDS)),
    specialTasks: sanitizeTaskStateMap(source.specialTasks, SPECIAL_TASK_IDS),
    weeklyMissions: parsedWeekKey === currentWeekKey
      ? sanitizeTaskStateMap(source.weeklyMissions, WEEKLY_MISSION_IDS)
      : sanitizeTaskStateMap({}, WEEKLY_MISSION_IDS),
    lastWeeklyCubeUnlockDate: parsedWeekKey === currentWeekKey
      && typeof source.lastWeeklyCubeUnlockDate === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(source.lastWeeklyCubeUnlockDate)
      ? source.lastWeeklyCubeUnlockDate
      : null,
    collectionBook: sanitizeCollectionBook(source.collectionBook),
    rodMastery: sanitizeRodMastery(source.rodMastery),
    fishingNet: sanitizeFishingNet(source.fishingNet),
    wheelSpun: Boolean(source.wheelSpun),
    wheelPrize: sanitizeWheelPrize(source.wheelPrize),
    dailyWheelRolls: clampInt(source.dailyWheelRolls, 0, 0, 99999),
    dailyRollRewardGranted: Boolean(source.dailyRollRewardGranted),
    paidWheelRolls: clampInt(source.paidWheelRolls, 0, 0, 99999),
    grillScore: clampInt(source.grillScore, 0, 0, 1_000_000_000),
    dishesToday: clampInt(source.dishesToday, 0, 0, 1_000_000),
  };
};

const mergeGameProgress = (
  currentProgress: GameProgressPayload,
  nextProgress: GameProgressPayload,
): GameProgressPayload => {
  if (currentProgress.date !== nextProgress.date) {
    const newerProgress = currentProgress.date >= nextProgress.date ? currentProgress : nextProgress;

    return {
      ...newerProgress,
      collectionBook: mergeCollectionBook(currentProgress.collectionBook, nextProgress.collectionBook),
      rodMastery: mergeRodMastery(currentProgress.rodMastery, nextProgress.rodMastery),
      fishingNet: mergeFishingNet(currentProgress.fishingNet, nextProgress.fishingNet),
      grillScore: Math.max(currentProgress.grillScore, nextProgress.grillScore),
      paidWheelRolls: Math.max(currentProgress.paidWheelRolls, nextProgress.paidWheelRolls),
      dailyWheelRolls: Math.max(currentProgress.dailyWheelRolls, nextProgress.dailyWheelRolls),
      dailyRollRewardGranted: currentProgress.dailyRollRewardGranted || nextProgress.dailyRollRewardGranted,
    };
  }

  const mergedTasks = Object.fromEntries(DAILY_TASK_IDS.map((id) => [
    id,
    {
      progress: Math.max(currentProgress.tasks[id]?.progress ?? 0, nextProgress.tasks[id]?.progress ?? 0),
      claimed: Boolean(currentProgress.tasks[id]?.claimed || nextProgress.tasks[id]?.claimed),
    },
  ]));

  const mergedSpecialTasks = Object.fromEntries(SPECIAL_TASK_IDS.map((id) => [
    id,
    {
      progress: Math.max(currentProgress.specialTasks[id]?.progress ?? 0, nextProgress.specialTasks[id]?.progress ?? 0),
      claimed: Boolean(currentProgress.specialTasks[id]?.claimed || nextProgress.specialTasks[id]?.claimed),
    },
  ]));

  const mergedWeeklyMissions = currentProgress.weekKey !== nextProgress.weekKey
    ? (currentProgress.weekKey >= nextProgress.weekKey ? currentProgress.weeklyMissions : nextProgress.weeklyMissions)
    : Object.fromEntries(WEEKLY_MISSION_IDS.map((id) => [
      id,
      {
        progress: Math.max(currentProgress.weeklyMissions?.[id]?.progress ?? 0, nextProgress.weeklyMissions?.[id]?.progress ?? 0),
        claimed: Boolean(currentProgress.weeklyMissions?.[id]?.claimed || nextProgress.weeklyMissions?.[id]?.claimed),
      },
    ]));

  return {
    date: currentProgress.date,
    weekKey: currentProgress.weekKey && nextProgress.weekKey
      ? (currentProgress.weekKey >= nextProgress.weekKey ? currentProgress.weekKey : nextProgress.weekKey)
      : (currentProgress.weekKey ?? nextProgress.weekKey ?? getWeekKey()),
    tasks: applyDailyCheckInReadyState(mergedTasks),
    specialTasks: mergedSpecialTasks,
    weeklyMissions: mergedWeeklyMissions,
    lastWeeklyCubeUnlockDate: currentProgress.weekKey !== nextProgress.weekKey
      ? (currentProgress.weekKey >= nextProgress.weekKey ? currentProgress.lastWeeklyCubeUnlockDate : nextProgress.lastWeeklyCubeUnlockDate)
      : currentProgress.lastWeeklyCubeUnlockDate ?? nextProgress.lastWeeklyCubeUnlockDate,
    collectionBook: mergeCollectionBook(currentProgress.collectionBook, nextProgress.collectionBook),
    rodMastery: mergeRodMastery(currentProgress.rodMastery, nextProgress.rodMastery),
    fishingNet: mergeFishingNet(currentProgress.fishingNet, nextProgress.fishingNet),
    wheelSpun: currentProgress.wheelSpun || nextProgress.wheelSpun,
    wheelPrize: nextProgress.wheelPrize ?? currentProgress.wheelPrize,
    dailyWheelRolls: Math.max(currentProgress.dailyWheelRolls, nextProgress.dailyWheelRolls),
    dailyRollRewardGranted: currentProgress.dailyRollRewardGranted || nextProgress.dailyRollRewardGranted,
    paidWheelRolls: Math.max(currentProgress.paidWheelRolls, nextProgress.paidWheelRolls),
    grillScore: Math.max(currentProgress.grillScore, nextProgress.grillScore),
    dishesToday: Math.max(currentProgress.dishesToday, nextProgress.dishesToday),
  };
};

const mergeStacksByMax = <T extends Record<string, unknown>>(
  currentStacks: T[],
  nextStacks: T[],
  keyField: keyof T,
) => {
  const merged = new Map<string, T>();

  for (const item of currentStacks) {
    const key = String(item[keyField]);
    merged.set(key, item);
  }

  for (const item of nextStacks) {
    const key = String(item[keyField]);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      continue;
    }

    merged.set(key, {
      ...existing,
      ...item,
      quantity: Math.max(
        clampInt(existing.quantity, 0, 0, 99999),
        clampInt(item.quantity, 0, 0, 99999),
      ),
    } as T);
  }

  return Array.from(merged.values()).filter((item) => clampInt(item.quantity, 0, 0, 99999) > 0);
};

const formatErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (error && typeof error === 'object') {
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      return 'Could not save progress';
    }
  }
  return 'Could not save progress';
};

const sumStackQuantity = (items: Array<{ quantity: number }>) => (
  items.reduce((sum, item) => sum + item.quantity, 0)
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      wallet_address,
      session_token,
      player_data,
      game_progress,
      base_updated_at,
    } = await req.json();

    const normalizedWalletAddress = normalizeWalletAddress(wallet_address);
    if (!normalizedWalletAddress || !session_token || (!player_data && !game_progress)) {
      return new Response(
        JSON.stringify({ error: 'Missing wallet address, session, or save payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!(await verifySessionToken(session_token, normalizedWalletAddress))) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    await enforceRateLimit(supabase, {
      actionKey: 'save_player_progress',
      subjectKey: normalizedWalletAddress,
      windowSeconds: 60,
      maxHits: 60,
    });

    const { data: currentPlayer, error: currentPlayerError } = await supabase
      .from('players')
      .select('wallet_address, coins, bait, daily_free_bait, daily_free_bait_reset_at, bonus_bait_granted_total, level, xp, xp_to_next, rod_level, equipped_rod, inventory, cooked_dishes, game_progress, total_catches, login_streak, nft_rods, nickname, avatar_url, updated_at')
      .eq('wallet_address', normalizedWalletAddress)
      .maybeSingle();

    if (currentPlayerError) throw currentPlayerError;
    if (!currentPlayer) {
      return new Response(
        JSON.stringify({ error: 'Player not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const currentUtcResetIso = getUtcResetIso();
    const currentPlayerRow = currentPlayer as PlayerRow & { daily_free_bait_reset_at: string | null };
    const clientPayload = (player_data ?? {}) as Partial<PlayerProgressPayload>;
    const clientBonusGrantedTotal = clampInt(
      clientPayload.bonus_bait_granted_total,
      currentPlayerRow.bonus_bait_granted_total,
      0,
      1_000_000_000,
    );

    let nextBait = clampInt(clientPayload.bait, currentPlayerRow.bait, 0, 1_000_000_000);
    if (currentPlayerRow.bonus_bait_granted_total > clientBonusGrantedTotal) {
      nextBait += currentPlayerRow.bonus_bait_granted_total - clientBonusGrantedTotal;
    }

    const requestedDailyResetAt = normalizeUtcResetIso(
      clientPayload.daily_free_bait_reset_at,
      currentUtcResetIso,
    );
    const requestedDailyFreeBait = clampInt(
      clientPayload.daily_free_bait,
      currentPlayerRow.daily_free_bait,
      0,
      DAILY_FREE_BAIT,
    );
    const nextDailyFreeBait = BAIT_BUCKETS_V2_ENABLED
      ? requestedDailyResetAt === currentUtcResetIso
        ? requestedDailyFreeBait
        : DAILY_FREE_BAIT
      : 0;

    const currentUpdatedAt = currentPlayerRow.updated_at ?? null;
    const normalizedBaseUpdatedAt = typeof base_updated_at === 'string' && base_updated_at.trim() ? base_updated_at.trim() : null;
    const isStaleBase = !!normalizedBaseUpdatedAt && !!currentUpdatedAt && normalizedBaseUpdatedAt !== currentUpdatedAt;

    const sanitizedInventory = sanitizeInventory(clientPayload.inventory);
    const sanitizedCookedDishes = sanitizeCookedDishes(clientPayload.cooked_dishes);
    const currentInventory = sanitizeInventory(currentPlayerRow.inventory);
    const currentCookedDishes = sanitizeCookedDishes(currentPlayerRow.cooked_dishes);
    const sanitizedNftRods = sanitizeNftRods(clientPayload.nft_rods);
    const currentGameProgress = sanitizeGameProgress(currentPlayerRow.game_progress, getUtcResetIso().slice(0, 10));
    const nextGameProgress = game_progress == null
      ? currentGameProgress
      : sanitizeGameProgress(game_progress, currentGameProgress.date);
    const hasCollectionBookPayload = Object.prototype.hasOwnProperty.call(clientPayload, 'collection_book');
    const hasRodMasteryPayload = Object.prototype.hasOwnProperty.call(clientPayload, 'rod_mastery');
    const resolvedCollectionBook = hasCollectionBookPayload
      ? sanitizeCollectionBook(clientPayload.collection_book)
      : (nextGameProgress.collectionBook ?? currentGameProgress.collectionBook ?? null);
    const resolvedRodMastery = hasRodMasteryPayload
      ? sanitizeRodMastery(clientPayload.rod_mastery)
      : (nextGameProgress.rodMastery ?? currentGameProgress.rodMastery ?? null);
    const enrichedNextGameProgress: GameProgressPayload = {
      ...nextGameProgress,
      collectionBook: resolvedCollectionBook,
      rodMastery: resolvedRodMastery,
    };

    const requestedCoins = clampInt(clientPayload.coins, currentPlayerRow.coins, 0, 1_000_000_000);
    const requestedBait = clampInt(clientPayload.bait, currentPlayerRow.bait, 0, 1_000_000_000);
    const requestedCatches = clampInt(clientPayload.total_catches, currentPlayerRow.total_catches, 0, 1_000_000_000);
    const inventoryDelta = Math.max(0, sumStackQuantity(sanitizedInventory) - sumStackQuantity(currentInventory));
    const cookedDishDelta = Math.max(0, sumStackQuantity(sanitizedCookedDishes) - sumStackQuantity(currentCookedDishes));
    const grillScoreDelta = Math.max(0, nextGameProgress.grillScore - currentGameProgress.grillScore);
    const paidRollDelta = Math.max(0, nextGameProgress.paidWheelRolls - currentGameProgress.paidWheelRolls);

    if (
      requestedCoins - currentPlayerRow.coins > MAX_PROGRESS_SAVE_COINS_DELTA
      || requestedBait - currentPlayerRow.bait > MAX_PROGRESS_SAVE_BAIT_DELTA
      || requestedCatches - currentPlayerRow.total_catches > MAX_PROGRESS_SAVE_CATCH_DELTA
      || inventoryDelta > MAX_PROGRESS_SAVE_INVENTORY_DELTA
      || cookedDishDelta > MAX_PROGRESS_SAVE_COOKED_DISH_DELTA
      || grillScoreDelta > MAX_PROGRESS_SAVE_GRILL_SCORE_DELTA
      || paidRollDelta > MAX_PROGRESS_SAVE_PAID_ROLL_DELTA
    ) {
      return new Response(
        JSON.stringify({ error: 'Progress payload exceeded guarded sync limits. Refresh the wallet session and try again.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const updatePayload = {
      coins: isStaleBase
        ? Math.max(currentPlayerRow.coins, requestedCoins)
        : requestedCoins,
      bait: isStaleBase ? Math.max(currentPlayerRow.bait, nextBait) : nextBait,
      daily_free_bait: isStaleBase
        ? Math.min(currentPlayerRow.daily_free_bait, nextDailyFreeBait)
        : nextDailyFreeBait,
      daily_free_bait_reset_at: BAIT_BUCKETS_V2_ENABLED ? currentUtcResetIso : null,
      level: isStaleBase
        ? Math.max(currentPlayerRow.level, clampInt(clientPayload.level, currentPlayerRow.level, 1, 999))
        : clampInt(clientPayload.level, currentPlayerRow.level, 1, 999),
      xp: isStaleBase
        ? Math.max(currentPlayerRow.xp, clampInt(clientPayload.xp, currentPlayerRow.xp, 0, 1_000_000_000))
        : clampInt(clientPayload.xp, currentPlayerRow.xp, 0, 1_000_000_000),
      xp_to_next: isStaleBase
        ? Math.max(currentPlayerRow.xp_to_next, clampInt(clientPayload.xp_to_next, currentPlayerRow.xp_to_next, 1, 1_000_000_000))
        : clampInt(clientPayload.xp_to_next, currentPlayerRow.xp_to_next, 1, 1_000_000_000),
      rod_level: isStaleBase
        ? Math.max(currentPlayerRow.rod_level, clampInt(clientPayload.rod_level, currentPlayerRow.rod_level, 0, 99))
        : clampInt(clientPayload.rod_level, currentPlayerRow.rod_level, 0, 99),
      equipped_rod: 0,
      inventory: isStaleBase
        ? mergeStacksByMax(currentInventory, sanitizedInventory, 'fishId')
        : sanitizedInventory,
      cooked_dishes: isStaleBase
        ? mergeStacksByMax(currentCookedDishes, sanitizedCookedDishes, 'recipeId')
        : sanitizedCookedDishes,
      total_catches: isStaleBase
        ? Math.max(currentPlayerRow.total_catches, requestedCatches)
        : requestedCatches,
      login_streak: isStaleBase
        ? Math.max(currentPlayerRow.login_streak, clampInt(clientPayload.login_streak, currentPlayerRow.login_streak, 1, 9999))
        : clampInt(clientPayload.login_streak, currentPlayerRow.login_streak, 1, 9999),
      nft_rods: isStaleBase
        ? Array.from(new Set([...sanitizeNftRods(currentPlayerRow.nft_rods), ...sanitizedNftRods])).sort((a, b) => a - b)
        : sanitizedNftRods,
      nickname: currentPlayerRow.nickname ?? normalizeNullableText(clientPayload.nickname, 20),
      avatar_url: isStaleBase
        ? (currentPlayerRow.avatar_url ?? normalizeNullableText(clientPayload.avatar_url, 2048))
        : normalizeNullableText(clientPayload.avatar_url, 2048),
      game_progress: game_progress == null && !hasCollectionBookPayload && !hasRodMasteryPayload
        ? currentPlayerRow.game_progress
        : isStaleBase
          ? mergeGameProgress(currentGameProgress, enrichedNextGameProgress)
          : enrichedNextGameProgress,
    };

    const requestedEquippedRod = clampInt(
      clientPayload.equipped_rod,
      currentPlayerRow.equipped_rod,
      0,
      99,
    );

    updatePayload.equipped_rod = Math.min(
      updatePayload.rod_level,
      isStaleBase
        ? clampInt(currentPlayerRow.equipped_rod, 0, 0, 99)
        : requestedEquippedRod,
    );

    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update(updatePayload)
      .eq('wallet_address', normalizedWalletAddress)
      .select('wallet_address, coins, bait, daily_free_bait, daily_free_bait_reset_at, bonus_bait_granted_total, level, xp, xp_to_next, rod_level, equipped_rod, inventory, cooked_dishes, game_progress, total_catches, login_streak, nft_rods, nickname, avatar_url, referrer_wallet_address, rewarded_referral_count, updated_at')
      .single();

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ player: updatedPlayer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Save player progress error:', error);

    const message = formatErrorMessage(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
