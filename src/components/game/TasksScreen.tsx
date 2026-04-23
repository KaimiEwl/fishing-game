import React, { useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Box, Check, Clock3, Coins, Copy, ExternalLink, Heart, Lock, MessageCircle, Repeat2, Send, Trophy, Worm } from 'lucide-react';
import { useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ReferralSummary } from '@/hooks/useWalletAuth';
import type {
  DailyTaskProgress,
  SocialTaskId,
  SocialTaskProgress,
  SpecialTaskProgress,
  TaskId,
  WalletCheckInSummary,
  WeeklyMissionId,
  WeeklyMissionProgress,
} from '@/types/game';
import { getErrorMessage, isUserRejectedError } from '@/lib/errorUtils';
import CoinIcon from './CoinIcon';
import GameScreenShell from './GameScreenShell';
import { publicAsset } from '@/lib/assets';
import { REFERRAL_BAIT_ENABLED } from '@/lib/baitEconomy';
import {
  formatStreakDays,
  WALLET_CHECK_IN_AMOUNT_MON,
  WALLET_CHECK_IN_RECEIVER_ADDRESS,
  WALLET_CHECK_IN_REPEAT_TEST_MODE,
} from '@/lib/walletCheckIn';

interface TasksScreenProps {
  coins: number;
  walletAddress?: string;
  dailyTasks: DailyTaskProgress[];
  specialTasks: SpecialTaskProgress[];
  weeklyMissions: WeeklyMissionProgress[];
  socialTasks: SocialTaskProgress[];
  walletCheckInSummary: WalletCheckInSummary | null;
  walletCheckInLoading?: boolean;
  dailyTaskClaimsMet: boolean;
  availableWheelRolls: number;
  socialTasksLoading?: boolean;
  isWalletVerified: boolean;
  referralSummary?: ReferralSummary | null;
  onClaimTask: (id: TaskId) => void;
  onClaimWeeklyMission: (id: WeeklyMissionId) => void;
  onWalletCheckIn: (txHash: string) => Promise<void>;
  onSubmitSocialTask: (id: SocialTaskId, proofUrl?: string) => void;
  onClaimSocialTask: (id: SocialTaskId) => void;
  onRefreshSocialTasks: () => void;
  onOpenWheel: () => void;
  weeklyMissionsEnabled?: boolean;
}

