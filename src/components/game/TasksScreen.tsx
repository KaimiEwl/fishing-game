import React from 'react';
import { Box, Check, Coins, Lock, Trophy, Worm } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DailyTaskProgress, SpecialTaskProgress, TaskId } from '@/types/game';
import CoinIcon from './CoinIcon';
import GameScreenShell from './GameScreenShell';
import { publicAsset } from '@/lib/assets';

interface TasksScreenProps {
  coins: number;
  dailyTasks: DailyTaskProgress[];
  specialTasks: SpecialTaskProgress[];
  dailyTaskClaimsMet: boolean;
  availableWheelRolls: number;
  onClaimTask: (id: TaskId) => void;
  onOpenWheel: () => void;
}

const TasksScreen: React.FC<TasksScreenProps> = ({
  coins,
  dailyTasks,
  specialTasks,
  dailyTaskClaimsMet,
  availableWheelRolls,
  onClaimTask,
  onOpenWheel,
}) => {
  const completedCount = dailyTasks.filter((task) => task.progress >= task.target).length;
  const claimedCount = dailyTasks.filter((task) => task.claimed).length;
  const renderTaskList = (tasks: Array<DailyTaskProgress | SpecialTaskProgress>) => (
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
              <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold shadow-sm">
                {task.rewardBait ? (
                  <>
                    <Worm className="h-4 w-4 text-lime-300" />
                    <span className="text-lime-200">{task.rewardBait} bait</span>
                  </>
                ) : (
                  <>
                    <CoinIcon size="md" />
                    <span className="text-amber-300">{task.rewardCoins}</span>
                  </>
                )}
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
                  {task.rewardBait ? <Worm className="mr-2 h-4 w-4" /> : <Coins className="mr-2 h-4 w-4" />}
                  Claim reward
                </>
              )}
            </Button>
          </article>
        );
      })}
    </div>
  );

  return (
    <GameScreenShell
      title="Daily Tasks"
      subtitle="Claim daily rewards, clear special objectives, and unlock 3 cube rolls."
      coins={coins}
      backgroundImage={publicAsset('assets/bg_tasks.jpg')}
      contentScrollable
    >
      <div className="grid gap-3 pb-3 lg:grid-cols-[1fr_0.72fr] lg:items-start">
        <Tabs defaultValue="daily" className="min-w-0">
          <TabsList className="grid w-full grid-cols-2 rounded-lg border border-cyan-300/15 bg-black/85 shadow-lg shadow-black/30">
            <TabsTrigger value="daily" className="rounded-lg text-zinc-200 data-[state=active]:border data-[state=active]:border-cyan-300/25 data-[state=active]:bg-zinc-950 data-[state=active]:text-cyan-50">Daily</TabsTrigger>
            <TabsTrigger value="special" className="rounded-lg text-zinc-200 data-[state=active]:border data-[state=active]:border-cyan-300/25 data-[state=active]:bg-zinc-950 data-[state=active]:text-cyan-50">Special</TabsTrigger>
          </TabsList>
          <TabsContent value="daily" className="mt-3">
            {renderTaskList(dailyTasks)}
          </TabsContent>
          <TabsContent value="special" className="mt-3">
            <div className="mb-3 rounded-xl border border-cyan-300/15 bg-black/60 p-4 text-sm text-white/70 shadow-lg shadow-black/20 backdrop-blur-md">
              Connect your wallet and invite a friend to unlock referral rewards, future MON features, and synced progress.
            </div>
            {renderTaskList(specialTasks)}
          </TabsContent>
        </Tabs>

        <aside className="rounded-xl border border-cyan-300/15 bg-black/60 p-5 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-5">
            <div>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-300/20 bg-zinc-950 text-cyan-100 shadow-lg shadow-black/30">
                <Trophy className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-white drop-shadow-md">Daily prize cube</h2>
              <p className="mt-2 text-base text-white/70 leading-relaxed">
                {claimedCount}/{dailyTasks.length} claimed rewards. {availableWheelRolls > 0 ? `${availableWheelRolls} cube rolls ready.` : dailyTaskClaimsMet ? 'Today\'s cube rolls are finished. Come back tomorrow.' : `Claim any 3 daily tasks to unlock cube rolls. ${completedCount}/${dailyTasks.length} are ready so far.`}
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
