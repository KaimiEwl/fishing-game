import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getStoredWalletSession } from '@/lib/walletSession';

interface AdminCheckResponse {
  is_admin: boolean;
}

export function useAdminAccess(walletAddress: string | undefined, enabled: boolean) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!enabled || !walletAddress) {
      setIsAdmin(null);
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
            action: 'check_admin',
            wallet_address: walletAddress.toLowerCase(),
            session_token: session.token,
          },
        });

        if (error || data?.error) {
          throw error ?? new Error(data.error);
        }

        if (!cancelled) {
          setIsAdmin((data as AdminCheckResponse).is_admin === true);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    };

    void checkAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [enabled, walletAddress]);

  return isAdmin;
}
