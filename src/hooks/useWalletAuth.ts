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

export interface ReferralSummary {
  rewardedReferralCount: number;
  maxRewardedReferrals: number;
  referrerWalletAddress: string | null;
  referralLink: string | null;
}

const SESSION_KEY = 'monadfish_session';
const REFERRAL_STORAGE_KEY = 'hook_loot_pending_referrer_v1';

function normalizeWalletAddress(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? trimmed.toLowerCase() : null;
}

function getStoredSession(): { address: string; token: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function storeSession(address: string, token: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ address, token }));
}

function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
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
  
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [savedPlayer, setSavedPlayer] = useState<PlayerState | null>(null);
  const [referralSummary, setReferralSummary] = useState<ReferralSummary | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const restoredRef = useRef(false);

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
    const stored = getStoredSession();
    if (!stored || stored.address.toLowerCase() !== addr.toLowerCase()) return false;

    try {
      const { data, error } = await supabase.functions.invoke('verify-wallet', {
        body: { wallet_address: addr, session_token: stored.token },
      });

      if (error || !data?.player) return false;

      setIsVerified(true);
      const nextToken = data.session_token || stored.token;
      sessionTokenRef.current = nextToken;
      storeSession(addr, nextToken);
      const playerRecord = data.player as PlayerRecord;
      setSavedPlayer(syncLocalPlayerFromServer(playerRecord));
      syncReferralSummary(playerRecord);
      return true;
    } catch {
      return false;
    }
  }, [syncLocalPlayerFromServer, syncReferralSummary]);

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
      storeSession(address, token);
      
      if (data.player) {
        const playerRecord = data.player as PlayerRecord;
        const mappedPlayer = syncLocalPlayerFromServer(data.player as PlayerRecord);
        setSavedPlayer(mappedPlayer);
        syncReferralSummary(playerRecord);

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
  }, [address, isVerifying, signMessageAsync, disconnect, syncLocalPlayerFromServer, syncReferralSummary]);

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
      clearStoredSession();
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
