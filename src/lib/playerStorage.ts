import type { PlayerState } from '@/types/game';

export const PLAYER_STORAGE_KEY = 'hook_loot_player_v1';

interface StoredCaughtFish {
  fishId: string;
  caughtAt: string;
  quantity: number;
}

interface StoredCookedDish {
  recipeId: string;
  createdAt: string;
  quantity: number;
}

interface StoredPlayerState extends Omit<PlayerState, 'inventory' | 'cookedDishes'> {
  inventory: StoredCaughtFish[];
  cookedDishes: StoredCookedDish[];
}

export const getUtcDayResetIso = (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return new Date(Date.UTC(year, month, day)).toISOString();
};

const toUtcDayResetIso = (value?: string | null) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return getUtcDayResetIso(parsed);
};

export const normalizePlayerDailyFreeBait = (
  player: PlayerState,
  enabled: boolean,
  dailyFreeBaitAmount: number,
  date = new Date(),
): PlayerState => {
  if (!enabled) {
    return {
      ...player,
      dailyFreeBait: 0,
      dailyFreeBaitResetAt: null,
    };
  }

  const currentResetIso = getUtcDayResetIso(date);
  const storedResetIso = toUtcDayResetIso(player.dailyFreeBaitResetAt);

  if (storedResetIso === currentResetIso) {
    return player;
  }

  return {
    ...player,
    dailyFreeBait: dailyFreeBaitAmount,
    dailyFreeBaitResetAt: currentResetIso,
  };
};

export const normalizeLegacyStartingBait = (
  player: PlayerState,
  dailyFreeBaitAmount: number,
): PlayerState => {
  const looksLikeFreshBaseline = (
    player.coins === 100
    && player.bait >= 10
    && player.dailyFreeBait === dailyFreeBaitAmount
    && player.level === 1
    && player.xp === 0
    && player.rodLevel === 0
    && player.equippedRod === 0
    && player.totalCatches === 0
    && player.loginStreak === 1
    && player.inventory.length === 0
    && player.cookedDishes.length === 0
    && player.nftRods.length === 0
    && player.nickname == null
    && player.avatarUrl == null
  );
  const hasLegacyStartingBait = (
    (player.bait === 10 && player.bonusBaitGrantedTotal === 0)
    || (player.bait === 20 && player.bonusBaitGrantedTotal === 10)
  );

  if (!looksLikeFreshBaseline || !hasLegacyStartingBait) {
    return player;
  }

  return {
    ...player,
    bait: 0,
    bonusBaitGrantedTotal: 0,
  };
};

export const applyServerBonusBaitSync = (
  player: PlayerState,
  serverGrantedTotal: number,
): PlayerState => {
  const localGrantedTotal = player.bonusBaitGrantedTotal ?? 0;
  if (serverGrantedTotal <= localGrantedTotal) {
    return {
      ...player,
      bonusBaitGrantedTotal: Math.max(localGrantedTotal, serverGrantedTotal),
    };
  }

  return {
    ...player,
    bait: player.bait + (serverGrantedTotal - localGrantedTotal),
    bonusBaitGrantedTotal: serverGrantedTotal,
  };
};

const mergeStacksByMax = <T extends { quantity: number }>(
  currentStacks: T[],
  nextStacks: T[],
  getKey: (item: T) => string,
  mergeDates: (currentItem: T, nextItem: T) => T,
) => {
  const merged = new Map<string, T>();

  for (const item of currentStacks) {
    merged.set(getKey(item), item);
  }

  for (const item of nextStacks) {
    const key = getKey(item);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      continue;
    }

    const preferred = existing.quantity >= item.quantity ? existing : item;
    const alternate = preferred === existing ? item : existing;
    merged.set(key, mergeDates(preferred, alternate));
  }

  return Array.from(merged.values()).filter((item) => item.quantity > 0);
};

