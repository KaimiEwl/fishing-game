import type { PlayerState } from '@/types/game';

export const PLAYER_STORAGE_KEY = 'hook_loot_player_v1';

interface StoredCaughtFish {
  fishId: string;
  caughtAt: string;
  quantity: number;
}

interface StoredPlayerState extends Omit<PlayerState, 'inventory'> {
  inventory: StoredCaughtFish[];
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

export const deserializeStoredPlayer = (raw: string, fallback: PlayerState): PlayerState | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPlayerState>;
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      ...fallback,
      ...parsed,
      inventory: Array.isArray(parsed.inventory)
        ? parsed.inventory.map((item) => ({
            fishId: item.fishId,
            caughtAt: new Date(item.caughtAt),
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
    };
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
  };

  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(serialized));
};
