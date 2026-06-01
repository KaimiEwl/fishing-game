import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Box, Check, Clock3, Coins, Copy, ExternalLink, Heart, Lock, MessageCircle, Repeat2, Send, Trophy, Worm } from 'lucide-react';
import { useSendTransaction } from 'wagmi';
import { toast } from 'sonner';
import { parseEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ReferralSummary } from '@/hooks/useWalletAuth';
import {
  LEVIATHAN_COMMON_ROD_BONUS_CONFIG,
  ROD_DATA,
  ROD_RARITY_COLORS,
  ROD_RARITY_NAMES,
} from '@/types/game';
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
  WALLET_CHECK_IN_REPEAT_TEST_MODE,
  WALLET_CHECK_IN_RECEIVER_ADDRESS,
} from '@/lib/walletCheckIn';
import {
  isRealWalletAddress,
  sendMonadPayment,
} from '@/lib/monadTestMode';
import { ownsRodLevel } from '@/lib/rodMonadRewards';

interface TasksScreenProps {
  coins: number;
  walletAddress?: string;
  rodLevel: number;
  equippedRod: number;
  nftRods?: number[];
  dailyTasks: DailyTaskProgress[];
  specialTasks: SpecialTaskProgress[];
  weeklyMissions: WeeklyMissionProgress[];
  socialTasks: SocialTaskProgress[];
  walletCheckInSummary: WalletCheckInSummary | null;
  walletCheckInLoading?: boolean;
  dailyTaskClaimsMet: boolean;
  availableWheelRolls: number;
  socialTasksLoading?: boolean;
  isWalletConnected: boolean;
  isWalletVerified: boolean;
  isWalletVerifying?: boolean;
  referralSummary?: ReferralSummary | null;
  onClaimTask: (id: TaskId) => void;
  onClaimWeeklyMission: (id: WeeklyMissionId) => void;
  claimingTaskId?: TaskId | null;
  claimingWeeklyMissionId?: WeeklyMissionId | null;
  onWalletCheckIn: (txHash: string) => Promise<void>;
  onVerifyWallet?: () => Promise<void> | void;
  onEquipRod: (level: number) => void;
  onOpenFish: () => void;
  onSubmitSocialTask: (id: SocialTaskId, proofUrl?: string) => Promise<void> | void;
  onClaimSocialTask: (id: SocialTaskId) => Promise<void> | void;
  onRefreshSocialTasks: () => Promise<void> | void;
  onOpenWheel: () => void;
  weeklyMissionsEnabled?: boolean;
}

type QuestTab = 'daily' | 'blockchain' | 'weekly' | 'social';
const WALLET_CHECK_IN_TOAST_ID = 'wallet-check-in-flow';
const WALLET_CHECK_IN_VERIFY_ATTEMPTS = 12;
const WALLET_CHECK_IN_VERIFY_RETRY_MS = 5000;
const WALLET_CHECK_IN_PENDING_STORAGE_KEY = 'hook_loot_pending_wallet_check_in_tx_v1';
const MONAD_MAINNET_CHAIN_ID = '0x8f';
const MONAD_MAINNET_PARAMS = {
  chainId: MONAD_MAINNET_CHAIN_ID,
  chainName: 'Monad Mainnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.monad.xyz'],
  blockExplorerUrls: ['https://monadscan.com'],
};
const DEFAULT_X_TARGET_USERNAME = 'HookLootgame';
const normalizeXHandle = (value?: string | null) => {
  const trimmed = String(value || '')
    .trim()
    .replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, '')
    .replace(/^@+/, '')
    .split(/[/?#]/)[0]
    .trim();
  return /^[A-Za-z0-9_]{1,15}$/.test(trimmed) ? trimmed : '';
};
const SOCIAL_X_TARGET_USERNAME = normalizeXHandle(import.meta.env.VITE_SOCIAL_X_TARGET_USERNAME) || DEFAULT_X_TARGET_USERNAME;
const SOCIAL_X_PROFILE_URL = String(import.meta.env.VITE_SOCIAL_X_PROFILE_URL || `https://x.com/${SOCIAL_X_TARGET_USERNAME}`);
const SOCIAL_X_VISIT_DELAY_MS = 12_000;
const getRodById = (id: string) => ROD_DATA.find((rod) => rod.id === id) ?? null;
const leviathanRequiredRod = getRodById(LEVIATHAN_COMMON_ROD_BONUS_CONFIG.requiredRodId) ?? ROD_DATA[0];
const leviathanBonusRod = getRodById(LEVIATHAN_COMMON_ROD_BONUS_CONFIG.bonusRodId);
type BrowserEthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

const getBrowserEthereumProvider = (): BrowserEthereumProvider | null => {
  if (typeof window === 'undefined') return null;
  const maybeWindow = window as typeof window & { ethereum?: BrowserEthereumProvider };
  return maybeWindow.ethereum && typeof maybeWindow.ethereum.request === 'function'
    ? maybeWindow.ethereum
    : null;
};

const toHexQuantity = (value: bigint) => `0x${value.toString(16)}`;
const isWalletTransactionHash = (value: string) => /^0x[a-fA-F0-9]{64}$/.test(value.trim());
const normalizeWalletTransactionHash = (value: string) => (
  isWalletTransactionHash(value) ? value.trim() : null
);

const pendingWalletCheckInStorageKey = (walletAddress: string) => (
  `${WALLET_CHECK_IN_PENDING_STORAGE_KEY}:${walletAddress.toLowerCase()}`
);

const readPendingWalletCheckInTx = (walletAddress?: string | null) => {
  if (!walletAddress || typeof window === 'undefined') return null;
  try {
    const txHash = window.localStorage.getItem(pendingWalletCheckInStorageKey(walletAddress));
    return txHash ? normalizeWalletTransactionHash(txHash) : null;
  } catch {
    return null;
  }
};

const writePendingWalletCheckInTx = (walletAddress: string, txHash: string) => {
  try {
    window.localStorage.setItem(pendingWalletCheckInStorageKey(walletAddress), txHash);
  } catch {
    // Best effort only; verification still continues in the current session.
  }
};

const clearPendingWalletCheckInTx = (walletAddress?: string | null) => {
  if (!walletAddress || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(pendingWalletCheckInStorageKey(walletAddress));
  } catch {
    // Ignore storage cleanup failures.
  }
};

const wait = (ms: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, ms);
});

