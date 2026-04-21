import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStoredWalletSession } from '@/lib/walletSession';
import { MON_HOLD_DAYS, MIN_WITHDRAW_MON, normalizeMonAmount } from '@/lib/monRewards';

interface MonBalanceSummaryResponse {
  totalEarnedMon?: number;
  pendingHoldMon?: number;
  withdrawableMon?: number;
  pendingRequestMon?: number;
  minWithdrawMon?: number;
  holdDays?: number;
}

interface WithdrawRequestRow {
  id: string;
  amount_mon: string | number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requested_at: string;
  processed_at: string | null;
  payout_tx_hash: string | null;
  admin_note: string | null;
}

export interface MonBalanceSummary {
  totalEarnedMon: number;
  pendingHoldMon: number;
  withdrawableMon: number;
  pendingRequestMon: number;
  minWithdrawMon: number;
  holdDays: number;
}

export interface PlayerWithdrawRequest {
  id: string;
  amountMon: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestedAt: string;
  processedAt: string | null;
  payoutTxHash: string | null;
  adminNote: string | null;
}

const EMPTY_SUMMARY: MonBalanceSummary = {
  totalEarnedMon: 0,
  pendingHoldMon: 0,
  withdrawableMon: 0,
  pendingRequestMon: 0,
  minWithdrawMon: MIN_WITHDRAW_MON,
  holdDays: MON_HOLD_DAYS,
};

const mapSummary = (summary: MonBalanceSummaryResponse | null | undefined): MonBalanceSummary => ({
  totalEarnedMon: normalizeMonAmount(summary?.totalEarnedMon ?? 0),
  pendingHoldMon: normalizeMonAmount(summary?.pendingHoldMon ?? 0),
  withdrawableMon: normalizeMonAmount(summary?.withdrawableMon ?? 0),
  pendingRequestMon: normalizeMonAmount(summary?.pendingRequestMon ?? 0),
  minWithdrawMon: normalizeMonAmount(summary?.minWithdrawMon ?? MIN_WITHDRAW_MON),
  holdDays: summary?.holdDays ?? MON_HOLD_DAYS,
});

const mapRequest = (request: WithdrawRequestRow): PlayerWithdrawRequest => ({
  id: request.id,
  amountMon: normalizeMonAmount(request.amount_mon ?? 0),
  status: request.status,
  requestedAt: request.requested_at,
  processedAt: request.processed_at,
  payoutTxHash: request.payout_tx_hash,
  adminNote: request.admin_note,
});

export function usePlayerMon(walletAddress: string | undefined, enabled: boolean) {
  const { toast } = useToast();
  const [summary, setSummary] = useState<MonBalanceSummary>(EMPTY_SUMMARY);
  const [requests, setRequests] = useState<PlayerWithdrawRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const refreshInFlightRef = useRef(false);

  const callPlayerMon = useCallback(async <T>(action: string, payload: Record<string, unknown> = {}) => {
    if (!walletAddress) throw new Error('Missing wallet');
    const session = getStoredWalletSession();
    if (!session || session.address.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error('Wallet session expired. Reconnect in the game first.');
    }

    const { data, error } = await supabase.functions.invoke('player-mon', {
      body: {
        action,
        wallet_address: walletAddress.toLowerCase(),
        session_token: session.token,
        ...payload,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as T;
  }, [walletAddress]);

  const refresh = useCallback(async () => {
    if (!enabled || !walletAddress || refreshInFlightRef.current) return false;

    refreshInFlightRef.current = true;
    setLoading(true);
    try {
      const [summaryResponse, requestsResponse] = await Promise.all([
        callPlayerMon<{ summary: MonBalanceSummaryResponse }>('get_mon_summary'),
        callPlayerMon<{ requests: WithdrawRequestRow[] }>('list_my_withdraw_requests', { limit: 12 }),
      ]);

      setSummary(mapSummary(summaryResponse.summary));
      setRequests((requestsResponse.requests ?? []).map(mapRequest));
      return true;
    } catch (error) {
      console.error('MON rewards refresh failed:', error);
      return false;
    } finally {
      refreshInFlightRef.current = false;
      setLoading(false);
    }
  }, [callPlayerMon, enabled, walletAddress]);

  const createWithdrawRequest = useCallback(async () => {
    if (!enabled || requesting) return null;

    setRequesting(true);
    try {
      const data = await callPlayerMon<{
        request: WithdrawRequestRow;
        summary: MonBalanceSummaryResponse;
      }>('create_withdraw_request');

      setSummary(mapSummary(data.summary));
      setRequests((current) => [mapRequest(data.request), ...current]);
      toast({
        title: 'Withdraw requested',
        description: 'Your MON withdraw request was added to the admin queue.',
      });

      return mapRequest(data.request);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Could not create withdraw request.';
      toast({
        title: 'Withdraw request failed',
        description,
        variant: 'destructive',
      });
      return null;
    } finally {
      setRequesting(false);
    }
  }, [callPlayerMon, enabled, requesting, toast]);

  useEffect(() => {
    if (!enabled || !walletAddress) {
      setSummary(EMPTY_SUMMARY);
      setRequests([]);
      setLoading(false);
      return;
    }

    void refresh();
  }, [enabled, refresh, walletAddress]);

  useEffect(() => {
    if (!enabled || !walletAddress) return undefined;

    const handleWindowFocus = () => {
      void refresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    }, 30000);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, refresh, walletAddress]);

  return {
    summary,
    requests,
    loading,
    requesting,
    refresh,
    createWithdrawRequest,
  };
}
