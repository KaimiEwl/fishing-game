import React from 'react';
import { Check, Coins, Flame, Lock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { DailyTaskId, DailyTaskProgress } from '@/types/game';
import CoinIcon from './CoinIcon';
import GameScreenShell from './GameScreenShell';
import { publicAsset } from '@/lib/assets';

interface TasksScreenProps {
  coins: number;
  tasks: DailyTaskProgress[];
  allTasksComplete: boolean;
  wheelReady: boolean;
  onClaimTask: (id: DailyTaskId) => void;
  onOpenWheel: () => void;
}

const TasksScreen: React.FC<TasksScreenProps> = ({
  coins,
  tasks,
  allTasksComplete,
  wheelReady,
  onClaimTask,
  onOpenWheel,
}) => {
  const completedCount = tasks.filter((task) => task.progress >= task.target).length;

  return (
    <GameScreenShell
      title="Daily Tasks"
      subtitle="Finish today's list, claim coins, then unlock the wheel."
      coins={coins}
      backgroundImage={publicAsset('assets/bg_tasks.jpg')}
    >
      <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[1fr_0.72fr]">
        <div className="min-h-0 overflow-y-auto pr-1">
          <div className="grid gap-3">
            {tasks.map((task) => {
              const complete = task.progress >= task.target;
              const progress = Math.min(100, (task.progress / task.target) * 100);

              return (
                <article key={task.id} className="rounded-xl border border-white/10 bg-black/35 p-4 backdrop-blur-md shadow-lg shadow-black/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-white drop-shadow-sm">{task.title}</h2>
                      <p className="mt-1 text-sm text-white/70">{task.description}</p>
                    </div>
                    <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-400/20 border border-amber-400/30 px-3 py-1.5 text-sm font-bold text-amber-300 shadow-sm">
                      <CoinIcon size={16} />
                      {task.rewardCoins}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-white/60">
                      <span>{task.progress}/{task.target}</span>
                      <span>{complete ? 'Ready' : 'In progress'}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <Button
                    type="button"
                    disabled={!complete || task.claimed}
                    onClick={() => onClaimTask(task.id)}
                    className="mt-4 h-12 w-full rounded-xl bg-violet-600 font-bold text-base text-white shadow-lg shadow-violet-500/20 hover:bg-violet-500 disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none transition-all"
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
        </div>

        <aside className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-5 backdrop-blur-md shadow-xl">
          <div className="flex h-full flex-col justify-between gap-5">
            <div>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-500/30">
                <Trophy className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-white drop-shadow-md">Daily wheel</h2>
              <p className="mt-2 text-base text-white/70 leading-relaxed">
                {completedCount}/{tasks.length} tasks complete. Complete all tasks to unlock today's spin.
              </p>
            </div>

            <Button
              type="button"
              disabled={!wheelReady}
              onClick={onOpenWheel}
              className="h-14 rounded-xl font-bold text-lg bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/30 hover:shadow-xl hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 disabled:from-white/10 disabled:to-white/10 disabled:text-white/40 disabled:shadow-none transition-all"
            >
              {allTasksComplete ? (
                <>
                  <Flame className="mr-2 h-5 w-5" />
                  Open wheel
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