const toTimeValue = (value: string | Date) => {
  const parsed = value instanceof Date ? value : new Date(value);
  const timestamp = parsed.getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const mergeSyncedPlayerState = (
  serverPlayer: PlayerState,
  localPlayer: PlayerState,
): PlayerState => {
  const normalizedServerPlayer = normalizeLegacyStartingBait(serverPlayer, serverPlayer.dailyFreeBait);
  const normalizedLocalPlayer = normalizeLegacyStartingBait(localPlayer, localPlayer.dailyFreeBait);
  const mergedBonusBaitGrantedTotal = Math.max(
    normalizedServerPlayer.bonusBaitGrantedTotal,
    normalizedLocalPlayer.bonusBaitGrantedTotal,
  );
  const serverNonBonusBait = Math.max(0, normalizedServerPlayer.bait - normalizedServerPlayer.bonusBaitGrantedTotal);
  const localNonBonusBait = Math.max(0, normalizedLocalPlayer.bait - normalizedLocalPlayer.bonusBaitGrantedTotal);

  return {
    ...normalizedServerPlayer,
    coins: Math.max(normalizedServerPlayer.coins, normalizedLocalPlayer.coins),
    bait: Math.max(serverNonBonusBait, localNonBonusBait) + mergedBonusBaitGrantedTotal,
    dailyFreeBait: Math.max(normalizedServerPlayer.dailyFreeBait, normalizedLocalPlayer.dailyFreeBait),
    dailyFreeBaitResetAt: normalizedServerPlayer.dailyFreeBaitResetAt ?? normalizedLocalPlayer.dailyFreeBaitResetAt,
    bonusBaitGrantedTotal: mergedBonusBaitGrantedTotal,
    level: Math.max(normalizedServerPlayer.level, normalizedLocalPlayer.level),
    xp: Math.max(normalizedServerPlayer.xp, normalizedLocalPlayer.xp),
    xpToNextLevel: Math.max(normalizedServerPlayer.xpToNextLevel, normalizedLocalPlayer.xpToNextLevel),
    rodLevel: Math.max(normalizedServerPlayer.rodLevel, normalizedLocalPlayer.rodLevel),
    equippedRod: Math.max(normalizedServerPlayer.equippedRod, normalizedLocalPlayer.equippedRod),
    inventory: mergeStacksByMax(
      normalizedServerPlayer.inventory,
      normalizedLocalPlayer.inventory,
      (item) => item.fishId,
      (preferred, alternate) => ({
        ...preferred,
        caughtAt: toTimeValue(preferred.caughtAt) >= toTimeValue(alternate.caughtAt)
          ? preferred.caughtAt
          : alternate.caughtAt,
      }),
    ),
    cookedDishes: mergeStacksByMax(
      normalizedServerPlayer.cookedDishes,
      normalizedLocalPlayer.cookedDishes,
      (item) => item.recipeId,
      (preferred, alternate) => ({
        ...preferred,
        createdAt: toTimeValue(preferred.createdAt) >= toTimeValue(alternate.createdAt)
          ? preferred.createdAt
          : alternate.createdAt,
      }),
    ),
    totalCatches: Math.max(normalizedServerPlayer.totalCatches, normalizedLocalPlayer.totalCatches),
    dailyBonusClaimed: normalizedLocalPlayer.dailyBonusClaimed,
    loginStreak: Math.max(normalizedServerPlayer.loginStreak, normalizedLocalPlayer.loginStreak),
    nftRods: Array.from(new Set([...normalizedServerPlayer.nftRods, ...normalizedLocalPlayer.nftRods])).sort((a, b) => a - b),
    // Wallet-bound identity fields must come from the server row for this wallet.
    nickname: normalizedServerPlayer.nickname,
    avatarUrl: normalizedServerPlayer.avatarUrl,
  };
};

export const deserializeStoredPlayer = (raw: string, fallback: PlayerState): PlayerState | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPlayerState>;
    if (!parsed || typeof parsed !== 'object') return null;

    return normalizeLegacyStartingBait({
      ...fallback,
      ...parsed,
      inventory: Array.isArray(parsed.inventory)
        ? parsed.inventory.map((item) => ({
            fishId: item.fishId,
            caughtAt: new Date(item.caughtAt),
            quantity: item.quantity,
          }))
        : [],
      cookedDishes: Array.isArray(parsed.cookedDishes)
        ? parsed.cookedDishes.map((item) => ({
            recipeId: item.recipeId,
            createdAt: new Date(item.createdAt),
            quantity: item.quantity,
          }))
        : [],
      nickname: parsed.nickname ?? null,
      avatarUrl: parsed.avatarUrl ?? null,
      nftRods: Array.isArray(parsed.nftRods) ? parsed.nftRods : [],
      dailyFreeBait: typeof parsed.dailyFreeBait === 'number' ? parsed.dailyFreeBait : fallback.dailyFreeBait,
      dailyFreeBaitResetAt: parsed.dailyFreeBaitResetAt ?? fallback.dailyFreeBaitResetAt,
      bonusBaitGrantedTotal: typeof parsed.bonusBaitGrantedTotal === 'number'
        ? parsed.bonusBaitGrantedTotal
        : fallback.bonusBaitGrantedTotal,
    }, fallback.dailyFreeBait);
  } catch {
    return null;
  }
};

export const loadStoredPlayer = (fallback: PlayerState): PlayerState | null => {
  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!raw) return null;
    return deserializeStoredPlayer(raw, fallback);
  } catch {
    return null;
  }
};

export const storePlayerLocally = (player: PlayerState) => {
  const serialized: StoredPlayerState = {
    ...player,
    inventory: player.inventory.map((item) => ({
      fishId: item.fishId,
      caughtAt: item.caughtAt instanceof Date ? item.caughtAt.toISOString() : new Date(item.caughtAt).toISOString(),
      quantity: item.quantity,
    })),
    cookedDishes: player.cookedDishes.map((item) => ({
      recipeId: item.recipeId,
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date(item.createdAt).toISOString(),
      quantity: item.quantity,
    })),
  };

  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(serialized));
};