const TasksScreen: React.FC<TasksScreenProps> = ({
  coins,
  walletAddress,
  dailyTasks,
  specialTasks,
  weeklyMissions,
  socialTasks,
  walletCheckInSummary,
  walletCheckInLoading = false,
  dailyTaskClaimsMet,
  availableWheelRolls,
  socialTasksLoading = false,
  isWalletVerified,
  referralSummary,
  onClaimTask,
  onClaimWeeklyMission,
  onWalletCheckIn,
  onOpenWheel,
  weeklyMissionsEnabled = false,
}) => {
  const completedCount = dailyTasks.filter((task) => task.progress >= task.target).length;
  const claimedCount = dailyTasks.filter((task) => task.claimed).length;
  const [walletCheckInSubmitting, setWalletCheckInSubmitting] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const { sendTransactionAsync } = useSendTransaction();
  const walletCheckInAmountMon = walletCheckInSummary?.amountMon ?? WALLET_CHECK_IN_AMOUNT_MON;
  const walletCheckInReceiverAddress = walletCheckInSummary?.receiverAddress ?? WALLET_CHECK_IN_RECEIVER_ADDRESS;
  const socialTaskCards = useMemo(() => socialTasks.map((task) => ({
    ...task,
    icon: task.id === 'twitter_follow'
      ? ExternalLink
      : task.id === 'twitter_repost'
        ? Repeat2
        : task.id === 'twitter_like'
          ? Heart
          : task.id === 'discord_join'
            ? MessageCircle
            : Send,
  })), [socialTasks]);

  const handleCopyReferralLink = async () => {
    if (!referralSummary?.referralLink) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralSummary.referralLink);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = referralSummary.referralLink;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopiedReferral(true);
      window.setTimeout(() => setCopiedReferral(false), 1800);
    } catch (error) {
      console.error('Referral link copy failed:', error);
      toast.error('Copy failed. Please copy the link manually.');
    }
  };

  const handleWalletCheckIn = async () => {
    if (!walletAddress || walletCheckInSubmitting) return;

    setWalletCheckInSubmitting(true);
    try {
      const txHash = await sendTransactionAsync({
        to: walletCheckInReceiverAddress as `0x${string}`,
        value: parseEther(walletCheckInAmountMon),
      });

      toast.info('Wallet check-in transaction sent. Verifying...');
      await onWalletCheckIn(txHash);
      toast.success('Daily wallet streak updated.');
    } catch (error) {
      if (isUserRejectedError(error)) {
        toast.error('Transaction cancelled');
      } else {
        toast.error(`Wallet check-in failed: ${getErrorMessage(error)}`);
      }
    } finally {
      setWalletCheckInSubmitting(false);
    }
  };

  const renderRewardBadge = (task: DailyTaskProgress | SpecialTaskProgress | WeeklyMissionProgress) => {
    const cubeChargeReward = 'rewardCubeCharge' in task ? (task.rewardCubeCharge ?? 0) : 0;

    if (cubeChargeReward > 0) {
      return (
        <>
          <Box className="h-4 w-4 text-cyan-200" />
          <span className="text-cyan-100">+{cubeChargeReward} cube roll</span>
        </>
      );
    }

    if (task.rewardBait) {
      return (
        <>
          <Worm className="h-4 w-4 text-lime-300" />
          <span className="text-lime-200">{task.rewardBait} bait</span>
        </>
      );
    }

    return (
      <>
        <CoinIcon size="md" />
        <span className="text-amber-300">{task.rewardCoins}</span>
      </>
    );
  };

  const renderTaskList = (
    tasks: Array<DailyTaskProgress | SpecialTaskProgress | WeeklyMissionProgress>,
    onClaim: (id: TaskId | WeeklyMissionId) => void,
  ) => (
    <div className="grid gap-3">
      {tasks.map((task) => {
        const complete = task.progress >= task.target;
        const progress = Math.min(100, (task.progress / task.target) * 100);
        const cubeChargeReward = 'rewardCubeCharge' in task ? (task.rewardCubeCharge ?? 0) : 0;
        const isWalletCheckInTask = task.id === 'wallet_check_in';
        const isInviteFriendTask = task.id === 'invite_friend';
        const hasConnectedWallet = Boolean(walletAddress);
        const walletCheckInStatusText = !hasConnectedWallet
          ? `Connect your wallet first, then send today's ${walletCheckInAmountMon} MON transaction to start or continue your streak.`
          : !isWalletVerified
            ? 'Preparing your verified wallet session so you can send the on-chain check-in.'
          : walletCheckInLoading
            ? 'Refreshing streak status...'
            : WALLET_CHECK_IN_REPEAT_TEST_MODE && walletCheckInSummary?.todayCheckedIn
              ? `Test mode is enabled. Current streak: ${formatStreakDays(walletCheckInSummary.streakDays)}. You can send another ${walletCheckInAmountMon} MON check-in right now and claim the task again.`
              : walletCheckInSummary?.todayCheckedIn
              ? `Checked in today. Streak: ${formatStreakDays(walletCheckInSummary.streakDays)}.`
              : walletCheckInSummary?.lastCheckInDate
                ? `Current streak: ${formatStreakDays(walletCheckInSummary.streakDays)}. Send today's ${walletCheckInSummary.amountMon} MON check-in to keep it going.`
                : `Start your streak with a ${walletCheckInAmountMon} MON check-in today.`;

        return (
          <article key={task.id} className="rounded-xl border border-cyan-300/15 bg-black/60 p-4 shadow-lg shadow-black/20 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white drop-shadow-sm">{task.title}</h2>
                <p className="mt-1 text-sm text-white/70">{task.description}</p>
              </div>
              <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold shadow-sm">
                {renderRewardBadge(task)}
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

            {isWalletCheckInTask && (
              <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-100/85">
                  <span>Streak: {formatStreakDays(walletCheckInSummary?.streakDays ?? 0)}</span>
                  {walletCheckInSummary?.lastCheckInAt && (
                    <span>Last check-in {new Date(walletCheckInSummary.lastCheckInAt).toLocaleString()}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-white/75">{walletCheckInStatusText}</p>
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <Button
                      type="button"
                      disabled={walletCheckInSubmitting || walletCheckInLoading || (hasConnectedWallet && !isWalletVerified)}
                      onClick={() => {
                        if (!hasConnectedWallet) {
                          openConnectModal?.();
                          return;
                        }

                        void handleWalletCheckIn();
                      }}
                      className="mt-3 h-11 w-full rounded-xl border border-emerald-300/25 bg-emerald-500/10 text-sm font-bold text-emerald-100 hover:bg-emerald-500/20 disabled:border-zinc-800 disabled:bg-zinc-950 disabled:text-zinc-600"
                    >
                      {walletCheckInSubmitting ? (
                        <>
                          <Clock3 className="mr-2 h-4 w-4" />
                          Verifying transaction
                        </>
                      ) : walletCheckInSummary?.todayCheckedIn && !WALLET_CHECK_IN_REPEAT_TEST_MODE ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Checked in today
                        </>
                      ) : !hasConnectedWallet ? (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Connect wallet to check in
                        </>
                      ) : !isWalletVerified ? (
                        <>
                          <Clock3 className="mr-2 h-4 w-4" />
                          Preparing wallet
                        </>
                      ) : walletCheckInSummary?.todayCheckedIn && WALLET_CHECK_IN_REPEAT_TEST_MODE ? (
                        <>
                          <Repeat2 className="mr-2 h-4 w-4" />
                          Send another test check-in
                        </>
                      ) : (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Send {walletCheckInAmountMon} MON check-in
                        </>
                      )}
                    </Button>
                  )}
                </ConnectButton.Custom>
              </div>
            )}

            {isInviteFriendTask && REFERRAL_BAIT_ENABLED && (
              <div className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-3">
                {hasConnectedWallet && referralSummary?.referralLink ? (
                  <>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-cyan-300/12 bg-black/50 px-3 py-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-100/75">Rewarded referrals</p>
                        <p className="mt-1 text-lg font-black text-zinc-100">
                          {referralSummary.rewardedReferralCount}
                          <span className="ml-1 text-sm font-bold text-zinc-400">/ {referralSummary.maxRewardedReferrals}</span>
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-100">
                        +10 bait
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Input
                        value={referralSummary.referralLink}
                        readOnly
                        className="h-11 flex-1 border-zinc-800 bg-black text-zinc-100"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleCopyReferralLink()}
                        className="h-11 gap-2 border-zinc-800 bg-black px-4 text-zinc-100 hover:bg-zinc-900"
                      >
                        {copiedReferral ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy link
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="mt-2 text-sm text-white/75">
                      Invite friends from here. Each invited wallet is locked to the first valid referrer link.
                    </p>
                  </>
                ) : (
                  <div className="space-y-2 text-sm text-white/75">
                    <p>Connect and verify your wallet first, then your referral link will appear here.</p>
                    <p>The reward stays in Special tasks, not in Settings.</p>
                  </div>
                )}
              </div>
            )}

            <Button
              type="button"
              disabled={!complete || task.claimed}
              onClick={() => onClaim(task.id)}
              className="mt-4 h-12 w-full rounded-xl border border-cyan-300/25 bg-zinc-950 text-base font-bold text-cyan-100 shadow-lg shadow-black/30 transition-all hover:bg-black disabled:border-zinc-800 disabled:bg-zinc-950 disabled:text-zinc-600 disabled:shadow-none"
            >
              {task.claimed ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Claimed
                </>
              ) : (
                <>
                  {cubeChargeReward > 0 ? <Box className="mr-2 h-4 w-4" /> : task.rewardBait ? <Worm className="mr-2 h-4 w-4" /> : <Coins className="mr-2 h-4 w-4" />}
                  Claim reward
                </>
              )}
            </Button>
          </article>
        );
      })}
    </div>
  );

  const renderSocialTaskList = () => (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {socialTaskCards.map((task) => {
        const Icon = task.icon;

        return (
          <button
            key={task.id}
            type="button"
            onClick={() => toast.info(`${task.title} coming soon`)}
            className="rounded-xl border border-cyan-300/15 bg-black/60 p-4 text-left shadow-lg shadow-black/20 backdrop-blur-md transition-all hover:border-cyan-300/30 hover:bg-black/70"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/20 bg-zinc-950 text-cyan-100 shadow-lg shadow-black/30">
                <Icon className="h-5 w-5" />
              </div>
              <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
                Coming soon
              </span>
            </div>
            <h2 className="mt-4 text-lg font-bold text-white drop-shadow-sm">{task.title}</h2>
            <p className="mt-1 text-sm text-white/70">
              This social action is planned but not live yet. Tap to see upcoming tasks only.
            </p>
          </button>
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
          <TabsList className={`grid w-full ${weeklyMissionsEnabled ? 'grid-cols-4' : 'grid-cols-3'} rounded-lg border border-cyan-300/15 bg-black/85 shadow-lg shadow-black/30`}>
            <TabsTrigger value="daily" className="rounded-lg text-zinc-200 data-[state=active]:border data-[state=active]:border-cyan-300/25 data-[state=active]:bg-zinc-950 data-[state=active]:text-cyan-50">Daily</TabsTrigger>
            <TabsTrigger value="special" className="rounded-lg text-zinc-200 data-[state=active]:border data-[state=active]:border-cyan-300/25 data-[state=active]:bg-zinc-950 data-[state=active]:text-cyan-50">Special</TabsTrigger>
            {weeklyMissionsEnabled && (
              <TabsTrigger value="weekly" className="rounded-lg text-zinc-200 data-[state=active]:border data-[state=active]:border-cyan-300/25 data-[state=active]:bg-zinc-950 data-[state=active]:text-cyan-50">Weekly</TabsTrigger>
            )}
            <TabsTrigger value="social" className="rounded-lg text-zinc-200 data-[state=active]:border data-[state=active]:border-cyan-300/25 data-[state=active]:bg-zinc-950 data-[state=active]:text-cyan-50">Social</TabsTrigger>
          </TabsList>
          <TabsContent value="daily" className="mt-3">
            {renderTaskList(dailyTasks, onClaimTask)}
          </TabsContent>
          <TabsContent value="special" className="mt-3">
            <div className="mb-3 rounded-xl border border-cyan-300/15 bg-black/60 p-4 text-sm text-white/70 shadow-lg shadow-black/20 backdrop-blur-md">
              Wallet check-in and friend invites live here now. Settings no longer carries wallet or referral actions.
            </div>
            {renderTaskList(specialTasks, onClaimTask)}
          </TabsContent>
          {weeklyMissionsEnabled && (
            <TabsContent value="weekly" className="mt-3">
              <div className="mb-3 rounded-xl border border-cyan-300/15 bg-black/60 p-4 text-sm text-white/70 shadow-lg shadow-black/20 backdrop-blur-md">
                Weekly missions are the longer ladder. Keep coming back through the week for bigger rewards, including bonus cube charges.
              </div>
              {renderTaskList(weeklyMissions, onClaimWeeklyMission)}
            </TabsContent>
          )}
          <TabsContent value="social" className="mt-3">
            <div className="mb-3 rounded-xl border border-cyan-300/15 bg-black/60 p-4 text-sm text-white/70 shadow-lg shadow-black/20 backdrop-blur-md">
              {isWalletVerified
                ? (socialTasksLoading ? 'Preparing future social tasks...' : 'Social tasks are not live yet. For now, only the platform icons remain here and each one will show Coming soon.')
                : 'Connect your wallet first. Social tasks, future MON rewards, and verified progress sync only work on wallet-linked accounts.'}
            </div>
            {renderSocialTaskList()}
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
