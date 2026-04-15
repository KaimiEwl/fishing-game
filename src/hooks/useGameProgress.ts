import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DAILY_TASKS,
  FISH_DATA,
  WHEEL_PRIZES,
  type DailyTaskId,
  type DailyTaskProgress,
  type Fish,
  type WheelPrize,
} from '@/types/game';

type DailyTaskMap = Record<DailyTaskId, { progress: number; claimed: boolean }>;

interface GameProgressState {
  date: string;
  tasks: DailyTaskMap;
  wheelSpun: boolean;
  wheelPrize: WheelPrize | null;
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

const createInitialState = (): GameProgressState => ({
  date: todayKey(),
  tasks: createTasks(),
  wheelSpun: false,
  wheelPrize: null,
  grillScore: 0,
  dishesToday: 0,
});

const loadState = (): GameProgressState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as GameProgressState;
    if (parsed.date !== todayKey()) {
      return {
        ...createInitialState(),
        grillScore: Number(parsed.grillScore || 0),
      };
    }
    return {
      ...createInitialState(),
      ...parsed,
      tasks: {
        ...createTasks(),
        ...parsed.tasks,
      },
    };
  } catch {
    return createInitialState();
  }
};

const capProgress = (id: DailyTaskId, progress: number) => {
  const task = DAILY_TASKS.find((item) => item.id === id);
  return Math.min(task?.target ?? progress, progress);
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
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [id]: {
            ...current,
            progress: capProgress(id, current.progress + amount),
          },
        },
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
        grill_1: {
          ...prev.tasks.grill_1,
          progress: prev.tasks.grill_1.claimed
            ? prev.tasks.grill_1.progress
            : capProgress('grill_1', prev.tasks.grill_1.progress + 1),
        },
      },
    }));
  }, []);

  const dailyTasks = useMemo<DailyTaskProgress[]>(() => (
    DAILY_TASKS.map((task) => ({
      ...task,
      progress: state.tasks[task.id]?.progress ?? 0,
      claimed: state.tasks[task.id]?.claimed ?? false,
    }))
  ), [state.tasks]);

  const allTasksComplete = dailyTasks.every((task) => task.progress >= task.target);
  const allTasksClaimed = dailyTasks.every((task) => task.claimed);
  const wheelReady = allTasksClaimed && !state.wheelSpun;

  const claimTask = useCallback((id: DailyTaskId, onReward: (coins: number) => void) => {
    const task = DAILY_TASKS.find((item) => item.id === id);
    if (!task) return false;
    const current = state.tasks[id];
    if (!current || current.claimed || current.progress < task.target) return false;

    setState((prev) => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [id]: {
          ...prev.tasks[id],
          claimed: true,
        },
      },
    }));
    onReward(task.rewardCoins);
    return true;
  }, [state.tasks]);

  const spinWheel = useCallback((onReward: (coins: number) => void) => {
    if (!wheelReady) return null;

    const roll = Math.random();
    const prize = roll > 0.985
      ? WHEEL_PRIZES.find((item) => item.secret)!
      : WHEEL_PRIZES[Math.floor(Math.random() * (WHEEL_PRIZES.length - 1))];

    setState((prev) => ({
      ...prev,
      wheelSpun: true,
      wheelPrize: prize,
    }));
    onReward(prize.coins);
    return prize;
  }, [wheelReady]);

  return {
    dailyTasks,
    allTasksComplete,
    allTasksClaimed,
    wheelReady,
    wheelSpun: state.wheelSpun,
    wheelPrize: state.wheelPrize,
    grillScore: state.grillScore,
    dishesToday: state.dishesToday,
    recordFishCatch,
    recordGrillDish,
    claimTask,
    spinWheel,
  };
}
