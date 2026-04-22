import React from 'react';
import { RefreshCcw } from 'lucide-react';
import type { AdminSocialTaskVerification } from '@/hooks/useAdmin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type SocialTaskStatusFilter = AdminSocialTaskVerification['status'] | 'all';

interface AdminSocialTaskCenterProps {
  verifications: AdminSocialTaskVerification[];
  filter: SocialTaskStatusFilter;
  loading?: boolean;
  processingVerificationId?: string | null;
  onFilterChange: (value: SocialTaskStatusFilter) => void;
  onRefresh: () => void;
  onSetStatus: (
    verification: AdminSocialTaskVerification,
    status: AdminSocialTaskVerification['status'],
  ) => Promise<void> | void;
}

const FILTERS: Array<{ value: SocialTaskStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'pending_verification', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'claimed', label: 'Claimed' },
];

const STATUS_TONES: Record<AdminSocialTaskVerification['status'], string> = {
  available: 'border-zinc-700 bg-zinc-900 text-zinc-200',
  pending_verification: 'border-yellow-400/20 bg-yellow-400/10 text-yellow-200',
  verified: 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100',
  claimed: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
};

const formatDateTime = (value: string) => new Date(value).toLocaleString();

const STATUS_ACTIONS: AdminSocialTaskVerification['status'][] = [
  'available',
  'pending_verification',
  'verified',
  'claimed',
];

const getPlayerLabel = (verification: AdminSocialTaskVerification) =>
  verification.playerNickname || `${verification.walletAddress.slice(0, 6)}...${verification.walletAddress.slice(-4)}`;

const AdminSocialTaskCenter: React.FC<AdminSocialTaskCenterProps> = ({
  verifications,
  filter,
  loading = false,
  processingVerificationId = null,
  onFilterChange,
  onRefresh,
  onSetStatus,
}) => (
  <div className="space-y-4">
    <Card className="border-zinc-800 bg-zinc-950">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base text-zinc-100">Social task verification scaffold</CardTitle>
          <p className="mt-1 text-xs text-zinc-500">
            Manual/admin override layer for future X, Discord, and Telegram task rollout.
          </p>
        </div>
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
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            className="border-zinc-800 bg-black text-zinc-100 hover:bg-zinc-900"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[32rem] pr-3">
          <div className="space-y-3">
            {verifications.map((verification) => {
              const isProcessing = processingVerificationId === verification.id;

              return (
                <div key={verification.id} className="rounded-lg border border-zinc-800 bg-black/60 px-4 py-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-100">{getPlayerLabel(verification)}</span>
                        <Badge className={cn('border', STATUS_TONES[verification.status])}>
                          {verification.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="font-mono text-[11px] text-zinc-400">{verification.walletAddress}</p>
                      <p className="text-sm text-zinc-200">{verification.taskTitle}</p>
                      <p className="text-xs text-zinc-500">Updated: {formatDateTime(verification.updatedAt)}</p>
                      {verification.proofUrl && (
                        <a
                          href={verification.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-xs font-medium text-cyan-100 hover:text-cyan-50"
                        >
                          {verification.proofUrl}
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {STATUS_ACTIONS.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          variant="outline"
                          disabled={isProcessing || verification.status === status}
                          onClick={() => void onSetStatus(verification, status)}
                          className={cn(
                            'border-zinc-800 bg-black text-zinc-100 hover:bg-zinc-900',
                            verification.status === status && 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
                          )}
                        >
                          {isProcessing && verification.status !== status ? 'Saving...' : status.replace(/_/g, ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {verifications.length === 0 && (
              <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-400">
                {loading ? 'Loading social task verifications...' : 'No social task verification rows for the selected filter.'}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  </div>
);

export default AdminSocialTaskCenter;
