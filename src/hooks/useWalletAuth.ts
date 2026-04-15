import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';
import type { PlayerState } from '@/types/game';
import { XP_PER_LEVEL } from '@/types/game';

interface PlayerRecord {
  wallet_address: string;
  coins: number;
  bait: number;
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
}

const SESSION_KEY = 'monadfish_session';

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

function mapPlayerRecord(p: PlayerRecord): PlayerState {
  return {
    coins: p.coins,
    bait: p.bait,
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
  const sessionTokenRef = useRef<string | null>(null);
  const restoredRef = useRef(false);

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
      sessionTokenRef.current = stored.token;
      setSavedPlayer(mapPlayerRecord(data.player as PlayerRecord));
      return true;
    } catch {
      return false;
    }
  }, []);

  const verifyWallet = useCallback(async () => {
    if (!address || isVerifying) return;
    
    setIsVerifying(true);
    try {
      const message = `MonadFish: Sign to verify your wallet\nAddress: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ account: address, message });
      
      const { data, error } = await supabase.functions.invoke('verify-wallet', {
        body: { wallet_address: address, signature, message },
      });

      if (error) throw error;

      const token = data.session_token || address.toLowerCase();
      setIsVerified(true);
      sessionTokenRef.current = token;
      storeSession(address, token);
      
      if (data.player) {
        setSavedPlayer(mapPlayerRecord(data.player as PlayerRecord));
      }
    } catch (err) {
      console.error('Wallet verification failed:', err);
      disconnect();
    } finally {
      setIsVerifying(false);
    }
  }, [address, isVerifying, signMessageAsync, disconnect]);

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
      sessionTokenRef.current = null;
      restoredRef.current = false;
      clearStoredSession();
    }

    return () => { cancelled = true; };
  }, [isConnected, address, isVerified, isVerifying, verifyWallet, tryRestoreSession]);

  const saveProgress = useCallback(async (player: PlayerState) => {
    if (!address || !isVerified || !sessionTokenRef.current) return;
    
    try {
      await supabase.functions.invoke('verify-wallet', {
        body: {
          wallet_address: address,
          session_token: sessionTokenRef.current,
          player_data: player,
        },
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  }, [address, isVerified]);

  return {
    address,
    isConnected,
    isVerified,
    isVerifying,
    savedPlayer,
    saveProgress,
    disconnect,
  };
}
