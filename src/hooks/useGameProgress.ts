import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CUBE_REBALANCE_ENABLED,
  WEEKLY_MISSION_CONFIG,
  WEEKLY_MISSIONS_ENABLED,
} from '@/lib/baitEconomy';
import { pushEconomyTelemetryEvent } from '@/lib/economyTelemetry';
import {
  DAILY_TASKS,
  FISH_DATA,
  SPECIAL_TASKS,
  WHEEL_PRIZES,
  type DailyTaskId,
  type DailyTaskProgress,
  type Fish,
  type GameProgressSnapshot,
  type SpecialTaskId,
  type SpecialTaskProgress,
  type TaskId,
  type WeeklyMissionId,
  type WeeklyMissionProgress,
  type WheelPrize,
} from '@/types/game';

type GameProgressState = GameProgressSnapshot;
type DailyTaskMap = GameProgressState['tasks'];
type SpecialTaskMap = GameProgressState['specialTasks'];
type WeeklyMissionMap = NonNullable<GameProgressState['weeklyMissions']>;

const STORAGE_KEY = 'monadfish_progress_v1';
const RARE_RANK = new Set(['rare', 'epic', 'legendary', 'mythical', 'secret']);
const DAILY_TASK_CLAIMS_REQUIRED = 3;
const DAILY_CUBE_ROLL_REWARD = 3;

const todayKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const currentWeekKey = () => {
  const now = new Date();
  const mondayBasedDay = (now.getDay() + 6) % 7;
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - mondayBasedDay);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const createTasks = (): DailyTaskMap => ({
  check_in: { progress: 1, claimed: false },
  catch_10: { progress: 0, claimed: false },
  rare_1: { progress: 0, claimed: false },
  grill_1: { progress: 0, claimed: false },
  spend_1000: { progress: 0, claimed: false },
});

const createSpecialTasks = (): SpecialTaskMap => ({
  wallet_check_in: { progress: 0, claimed: false },
  invite_friend: { progress: 0, claimed: false },
});

const createWeeklyMissions = (): WeeklyMissionMap => (
  Object.fromEntries(
    WEEKLY_MISSION_CONFIG.map((mission) => [
      mission.id as WeeklyMissionId,
      { progress: 0, claimed: false },
    ]),
  ) as WeeklyMissionMap
);

const createInitialState = (): GameProgressState => ({
  date: todayKey(),
  weekKey: currentWeekKey(),
  tasks: createTasks(),
  specialTasks: createSpecialTasks(),
  weeklyMissions: createWeeklyMissions(),
  lastWeeklyCubeUnlockDate: null,
  premiumSession: null,
  lastWalletCheckInTxHash: null,
  wheelSpun: false,
  wheelPrize: null,
  dailyWheelRolls: 0,
  dailyRollRewardGranted: false,
  paidWheelRolls: 0,
  grillScore: 0,
  dishesToday: 0,
});

interface UseGameProgressOptions {
  savedProgress?: GameProgressState | null;
  onSave?: (progress: GameProgressState) => void;
  weeklyMissionsEnabled?: boolean;
  cubeRebalanceEnabled?: boolean;
}

type RewardPayload = { coins?: number; bait?: number };
type WeeklyRewardPayload = RewardPayload & { cubeCharge?: number };

const normalizeWheelPrize = (prize: WheelPrize | null | undefined): WheelPrize | null => {
  if (!prize) return null;

  if (prize.type) return prize;

  return {
    ...prize,
    type: prize.fishId ? 'fish' : 'coins',
    quantity: prize.quantity ?? (prize.fishId ? 1 : undefined),
  };
};

const getTaskDefinition = (id: TaskId) => (
  DAILY_TASKS.find((item) => item.id === id) ?? SPECIAL_TASKS.find((item) => item.id === id)
);

const getWeeklyMissionDefinition = (id: WeeklyMissionId) => (
  WEEKLY_MISSION_CONFIG.find((item) => item.id === id)
);

const capProgress = (id: TaskId, progress: number) => {
  const task = getTaskDefinition(id);
  return Math.min(task?.target ?? progress, progress);
};

