import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';
import { type PlayerState, XP_PER_LEVEL } from '@/types/game';
import {
  BAIT_BUCKETS_V2_ENABLED,
  DAILY_FREE_BAIT,
  MAX_REWARDED_REFERRALS_PER_INVITER,
  REFERRAL_BAIT_ENABLED,
} from '@/lib/baitEconomy';
import {
  applyServerBonusBaitSync,
  loadStoredPlayer,
  normalizePlayerDailyFreeBait,
  storePlayerLocally,
} from '@/lib/playerStorage';
import {
  clearStoredWalletSession,
  getStoredWalletSession,
  storeWalletSession,
} from '@/lib/walletSession';
import { useToast } from '@/hooks/use-toast';

interface PlayerRecord {
  wallet_address: string;
  coins: number;
  bait: number;
  daily_free_bait?: number;
  daily_free_bait_reset_at?: string | null;
  bonus_bait_granted_total?: number;
  level: number;
  xp: number;
  xp_to_next: number;
  rod_level: number;
  equipped_rod: number;
  inventory: unknown[];
  total_catches: number;
  login_streak: number;
  nft_rods: number[];
  nickname: string | null;
  avatar_url: string | null;
  referrer_wallet_address?: string | null;
  rewarded_referral_count?: number;
}

interface ReferralRewardNotification {
  invitedWalletAddress: string | null;
  invitedPlayerName: string | null;
  rewardBait: number;
  createdAt: string;
}

export interface ReferralSummary {
  rewardedReferralCount: number;
  maxRewardedReferrals: number;
  referrerWalletAddress: string | null;
  referralLink: string | null;
}

const REFERRAL_STORAGE_KEY = 'hook_loot_pending_referrer_v1';

function normalizeWalletAddress(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? trimmed.toLowerCase() : null;
}

function getPendingReferrer(): string | null {
  try {
    return normalizeWalletAddress(localStorage.getItem(REFERRAL_STORAGE_KEY));
  } catch {
    return null;
  }
}

function storePendingReferrer(referrerWalletAddress: string) {
  localStorage.setItem(REFERRAL_STORAGE_KEY, referrerWalletAddress);
}

function clearPendingReferrer() {
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
}

function buildReferralLink(walletAddress: string | null | undefined): string | null {
  const normalizedAddress = normalizeWalletAddress(walletAddress);
  if (!normalizedAddress) return null;

  const referralUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  referralUrl.searchParams.set('ref', normalizedAddress);
  return referralUrl.toString();
}

function mapPlayerRecord(p: PlayerRecord): PlayerState {
  return {
    coins: p.coins,
    bait: p.bait,
    dailyFreeBait: p.daily_free_bait ?? 0,
    dailyFreeBaitResetAt: p.daily_free_bait_reset_at ?? null,
    bonusBaitGrantedTotal: p.bonus_bait_granted_total ?? 0,
    level: p.level,
    xp: p.xp,
    xpToNextLevel: p.xp_to_next || p.level * XP_PER_LEVEL,
    rodLevel: p.rod_level,
    equippedRod: p.equipped_rod ?? p.rod_level,
    inventory: (p.inventory || []) as PlayerState['inventory'],
    totalCatches: p.total_catches,
    dailyBonusClaimed: false,
    loginStreak: p.login_streak || 1,
    nftRods: (p.nft_rods || []) as number[],
    nickname: p.nickname || null,
    avatarUrl: p.avatar_url || null,
  };
}

