import {
  DAILY_TASK_IDS,
  SPECIAL_TASK_IDS,
  WEEKLY_MISSION_IDS,
  type DailyTaskId,
  type SpecialTaskId,
  type WeeklyMissionId,
} from './taskRegistry.ts';

export interface CubePrizeSnapshot {
  id: string;
  label: string;
  type: 'coins' | 'fish' | 'mon' | 'bait';
  coins?: number;
  fishId?: string;
  quantity?: number;
  mon?: number;
  bait?: number;
  secret?: boolean;
}

export interface CollectionSpeciesSnapshot {
  fishId: string;
  discovered: boolean;
  catches: number;
  firstCaughtAt: string | null;
  lastCaughtAt: string | null;
  firstCatchBonusClaimed: boolean;
}

export interface CollectionPageSnapshot {
  pageId: string;
  completed: boolean;
  claimed: boolean;
}

export interface CollectionBookSnapshot {
  species: Record<string, CollectionSpeciesSnapshot>;
  pages: CollectionPageSnapshot[];
  totalSpeciesCaught: number;
  totalFirstCatchBonusesClaimed: number;
}

export interface RodMasteryTrackSnapshot {
  rodLevel: number;
  masteryLevel: number;
  masteryPoints: number;
  lastUpdatedAt: string | null;
}

export interface RodMasterySnapshot {
  totalMasteryPoints: number;
  tracks: Record<string, RodMasteryTrackSnapshot>;
}

export interface GameProgressSnapshot {
  date: string;
  weekKey: string;
  tasks: Record<DailyTaskId, { progress: number; claimed: boolean }>;
  specialTasks: Record<SpecialTaskId, { progress: number; claimed: boolean }>;
  weeklyMissions: Record<WeeklyMissionId, { progress: number; claimed: boolean }>;
  lastWeeklyCubeUnlockDate: string | null;
  collectionBook: CollectionBookSnapshot | null;
  rodMastery: RodMasterySnapshot | null;
  wheelSpun: boolean;
  wheelPrize: CubePrizeSnapshot | null;
  dailyWheelRolls: number;
  dailyRollRewardGranted: boolean;
  paidWheelRolls: number;
  grillScore: number;
  dishesToday: number;
}

const COLLECTION_FISH_IDS = ['carp', 'perch', 'bream', 'catfish', 'goldfish', 'mutant', 'pike', 'leviathan'] as const;
const COLLECTION_PAGE_IDS = ['lake_basics', 'deepwater_odds', 'trophy_legends'] as const;

const clampInt = (value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
};

const todayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const weekKey = () => {
  const now = new Date();
  const mondayBasedDay = (now.getDay() + 6) % 7;
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - mondayBasedDay);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const sanitizeTaskStateMap = <T extends string>(value: unknown, ids: readonly T[]) => {
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
  })) as Record<T, { progress: number; claimed: boolean }>;
};

const sanitizeWheelPrize = (value: unknown): CubePrizeSnapshot | null => {
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

const sanitizeCollectionBook = (value: unknown): CollectionBookSnapshot | null => {
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
  })) as Record<string, CollectionSpeciesSnapshot>;
  const pagesSource = Array.isArray(source.pages) ? source.pages : [];
  const pages = COLLECTION_PAGE_IDS.map((pageId) => {
    const current = pagesSource.find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).pageId === pageId);
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

const sanitizeRodMastery = (value: unknown): RodMasterySnapshot | null => {
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
  ) as Record<string, RodMasteryTrackSnapshot>;

  return {
    totalMasteryPoints: Math.max(
      clampInt(source.totalMasteryPoints, 0, 0, 1_000_000),
      Object.values(tracks).reduce((sum, track) => sum + track.masteryPoints, 0),
    ),
    tracks,
  };
};

export const createDefaultGameProgress = (): GameProgressSnapshot => ({
  date: todayKey(),
  weekKey: weekKey(),
  tasks: sanitizeTaskStateMap({}, DAILY_TASK_IDS),
  specialTasks: sanitizeTaskStateMap({}, SPECIAL_TASK_IDS),
  weeklyMissions: sanitizeTaskStateMap({}, WEEKLY_MISSION_IDS),
  lastWeeklyCubeUnlockDate: null,
  collectionBook: null,
  rodMastery: null,
  wheelSpun: false,
  wheelPrize: null,
  dailyWheelRolls: 0,
  dailyRollRewardGranted: false,
  paidWheelRolls: 0,
  grillScore: 0,
  dishesToday: 0,
});

export const sanitizeGameProgress = (value: unknown): GameProgressSnapshot => {
  const source = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  const fallback = createDefaultGameProgress();
  const parsedWeekKey = typeof source.weekKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.weekKey)
    ? source.weekKey
    : fallback.weekKey;

  return {
    date: typeof source.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.date)
      ? source.date
      : fallback.date,
    weekKey: parsedWeekKey,
    tasks: sanitizeTaskStateMap(source.tasks, DAILY_TASK_IDS),
    specialTasks: sanitizeTaskStateMap(source.specialTasks, SPECIAL_TASK_IDS),
    weeklyMissions: parsedWeekKey === fallback.weekKey
      ? sanitizeTaskStateMap(source.weeklyMissions, WEEKLY_MISSION_IDS)
      : fallback.weeklyMissions,
    lastWeeklyCubeUnlockDate: parsedWeekKey === fallback.weekKey
      && typeof source.lastWeeklyCubeUnlockDate === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(source.lastWeeklyCubeUnlockDate)
      ? source.lastWeeklyCubeUnlockDate
      : null,
    collectionBook: sanitizeCollectionBook(source.collectionBook),
    rodMastery: sanitizeRodMastery(source.rodMastery),
    wheelSpun: Boolean(source.wheelSpun),
    wheelPrize: sanitizeWheelPrize(source.wheelPrize),
    dailyWheelRolls: clampInt(source.dailyWheelRolls, 0, 0, 99999),
    dailyRollRewardGranted: Boolean(source.dailyRollRewardGranted),
    paidWheelRolls: clampInt(source.paidWheelRolls, 0, 0, 99999),
    grillScore: clampInt(source.grillScore, 0, 0, 1_000_000_000),
    dishesToday: clampInt(source.dishesToday, 0, 0, 1_000_000),
  };
};