const isRetryableWalletCheckInError = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('transaction pending')
    || message.includes('fetch failed')
    || message.includes('failed to fetch')
    || message.includes('rpc request failed')
    || message.includes('rpc error')
    || message.includes('cannot fetch transaction details')
    || message.includes('timeout')
    || message.includes('network');
};

const getProviderChainId = async (provider: BrowserEthereumProvider) => {
  const chainId = await provider.request({ method: 'eth_chainId' });
  return typeof chainId === 'string' ? chainId.toLowerCase() : null;
};

const getProviderErrorCode = (error: unknown) => (
  error && typeof error === 'object' && 'code' in error
    ? Number((error as { code?: unknown }).code)
    : null
);

const ensureMonadMainnet = async (provider: BrowserEthereumProvider) => {
  if (await getProviderChainId(provider) === MONAD_MAINNET_CHAIN_ID) return;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MONAD_MAINNET_CHAIN_ID }],
    });
  } catch (error) {
    if (getProviderErrorCode(error) !== 4902) {
      throw error;
    }

    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [MONAD_MAINNET_PARAMS],
    });
  }

  if (await getProviderChainId(provider) !== MONAD_MAINNET_CHAIN_ID) {
    throw new Error('Switch MetaMask to Monad Mainnet before sending the check-in.');
  }
};

