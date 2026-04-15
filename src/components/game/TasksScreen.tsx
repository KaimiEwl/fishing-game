import React from 'react';
import { Check, Coins, Flame, Lock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { DailyTaskId, DailyTaskProgress } from '@/types/game';
import CoinIcon from './CoinIcon';
import GameScreenShell from './GameScreenShell';

interface TasksScreenProps {
  coins: number;
  tasks: DailyTaskProgress[];
  allTasksClaimed: boolean;
  wheelReady: boolean;
  onClaimTask: (id: DailyTaskId) => void;
  onOpenWheel: () => void;
}

const TasksScreen: React.FC<TasksScreenProps> = ({
  coins,
  tasks,
  allTasksClaimed,
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
    >
      <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[1fr_0.72fr]">
        <div className="min-h-0 overflow-y-auto pr-1">
          <div className="grid gap-3">
            {tasks.map((task) => {
              const complete = task.progress >= task.target;
              const progress = Math.min(100, (task.progress / task.target) * 100);

              return (
                <article key={task.id} className="rounded-lg border border-white/10 bg-black/35 p-4 backdrop-blur-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-bold">{task.title}</h2>
                      <p className="mt-1 text-sm text-white/60">{task.description}</p>
                    </div>
                    <div className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-400/15 px-2 py-1 text-sm font-bold text-amber-100">
                      <CoinIcon size={14} />
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
                    className="mt-4 h-10 w-full rounded-lg bg-violet-500 text-white hover:bg-violet-400 disabled:bg-white/10 disabled:text-white/35"
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

        <aside className="rounded-lg border border-violet-300/20 bg-violet-500/10 p-4 backdrop-blur-md">
          <div className="flex h-full flex-col justify-between gap-5">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500 text-white">
                <Trophy className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-black">Daily wheel</h2>
              <p className="mt-2 text-sm text-white/65">
                {completedCount}/{tasks.length} tasks complete. Claim every reward to unlock today's spin.
              </p>
            </div>

            <Button
              type="button"
              disabled={!wheelReady}
              onClick={onOpenWheel}
              className="h-12 rounded-lg bg-amber-400 text-black hover:bg-amber-300 disabled:bg-white/10 disabled:text-white/35"
            >
              {allTasksClaimed ? (
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