const capWeeklyProgress = (id: WeeklyMissionId, progress: number) => {
  const mission = getWeeklyMissionDefinition(id);
  return Math.min(mission?.target ?? progress, progress);
};

const getClaimedDailyCount = (tasks: DailyTaskMap) => (
  DAILY_TASKS.filter((task) => tasks[task.id]?.claimed).length
);

const normalizeDailyTasks = (value?: Partial<DailyTaskMap> | null): DailyTaskMap => (
  Object.fromEntries(
    DAILY_TASKS.map((task) => {
      const current = value?.[task.id];
      return [task.id, {
        progress: capProgress(task.id, Math.max(0, Number(current?.progress ?? 0))),
        claimed: Boolean(current?.claimed),
      }];
    }),
  ) as DailyTaskMap
);

const normalizeSpecialTasks = (value?: Partial<SpecialTaskMap> | null): SpecialTaskMap => (
  Object.fromEntries(
    SPECIAL_TASKS.map((task) => {
      const current = value?.[task.id];
      return [task.id, {
        progress: capProgress(task.id, Math.max(0, Number(current?.progress ?? 0))),
        claimed: Boolean(current?.claimed),
      }];
    }),
  ) as SpecialTaskMap
);

const normalizeWeeklyMissions = (value?: Partial<WeeklyMissionMap> | null): WeeklyMissionMap => (
  Object.fromEntries(
    WEEKLY_MISSION_CONFIG.map((mission) => {
      const current = value?.[mission.id as WeeklyMissionId];
      return [mission.id, {
        progress: capWeeklyProgress(mission.id as WeeklyMissionId, Math.max(0, Number(current?.progress ?? 0))),
        claimed: Boolean(current?.claimed),
      }];
    }),
  ) as WeeklyMissionMap
);

const applyDailyRollReward = (prev: GameProgressState, tasks: DailyTaskMap) => {
  if (prev.dailyRollRewardGranted || getClaimedDailyCount(tasks) < DAILY_TASK_CLAIMS_REQUIRED) {
    return {
      dailyWheelRolls: prev.dailyWheelRolls,
      dailyRollRewardGranted: prev.dailyRollRewardGranted,
      unlockedToday: false,
    };
  }

  return {
    dailyWheelRolls: prev.dailyWheelRolls + DAILY_CUBE_ROLL_REWARD,
    dailyRollRewardGranted: true,
    unlockedToday: true,
  };
};

const applyWeeklyCubeUnlockProgress = (
  prev: GameProgressState,
  unlockedToday: boolean,
  weeklyMissionsEnabled: boolean,
): Pick<GameProgressState, 'weeklyMissions' | 'lastWeeklyCubeUnlockDate'> => {
  if (!weeklyMissionsEnabled || !unlockedToday || prev.lastWeeklyCubeUnlockDate === prev.date) {
    return {
      weeklyMissions: prev.weeklyMissions ?? createWeeklyMissions(),
      lastWeeklyCubeUnlockDate: prev.lastWeeklyCubeUnlockDate ?? null,
    };
  }

  const current = prev.weeklyMissions?.cube_3_days ?? { progress: 0, claimed: false };

  return {
    weeklyMissions: {
      ...(prev.weeklyMissions ?? createWeeklyMissions()),
      cube_3_days: {
        ...current,
        progress: capWeeklyProgress('cube_3_days', current.progress + 1),
      },
    },
    lastWeeklyCubeUnlockDate: prev.date,
  };
};

