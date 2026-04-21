import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getStoredWalletSession } from '@/lib/walletSession';

interface AdminWithdrawSummaryResponse {
  summary: {
    pending_count: number;
  };
}

export function useAdminAccess(walletAddress: string | undefined, enabled: boolean) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [pendingWithdrawCount, setPendingWithdrawCount] = useState(0);

  useEffect(() => {
    if (!enabled || !walletAddress) {
      setIsAdmin(null);
      setPendingWithdrawCount(0);
      return;
    }

    let cancelled = false;

    const checkAdminAccess = async () => {
      try {
        const session = getStoredWalletSession();
        if (!session || session.address.toLowerCase() !== walletAddress.toLowerCase()) {
          if (!cancelled) setIsAdmin(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('admin', {
          body: {
            action: 'get_admin_withdraw_summary',
            wallet_address: walletAddress.toLowerCase(),
            session_token: session.token,
          },
        });

        if (error || data?.error) {
          throw error ?? new Error(data.error);
        }

        if (!cancelled) {
          setIsAdmin(true);
          setPendingWithdrawCount((data as AdminWithdrawSummaryResponse).summary?.pending_count ?? 0);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setPendingWithdrawCount(0);
        }
      }
    };

    void checkAdminAccess();

    const handleWindowFocus = () => {
      void checkAdminAccess();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkAdminAccess();
      }
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkAdminAccess();
      }
    }, 30000);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, walletAddress]);

  return { isAdmin, pendingWithdrawCount };
}
