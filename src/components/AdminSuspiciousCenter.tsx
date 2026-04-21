import React from 'react';
import { Activity, AlertTriangle, ArrowUpRight, Coins, Eye, RefreshCcw, Shield } from 'lucide-react';
import type { AdminSuspiciousPlayer, AdminSuspiciousSummary } from '@/hooks/useAdmin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminSuspiciousCenterProps {
  summary: AdminSuspiciousSummary | null;
  players: AdminSuspiciousPlayer[];
  loading?: boolean;
  onRefresh: () => void;
  onInspectPlayer: (player: AdminSuspiciousPlayer) => void;
}

const formatWallet = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`;

const formatDateTime = (value: string | null | undefined) => (
  value ? new Date(value).toLocaleString() : '--'
);

const summaryCards = (summary: AdminSuspiciousSummary | null) => [
  {
    label: 'Flagged players',
    value: summary?.flaggedPlayers ?? 0,
    icon: <AlertTriangle className="h-4 w-4 text-yellow-300" />,
  },
  {
    label: 'High coin gain',
    value: summary?.highCoinGainPlayers ?? 0,
    icon: <Coins className="h-4 w-4 text-amber-300" />,
  },
  {
    label: 'High bait gain',
    value: summary?.highBaitGainPlayers ?? 0,
    icon: <Shield className="h-4 w-4 text-cyan-100" />,
  },
  {
    label: 'Withdraw spam',
    value: summary?.withdrawSpamPlayers ?? 0,
    icon: <ArrowUpRight className="h-4 w-4 text-emerald-300" />,
  },
  {
    label: 'Rate-limit pressure',
    value: summary?.rateLimitedSubjects ?? 0,
    icon: <Activity className="h-4 w-4 text-rose-300" />,
  },
];

const AdminSuspiciousCenter: React.FC<AdminSuspiciousCenterProps> = ({
  summary,
  players,
  loading = false,
  onRefresh,
  onInspectPlayer,
}) => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-5">
      {summaryCards(summary).map((item) => (
        <Card key={item.label} className="border-zinc-800 bg-zinc-950">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-zinc-100">{item.value}</p>
            </div>
            <div className="rounded-full border border-zinc-800 bg-black/70 p-2">
              {item.icon}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card className="border-zinc-800 bg-zinc-950">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
            <AlertTriangle className="h-4 w-4 text-yellow-300" />
            Security watch
          </CardTitle>
          <p className="mt-1 text-xs text-zinc-500">
            Recent signals from audit logs, withdraw requests, and edge-function throttles.
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Latest signal: {formatDateTime(summary?.latestSignalAt)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
          className="border-zinc-800 bg-black text-zinc-100 hover:bg-zinc-900"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[22rem] pr-3">
          <div className="space-y-3">
            {players.length > 0 ? players.map((player) => (
              <div key={player.walletAddress} className="rounded-lg border border-zinc-800 bg-black/60 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-100">
                        {player.nickname || formatWallet(player.walletAddress)}
                      </p>
                      <span className="font-mono text-xs text-zinc-500">{player.walletAddress}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {player.flags.map((flag) => (
                        <Badge key={`${player.walletAddress}-${flag}`} className="border-yellow-300/20 bg-yellow-300/10 text-yellow-100 hover:bg-yellow-300/10">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-5">
                      <span>Coins 24h: <span className="font-semibold text-zinc-200">{player.coinGain24h.toLocaleString()}</span></span>
                      <span>Bait 24h: <span className="font-semibold text-zinc-200">{player.baitGain24h.toLocaleString()}</span></span>
                      <span>Cube rewards: <span className="font-semibold text-zinc-200">{player.cubeRewards24h}</span></span>
                      <span>Withdraw reqs 7d: <span className="font-semibold text-zinc-200">{player.withdrawRequests7d}</span></span>
                      <span>Rate-limit hits 1h: <span className="font-semibold text-zinc-200">{player.rateLimitHits1h}</span></span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-zinc-800 bg-black text-zinc-100 hover:bg-zinc-900"
                    onClick={() => onInspectPlayer(player)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Inspect
                  </Button>
                </div>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-400">
                {loading ? 'Loading suspicious signals...' : 'No suspicious signals above the current thresholds.'}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  </div>
);

export default AdminSuspiciousCenter;