const normalizeState = (parsed?: Partial<GameProgressState> | null): GameProgressState => {
  const baseState = createInitialState();
  if (!parsed) return baseState;

  const parsedWeekKey = parsed.weekKey && /^\d{4}-\d{2}-\d{2}$/.test(parsed.weekKey)
    ? parsed.weekKey
    : baseState.weekKey;
  const weeklyMissions = parsedWeekKey === baseState.weekKey
    ? normalizeWeeklyMissions(parsed.weeklyMissions ?? null)
    : createWeeklyMissions();
  const lastWeeklyCubeUnlockDate = parsedWeekKey === baseState.weekKey
    ? parsed.lastWeeklyCubeUnlockDate ?? null
    : null;

  if (parsed.date !== todayKey()) {
    return {
      ...baseState,
      weekKey: baseState.weekKey,
      weeklyMissions,
      lastWeeklyCubeUnlockDate,
      grillScore: Math.max(0, Number(parsed.grillScore || 0)),
      lastWalletCheckInTxHash: parsed.lastWalletCheckInTxHash ?? null,
      paidWheelRolls: Math.max(0, Number(parsed.paidWheelRolls || 0)),
      premiumSession: parsed.premiumSession ?? null,
    };
  }

  const tasks = normalizeDailyTasks(parsed.tasks ?? null);
  const specialTasks = normalizeSpecialTasks(parsed.specialTasks ?? null);
  const rewardState = applyDailyRollReward({
    ...baseState,
    ...parsed,
    weekKey: baseState.weekKey,
    tasks,
    specialTasks,
    weeklyMissions,
    lastWeeklyCubeUnlockDate,
    wheelPrize: normalizeWheelPrize(parsed.wheelPrize as WheelPrize | null | undefined),
    premiumSession: parsed.premiumSession ?? null,
    lastWalletCheckInTxHash: parsed.lastWalletCheckInTxHash ?? null,
    paidWheelRolls: Math.max(0, Number(parsed.paidWheelRolls || 0)),
    dailyWheelRolls: Math.max(0, Number(parsed.dailyWheelRolls || 0)),
    dailyRollRewardGranted: Boolean(parsed.dailyRollRewardGranted),
  }, tasks);

  return {
    ...baseState,
    ...parsed,
    weekKey: baseState.weekKey,
    tasks,
    specialTasks,
    weeklyMissions,
    lastWeeklyCubeUnlockDate,
    premiumSession: parsed.premiumSession ?? null,
    lastWalletCheckInTxHash: parsed.lastWalletCheckInTxHash ?? null,
    wheelPrize: normalizeWheelPrize(parsed.wheelPrize as WheelPrize | null | undefined),
    dailyWheelRolls: rewardState.dailyWheelRolls,
    dailyRollRewardGranted: rewardState.dailyRollRewardGranted,
    paidWheelRolls: Math.max(0, Number(parsed.paidWheelRolls || 0)),
    grillScore: Math.max(0, Number(parsed.grillScore || 0)),
    dishesToday: Math.max(0, Number(parsed.dishesToday || 0)),
  };
};

const mergeWeeklyState = (serverState: GameProgressState, localState: GameProgressState) => {
  const currentWeek = currentWeekKey();
  const serverWeek = serverState.weekKey ?? currentWeek;
  const localWeek = localState.weekKey ?? currentWeek;

  if (serverWeek !== localWeek) {
    const preferred = serverWeek >= localWeek ? serverState : localState;
    return {
      weekKey: preferred.weekKey ?? currentWeek,
      weeklyMissions: normalizeWeeklyMissions(preferred.weeklyMissions ?? null),
      lastWeeklyCubeUnlockDate: preferred.lastWeeklyCubeUnlockDate ?? null,
    };
  }

  const weeklyMissions = Object.fromEntries(
    WEEKLY_MISSION_CONFIG.map((mission) => {
      const id = mission.id as WeeklyMissionId;
      const serverMission = serverState.weeklyMissions?.[id];
      const localMission = localState.weeklyMissions?.[id];
      return [id, {
        progress: capWeeklyProgress(id, Math.max(serverMission?.progress ?? 0, localMission?.progress ?? 0)),
        claimed: Boolean(serverMission?.claimed || localMission?.claimed),
      }];
    }),
  ) as WeeklyMissionMap;

  return {
    weekKey: serverWeek,
    weeklyMissions,
    lastWeeklyCubeUnlockDate: [serverState.lastWeeklyCubeUnlockDate, localState.lastWeeklyCubeUnlockDate]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null,
  };
};

