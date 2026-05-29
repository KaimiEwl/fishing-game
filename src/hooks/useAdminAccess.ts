import { useEffect, useState } from 'react';
import { invokeHooklootEdge } from '@/lib/serverApi';
import { getStoredWalletSession } from '@/lib/walletSession';

const ADMIN_ACCESS_REFRESH_INTERVAL_MS = 300_000;

interface AdminWithdrawSummaryResponse {
  error?: string;
  summary: {
    pending_count: number;
  };
}

interface AdminCheckResponse {
  error?: string;
  is_admin?: boolean;
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
          if (!cancelled) {
            setIsAdmin(false);
            setPendingWithdrawCount(0);
          }
          return;
        }

        const { data: adminCheck, error: adminCheckError } = await invokeHooklootEdge<AdminCheckResponse>('admin', {
          body: {
            action: 'check_admin',
            wallet_address: walletAddress.toLowerCase(),
            session_token: session.token,
          },
        });

        if (adminCheckError || adminCheck?.error) {
          throw adminCheckError ?? new Error(adminCheck.error);
        }

        if (!adminCheck?.is_admin) {
          if (!cancelled) {
            setIsAdmin(false);
            setPendingWithdrawCount(0);
          }
          return;
        }

        if (!cancelled) {
          setIsAdmin(true);
        }

        try {
          const { data, error } = await invokeHooklootEdge<AdminWithdrawSummaryResponse>('admin', {
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
            setPendingWithdrawCount(data.summary?.pending_count ?? 0);
          }
        } catch {
          if (!cancelled) {
            setPendingWithdrawCount(0);
          }
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
    }, ADMIN_ACCESS_REFRESH_INTERVAL_MS);

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
