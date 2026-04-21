import {
  DAILY_TASK_IDS,
  SPECIAL_TASK_IDS,
  type DailyTaskId,
  type SpecialTaskId,
} from './taskRegistry.ts';

export interface CubePrizeSnapshot {
  id: string;
  label: string;
  type: 'coins' | 'fish' | 'mon';
  coins?: number;
  fishId?: string;
  quantity?: number;
  mon?: number;
  secret?: boolean;
}

export interface GameProgressSnapshot {
  date: string;
  tasks: Record<DailyTaskId, { progress: number; claimed: boolean }>;
  specialTasks: Record<SpecialTaskId, { progress: number; claimed: boolean }>;
  wheelSpun: boolean;
  wheelPrize: CubePrizeSnapshot | null;
  dailyWheelRolls: number;
  dailyRollRewardGranted: boolean;
  paidWheelRolls: number;
  grillScore: number;
  dishesToday: number;
}

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
    secret: Boolean(prize.secret),
  };
};

export const createDefaultGameProgress = (): GameProgressSnapshot => ({
  date: todayKey(),
  tasks: sanitizeTaskStateMap({}, DAILY_TASK_IDS),
  specialTasks: sanitizeTaskStateMap({}, SPECIAL_TASK_IDS),
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

  return {
    date: typeof source.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.date)
      ? source.date
      : fallback.date,
    tasks: sanitizeTaskStateMap(source.tasks, DAILY_TASK_IDS),
    specialTasks: sanitizeTaskStateMap(source.specialTasks, SPECIAL_TASK_IDS),
    wheelSpun: Boolean(source.wheelSpun),
    wheelPrize: sanitizeWheelPrize(source.wheelPrize),
    dailyWheelRolls: clampInt(source.dailyWheelRolls, 0, 0, 99999),
    dailyRollRewardGranted: Boolean(source.dailyRollRewardGranted),
    paidWheelRolls: clampInt(source.paidWheelRolls, 0, 0, 99999),
    grillScore: clampInt(source.grillScore, 0, 0, 1_000_000_000),
    dishesToday: clampInt(source.dishesToday, 0, 0, 1_000_000),
  };
};
