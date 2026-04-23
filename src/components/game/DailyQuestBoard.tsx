import React from 'react';
import { Check, Coins, Lock, Trophy, Worm } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DailyTaskProgress, TaskId } from '@/types/game';
import { publicAsset } from '@/lib/assets';
import CoinIcon from './CoinIcon';

interface DailyQuestBoardProps {
  tasks: DailyTaskProgress[];
  claimedCount: number;
  dailyTaskClaimsMet: boolean;
  availableWheelRolls: number;
  onClaimTask: (id: TaskId) => void;
  onOpenWheel: () => void;
}

const getTaskStatusLabel = (task: DailyTaskProgress) => {
  if (task.claimed) return 'Claimed';
  if (task.progress >= task.target) return 'Ready';
  if (task.progress > 0) return 'In progress';
  return 'Not started';
};

const DailyQuestBoard: React.FC<DailyQuestBoardProps> = ({
  tasks,
  claimedCount,
  dailyTaskClaimsMet,
  availableWheelRolls,
  onClaimTask,
  onOpenWheel,
}) => {
  return (
    <div className="mx-auto w-full max-w-[1180px] pb-4">
      <div className="relative overflow-hidden rounded-[28px] border border-[#6f4928]/80 shadow-[0_22px_60px_rgba(0,0,0,0.55)]" style={{ aspectRatio: '3 / 2' }}>
        <img
          src={publicAsset('assets/daily_quests_board_reference.png')}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,4,2,0.18)_0%,rgba(6,4,2,0.08)_24%,rgba(6,4,2,0.14)_100%)]" />

        <div className="absolute left-[14.8%] right-[14.8%] top-[17.2%] bottom-[14.8%]">
          <div className="h-full overflow-y-auto pr-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
              {tasks.map((task) => {
                const complete = task.progress >= task.target;
                const statusLabel = getTaskStatusLabel(task);
                const progress = Math.min(100, (task.progress / task.target) * 100);
                const baitReward = task.rewardBait ?? 0;

                return (
                  <article
                    key={task.id}
                    className="group relative min-h-[14.25rem] rounded-[1.7rem] border border-[#725130] bg-[linear-gradient(180deg,rgba(38,25,16,0.95)_0%,rgba(31,21,14,0.92)_100%)] p-4 text-[#f0d09b] shadow-[inset_0_0_0_1px_rgba(255,215,150,0.06),0_12px_24px_rgba(0,0,0,0.34)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#9d7141] hover:shadow-[inset_0_0_0_1px_rgba(255,215,150,0.1),0_16px_26px_rgba(0,0,0,0.38)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="pr-2 text-[1.05rem] font-black uppercase tracking-[0.05em] text-[#f3c777] drop-shadow-[0_1px_0_rgba(0,0,0,0.6)] sm:text-[1.2rem]">
                          {task.title}
                        </h2>
                        <p className="mt-2 max-w-[18rem] text-sm leading-6 text-[#f8e8bf]/88 sm:text-[0.97rem]">
                          {task.description}
                        </p>
                      </div>

                      <div className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-[#c89745] bg-[linear-gradient(180deg,rgba(48,31,14,0.95)_0%,rgba(30,19,10,0.92)_100%)] px-3 py-2 text-sm font-black text-[#ffd56d] shadow-[0_8px_16px_rgba(0,0,0,0.28)]">
                        {baitReward > 0 ? <Worm className="h-4 w-4 text-lime-300" /> : <CoinIcon size="md" />}
                        <span>{baitReward > 0 ? baitReward : task.rewardCoins}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm text-[#f8e8bf]/82">
                      <span>{task.progress}/{task.target}</span>
                      <span>{statusLabel}</span>
                    </div>

                    <div className="mt-2 h-4 rounded-full border border-[#684623] bg-[#120d09] px-1 py-[3px] shadow-[inset_0_2px_5px_rgba(0,0,0,0.55)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(180deg,#8cecff_0%,#55dbff_100%)] shadow-[0_0_16px_rgba(96,223,255,0.7)] transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <Button
                      type="button"
                      disabled={!complete || task.claimed}
                      onClick={() => onClaimTask(task.id)}
                      className="mt-4 h-[3.25rem] w-full rounded-[1.2rem] border border-[#7f5227] bg-[linear-gradient(180deg,#8c531f_0%,#6e4117_42%,#4f2f14_100%)] text-[1.02rem] font-black uppercase tracking-[0.04em] text-[#f8db9a] shadow-[inset_0_1px_0_rgba(255,220,160,0.22),0_10px_16px_rgba(0,0,0,0.28)] transition-all duration-200 hover:brightness-110 disabled:border-[#3a2817] disabled:bg-[linear-gradient(180deg,#2f241c_0%,#231b15_100%)] disabled:text-[#8c7b63] disabled:shadow-none"
                    >
                      {task.claimed ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Claimed
                        </>
                      ) : (
                        <>
                          {baitReward > 0 ? <Worm className="mr-2 h-4 w-4" /> : <Coins className="mr-2 h-4 w-4" />}
                          Claim reward
                        </>
                      )}
                    </Button>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <div className="absolute bottom-[3.7%] left-1/2 flex w-[min(70%,34rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-[1.25rem] border border-[#6f4928] bg-[linear-gradient(180deg,rgba(38,25,16,0.98)_0%,rgba(28,20,13,0.98)_100%)] px-4 py-3 text-[#f0d09b] shadow-[inset_0_0_0_1px_rgba(255,215,150,0.06),0_12px_24px_rgba(0,0,0,0.34)]">
          <div className="min-w-0">
            <div className="text-[0.66rem] font-black uppercase tracking-[0.22em] text-[#f3c777]/85">
              Daily prize cube
            </div>
            <p className="mt-1 text-sm font-semibold text-[#f8e8bf]/88 sm:text-[0.95rem]">
              {claimedCount}/{tasks.length} claimed. {availableWheelRolls > 0 ? `${availableWheelRolls} roll${availableWheelRolls === 1 ? '' : 's'} ready.` : dailyTaskClaimsMet ? 'Done for today.' : 'Claim 3 daily tasks to unlock it.'}
            </p>
          </div>

          <Button
            type="button"
            disabled={availableWheelRolls <= 0}
            onClick={onOpenWheel}
            className="h-11 shrink-0 rounded-[1rem] border border-[#7f5227] bg-[linear-gradient(180deg,#8c531f_0%,#6e4117_42%,#4f2f14_100%)] px-4 text-sm font-black uppercase tracking-[0.04em] text-[#f8db9a] shadow-[inset_0_1px_0_rgba(255,220,160,0.22),0_10px_16px_rgba(0,0,0,0.28)] transition-all duration-200 hover:brightness-110 disabled:border-[#3a2817] disabled:bg-[linear-gradient(180deg,#2f241c_0%,#231b15_100%)] disabled:text-[#8c7b63] disabled:shadow-none"
          >
            {availableWheelRolls > 0 ? (
              <>
                <Trophy className="mr-2 h-4 w-4" />
                Open cube
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Locked
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DailyQuestBoard;
