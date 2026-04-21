import React, { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Clock3, RefreshCcw, Wallet } from 'lucide-react';
import type { AdminWithdrawRequest, AdminWithdrawSummary, WithdrawRequestStatus } from '@/hooks/useAdmin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatMonAmount } from '@/lib/monRewards';
import { cn } from '@/lib/utils';

interface AdminWithdrawRequestCenterProps {
  requests: AdminWithdrawRequest[];
  summary: AdminWithdrawSummary | null;
  filter: WithdrawRequestStatus | 'all';
  loading?: boolean;
  processingRequestId?: string | null;
  onFilterChange: (value: WithdrawRequestStatus | 'all') => void;
  onRefresh: () => void;
  onApprove: (requestId: string) => Promise<void> | void;
  onReject: (requestId: string) => Promise<void> | void;
  onMarkPaid: (requestId: string, payoutTxHash: string) => Promise<void> | void;
}

const FILTERS: Array<{ value: WithdrawRequestStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
];

const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : '--';

const getStatusTone = (status: WithdrawRequestStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-400/10 text-yellow-200 border-yellow-400/20';
    case 'approved':
      return 'bg-cyan-300/10 text-cyan-100 border-cyan-300/20';
    case 'rejected':
      return 'bg-red-400/10 text-red-200 border-red-400/20';
    case 'paid':
      return 'bg-emerald-400/10 text-emerald-200 border-emerald-400/20';
    default:
      return 'bg-zinc-800 text-zinc-200 border-zinc-700';
  }
};

const AdminWithdrawRequestCenter: React.FC<AdminWithdrawRequestCenterProps> = ({
  requests,
  summary,
  filter,
  loading = false,
  processingRequestId = null,
  onFilterChange,
  onRefresh,
  onApprove,
  onReject,
  onMarkPaid,
}) => {
  const [txHashes, setTxHashes] = useState<Record<string, string>>({});

  const filteredCountLabel = useMemo(() => {
    if (filter === 'all') return `${requests.length} requests`;
    return `${requests.length} ${filter}`;
  }, [filter, requests.length]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-yellow-200">{summary?.pending_count ?? 0}</p>
            <p className="mt-1 text-xs text-zinc-500">{formatMonAmount(summary?.pending_amount_mon ?? 0)} MON</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-cyan-100">{summary?.approved_count ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-red-200">{summary?.rejected_count ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-emerald-200">{summary?.paid_count ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base text-zinc-100">Withdraw queue</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant="outline"
                onClick={() => onFilterChange(item.value)}
                className={cn(
                  'border-zinc-800 bg-black text-zinc-100 hover:bg-zinc-900',
                  filter === item.value && 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
                )}
              >
                {item.label}
              </Button>
            ))}
            <Button type="button" variant="outline" onClick={onRefresh} className="border-zinc-800 bg-black text-zinc-100 hover:bg-zinc-900">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-zinc-400">{filteredCountLabel}</p>
          <ScrollArea className="h-[28rem] pr-3">
            <div className="space-y-3">
              {requests.map((request) => {
                const txHash = txHashes[request.id] ?? '';
                const isProcessing = processingRequestId === request.id;

                return (
                  <div key={request.id} className="rounded-lg border border-zinc-800 bg-black/60 px-4 py-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-100">
                            {request.playerNickname || request.walletAddress}
                          </span>
                          <Badge className={cn('border', getStatusTone(request.status))}>
                            {request.status}
                          </Badge>
                        </div>
                        <p className="font-mono text-xs text-zinc-400">{request.walletAddress}</p>
                        <p className="text-sm text-zinc-300">
                          {formatMonAmount(request.amountMon)} MON
                        </p>
                        <p className="text-xs text-zinc-500">Requested: {formatDateTime(request.requestedAt)}</p>
                        {request.processedAt && (
                          <p className="text-xs text-zinc-500">Processed: {formatDateTime(request.processedAt)}</p>
                        )}
                        {request.payoutTxHash && (
                          <p className="truncate text-xs text-zinc-500">Tx: {request.payoutTxHash}</p>
                        )}
                        {request.adminNote && (
                          <p className="text-xs text-zinc-400">{request.adminNote}</p>
                        )}
                      </div>

                      <div className="flex w-full max-w-md flex-col gap-2">
                        {request.status === 'approved' && (
                          <Input
                            value={txHash}
                            onChange={(event) => setTxHashes((current) => ({ ...current, [request.id]: event.target.value }))}
                            placeholder="Payout tx hash"
                            className="border-zinc-800 bg-black text-zinc-100"
                          />
                        )}

                        <div className="flex flex-wrap gap-2">
                          {request.status === 'pending' && (
                            <>
                              <Button
                                type="button"
                                onClick={() => void onApprove(request.id)}
                                disabled={isProcessing}
                                className="gap-2"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                {isProcessing ? 'Approving...' : 'Approve'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => void onReject(request.id)}
                                disabled={isProcessing}
                                className="border-zinc-800 bg-black text-zinc-100 hover:bg-zinc-900"
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {request.status === 'approved' && (
                            <>
                              <Button
                                type="button"
                                onClick={() => void onMarkPaid(request.id, txHash)}
                                disabled={isProcessing || !txHash.trim()}
                                className="gap-2"
                              >
                                <ArrowUpRight className="h-4 w-4" />
                                {isProcessing ? 'Marking...' : 'Mark paid'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => void onReject(request.id)}
                                disabled={isProcessing}
                                className="border-zinc-800 bg-black text-zinc-100 hover:bg-zinc-900"
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {request.status === 'rejected' && (
                            <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500">
                              <Clock3 className="h-3.5 w-3.5" />
                              Rejected request
                            </span>
                          )}

                          {request.status === 'paid' && (
                            <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300">
                              <Wallet className="h-3.5 w-3.5" />
                              Paid out
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {requests.length === 0 && (
                <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-400">
                  {loading ? 'Loading withdraw requests...' : 'No withdraw requests for the selected filter.'}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWithdrawRequestCenter;
