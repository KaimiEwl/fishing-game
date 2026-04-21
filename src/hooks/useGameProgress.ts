import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  type WheelPrize,
} from '@/types/game';

type GameProgressState = GameProgressSnapshot;
type DailyTaskMap = GameProgressState['tasks'];
type SpecialTaskMap = GameProgressState['specialTasks'];

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

const createTasks = (): DailyTaskMap => ({
  check_in: { progress: 1, claimed: false },
  catch_10: { progress: 0, claimed: false },
  rare_1: { progress: 0, claimed: false },
  grill_1: { progress: 0, claimed: false },
  spend_1000: { progress: 0, claimed: false },
});

const createSpecialTasks = (): SpecialTaskMap => ({
  invite_friend: { progress: 0, claimed: false },
});

const createInitialState = (): GameProgressState => ({
  date: todayKey(),
  tasks: createTasks(),
  specialTasks: createSpecialTasks(),
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
}

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

const capProgress = (id: TaskId, progress: number) => {
  const task = getTaskDefinition(id);
  return Math.min(task?.target ?? progress, progress);
};

const getClaimedDailyCount = (tasks: DailyTaskMap) => (
  DAILY_TASKS.filter((task) => tasks[task.id]?.claimed).length
);

const applyDailyRollReward = (prev: GameProgressState, tasks: DailyTaskMap) => {
  if (prev.dailyRollRewardGranted || getClaimedDailyCount(tasks) < DAILY_TASK_CLAIMS_REQUIRED) {
    return {
      dailyWheelRolls: prev.dailyWheelRolls,
      dailyRollRewardGranted: prev.dailyRollRewardGranted,
    };
  }

  return {
    dailyWheelRolls: prev.dailyWheelRolls + DAILY_CUBE_ROLL_REWARD,
    dailyRollRewardGranted: true,
  };
};

const normalizeState = (parsed?: Partial<GameProgressState> | null): GameProgressState => {
  const baseState = createInitialState();
  if (!parsed) return baseState;

  const specialTasks = {
    ...createSpecialTasks(),
    ...(parsed.specialTasks ?? {}),
  };

  if (parsed.date !== todayKey()) {
    return {
      ...baseState,
      specialTasks,
      grillScore: Math.max(0, Number(parsed.grillScore || 0)),
      paidWheelRolls: Math.max(0, Number(parsed.paidWheelRolls || 0)),
    };
  }

  const tasks = {
    ...createTasks(),
    ...(parsed.tasks ?? {}),
  };
  const rewardState = applyDailyRollReward({
    ...baseState,
    ...parsed,
    tasks,
    specialTasks,
    wheelPrize: normalizeWheelPrize(parsed.wheelPrize as WheelPrize | null | undefined),
    paidWheelRolls: Math.max(0, Number(parsed.paidWheelRolls || 0)),
    dailyWheelRolls: Math.max(0, Number(parsed.dailyWheelRolls || 0)),
    dailyRollRewardGranted: Boolean(parsed.dailyRollRewardGranted),
  }, tasks);

  return {
    ...baseState,
    ...parsed,
    tasks,
    specialTasks,
    wheelPrize: normalizeWheelPrize(parsed.wheelPrize as WheelPrize | null | undefined),
    dailyWheelRolls: rewardState.dailyWheelRolls,
    dailyRollRewardGranted: rewardState.dailyRollRewardGranted,
    paidWheelRolls: Math.max(0, Number(parsed.paidWheelRolls || 0)),
    grillScore: Math.max(0, Number(parsed.grillScore || 0)),
    dishesToday: Math.max(0, Number(parsed.dishesToday || 0)),
  };
};

const mergeState = (serverState: GameProgressState, localState: GameProgressState): GameProgressState => {
  if (serverState.date !== localState.date) {
    const newerState = serverState.date >= localState.date ? serverState : localState;
    const olderState = newerState === serverState ? localState : serverState;
    return normalizeState({
      ...newerState,
      grillScore: Math.max(serverState.grillScore, localState.grillScore),
      paidWheelRolls: Math.max(serverState.paidWheelRolls, localState.paidWheelRolls),
      dailyWheelRolls: Math.max(serverState.dailyWheelRolls, localState.dailyWheelRolls),
      dailyRollRewardGranted: newerState.dailyRollRewardGranted || olderState.dailyRollRewardGranted,
      specialTasks: {
        ...olderState.specialTasks,
        ...newerState.specialTasks,
      },
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

export const pickWheelPrize = () => {
  const roll = Math.random();
  return roll > 0.985
    ? WHEEL_PRIZES.find((item) => item.secret)!
    : WHEEL_PRIZES[Math.floor(Math.random() * (WHEEL_PRIZES.length - 1))];
};

export function useGameProgress(options?: UseGameProgressOptions) {
  const savedProgress = options?.savedProgress;
  const onSave = options?.onSave;
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
  }, []);

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

  const recordFishCatch = useCallback((fish: Fish) => {
    updateTask('catch_10', 1);
    if (RARE_RANK.has(fish.rarity)) {
      updateTask('rare_1', 1);
    }
  }, [updateTask]);

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
    }));
  }, []);

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

  const syncReferralTask = useCallback((rewardedReferralCount: number) => {
    setState((prev) => {
      const current = prev.specialTasks.invite_friend;
      const nextProgress = rewardedReferralCount > 0 ? 1 : 0;

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

  const allTasksComplete = dailyTasks.every((task) => task.progress >= task.target);
  const allTasksClaimed = dailyTasks.every((task) => task.claimed);
  const claimedDailyCount = dailyTasks.filter((task) => task.claimed).length;
  const dailyTaskClaimsMet = claimedDailyCount >= DAILY_TASK_CLAIMS_REQUIRED;
  const wheelUnlocked = dailyTaskClaimsMet || state.dailyWheelRolls > 0 || state.paidWheelRolls > 0;
  const wheelReady = state.dailyWheelRolls > 0 || state.paidWheelRolls > 0;

  const claimTask = useCallback((id: TaskId, onReward: (reward: { coins?: number; bait?: number }) => void) => {
    const task = getTaskDefinition(id);
    if (!task) return false;
    let rewardGranted = false;

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

        return {
          ...prev,
          tasks,
          ...rewardState,
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
    recordCoinsSpent,
    syncReferralTask,
    claimTask,
    spinWheel,
    addPaidWheelRolls,
  };
}
