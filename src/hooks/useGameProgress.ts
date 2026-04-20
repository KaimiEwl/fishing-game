import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DAILY_TASKS,
  FISH_DATA,
  SPECIAL_TASKS,
  WHEEL_PRIZES,
  type DailyTaskId,
  type DailyTaskProgress,
  type Fish,
  type SpecialTaskId,
  type SpecialTaskProgress,
  type TaskId,
  type WheelPrize,
} from '@/types/game';

type DailyTaskMap = Record<DailyTaskId, { progress: number; claimed: boolean }>;
type SpecialTaskMap = Record<SpecialTaskId, { progress: number; claimed: boolean }>;

interface GameProgressState {
  date: string;
  tasks: DailyTaskMap;
  specialTasks: SpecialTaskMap;
  wheelSpun: boolean;
  wheelPrize: WheelPrize | null;
  dailyWheelRolls: number;
  dailyRollRewardGranted: boolean;
  paidWheelRolls: number;
  grillScore: number;
  dishesToday: number;
}

const STORAGE_KEY = 'monadfish_progress_v1';
const RARE_RANK = new Set(['rare', 'epic', 'legendary', 'mythical', 'secret']);

const todayKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const createTasks = (): DailyTaskMap => ({
  catch_10: { progress: 0, claimed: false },
  rare_1: { progress: 0, claimed: false },
  grill_1: { progress: 0, claimed: false },
});

const createSpecialTasks = (): SpecialTaskMap => ({
  earn_1000: { progress: 0, claimed: false },
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

const areAllTasksComplete = (tasks: DailyTaskMap) => (
  DAILY_TASKS.every((task) => (tasks[task.id]?.progress ?? 0) >= task.target)
);

const normalizeWheelPrize = (prize: WheelPrize | null | undefined): WheelPrize | null => {
  if (!prize) return null;

  if (prize.type) return prize;

  return {
    ...prize,
    type: prize.fishId ? 'fish' : 'coins',
    quantity: prize.quantity ?? (prize.fishId ? 1 : undefined),
  };
};

const loadState = (): GameProgressState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as GameProgressState;
    if (parsed.date !== todayKey()) {
      return {
        ...createInitialState(),
        grillScore: Number(parsed.grillScore || 0),
        paidWheelRolls: Math.max(0, Number(parsed.paidWheelRolls || 0)),
      };
    }
    const tasks = {
      ...createTasks(),
      ...parsed.tasks,
    };
    const specialTasks = {
      ...createSpecialTasks(),
      ...parsed.specialTasks,
    };
    const rewardState = applyDailyRollReward({
      ...createInitialState(),
      ...parsed,
      tasks,
      specialTasks,
      wheelPrize: normalizeWheelPrize(parsed.wheelPrize),
      paidWheelRolls: Math.max(0, Number(parsed.paidWheelRolls || 0)),
      dailyWheelRolls: Math.max(0, Number(parsed.dailyWheelRolls || 0)),
      dailyRollRewardGranted: Boolean(parsed.dailyRollRewardGranted),
    }, tasks);

    return {
      ...createInitialState(),
      ...parsed,
      wheelPrize: normalizeWheelPrize(parsed.wheelPrize),
      tasks,
      specialTasks,
      dailyWheelRolls: rewardState.dailyWheelRolls,
      dailyRollRewardGranted: rewardState.dailyRollRewardGranted,
      paidWheelRolls: Math.max(0, Number(parsed.paidWheelRolls || 0)),
    };
  } catch {
    return createInitialState();
  }
};

const getTaskDefinition = (id: TaskId) => {
  return DAILY_TASKS.find((item) => item.id === id) ?? SPECIAL_TASKS.find((item) => item.id === id);
};

const capProgress = (id: TaskId, progress: number) => {
  const task = getTaskDefinition(id);
  return Math.min(task?.target ?? progress, progress);
};

const applyDailyRollReward = (prev: GameProgressState, tasks: DailyTaskMap) => {
  if (prev.dailyRollRewardGranted || !areAllTasksComplete(tasks)) {
    return {
      dailyWheelRolls: prev.dailyWheelRolls,
      dailyRollRewardGranted: prev.dailyRollRewardGranted,
    };
  }

  return {
    dailyWheelRolls: prev.dailyWheelRolls + 3,
    dailyRollRewardGranted: true,
  };
};

export const pickWheelPrize = () => {
  const roll = Math.random();
  return roll > 0.985
    ? WHEEL_PRIZES.find((item) => item.secret)!
    : WHEEL_PRIZES[Math.floor(Math.random() * (WHEEL_PRIZES.length - 1))];
};

export function useGameProgress() {
  const [state, setState] = useState<GameProgressState>(() => loadState());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

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
      const rewardState = applyDailyRollReward(prev, tasks);

      return {
        ...prev,
        tasks,
        ...rewardState,
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
    setState((prev) => {
      const tasks = {
        ...prev.tasks,
        grill_1: {
          ...prev.tasks.grill_1,
          progress: prev.tasks.grill_1.claimed
            ? prev.tasks.grill_1.progress
            : capProgress('grill_1', prev.tasks.grill_1.progress + 1),
        },
      };
      const rewardState = applyDailyRollReward(prev, tasks);

      return {
        ...prev,
        grillScore: prev.grillScore + score,
        dishesToday: prev.dishesToday + 1,
        tasks,
        ...rewardState,
      };
    });
  }, []);

  const recordCoinsEarned = useCallback((amount: number) => {
    if (amount <= 0) return;

    setState((prev) => {
      const current = prev.specialTasks.earn_1000;
      if (!current || current.claimed) return prev;

      return {
        ...prev,
        specialTasks: {
          ...prev.specialTasks,
          earn_1000: {
            ...current,
            progress: capProgress('earn_1000', current.progress + amount),
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
  const wheelUnlocked = allTasksComplete || state.dailyWheelRolls > 0 || state.paidWheelRolls > 0;
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
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [id]: {
              ...prev.tasks[id as DailyTaskId],
              claimed: true,
            },
          },
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
    recordCoinsEarned,
    claimTask,
    spinWheel,
    addPaidWheelRolls,
  };
}