const mergeState = (serverState: GameProgressState, localState: GameProgressState): GameProgressState => {
  const mergedWeeklyState = mergeWeeklyState(serverState, localState);

  if (serverState.date !== localState.date) {
    const newerState = serverState.date >= localState.date ? serverState : localState;
    const olderState = newerState === serverState ? localState : serverState;
    return normalizeState({
      ...newerState,
      weekKey: mergedWeeklyState.weekKey,
      weeklyMissions: mergedWeeklyState.weeklyMissions,
      lastWeeklyCubeUnlockDate: mergedWeeklyState.lastWeeklyCubeUnlockDate,
      grillScore: Math.max(serverState.grillScore, localState.grillScore),
      paidWheelRolls: Math.max(serverState.paidWheelRolls, localState.paidWheelRolls),
      dailyWheelRolls: Math.max(serverState.dailyWheelRolls, localState.dailyWheelRolls),
      dailyRollRewardGranted: newerState.dailyRollRewardGranted || olderState.dailyRollRewardGranted,
      premiumSession: localState.premiumSession ?? serverState.premiumSession ?? null,
      lastWalletCheckInTxHash: localState.lastWalletCheckInTxHash ?? serverState.lastWalletCheckInTxHash ?? null,
    });
  }

  const tasks = Object.fromEntries(
    DAILY_TASKS.map((task) => {
      const serverTask = serverState.tasks[task.id];
      const localTask = localState.tasks[task.id];
      return [task.id, {
        progress: Math.max(serverTask?.progress ?? 0, localTask?.progress ?? 0),
        claimed: Boolean(serverTask?.claimed || localTask?.claimed),
      }];
    }),
  ) as DailyTaskMap;

  const specialTasks = Object.fromEntries(
    SPECIAL_TASKS.map((task) => {
      const serverTask = serverState.specialTasks[task.id];
      const localTask = localState.specialTasks[task.id];
      return [task.id, {
        progress: Math.max(serverTask?.progress ?? 0, localTask?.progress ?? 0),
        claimed: Boolean(serverTask?.claimed || localTask?.claimed),
      }];
    }),
  ) as SpecialTaskMap;

  return normalizeState({
    ...serverState,
    tasks,
    specialTasks,
    weekKey: mergedWeeklyState.weekKey,
    weeklyMissions: mergedWeeklyState.weeklyMissions,
    lastWeeklyCubeUnlockDate: mergedWeeklyState.lastWeeklyCubeUnlockDate,
    premiumSession: localState.premiumSession ?? serverState.premiumSession ?? null,
    lastWalletCheckInTxHash: localState.lastWalletCheckInTxHash ?? serverState.lastWalletCheckInTxHash ?? null,
    wheelSpun: serverState.wheelSpun || localState.wheelSpun,
    wheelPrize: localState.wheelPrize ?? serverState.wheelPrize,
    dailyWheelRolls: Math.max(serverState.dailyWheelRolls, localState.dailyWheelRolls),
    dailyRollRewardGranted: serverState.dailyRollRewardGranted || localState.dailyRollRewardGranted,
    paidWheelRolls: Math.max(serverState.paidWheelRolls, localState.paidWheelRolls),
    grillScore: Math.max(serverState.grillScore, localState.grillScore),
    dishesToday: Math.max(serverState.dishesToday, localState.dishesToday),
  });
};

const loadState = (): GameProgressState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return normalizeState(JSON.parse(raw) as Partial<GameProgressState>);
  } catch {
    return createInitialState();
  }
};

export const pickWheelPrize = (cubeRebalanceEnabled = CUBE_REBALANCE_ENABLED) => {
  const secretPrizes = WHEEL_PRIZES.filter((item) => item.secret);
  const standardPrizes = WHEEL_PRIZES.filter((item) => !item.secret);

  if (secretPrizes.length > 0 && (cubeRebalanceEnabled || Math.random() > 0.985)) {
    return secretPrizes[Math.floor(Math.random() * secretPrizes.length)];
  }

  return standardPrizes[Math.floor(Math.random() * standardPrizes.length)];
};