const TasksScreen: React.FC<TasksScreenProps> = ({
  walletAddress,
  rodLevel,
  equippedRod,
  nftRods = [],
  dailyTasks,
  specialTasks,
  weeklyMissions,
  socialTasks,
  walletCheckInSummary,
  walletCheckInLoading = false,
  socialTasksLoading = false,
  dailyTaskClaimsMet,
  availableWheelRolls,
  isWalletConnected,
  isWalletVerified,
  isWalletVerifying = false,
  referralSummary,
  onClaimTask,
  onClaimWeeklyMission,
  claimingTaskId = null,
  claimingWeeklyMissionId = null,
  onWalletCheckIn,
  onVerifyWallet,
  onEquipRod,
  onOpenFish,
  onSubmitSocialTask,
  onClaimSocialTask,
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
  const [pendingWalletCheckInTx, setPendingWalletCheckInTx] = useState<string | null>(() => readPendingWalletCheckInTx(walletAddress));
  const [manualWalletCheckInTxHash, setManualWalletCheckInTxHash] = useState('');
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [submittingSocialTaskId, setSubmittingSocialTaskId] = useState<SocialTaskId | null>(null);
  const [claimingSocialTaskId, setClaimingSocialTaskId] = useState<SocialTaskId | null>(null);
  const socialVisitTimerRef = useRef<number | null>(null);
  const { sendTransactionAsync } = useSendTransaction();
  const canUseWalletCheckInPayment = isRealWalletAddress(walletAddress);
  const ownsLeviathanBonusRod = Boolean(leviathanBonusRod && ownsRodLevel(leviathanBonusRod.level, rodLevel, nftRods));
  const hasLeviathanRodEquipped = equippedRod === leviathanRequiredRod.level;
  const leviathanBountyStatus = ownsLeviathanBonusRod
    ? 'Reward owned'
    : hasLeviathanRodEquipped
      ? 'Ready to hunt'
      : 'Equip Common Rod';
  const walletCheckInAmountMon = walletCheckInSummary?.amountMon ?? WALLET_CHECK_IN_AMOUNT_MON;
  const walletCheckInPriceLabel = `${walletCheckInAmountMon} MON`;
  const walletCheckInReceiverAddress = walletCheckInSummary?.receiverAddress ?? WALLET_CHECK_IN_RECEIVER_ADDRESS;
  const walletCheckInRepeatTestMode = Boolean(walletCheckInSummary?.repeatTestMode || WALLET_CHECK_IN_REPEAT_TEST_MODE);
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
            left: '16.2%',
            right: '16.2%',
            top: '16.2%',
            bottom: '18.6%',
          },
        }
      : {
          desktop: {
            left: '11.6%',
            right: '10.8%',
            top: '18.2%',
            bottom: '18.8%',
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

  useEffect(() => {
    setPendingWalletCheckInTx(readPendingWalletCheckInTx(walletAddress));
  }, [walletAddress]);

  useEffect(() => () => {
    if (socialVisitTimerRef.current != null) {
      window.clearTimeout(socialVisitTimerRef.current);
    }
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

  const handleOpenXProfile = (task?: SocialTaskProgress) => {
    window.open(SOCIAL_X_PROFILE_URL, '_blank', 'noopener,noreferrer');

    if (!task || task.status === 'claimed' || task.canClaim || submittingSocialTaskId === task.id) return;
    if (!isWalletVerified) {
      toast.error('Connect a verified wallet first.');
      return;
    }

    setSubmittingSocialTaskId(task.id);
    if (socialVisitTimerRef.current != null) {
      window.clearTimeout(socialVisitTimerRef.current);
    }
    socialVisitTimerRef.current = window.setTimeout(() => {
      socialVisitTimerRef.current = null;
      void (async () => {
        try {
          await onSubmitSocialTask(task.id, `visited:${SOCIAL_X_PROFILE_URL}`);
        } finally {
          setSubmittingSocialTaskId(null);
        }
      })();
    }, SOCIAL_X_VISIT_DELAY_MS);
  };

  const handleClaimSocialReward = async (taskId: SocialTaskId) => {
    if (!isWalletVerified) {
      toast.error('Connect a verified wallet first.');
      return;
    }

    setClaimingSocialTaskId(taskId);
    try {
      await onClaimSocialTask(taskId);
    } finally {
      setClaimingSocialTaskId(null);
    }
  };

  const showWalletCheckInError = (error: unknown) => {
    if (isUserRejectedError(error)) {
      toast.error('Transaction cancelled', {
        id: WALLET_CHECK_IN_TOAST_ID,
        duration: 5600,
      });
      return;
    }

    const retryable = isRetryableWalletCheckInError(error);
    if (retryable) {
      toast.info('Check-in transaction is still confirming. No new MON was sent; press the button again to re-check the same transaction.', {
        id: WALLET_CHECK_IN_TOAST_ID,
        duration: 9000,
      });
      return;
    }

    clearPendingWalletCheckInTx(walletAddress);
    setPendingWalletCheckInTx(null);
    toast.error(`Wallet check-in failed: ${getErrorMessage(error)}`, {
      id: WALLET_CHECK_IN_TOAST_ID,
      duration: 5600,
    });
  };

  const verifyWalletCheckInTxHash = async (txHash: string, pendingMessage: string) => {
    if (!walletAddress) throw new Error('Wallet is not connected.');

    writePendingWalletCheckInTx(walletAddress, txHash);
    setPendingWalletCheckInTx(txHash);

    toast.loading(pendingMessage, {
      id: WALLET_CHECK_IN_TOAST_ID,
      duration: 90_000,
    });

    for (let attempt = 1; attempt <= WALLET_CHECK_IN_VERIFY_ATTEMPTS; attempt += 1) {
      try {
        await onWalletCheckIn(txHash);
        break;
      } catch (error) {
        if (attempt >= WALLET_CHECK_IN_VERIFY_ATTEMPTS || !isRetryableWalletCheckInError(error)) {
          throw error;
        }

        toast.loading(`Transaction sent. Waiting for Monad confirmation (${attempt}/${WALLET_CHECK_IN_VERIFY_ATTEMPTS})...`, {
          id: WALLET_CHECK_IN_TOAST_ID,
          duration: 90_000,
        });
        await wait(WALLET_CHECK_IN_VERIFY_RETRY_MS);
      }
    }

    clearPendingWalletCheckInTx(walletAddress);
    setPendingWalletCheckInTx(null);
    setManualWalletCheckInTxHash('');
    toast.success('Daily wallet streak updated.', {
      id: WALLET_CHECK_IN_TOAST_ID,
      duration: 5600,
    });
  };

  const handleWalletCheckIn = async () => {
    if (!walletAddress || !canUseWalletCheckInPayment || walletCheckInSubmitting) return;

    setWalletCheckInSubmitting(true);
    try {
      const pendingTxHash = pendingWalletCheckInTx ?? readPendingWalletCheckInTx(walletAddress);
      if (pendingTxHash) {
        await verifyWalletCheckInTxHash(pendingTxHash, 'Verifying your already sent wallet check-in...');
        return;
      }

      const provider = getBrowserEthereumProvider();
      if (provider) {
        await ensureMonadMainnet(provider);
      }
      const paymentRequest = {
        to: walletCheckInReceiverAddress as `0x${string}`,
        value: parseEther(walletCheckInAmountMon),
      };
      const txHash = provider
        ? await provider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: walletAddress,
              to: paymentRequest.to,
              value: toHexQuantity(paymentRequest.value),
            }],
          })
        : await sendMonadPayment({
            sendTransactionAsync,
            receiverAddress: paymentRequest.to,
            monAmount: walletCheckInAmountMon,
            purpose: 'wallet-check-in',
            allowTestMode: false,
          });
      if (typeof txHash !== 'string' || !isWalletTransactionHash(txHash)) {
        throw new Error('Wallet did not return a transaction hash.');
      }

      await verifyWalletCheckInTxHash(txHash, 'Wallet check-in transaction sent. Verifying on-chain...');
    } catch (error) {
      showWalletCheckInError(error);
    } finally {
      setWalletCheckInSubmitting(false);
    }
  };

  const handleVerifyExistingWalletCheckIn = async () => {
    if (!walletAddress || walletCheckInSubmitting) return;
    const txHash = normalizeWalletTransactionHash(manualWalletCheckInTxHash);
    if (!txHash) {
      toast.error('Paste a valid transaction hash first.', {
        id: WALLET_CHECK_IN_TOAST_ID,
        duration: 5600,
      });
      return;
    }

    setWalletCheckInSubmitting(true);
    try {
      await verifyWalletCheckInTxHash(txHash, 'Verifying pasted wallet check-in transaction...');
    } catch (error) {
      showWalletCheckInError(error);
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

  const renderSocialRewardBadge = (task: SocialTaskProgress) => {
    if (task.rewardCubeCharge) {
      return (
        <>
          <Box className="h-4 w-4 text-cyan-200" />
          <span className="text-cyan-100">+{task.rewardCubeCharge} cube rolls</span>
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

    if (task.rewardCoins) {
      return (
        <>
          <CoinIcon size="md" />
          <span className="text-amber-300">{task.rewardCoins}</span>
        </>
      );
    }

    return <span className="text-[#f3d47e]">Preview</span>;
  };

  const getSocialStatusLabel = (task: SocialTaskProgress) => {
    if (task.status === 'claimed') return 'Claimed';
    if (task.canClaim || task.status === 'verified') return 'Ready';
    if (task.status === 'pending_verification') return 'Pending';
    return task.verificationMode === 'automatic' ? 'Available' : 'Preview';
  };

  const getQuestStatusLabel = (task: DailyTaskProgress | SpecialTaskProgress | WeeklyMissionProgress) => {
    if (task.claimed) return 'Claimed';
    if (task.progress >= task.target) return 'Ready';
    if (task.progress > 0) return 'In progress';
    return 'Not started';
  };

  const renderLeviathanBountyCard = () => {
    if (!leviathanBonusRod) return null;

    return (
      <QuestBoardCard className="md:col-span-2">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[0.64rem] font-black uppercase tracking-[0.16em] text-cyan-200/75 sm:text-xs">Trophy bounty</p>
              <h2 className="mt-1 pr-2 text-[0.96rem] font-black uppercase tracking-[0.04em] text-[#f3c777] drop-shadow-[0_1px_0_rgba(0,0,0,0.6)] sm:text-[1.2rem]">
                Catch Cosmic Leviathan
              </h2>
              <p className="mt-1.5 text-[0.8rem] leading-5 text-[#f8e8bf]/88 sm:mt-2 sm:text-[0.97rem] sm:leading-6">
                Land it with the {leviathanRequiredRod.name}. The reward applies instantly on the catch result.
              </p>
            </div>
            <div
              className="inline-flex shrink-0 flex-col items-end rounded-2xl border bg-[linear-gradient(180deg,rgba(48,31,14,0.95)_0%,rgba(30,19,10,0.92)_100%)] px-2.5 py-1.5 text-right shadow-[0_8px_16px_rgba(0,0,0,0.28)] sm:px-3 sm:py-2"
              style={{ borderColor: `${ROD_RARITY_COLORS[leviathanBonusRod.rarity]}80` }}
            >
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f8e8bf]/72">Reward</span>
              <span className="text-[0.8rem] font-black sm:text-sm" style={{ color: ROD_RARITY_COLORS[leviathanBonusRod.rarity] }}>
                {leviathanBonusRod.name}
              </span>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-[#8f6a38]/70 bg-[rgba(15,10,7,0.62)] px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f3c777]/70">Required rod</p>
              <p className="mt-1 text-sm font-black text-[#f8e8bf]">{leviathanRequiredRod.name}</p>
            </div>
            <div className="rounded-xl border border-[#8f6a38]/70 bg-[rgba(15,10,7,0.62)] px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f3c777]/70">Bounty</p>
              <p className="mt-1 text-sm font-black" style={{ color: ROD_RARITY_COLORS[leviathanBonusRod.rarity] }}>
                {ROD_RARITY_NAMES[leviathanBonusRod.rarity]}
              </p>
            </div>
            <div className="rounded-xl border border-[#8f6a38]/70 bg-[rgba(15,10,7,0.62)] px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f3c777]/70">Status</p>
              <p className="mt-1 text-sm font-black text-cyan-100">{leviathanBountyStatus}</p>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <Button
              type="button"
              disabled={ownsLeviathanBonusRod}
              onClick={() => {
                if (ownsLeviathanBonusRod) return;
                if (!hasLeviathanRodEquipped) {
                  onEquipRod(leviathanRequiredRod.level);
                  return;
                }
                onOpenFish();
              }}
              className="h-11 w-full rounded-[1rem] border border-[#7f5227] bg-[linear-gradient(180deg,#8c531f_0%,#6e4117_42%,#4f2f14_100%)] text-[0.86rem] font-black uppercase tracking-[0.04em] text-[#f8db9a] shadow-[inset_0_1px_0_rgba(255,220,160,0.22),0_10px_16px_rgba(0,0,0,0.28)] transition-all duration-200 hover:brightness-110 disabled:border-[#3a2817] disabled:bg-[linear-gradient(180deg,#2f241c_0%,#231b15_100%)] disabled:text-[#8c7b63] disabled:shadow-none sm:h-[3.25rem] sm:rounded-[1.2rem] sm:text-[1.02rem]"
            >
              {ownsLeviathanBonusRod ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Reward owned
                </>
              ) : hasLeviathanRodEquipped ? (
                <>
                  <Trophy className="mr-2 h-4 w-4" />
                  Go fish
                </>
              ) : (
                <>
                  <Trophy className="mr-2 h-4 w-4" />
                  Equip {leviathanRequiredRod.name}
                </>
              )}
            </Button>
          </div>
        </div>
      </QuestBoardCard>
    );
  };

  const boardHeader = (
    <div className="space-y-2">
      <TabsList className={`grid h-auto w-full gap-1 rounded-[1.1rem] border border-[#8f6a38]/70 bg-[rgba(16,11,8,0.84)] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md sm:gap-1.5 sm:rounded-[1.35rem] sm:p-1.5 ${isMobileLayout ? 'grid-cols-2' : weeklyMissionsEnabled ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <TabsTrigger value="daily" className="h-9 rounded-[0.8rem] px-2 text-[0.68rem] font-black uppercase tracking-[0.03em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:h-10 sm:rounded-[0.95rem] sm:text-[0.82rem] sm:tracking-[0.05em]">Daily</TabsTrigger>
        <TabsTrigger value="blockchain" className="h-9 rounded-[0.8rem] px-2 text-[0.68rem] font-black uppercase tracking-[0.03em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:h-10 sm:rounded-[0.95rem] sm:text-[0.82rem] sm:tracking-[0.05em]">Blockchain</TabsTrigger>
        {weeklyMissionsEnabled && (
          <TabsTrigger value="weekly" className="h-9 rounded-[0.8rem] px-2 text-[0.68rem] font-black uppercase tracking-[0.03em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:h-10 sm:rounded-[0.95rem] sm:text-[0.82rem] sm:tracking-[0.05em]">Weekly</TabsTrigger>
        )}
        <TabsTrigger value="social" className={`h-9 rounded-[0.8rem] px-2 text-[0.68rem] font-black uppercase tracking-[0.03em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:h-10 sm:rounded-[0.95rem] sm:text-[0.82rem] sm:tracking-[0.05em] ${!weeklyMissionsEnabled ? 'col-span-2 sm:col-span-1' : ''}`}>Social</TabsTrigger>
      </TabsList>
    </div>
  );

  const renderTaskBoard = (
    tasks: Array<DailyTaskProgress | SpecialTaskProgress | WeeklyMissionProgress>,
    onClaim: (id: TaskId | WeeklyMissionId) => void,
    footer: React.ReactNode,
    claimingId?: TaskId | WeeklyMissionId | null,
    leadingCard?: React.ReactNode,
  ) => (
    <QuestBoard
      layout={boardLayout}
      header={boardHeader}
      footer={footer}
      headerPlacement={isMobileLayout ? 'inline' : 'fixed'}
      footerPlacement={isMobileLayout ? 'inline' : 'fixed'}
      viewportInsets={boardViewportInsets}
    >
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3">
        {leadingCard}
        {tasks.map((task) => {
        const isWalletCheckInTask = task.id === 'wallet_check_in';
        const taskProgress = isWalletCheckInTask && walletCheckInRepeatTestMode ? 0 : task.progress;
        const taskClaimed = isWalletCheckInTask && walletCheckInRepeatTestMode ? false : task.claimed;
        const complete = taskProgress >= task.target;
        const progress = Math.min(100, (taskProgress / task.target) * 100);
        const statusLabel = getQuestStatusLabel({ ...task, progress: taskProgress, claimed: taskClaimed });
        const cubeChargeReward = 'rewardCubeCharge' in task ? (task.rewardCubeCharge ?? 0) : 0;
        const isClaiming = claimingId === task.id;
        const isInviteFriendTask = task.id === 'invite_friend';
        const hasPaymentIdentity = Boolean(walletAddress) && canUseWalletCheckInPayment;
        const walletCheckInReady = isWalletVerified && hasPaymentIdentity;
        const walletAlreadyCheckedInToday = !walletCheckInRepeatTestMode && Boolean(walletCheckInSummary?.todayCheckedIn);
        const walletCheckInNeedsVerification = isWalletConnected && !walletCheckInReady;
        const walletCheckInStatusText = !hasPaymentIdentity
          ? walletCheckInNeedsVerification
            ? `Verify your wallet first, then send today's ${walletCheckInPriceLabel} transaction to start or continue your streak.`
            : `Connect your wallet first, then send today's ${walletCheckInPriceLabel} transaction to start or continue your streak.`
          : !walletCheckInReady
            ? `Verify your wallet first, then send today's ${walletCheckInPriceLabel} transaction to start or continue your streak.`
          : walletCheckInLoading
            ? 'Refreshing streak status...'
          : pendingWalletCheckInTx
            ? 'A check-in transaction was already sent. Press the button to verify the same transaction; no new MON will be sent.'
            : walletAlreadyCheckedInToday
              ? `Checked in today. Streak: ${formatStreakDays(walletCheckInSummary.streakDays)}.`
            : walletCheckInSummary?.lastCheckInDate
                ? `Current streak: ${formatStreakDays(walletCheckInSummary.streakDays)}. Send today's ${walletCheckInPriceLabel} check-in to keep it going.`
                : `Start your streak with a ${walletCheckInPriceLabel} check-in today.`;

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
                <span>{taskProgress}/{task.target}</span>
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
                      disabled={
                        walletCheckInSubmitting
                        || walletCheckInLoading
                        || isWalletVerifying
                        || walletAlreadyCheckedInToday
                      }
                      onClick={() => {
                        if (!hasPaymentIdentity) {
                          if (walletCheckInNeedsVerification && onVerifyWallet) {
                            void onVerifyWallet();
                            return;
                          }

                          openConnectModal?.();
                          return;
                        }

                        if (!walletCheckInReady) {
                          if (onVerifyWallet) {
                            void onVerifyWallet();
                          } else {
                            toast.info('Wallet verification is still starting. Try again in a moment.');
                          }
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
                      ) : walletAlreadyCheckedInToday ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Checked in today
                        </>
                      ) : isWalletVerifying ? (
                        <>
                          <Clock3 className="mr-2 h-4 w-4" />
                          Verifying wallet
                        </>
                      ) : walletCheckInNeedsVerification ? (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Verify wallet to check in
                        </>
                      ) : !hasPaymentIdentity ? (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Connect wallet to check in
                        </>
                      ) : !walletCheckInReady ? (
                        <>
                          <Clock3 className="mr-2 h-4 w-4" />
                          Preparing wallet
                        </>
                      ) : pendingWalletCheckInTx ? (
                        <>
                          <Clock3 className="mr-2 h-4 w-4" />
                          Verify sent check-in
                        </>
                      ) : (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Send {walletCheckInPriceLabel} check-in
                        </>
                      )}
                    </Button>
                  )}
                </ConnectButton.Custom>
                {walletCheckInReady && !walletAlreadyCheckedInToday && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input
                      value={manualWalletCheckInTxHash}
                      onChange={(event) => setManualWalletCheckInTxHash(event.target.value)}
                      placeholder="Paste existing tx hash"
                      disabled={walletCheckInSubmitting}
                      className="h-10 rounded-[0.9rem] border-[#7f5227] bg-[rgba(12,8,5,0.74)] text-[0.76rem] font-bold text-[#f8db9a] placeholder:text-[#9b815b] focus-visible:ring-[#c89745] sm:text-xs"
                    />
                    <Button
                      type="button"
                      disabled={walletCheckInSubmitting || !normalizeWalletTransactionHash(manualWalletCheckInTxHash)}
                      onClick={() => void handleVerifyExistingWalletCheckIn()}
                      className="h-10 rounded-[0.9rem] border border-[#6b7f27] bg-[linear-gradient(180deg,#5f8122_0%,#456519_100%)] px-3 text-[0.74rem] font-black uppercase tracking-[0.04em] text-[#efffc8] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_14px_rgba(0,0,0,0.24)] hover:brightness-110 disabled:border-[#30351d] disabled:bg-[linear-gradient(180deg,#2f3324_0%,#25271d_100%)] disabled:text-[#7b826b] sm:text-xs"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Verify tx
                    </Button>
                  </div>
                )}
              </div>
            )}

            {isInviteFriendTask && REFERRAL_BAIT_ENABLED && (
              <div className="mt-3 rounded-[1.05rem] border border-[#8f6a38] bg-[linear-gradient(180deg,rgba(30,22,15,0.82)_0%,rgba(20,15,10,0.9)_100%)] p-3 sm:mt-4 sm:rounded-[1.2rem]">
                {Boolean(walletAddress) && referralSummary?.referralLink ? (
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

              {!(isWalletCheckInTask && walletCheckInRepeatTestMode) && (
              <div className="mt-auto pt-4">
                <Button
                  type="button"
                  disabled={!complete || taskClaimed || isClaiming}
                  onClick={() => {
                    void onClaim(task.id);
                  }}
                  className="h-11 w-full rounded-[1rem] border border-[#7f5227] bg-[linear-gradient(180deg,#8c531f_0%,#6e4117_42%,#4f2f14_100%)] text-[0.86rem] font-black uppercase tracking-[0.04em] text-[#f8db9a] shadow-[inset_0_1px_0_rgba(255,220,160,0.22),0_10px_16px_rgba(0,0,0,0.28)] transition-all duration-200 hover:brightness-110 disabled:border-[#3a2817] disabled:bg-[linear-gradient(180deg,#2f241c_0%,#231b15_100%)] disabled:text-[#8c7b63] disabled:shadow-none sm:h-[3.25rem] sm:rounded-[1.2rem] sm:text-[1.02rem]"
                >
                  {taskClaimed ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Claimed
                    </>
                  ) : isClaiming ? (
                    <>
                      <Clock3 className="mr-2 h-4 w-4" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      {cubeChargeReward > 0 ? <Box className="mr-2 h-4 w-4" /> : task.rewardBait ? <Worm className="mr-2 h-4 w-4" /> : <Coins className="mr-2 h-4 w-4" />}
                      Claim reward
                    </>
                  )}
                </Button>
              </div>
              )}
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
      headerPlacement={isMobileLayout ? 'inline' : 'fixed'}
      footerPlacement={isMobileLayout ? 'inline' : 'fixed'}
      viewportInsets={boardViewportInsets}
    >
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3">
      {socialTaskCards.map((task) => {
        const Icon = task.icon;
        const isXFollowTask = task.id === 'twitter_follow';
        const isSubmitting = submittingSocialTaskId === task.id || socialTasksLoading;
        const isClaiming = claimingSocialTaskId === task.id;
        const isClaimed = task.status === 'claimed';
        const canClaim = task.canClaim && !isClaimed;

        return (
          <QuestBoardCard key={task.id} className={`min-h-[11rem] text-left md:min-h-[12.75rem] ${isXFollowTask ? 'md:col-span-2' : ''}`}>
            <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[#8f6a38] bg-[rgba(15,10,7,0.72)] text-[#f3c777] shadow-[0_8px_16px_rgba(0,0,0,0.28)]">
                <Icon className="h-5 w-5" />
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#9a7a33] bg-[rgba(92,70,21,0.42)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#f3d47e]">
                {getSocialStatusLabel(task)}
              </span>
            </div>
            <h2 className="mt-3 pr-2 text-[0.96rem] font-black uppercase tracking-[0.04em] text-[#f3c777] drop-shadow-[0_1px_0_rgba(0,0,0,0.6)] sm:mt-4 sm:text-[1.2rem]">
              {task.title}
            </h2>
            <p className="mt-1.5 text-[0.8rem] leading-5 text-[#f8e8bf]/88 sm:mt-2 sm:text-[0.97rem] sm:leading-6">
              {isXFollowTask ? task.description : 'Social quests are still in preview. Rewards and verification will unlock in a later update.'}
            </p>
            <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-2xl border border-[#c89745] bg-[rgba(18,13,9,0.68)] px-2.5 py-1.5 text-[0.8rem] font-black shadow-[0_8px_16px_rgba(0,0,0,0.22)] sm:px-3 sm:text-sm">
              {renderSocialRewardBadge(task)}
            </div>

            {isXFollowTask ? (
              <div className="mt-auto pt-4">
                <Button
                  type="button"
                  disabled={
                    isSubmitting
                    || isClaiming
                    || isClaimed
                  }
                  onClick={() => {
                    if (canClaim) void handleClaimSocialReward(task.id);
                    else handleOpenXProfile(task);
                  }}
                  className="h-11 w-full rounded-[1rem] border border-[#7f5227] bg-[linear-gradient(180deg,#8c531f_0%,#6e4117_42%,#4f2f14_100%)] text-[0.86rem] font-black uppercase tracking-[0.04em] text-[#f8db9a] shadow-[inset_0_1px_0_rgba(255,220,160,0.22),0_10px_16px_rgba(0,0,0,0.28)] transition-all duration-200 hover:brightness-110 disabled:border-[#3a2817] disabled:bg-[linear-gradient(180deg,#2f241c_0%,#231b15_100%)] disabled:text-[#8c7b63] disabled:shadow-none sm:h-[3.25rem] sm:rounded-[1.2rem] sm:text-[1.02rem]"
                >
                  {isClaimed ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Claimed
                    </>
                  ) : isClaiming ? (
                    <>
                      <Clock3 className="mr-2 h-4 w-4" />
                      Claiming...
                    </>
                  ) : canClaim ? (
                    <>
                      <Box className="mr-2 h-4 w-4" />
                      Claim 3 cube rolls
                    </>
                  ) : isSubmitting ? (
                    <>
                      <Clock3 className="mr-2 h-4 w-4" />
                      Checking visit...
                    </>
                  ) : isWalletVerified ? (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open X and start check
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open X profile
                    </>
                  )}
                </Button>
                {task.proofUrl && (
                  <p className="mt-2 text-[0.72rem] font-bold text-[#f8e8bf]/72 sm:text-xs">
                    Visit recorded: @{SOCIAL_X_TARGET_USERNAME}
                  </p>
                )}
                {isSubmitting && (
                  <p className="mt-2 text-[0.72rem] font-bold text-[#f8e8bf]/72 sm:text-xs">
                    Keep the X profile open for a few seconds. The quest will become ready automatically.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-auto pt-4">
                <Button
                  type="button"
                  onClick={() => toast.info('Social quests are still in preview.')}
                  className="h-11 w-full rounded-[1rem] border border-[#7f5227] bg-[linear-gradient(180deg,#8c531f_0%,#6e4117_42%,#4f2f14_100%)] text-[0.86rem] font-black uppercase tracking-[0.04em] text-[#f8db9a] shadow-[inset_0_1px_0_rgba(255,220,160,0.22),0_10px_16px_rgba(0,0,0,0.28)] transition-all duration-200 hover:brightness-110 sm:h-[3.25rem] sm:rounded-[1.2rem] sm:text-[1.02rem]"
                >
                  Preview only
                </Button>
              </div>
            )}
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
      shellPaddingClassName="px-0 pb-[calc(var(--bottom-nav-clearance,6rem)+0.35rem)] pt-0"
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
            claimingTaskId,
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
            claimingTaskId,
            renderLeviathanBountyCard(),
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
              claimingWeeklyMissionId,
            )}
          </TabsContent>
        )}
        <TabsContent value="social" className="mt-0 min-h-0 flex-1 overflow-hidden">
          {renderSocialTaskBoard(
            <QuestBoardPlaque
              eyebrow="Community loop"
              description={
                isWalletVerified
                  ? `Open @${SOCIAL_X_TARGET_USERNAME}, wait a few seconds, and claim 3 cube rolls.`
                  : 'Connect your wallet first. Social quests and verified rewards only work on wallet-linked accounts.'
              }
            />,
          )}
        </TabsContent>
      </Tabs>
    </GameScreenShell>
  );
};

export default TasksScreen;
