import React from 'react';
import { CalendarRange, RefreshCcw, Trophy } from 'lucide-react';
import type { AdminWeeklyPayoutBatch, AdminWeeklyPayoutPreviewEntry } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatMonAmount } from '@/lib/monRewards';

interface AdminWeeklyPayoutCenterProps {
  weekKey: string | null;
  preview: AdminWeeklyPayoutPreviewEntry[];
  batches: AdminWeeklyPayoutBatch[];
  alreadyApplied: boolean;
  loading?: boolean;
  applying?: boolean;
  onRefresh: () => void;
  onApply: () => void;
}

const formatDateTime = (value: string | null | undefined) => (
  value ? new Date(value).toLocaleString() : '--'
);

const AdminWeeklyPayoutCenter: React.FC<AdminWeeklyPayoutCenterProps> = ({
  weekKey,
  preview,
  batches,
  alreadyApplied,
  loading = false,
  applying = false,
  onRefresh,
  onApply,
}) => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-[1.05fr,0.95fr]">
      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base text-zinc-100">Weekly payout preview</CardTitle>
            <p className="mt-1 text-xs text-zinc-500">
              Week key: {weekKey ?? '--'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              className="border-zinc-800 bg-black text-zinc-100 hover:bg-zinc-900"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" onClick={onApply} disabled={alreadyApplied || applying || preview.length === 0}>
              {applying ? 'Applying...' : alreadyApplied ? 'Already applied' : 'Apply weekly payout'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {preview.length > 0 ? preview.map((entry) => (
            <div key={`${entry.rank}-${entry.walletAddress}`} className="rounded-lg border border-zinc-800 bg-black/60 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">#{entry.rank} {entry.name}</p>
                  <p className="mt-1 font-mono text-xs text-zinc-400">{entry.walletAddress}</p>
                  <p className="mt-1 text-xs text-zinc-500">{entry.score.toLocaleString()} score • {entry.dishes} dishes</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-sm font-bold text-emerald-200">
                  <Trophy className="h-4 w-4" />
                  {formatMonAmount(entry.amountMon)} MON
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-400">
              {loading ? 'Loading weekly preview...' : 'No weekly payout candidates yet.'}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
            <CalendarRange className="h-4 w-4 text-cyan-100" />
            Applied history
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[25rem] pr-3">
            <div className="space-y-3">
              {batches.map((batch) => (
                <div key={batch.id} className="rounded-lg border border-zinc-800 bg-black/60 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">Week {batch.weekKey}</p>
                      <p className="mt-1 text-xs text-zinc-500">Applied: {formatDateTime(batch.appliedAt)}</p>
                      <p className="mt-1 text-xs text-zinc-500">By: {batch.createdByWallet}</p>
                    </div>
                    <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-sm font-bold text-cyan-100">
                      {formatMonAmount(batch.totalAmountMon)} MON
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {batch.payouts.map((entry) => (
                      <div key={`${batch.id}-${entry.rank}`} className="flex items-center justify-between text-xs text-zinc-300">
                        <span>#{entry.rank} {entry.name}</span>
                        <span>{formatMonAmount(entry.amountMon)} MON</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {batches.length === 0 && (
                <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-400">
                  No weekly payout batches yet.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default AdminWeeklyPayoutCenter;