export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [savedPlayer, setSavedPlayer] = useState<PlayerState | null>(null);
  const [referralSummary, setReferralSummary] = useState<ReferralSummary | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const restoredRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const savedPlayerRef = useRef<PlayerState | null>(null);
  const referralSummaryRef = useRef<ReferralSummary | null>(null);

  useEffect(() => {
    savedPlayerRef.current = savedPlayer;
  }, [savedPlayer]);

  useEffect(() => {
    referralSummaryRef.current = referralSummary;
  }, [referralSummary]);

  const syncReferralSummary = useCallback((playerRecord: PlayerRecord) => {
    if (!REFERRAL_BAIT_ENABLED) {
      setReferralSummary(null);
      return;
    }

    const referralLink = buildReferralLink(playerRecord.wallet_address ?? address);
    setReferralSummary({
      rewardedReferralCount: playerRecord.rewarded_referral_count ?? 0,
      maxRewardedReferrals: MAX_REWARDED_REFERRALS_PER_INVITER,
      referrerWalletAddress: playerRecord.referrer_wallet_address ?? null,
      referralLink,
    });
  }, [address]);

  const syncLocalPlayerFromServer = useCallback((playerRecord: PlayerRecord) => {
    const mappedPlayer = normalizePlayerDailyFreeBait(
      mapPlayerRecord(playerRecord),
      BAIT_BUCKETS_V2_ENABLED,
      DAILY_FREE_BAIT,
    );
    const localPlayer = loadStoredPlayer(mappedPlayer);
    const normalizedLocalPlayer = localPlayer
      ? normalizePlayerDailyFreeBait(localPlayer, BAIT_BUCKETS_V2_ENABLED, DAILY_FREE_BAIT)
      : mappedPlayer;

    const nextStoredPlayer = applyServerBonusBaitSync({
      ...normalizedLocalPlayer,
      nickname: normalizedLocalPlayer.nickname ?? mappedPlayer.nickname,
      avatarUrl: normalizedLocalPlayer.avatarUrl ?? mappedPlayer.avatarUrl,
      nftRods: Array.from(new Set([...mappedPlayer.nftRods, ...normalizedLocalPlayer.nftRods])).sort((a, b) => a - b),
    }, mappedPlayer.bonusBaitGrantedTotal);

    storePlayerLocally(nextStoredPlayer);
    return nextStoredPlayer;
  }, []);

  const showReferralRewardToast = useCallback((reward: ReferralRewardNotification | null | undefined) => {
    if (!reward) return;

    const referralLabel = reward.invitedPlayerName?.trim()
      || (reward.invitedWalletAddress
        ? `${reward.invitedWalletAddress.slice(0, 6)}...${reward.invitedWalletAddress.slice(-4)}`
        : 'your referral');

    toast({
      title: `+${reward.rewardBait} bait received`,
      description: `You received +${reward.rewardBait} bait for referral ${referralLabel}.`,
    });
  }, [toast]);

  const applyVerifiedPlayerPayload = useCallback((
    playerRecord: PlayerRecord,
    latestReferralReward?: ReferralRewardNotification | null,
  ) => {
    const previousRewardedCount = referralSummaryRef.current?.rewardedReferralCount ?? 0;
    const previousBonusGranted = savedPlayerRef.current?.bonusBaitGrantedTotal ?? 0;
    const nextStoredPlayer = syncLocalPlayerFromServer(playerRecord);
    setSavedPlayer(nextStoredPlayer);
    syncReferralSummary(playerRecord);

    if (
      REFERRAL_BAIT_ENABLED
      && (playerRecord.rewarded_referral_count ?? 0) > previousRewardedCount
      && (playerRecord.bonus_bait_granted_total ?? 0) > previousBonusGranted
    ) {
      showReferralRewardToast(latestReferralReward);
    }

    return nextStoredPlayer;
  }, [showReferralRewardToast, syncLocalPlayerFromServer, syncReferralSummary]);

  useEffect(() => {
    if (!REFERRAL_BAIT_ENABLED) return;

    const searchParams = new URLSearchParams(window.location.search);
    const pendingReferrer = normalizeWalletAddress(
      searchParams.get('ref') ?? searchParams.get('referrer'),
    );

    if (pendingReferrer) {
      storePendingReferrer(pendingReferrer);
    }
  }, []);

  // Try to restore session from localStorage on page refresh
  const tryRestoreSession = useCallback(async (addr: string) => {
    const stored = getStoredWalletSession();
    if (!stored || stored.address.toLowerCase() !== addr.toLowerCase()) return false;

    try {
      const { data, error } = await supabase.functions.invoke('verify-wallet', {
        body: { wallet_address: addr, session_token: stored.token },
      });

      if (error || !data?.player) return false;

      setIsVerified(true);
      const nextToken = data.session_token || stored.token;
      sessionTokenRef.current = nextToken;
      storeWalletSession(addr, nextToken);
      const playerRecord = data.player as PlayerRecord;
      applyVerifiedPlayerPayload(
        playerRecord,
        (data.latest_referral_reward as ReferralRewardNotification | null | undefined) ?? null,
      );
      return true;
    } catch {
      return false;
    }
  }, [applyVerifiedPlayerPayload]);

  const refreshVerifiedSession = useCallback(async () => {
    if (
      !address
      || !isConnected
      || !isVerified
      || isVerifying
      || refreshInFlightRef.current
      || !sessionTokenRef.current
    ) {
      return false;
    }

    refreshInFlightRef.current = true;
    try {
      const { data, error } = await supabase.functions.invoke('verify-wallet', {
        body: {
          wallet_address: address,
          session_token: sessionTokenRef.current,
        },
      });

      if (error || !data?.player) return false;

      const nextToken = data.session_token || sessionTokenRef.current;
      sessionTokenRef.current = nextToken;
      storeWalletSession(address, nextToken);
      applyVerifiedPlayerPayload(
        data.player as PlayerRecord,
        (data.latest_referral_reward as ReferralRewardNotification | null | undefined) ?? null,
      );
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [address, applyVerifiedPlayerPayload, isConnected, isVerified, isVerifying]);

  const verifyWallet = useCallback(async () => {
    if (!address || isVerifying) return;
    
    setIsVerifying(true);
    try {
      const pendingReferrer = REFERRAL_BAIT_ENABLED ? getPendingReferrer() : null;
      const message = `Hook & Loot: Sign to verify your wallet\nAddress: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ account: address, message });
      
      const { data, error } = await supabase.functions.invoke('verify-wallet', {
        body: {
          wallet_address: address,
          signature,
          message,
          referrer_wallet_address: pendingReferrer,
        },
      });

      if (error) throw error;

      const token = data.session_token || address.toLowerCase();
      setIsVerified(true);
      sessionTokenRef.current = token;
      storeWalletSession(address, token);
      
      if (data.player) {
        const playerRecord = data.player as PlayerRecord;
        applyVerifiedPlayerPayload(
          playerRecord,
          (data.latest_referral_reward as ReferralRewardNotification | null | undefined) ?? null,
        );

        if (
          pendingReferrer
          && (playerRecord.referrer_wallet_address != null || pendingReferrer === address.toLowerCase())
        ) {
          clearPendingReferrer();
        }
      }
    } catch (err) {
      console.error('Wallet verification failed:', err);
      disconnect();
    } finally {
      setIsVerifying(false);
    }
  }, [address, applyVerifiedPlayerPayload, isVerifying, signMessageAsync, disconnect]);

  useEffect(() => {
    if (!isConnected || !address || !isVerified) return;

    const handleWindowFocus = () => {
      void refreshVerifiedSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshVerifiedSession();
      }
    };

    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshVerifiedSession();
      }
    }, 30000);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(pollInterval);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [address, isConnected, isVerified, refreshVerifiedSession]);

  // Auto-restore or auto-verify when wallet connects
  useEffect(() => {
    let cancelled = false;

    if (isConnected && address && !isVerified && !isVerifying) {
      if (!restoredRef.current) {
        restoredRef.current = true;
        tryRestoreSession(address).then((restored) => {
          if (cancelled) return;
          if (!restored) {
            verifyWallet();
          }
        });
      } else {
        verifyWallet();
      }
    }
    if (!isConnected) {
      setIsVerified(false);
      setSavedPlayer(null);
      setReferralSummary(null);
      sessionTokenRef.current = null;
      restoredRef.current = false;
      clearStoredWalletSession();
    }

    return () => { cancelled = true; };
  }, [isConnected, address, isVerified, isVerifying, verifyWallet, tryRestoreSession]);

  return {
    address,
    isConnected,
    isVerified,
    isVerifying,
    savedPlayer,
    referralSummary,
    disconnect,
  };
}
