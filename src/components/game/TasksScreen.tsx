import React from 'react';
import { Box, Check, Coins, Lock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DailyTaskId, DailyTaskProgress } from '@/types/game';
import CoinIcon from './CoinIcon';
import GameScreenShell from './GameScreenShell';
import { publicAsset } from '@/lib/assets';

interface TasksScreenProps {
  coins: number;
  tasks: DailyTaskProgress[];
  allTasksComplete: boolean;
  availableWheelRolls: number;
  onClaimTask: (id: DailyTaskId) => void;
  onOpenWheel: () => void;
}

const TasksScreen: React.FC<TasksScreenProps> = ({
  coins,
  tasks,
  allTasksComplete,
  availableWheelRolls,
  onClaimTask,
  onOpenWheel,
}) => {
  const completedCount = tasks.filter((task) => task.progress >= task.target).length;

  return (
    <GameScreenShell
      title="Daily Tasks"
      subtitle="Finish today's list, claim coins, and earn 3 cube rolls."
      coins={coins}
      backgroundImage={publicAsset('assets/bg_tasks.jpg')}
      contentScrollable
    >
      <div className="grid gap-3 pb-3 lg:grid-cols-[1fr_0.72fr] lg:items-start">
        <div className="grid gap-3">
          {tasks.map((task) => {
            const complete = task.progress >= task.target;
            const progress = Math.min(100, (task.progress / task.target) * 100);

            return (
              <article key={task.id} className="rounded-xl border border-cyan-300/15 bg-black/60 p-4 shadow-lg shadow-black/20 backdrop-blur-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-white drop-shadow-sm">{task.title}</h2>
                    <p className="mt-1 text-sm text-white/70">{task.description}</p>
                  </div>
                  <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-400/20 border border-amber-400/30 px-3 py-1.5 text-sm font-bold text-amber-300 shadow-sm">
            <CoinIcon size="md" />
                    {task.rewardCoins}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-white/60">
                    <span>{task.progress}/{task.target}</span>
                    <span>{complete ? 'Ready' : 'In progress'}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-zinc-800">
                    <div
                      className="h-full rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.35)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={!complete || task.claimed}
                  onClick={() => onClaimTask(task.id)}
                  className="mt-4 h-12 w-full rounded-xl border border-cyan-300/25 bg-zinc-950 text-base font-bold text-cyan-100 shadow-lg shadow-black/30 transition-all hover:bg-black disabled:border-zinc-800 disabled:bg-zinc-950 disabled:text-zinc-600 disabled:shadow-none"
                >
                  {task.claimed ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Claimed
                    </>
                  ) : (
                    <>
                      <Coins className="mr-2 h-4 w-4" />
                      Claim reward
                    </>
                  )}
                </Button>
              </article>
            );
          })}
        </div>

        <aside className="rounded-xl border border-cyan-300/15 bg-black/60 p-5 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-5">
            <div>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-300/20 bg-zinc-950 text-cyan-100 shadow-lg shadow-black/30">
                <Trophy className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-white drop-shadow-md">Daily prize cube</h2>
              <p className="mt-2 text-base text-white/70 leading-relaxed">
                {completedCount}/{tasks.length} tasks complete. {availableWheelRolls > 0 ? `${availableWheelRolls} cube rolls ready.` : allTasksComplete ? 'Today\'s cube rolls are finished. Come back tomorrow.' : 'Complete all tasks to earn 3 cube rolls.'}
              </p>
            </div>

            <Button
              type="button"
              disabled={availableWheelRolls <= 0}
              onClick={onOpenWheel}
              className="h-14 rounded-xl border border-cyan-300/25 bg-zinc-950 text-lg font-bold text-cyan-100 shadow-lg shadow-black/30 transition-all hover:bg-black hover:shadow-xl disabled:border-zinc-800 disabled:bg-zinc-950 disabled:text-zinc-600 disabled:shadow-none"
            >
              {availableWheelRolls > 0 ? (
                <>
                  <Box className="mr-2 h-5 w-5" />
                  Open cube
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-5 w-5" />
                  Locked
                </>
              )}
            </Button>
          </div>
        </aside>
      </div>
    </GameScreenShell>
  );
};

export default TasksScreen;