export function useGameProgress(options?: UseGameProgressOptions) {
  const savedProgress = options?.savedProgress;
  const onSave = options?.onSave;
  const weeklyMissionsEnabled = options?.weeklyMissionsEnabled ?? WEEKLY_MISSIONS_ENABLED;
  const cubeRebalanceEnabled = options?.cubeRebalanceEnabled ?? CUBE_REBALANCE_ENABLED;
  const [state, setState] = useState<GameProgressState>(() => loadState());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (savedProgress) {
      setState((prev) => mergeState(
        normalizeState(savedProgress),
        normalizeState(prev),
      ));
    }
  }, [savedProgress]);

  useEffect(() => {
    initializedRef.current = true;
  }, [weeklyMissionsEnabled]);

  useEffect(() => {
    if (!initializedRef.current || !onSave) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onSave(state);
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [onSave, state]);

  const updateTask = useCallback((id: DailyTaskId, amount: number) => {
    setState((prev) => {
      const current = prev.tasks[id];
      if (!current || current.claimed) return prev;

      const tasks = {
        ...prev.tasks,
        [id]: {
          ...current,
          progress: capProgress(id, current.progress + amount),
        },
      };

      return {
        ...prev,
        tasks,
      };
    });
  }, []);

  const updateWeeklyMission = useCallback((id: WeeklyMissionId, amount: number) => {
    if (!weeklyMissionsEnabled || amount <= 0) return;
    let nextProgress: number | null = null;

    setState((prev) => {
      const current = prev.weeklyMissions?.[id];
      if (!current || current.claimed) return prev;

      nextProgress = capWeeklyProgress(id, current.progress + amount);

      return {
        ...prev,
        weeklyMissions: {
          ...(prev.weeklyMissions ?? createWeeklyMissions()),
          [id]: {
            ...current,
            progress: nextProgress,
          },
        },
      };
    });

    if (nextProgress != null) {
      pushEconomyTelemetryEvent('weekly_mission_progressed', {
        missionId: id,
        progress: nextProgress,
      });
    }
  }, [weeklyMissionsEnabled]);

  const recordFishCatch = useCallback((fish: Fish) => {
    updateTask('catch_10', 1);
    updateWeeklyMission('catch_60_fish', 1);
    if (RARE_RANK.has(fish.rarity)) {
      updateTask('rare_1', 1);
      updateWeeklyMission('catch_6_rare', 1);
    }
  }, [updateTask, updateWeeklyMission]);

  const recordGrillDish = useCallback((score: number) => {
    setState((prev) => ({
      ...prev,
      grillScore: prev.grillScore + score,
      dishesToday: prev.dishesToday + 1,
      tasks: {
        ...prev.tasks,
        grill_1: prev.tasks.grill_1.claimed
          ? prev.tasks.grill_1
          : {
            ...prev.tasks.grill_1,
            progress: capProgress('grill_1', prev.tasks.grill_1.progress + 1),
          },
      },
      weeklyMissions: !weeklyMissionsEnabled
        ? prev.weeklyMissions
        : {
          ...(prev.weeklyMissions ?? createWeeklyMissions()),
          cook_5_dishes: {
            ...(prev.weeklyMissions?.cook_5_dishes ?? { progress: 0, claimed: false }),
            progress: capWeeklyProgress('cook_5_dishes', (prev.weeklyMissions?.cook_5_dishes?.progress ?? 0) + 1),
          },
        },
    }));
  }, [weeklyMissionsEnabled]);

  const recordDishSold = useCallback(() => {
    updateWeeklyMission('sell_3_dishes', 1);
  }, [updateWeeklyMission]);

  const recordPremiumSessionCompleted = useCallback(() => {
    pushEconomyTelemetryEvent('premium_session_completed', {
      weekKey: state.weekKey ?? currentWeekKey(),
    });
    updateWeeklyMission('complete_1_premium_session', 1);
  }, [state.weekKey, updateWeeklyMission]);

  const recordCoinsSpent = useCallback((amount: number) => {
    if (amount <= 0) return;

    setState((prev) => {
      const current = prev.tasks.spend_1000;
      if (!current || current.claimed) return prev;

      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          spend_1000: {
            ...current,
            progress: capProgress('spend_1000', current.progress + amount),
          },
        },
      };
    });
  }, []);

  const syncReferralTask = useCallback((todayReferralAttachCount: number) => {
    setState((prev) => {
      const current = prev.specialTasks.invite_friend;
      const nextProgress = todayReferralAttachCount > 0 ? 1 : 0;

      if (!current || current.progress === nextProgress) {
        return prev;
      }

      return {
        ...prev,
        specialTasks: {
          ...prev.specialTasks,
          invite_friend: {
            ...current,
            progress: nextProgress,
          },
        },
      };
    });
  }, []);

  const syncWalletCheckInTask = useCallback((checkedInToday: boolean, txHash?: string | null) => {
    setState((prev) => {
      const current = prev.specialTasks.wallet_check_in;
      const nextProgress = checkedInToday ? 1 : 0;
      const nextTxHash = txHash ?? null;
      const txChanged = checkedInToday && Boolean(nextTxHash) && nextTxHash !== prev.lastWalletCheckInTxHash;

      if (!current) {
        return prev;
      }

      if (current.progress === nextProgress && !txChanged) {
        return prev;
      }

      return {
        ...prev,
        lastWalletCheckInTxHash: txChanged ? nextTxHash : (checkedInToday ? prev.lastWalletCheckInTxHash : null),
        specialTasks: {
          ...prev.specialTasks,
          wallet_check_in: {
            ...current,
            progress: nextProgress,
            claimed: checkedInToday && txChanged ? false : (nextProgress === 0 ? false : current.claimed),
          },
        },
      };
    });
  }, []);

  const dailyTasks = useMemo<DailyTaskProgress[]>(() => (
    DAILY_TASKS.map((task) => ({
      ...task,
      progress: state.tasks[task.id]?.progress ?? 0,
      claimed: state.tasks[task.id]?.claimed ?? false,
    }))
  ), [state.tasks]);

  const specialTasks = useMemo<SpecialTaskProgress[]>(() => (
    SPECIAL_TASKS.map((task) => ({
      ...task,
      progress: state.specialTasks[task.id]?.progress ?? 0,
      claimed: state.specialTasks[task.id]?.claimed ?? false,
    }))
  ), [state.specialTasks]);

  const weeklyMissions = useMemo<WeeklyMissionProgress[]>(() => (
    WEEKLY_MISSION_CONFIG.map((mission) => ({
      ...mission,
      id: mission.id as WeeklyMissionId,
      progress: state.weeklyMissions?.[mission.id as WeeklyMissionId]?.progress ?? 0,
      claimed: state.weeklyMissions?.[mission.id as WeeklyMissionId]?.claimed ?? false,
    }))
  ), [state.weeklyMissions]);

  const allTasksComplete = dailyTasks.every((task) => task.progress >= task.target);
  const allTasksClaimed = dailyTasks.every((task) => task.claimed);
  const claimedDailyCount = dailyTasks.filter((task) => task.claimed).length;
  const dailyTaskClaimsMet = claimedDailyCount >= DAILY_TASK_CLAIMS_REQUIRED;
  const wheelUnlocked = dailyTaskClaimsMet || state.dailyWheelRolls > 0 || state.paidWheelRolls > 0;
  const wheelReady = state.dailyWheelRolls > 0 || state.paidWheelRolls > 0;

  const claimTask = useCallback((id: TaskId, onReward: (reward: RewardPayload) => void) => {
    const task = getTaskDefinition(id);
    if (!task) return false;
    let rewardGranted = false;
    let cubeUnlockProgressed = false;

    setState((prev) => {
      const current = id in prev.tasks
        ? prev.tasks[id as DailyTaskId]
        : prev.specialTasks[id as SpecialTaskId];

      if (!current || current.claimed || current.progress < task.target) {
        return prev;
      }

      rewardGranted = true;

      if (id in prev.tasks) {
        const tasks = {
          ...prev.tasks,
          [id]: {
            ...prev.tasks[id as DailyTaskId],
            claimed: true,
          },
        };
        const rewardState = applyDailyRollReward(prev, tasks);
        const weeklyCubeState = applyWeeklyCubeUnlockProgress(prev, rewardState.unlockedToday, weeklyMissionsEnabled);
        cubeUnlockProgressed = rewardState.unlockedToday && weeklyCubeState.lastWeeklyCubeUnlockDate === prev.date;

        return {
          ...prev,
          tasks,
          dailyWheelRolls: rewardState.dailyWheelRolls,
          dailyRollRewardGranted: rewardState.dailyRollRewardGranted,
          weeklyMissions: weeklyCubeState.weeklyMissions,
          lastWeeklyCubeUnlockDate: weeklyCubeState.lastWeeklyCubeUnlockDate,
        };
      }

      return {
        ...prev,
        specialTasks: {
          ...prev.specialTasks,
          [id]: {
            ...prev.specialTasks[id as SpecialTaskId],
            claimed: true,
          },
        },
      };
    });

    if (!rewardGranted) return false;

    onReward({
      coins: task.rewardCoins,
      bait: task.rewardBait,
    });

    if (cubeUnlockProgressed) {
      pushEconomyTelemetryEvent('cube_daily_unlock_progressed', {
        date: todayKey(),
      });
    }
    return true;
  }, [weeklyMissionsEnabled]);

  const claimWeeklyMission = useCallback((id: WeeklyMissionId, onReward: (reward: WeeklyRewardPayload) => void) => {
    const mission = getWeeklyMissionDefinition(id);
    if (!mission) return false;
    let rewardGranted = false;

    setState((prev) => {
      const current = prev.weeklyMissions?.[id];
      if (!current || current.claimed || current.progress < mission.target) {
        return prev;
      }

      rewardGranted = true;
      return {
        ...prev,
        dailyWheelRolls: prev.dailyWheelRolls + (mission.rewardCubeCharge ?? 0),
        weeklyMissions: {
          ...(prev.weeklyMissions ?? createWeeklyMissions()),
          [id]: {
            ...current,
            claimed: true,
          },
        },
      };
    });

    if (!rewardGranted) return false;

    onReward({
      coins: mission.rewardCoins,
      bait: mission.rewardBait,
      cubeCharge: mission.rewardCubeCharge,
    });
    pushEconomyTelemetryEvent('weekly_mission_claimed', {
      missionId: id,
      rewardCoins: mission.rewardCoins ?? 0,
      rewardBait: mission.rewardBait ?? 0,
      rewardCubeCharge: mission.rewardCubeCharge ?? 0,
    });
    return true;
  }, []);

  const spinWheel = useCallback((onReward: (prize: WheelPrize) => void, selectedPrize?: WheelPrize) => {
    let awardedPrize: WheelPrize | null = null;

    setState((prev) => {
      const dailyReady = prev.dailyWheelRolls > 0;
      const paidReady = prev.paidWheelRolls > 0;

      if (!dailyReady && !paidReady) {
        return prev;
      }

      const prize = selectedPrize ?? pickWheelPrize();
      awardedPrize = prize;

      return {
        ...prev,
        wheelSpun: prev.wheelSpun || dailyReady,
        wheelPrize: prize,
        dailyWheelRolls: dailyReady ? Math.max(0, prev.dailyWheelRolls - 1) : prev.dailyWheelRolls,
        paidWheelRolls: dailyReady ? prev.paidWheelRolls : Math.max(0, prev.paidWheelRolls - 1),
      };
    });

    if (!awardedPrize) return null;

    onReward(awardedPrize);
    return awardedPrize;
  }, []);

  const addPaidWheelRolls = useCallback((amount: number) => {
    if (amount <= 0) return;

    setState((prev) => ({
      ...prev,
      paidWheelRolls: prev.paidWheelRolls + amount,
    }));
  }, []);

  return {
    dailyTasks,
    specialTasks,
    weeklyMissions,
    allTasksComplete,
    allTasksClaimed,
    claimedDailyCount,
    dailyTaskClaimsMet,
    wheelUnlocked,
    wheelReady,
    wheelSpun: state.wheelSpun,
    wheelPrize: state.wheelPrize,
    dailyWheelRolls: state.dailyWheelRolls,
    availableWheelRolls: state.dailyWheelRolls + state.paidWheelRolls,
    paidWheelRolls: state.paidWheelRolls,
    grillScore: state.grillScore,
    dishesToday: state.dishesToday,
    recordFishCatch,
    recordGrillDish,
    recordDishSold,
    recordPremiumSessionCompleted,
    recordCoinsSpent,
    syncReferralTask,
    syncWalletCheckInTask,
    claimTask,
    claimWeeklyMission,
    spinWheel,
    addPaidWheelRolls,
  };
}
