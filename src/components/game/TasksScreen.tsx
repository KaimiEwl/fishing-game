import React, { useEffect, useMemo, useState } from 'react';
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
import QuestBoard, { QuestBoardCard, QuestBoardPlaque } from './QuestBoard';
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

type QuestTab = 'daily' | 'blockchain' | 'weekly' | 'social';

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
  const [activeTab, setActiveTab] = useState<QuestTab>('daily');
  const [isMobileLayout, setIsMobileLayout] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  ));
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
  const boardLayout = isMobileLayout ? 'mobile' : 'desktop';
  const boardViewportInsets = useMemo(() => (
    isMobileLayout
      ? {
          mobile: {
            left: '18.8%',
            right: '18.5%',
            top: '14.8%',
            bottom: '20.4%',
          },
        }
      : {
          desktop: {
            left: '12.8%',
            right: '11.8%',
            top: '14.6%',
            bottom: '14.4%',
          },
        }
  ), [isMobileLayout]);
  const questBackgrounds = useMemo<Record<QuestTab, string>>(() => (
    isMobileLayout
      ? {
          daily: publicAsset('assets/daily_quests_mobile_reference.webp'),
          blockchain: publicAsset('assets/blockchain_quests_mobile_reference.webp'),
          weekly: publicAsset('assets/weekly_quests_mobile_reference.webp'),
          social: publicAsset('assets/social_quests_mobile_reference.webp'),
        }
      : {
          daily: publicAsset('assets/daily_quests_board_reference.webp'),
          blockchain: publicAsset('assets/blockchain_quests_board_reference.webp'),
          weekly: publicAsset('assets/weekly_quests_board_reference.webp'),
          social: publicAsset('assets/social_quests_board_reference.webp'),
        }
  ), [isMobileLayout]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobileLayout(event.matches);

    setIsMobileLayout(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

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

  const getQuestStatusLabel = (task: DailyTaskProgress | SpecialTaskProgress | WeeklyMissionProgress) => {
    if (task.claimed) return 'Claimed';
    if (task.progress >= task.target) return 'Ready';
    if (task.progress > 0) return 'In progress';
    return 'Not started';
  };

  const boardHeader = (
    <div className="space-y-2.5">
      <TabsList className={`grid h-auto w-full gap-1.5 rounded-[1.35rem] border border-[#8f6a38]/70 bg-[rgba(16,11,8,0.84)] p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md ${isMobileLayout ? 'grid-cols-2' : weeklyMissionsEnabled ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <TabsTrigger value="daily" className="h-10 rounded-[0.95rem] text-[0.74rem] font-black uppercase tracking-[0.05em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:text-[0.82rem]">Daily</TabsTrigger>
        <TabsTrigger value="blockchain" className="h-10 rounded-[0.95rem] text-[0.74rem] font-black uppercase tracking-[0.05em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:text-[0.82rem]">Blockchain</TabsTrigger>
        {weeklyMissionsEnabled && (
          <TabsTrigger value="weekly" className="h-10 rounded-[0.95rem] text-[0.74rem] font-black uppercase tracking-[0.05em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:text-[0.82rem]">Weekly</TabsTrigger>
        )}
        <TabsTrigger value="social" className={`h-10 rounded-[0.95rem] text-[0.74rem] font-black uppercase tracking-[0.05em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:text-[0.82rem] ${!weeklyMissionsEnabled ? 'col-span-2 sm:col-span-1' : ''}`}>Social</TabsTrigger>
      </TabsList>
      <div className="flex items-center justify-end">
        <div className="inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-[#8f6a38]/70 bg-[rgba(16,11,8,0.84)] px-3.5 text-sm font-black text-[#f8dfab] shadow-[0_12px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
          <CoinIcon size="md" />
          {coins.toLocaleString()}
        </div>
      </div>
    </div>
  );

  const renderTaskBoard = (
    tasks: Array<DailyTaskProgress | SpecialTaskProgress | WeeklyMissionProgress>,
    onClaim: (id: TaskId | WeeklyMissionId) => void,
    footer: React.ReactNode,
  ) => (
    <QuestBoard
      layout={boardLayout}
      header={boardHeader}
      footer={footer}
      headerPlacement="inline"
      footerPlacement="inline"
      viewportInsets={boardViewportInsets}
    >
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-4">
        {tasks.map((task) => {
        const complete = task.progress >= task.target;
        const progress = Math.min(100, (task.progress / task.target) * 100);
        const statusLabel = getQuestStatusLabel(task);
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
          <QuestBoardCard key={task.id} className={isWalletCheckInTask || isInviteFriendTask ? 'md:col-span-2' : ''}>
            <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="pr-2 text-[0.96rem] font-black uppercase tracking-[0.04em] text-[#f3c777] drop-shadow-[0_1px_0_rgba(0,0,0,0.6)] sm:text-[1.2rem]">
                  {task.title}
                </h2>
                <p className="mt-1.5 text-[0.8rem] leading-5 text-[#f8e8bf]/88 sm:mt-2 sm:text-[0.97rem] sm:leading-6">{task.description}</p>
              </div>
              <div className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-[#c89745] bg-[linear-gradient(180deg,rgba(48,31,14,0.95)_0%,rgba(30,19,10,0.92)_100%)] px-2.5 py-1.5 text-[0.8rem] font-black text-[#ffd56d] shadow-[0_8px_16px_rgba(0,0,0,0.28)] sm:px-3 sm:py-2 sm:text-sm">
                {renderRewardBadge(task)}
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[0.78rem] text-[#f8e8bf]/82 sm:mb-2 sm:text-sm">
                <span>{task.progress}/{task.target}</span>
                <span>{statusLabel}</span>
              </div>
              <div className="h-3.5 rounded-full border border-[#684623] bg-[#120d09] px-1 py-[3px] shadow-[inset_0_2px_5px_rgba(0,0,0,0.55)] sm:h-4">
                <div
                  className="h-full rounded-full bg-[linear-gradient(180deg,#8cecff_0%,#55dbff_100%)] shadow-[0_0_16px_rgba(96,223,255,0.7)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {isWalletCheckInTask && (
              <div className="mt-3 rounded-[1.05rem] border border-[#8f6a38] bg-[linear-gradient(180deg,rgba(30,22,15,0.82)_0%,rgba(20,15,10,0.9)_100%)] p-3 sm:mt-4 sm:rounded-[1.2rem]">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#f8e8bf]/80 sm:text-xs">
                  <span>Streak: {formatStreakDays(walletCheckInSummary?.streakDays ?? 0)}</span>
                  {walletCheckInSummary?.lastCheckInAt && (
                    <span>Last check-in {new Date(walletCheckInSummary.lastCheckInAt).toLocaleString()}</span>
                  )}
                </div>
                <p className="mt-2 text-[0.78rem] leading-5 text-[#f8e8bf]/82 sm:text-sm">{walletCheckInStatusText}</p>
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
                      className="mt-3 h-10 w-full rounded-[1rem] border border-[#7f5227] bg-[linear-gradient(180deg,#8c531f_0%,#6e4117_42%,#4f2f14_100%)] text-[0.78rem] font-black uppercase tracking-[0.04em] text-[#f8db9a] shadow-[inset_0_1px_0_rgba(255,220,160,0.22),0_10px_16px_rgba(0,0,0,0.28)] transition-all duration-200 hover:brightness-110 disabled:border-[#3a2817] disabled:bg-[linear-gradient(180deg,#2f241c_0%,#231b15_100%)] disabled:text-[#8c7b63] disabled:shadow-none sm:h-11 sm:text-sm"
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
              <div className="mt-3 rounded-[1.05rem] border border-[#8f6a38] bg-[linear-gradient(180deg,rgba(30,22,15,0.82)_0%,rgba(20,15,10,0.9)_100%)] p-3 sm:mt-4 sm:rounded-[1.2rem]">
                {hasConnectedWallet && referralSummary?.referralLink ? (
                  <>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#8f6a38] bg-[rgba(15,10,7,0.7)] px-3 py-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#f3c777]/80">Rewarded referrals</p>
                        <p className="mt-1 text-lg font-black text-[#f8e8bf]">
                          {referralSummary.rewardedReferralCount}
                          <span className="ml-1 text-sm font-bold text-[#c8ab7d]">/ {referralSummary.maxRewardedReferrals}</span>
                        </p>
                      </div>
                      <span className="rounded-full border border-[#9a7a33] bg-[rgba(92,70,21,0.42)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#f3d47e]">
                        +10 bait
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Input
                        value={referralSummary.referralLink}
                        readOnly
                        className="h-11 flex-1 border-[#6f4928] bg-[rgba(15,10,7,0.7)] text-[#f8e8bf]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleCopyReferralLink()}
                        className="h-11 gap-2 border-[#6f4928] bg-[rgba(15,10,7,0.7)] px-4 text-[#f8e8bf] hover:bg-[rgba(30,22,15,0.88)]"
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
                    <p className="mt-2 text-[0.78rem] leading-5 text-[#f8e8bf]/82 sm:text-sm">
                      Invite friends from here. Each invited wallet is locked to the first valid referrer link.
                    </p>
                  </>
                ) : (
                  <div className="space-y-2 text-[0.78rem] leading-5 text-[#f8e8bf]/82 sm:text-sm">
                    <p>Connect and verify your wallet first, then your referral link will appear here.</p>
                    <p>The reward stays in Blockchain quests, not in Settings.</p>
                  </div>
                )}
              </div>
            )}

              <div className="mt-auto pt-4">
                <Button
                  type="button"
                  disabled={!complete || task.claimed}
                  onClick={() => onClaim(task.id)}
                  className="h-11 w-full rounded-[1rem] border border-[#7f5227] bg-[linear-gradient(180deg,#8c531f_0%,#6e4117_42%,#4f2f14_100%)] text-[0.86rem] font-black uppercase tracking-[0.04em] text-[#f8db9a] shadow-[inset_0_1px_0_rgba(255,220,160,0.22),0_10px_16px_rgba(0,0,0,0.28)] transition-all duration-200 hover:brightness-110 disabled:border-[#3a2817] disabled:bg-[linear-gradient(180deg,#2f241c_0%,#231b15_100%)] disabled:text-[#8c7b63] disabled:shadow-none sm:h-[3.25rem] sm:rounded-[1.2rem] sm:text-[1.02rem]"
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
              </div>
            </div>
          </QuestBoardCard>
        );
      })}
      </div>
    </QuestBoard>
  );

  const renderSocialTaskBoard = (footer: React.ReactNode) => (
    <QuestBoard
      layout={boardLayout}
      header={boardHeader}
      footer={footer}
      headerPlacement="inline"
      footerPlacement="inline"
      viewportInsets={boardViewportInsets}
    >
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-4">
      {socialTaskCards.map((task) => {
        const Icon = task.icon;

        return (
          <QuestBoardCard key={task.id} className="min-h-[11rem] text-left md:min-h-[12.75rem]">
            <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[#8f6a38] bg-[rgba(15,10,7,0.72)] text-[#f3c777] shadow-[0_8px_16px_rgba(0,0,0,0.28)]">
                <Icon className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-[#9a7a33] bg-[rgba(92,70,21,0.42)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#f3d47e]">
                Coming soon
              </span>
            </div>
            <h2 className="mt-3 pr-2 text-[0.96rem] font-black uppercase tracking-[0.04em] text-[#f3c777] drop-shadow-[0_1px_0_rgba(0,0,0,0.6)] sm:mt-4 sm:text-[1.2rem]">
              {task.title}
            </h2>
            <p className="mt-1.5 text-[0.8rem] leading-5 text-[#f8e8bf]/88 sm:mt-2 sm:text-[0.97rem] sm:leading-6">
              This social action is planned but not live yet. Tap to see upcoming tasks only.
            </p>
              <div className="mt-auto pt-4">
                <Button
                  type="button"
                  onClick={() => toast.info(`${task.title} coming soon`)}
                  className="h-11 w-full rounded-[1rem] border border-[#7f5227] bg-[linear-gradient(180deg,#8c531f_0%,#6e4117_42%,#4f2f14_100%)] text-[0.86rem] font-black uppercase tracking-[0.04em] text-[#f8db9a] shadow-[inset_0_1px_0_rgba(255,220,160,0.22),0_10px_16px_rgba(0,0,0,0.28)] transition-all duration-200 hover:brightness-110 sm:h-[3.25rem] sm:rounded-[1.2rem] sm:text-[1.02rem]"
                >
                  Explore task
                </Button>
              </div>
            </div>
          </QuestBoardCard>
        );
      })}
      </div>
    </QuestBoard>
  );

  return (
    <GameScreenShell
      title="Quest Board"
      subtitle="Daily, blockchain, weekly, and social progression all live here."
      backgroundImage={questBackgrounds[activeTab]}
      backgroundFit="cover"
      overlayClassName="bg-[linear-gradient(180deg,rgba(8,6,3,0.18)_0%,rgba(10,8,5,0.2)_48%,rgba(6,5,3,0.26)_100%)]"
      headerHidden
      shellPaddingClassName="px-0 pb-[calc(var(--bottom-nav-clearance,6rem)+0.4rem)] pt-0"
      contentWrapperClassName="mx-auto mt-0 min-h-0 w-full flex-1 overflow-hidden"
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as QuestTab)}
        className="flex h-full min-h-0 flex-col"
      >
        <TabsContent value="daily" className="mt-0 min-h-0 flex-1 overflow-hidden">
          {renderTaskBoard(
            dailyTasks,
            onClaimTask,
            <QuestBoardPlaque
              eyebrow="Daily prize cube"
              description={
                <>
                  {claimedCount}/{dailyTasks.length} claimed. {availableWheelRolls > 0 ? `${availableWheelRolls} roll${availableWheelRolls === 1 ? '' : 's'} ready.` : dailyTaskClaimsMet ? 'Done for today.' : 'Claim 3 daily tasks to unlock it.'}
                </>
              }
              action={
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
              }
            />,
          )}
        </TabsContent>
        <TabsContent value="blockchain" className="mt-0 min-h-0 flex-1 overflow-hidden">
          {renderTaskBoard(
            specialTasks,
            onClaimTask,
            <QuestBoardPlaque
              eyebrow="Wallet-linked"
              description={
                isWalletVerified
                  ? 'Wallet check-in and friend-invite rewards live here now.'
                  : 'Connect and verify your wallet to unlock blockchain quests and referral rewards.'
              }
            />,
          )}
        </TabsContent>
        {weeklyMissionsEnabled && (
          <TabsContent value="weekly" className="mt-0 min-h-0 flex-1 overflow-hidden">
            {renderTaskBoard(
              weeklyMissions,
              onClaimWeeklyMission,
              <QuestBoardPlaque
                eyebrow="Long ladder"
                description="Weekly quests track bigger goals and can award bonus cube charges."
              />,
            )}
          </TabsContent>
        )}
        <TabsContent value="social" className="mt-0 min-h-0 flex-1 overflow-hidden">
          {renderSocialTaskBoard(
            <QuestBoardPlaque
              eyebrow="Community loop"
              description={
                isWalletVerified
                  ? (socialTasksLoading ? 'Preparing future social tasks...' : 'Social quests are not live yet. These cards preview the upcoming community actions.')
                  : 'Connect your wallet first. Social quests and future verified rewards only work on wallet-linked accounts.'
              }
            />,
          )}
        </TabsContent>
      </Tabs>
    </GameScreenShell>
  );
};

export default TasksScreen;
