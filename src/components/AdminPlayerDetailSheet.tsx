import React from 'react';
import { AlertTriangle, Coins, Fish, MessageSquare, UserRound, Worm } from 'lucide-react';
import type {
  AdminPlayer,
  AdminPlayerActivityEntry,
  AdminPlayerDetails,
} from '@/hooks/useAdmin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FISH_DATA } from '@/types/game';

interface AdminPlayerDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: AdminPlayerDetails | null;
  activity: AdminPlayerActivityEntry[];
  loading?: boolean;
  onQuickGrant: (player: AdminPlayer, field: 'coins' | 'bait' | 'daily_free_bait', amount: number) => void;
}

const formatWallet = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`;

const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : 'Never';

const labelizeEvent = (eventType: string) =>
  eventType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getFishName = (fishId: string) => FISH_DATA.find((fish) => fish.id === fishId)?.name ?? fishId;

const AdminPlayerDetailSheet: React.FC<AdminPlayerDetailSheetProps> = ({
  open,
  onOpenChange,
  details,
  activity,
  loading = false,
  onQuickGrant,
}) => {
  const player = details?.player ?? null;
  const totalBait = player ? player.bait + player.daily_free_bait : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-hidden border-zinc-800 bg-black/95 p-0 text-zinc-100 sm:max-w-2xl">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-zinc-800 px-6 py-5">
            <SheetTitle className="flex items-center gap-2 text-zinc-100">
              <UserRound className="h-5 w-5 text-cyan-100" />
              {player?.nickname || 'Player details'}
            </SheetTitle>
            <SheetDescription className="font-mono text-xs text-zinc-400">
              {player ? player.wallet_address : 'Loading player details...'}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-5 px-6 py-5">
              {loading && !details ? (
                <Card className="border-zinc-800 bg-zinc-950">
                  <CardContent className="py-10 text-center text-sm text-zinc-400">
                    Loading player details...
                  </CardContent>
                </Card>
              ) : !details || !player ? (
                <Card className="border-zinc-800 bg-zinc-950">
                  <CardContent className="py-10 text-center text-sm text-zinc-400">
                    Select a player to inspect stats and activity.
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-zinc-800 bg-zinc-950">
                      <CardHeader>
                        <CardTitle className="text-base text-zinc-100">Profile</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-zinc-300">
                        <div className="flex justify-between gap-3">
                          <span>Nickname</span>
                          <span className="font-semibold text-zinc-100">{player.nickname || '—'}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Wallet</span>
                          <span className="font-mono text-zinc-100">{formatWallet(player.wallet_address)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Joined</span>
                          <span className="text-right text-zinc-100">{formatDateTime(player.created_at)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Last seen</span>
                          <span className="text-right text-zinc-100">{formatDateTime(player.last_login)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-zinc-800 bg-zinc-950">
                      <CardHeader>
                        <CardTitle className="text-base text-zinc-100">Economy</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-zinc-300">
                        <div className="flex justify-between gap-3">
                          <span>Coins</span>
                          <span className="font-semibold text-zinc-100">{player.coins.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Total bait</span>
                          <span className="font-semibold text-zinc-100">{totalBait.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Daily free bait</span>
                          <span className="text-zinc-100">{player.daily_free_bait}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Reserve bait</span>
                          <span className="text-zinc-100">{player.bait}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Level / XP</span>
                          <span className="text-zinc-100">
                            Lv. {player.level} • {player.xp}/{player.xp_to_next}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Rod / catches</span>
                          <span className="text-zinc-100">
                            Rod {player.equipped_rod + 1} • {player.total_catches}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-zinc-800 bg-zinc-950">
                      <CardHeader>
                        <CardTitle className="text-base text-zinc-100">Referral + grill</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-zinc-300">
                        <div className="flex justify-between gap-3">
                          <span>Referrer</span>
                          <span className="font-mono text-right text-zinc-100">
                            {details.referral_summary.referrer_wallet_address
                              ? formatWallet(details.referral_summary.referrer_wallet_address)
                              : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Rewarded referrals</span>
                          <span className="text-zinc-100">{details.referral_summary.rewarded_referral_count}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Wallet bait bonus</span>
                          <span className="text-zinc-100">
                            {details.referral_summary.wallet_bait_bonus_claimed ? 'Claimed' : 'Not claimed'}
                          </span>
                        </div>
                        <Separator className="bg-zinc-800" />
                        <div className="flex justify-between gap-3">
                          <span>Grill score</span>
                          <span className="text-zinc-100">{details.grill_summary?.score ?? 0}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Dishes</span>
                          <span className="text-zinc-100">{details.grill_summary?.dishes ?? 0}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-zinc-800 bg-zinc-950">
                      <CardHeader>
                        <CardTitle className="text-base text-zinc-100">Quick grants</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <Button
                          variant="outline"
                          className="h-auto border-zinc-800 bg-black py-3 text-left text-zinc-100 hover:bg-zinc-900"
                          onClick={() => onQuickGrant(player, 'coins', 1000)}
                        >
                          <Coins className="mb-2 h-4 w-4 text-yellow-300" />
                          <span className="block text-xs text-zinc-400">Grant</span>
                          <span className="font-semibold">+1000 coins</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto border-zinc-800 bg-black py-3 text-left text-zinc-100 hover:bg-zinc-900"
                          onClick={() => onQuickGrant(player, 'bait', 10)}
                        >
                          <Worm className="mb-2 h-4 w-4 text-cyan-100" />
                          <span className="block text-xs text-zinc-400">Grant</span>
                          <span className="font-semibold">+10 reserve bait</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto border-zinc-800 bg-black py-3 text-left text-zinc-100 hover:bg-zinc-900"
                          onClick={() => onQuickGrant(player, 'daily_free_bait', 10)}
                        >
                          <Fish className="mb-2 h-4 w-4 text-emerald-300" />
                          <span className="block text-xs text-zinc-400">Grant</span>
                          <span className="font-semibold">+10 daily bait</span>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-zinc-800 bg-zinc-950">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
                        <AlertTriangle className="h-4 w-4 text-yellow-300" />
                        Suspicious activity flags
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {details.suspicious_flags.length > 0 ? (
                        details.suspicious_flags.map((flag) => (
                          <Badge key={flag} className="border-yellow-300/20 bg-yellow-300/10 text-yellow-100 hover:bg-yellow-300/10">
                            {flag}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-400">No obvious suspicious flags from recent activity.</p>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-[0.95fr,1.05fr]">
                    <Card className="border-zinc-800 bg-zinc-950">
                      <CardHeader>
                        <CardTitle className="text-base text-zinc-100">Inventory summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {details.inventory_summary.length > 0 ? (
                          details.inventory_summary.map((entry) => (
                            <div key={entry.fish_id} className="flex items-center justify-between text-sm">
                              <span className="text-zinc-300">{getFishName(entry.fish_id)}</span>
                              <span className="font-semibold text-zinc-100">{entry.quantity}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-zinc-400">Inventory is empty.</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-zinc-800 bg-zinc-950">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
                          <MessageSquare className="h-4 w-4 text-cyan-100" />
                          Recent activity
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {activity.length > 0 ? (
                          activity.slice(0, 12).map((entry) => (
                            <div key={entry.id} className="rounded-lg border border-zinc-800 bg-black/60 px-3 py-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-zinc-100">{labelizeEvent(entry.event_type)}</p>
                                <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                                  {entry.event_source}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-zinc-400">{formatDateTime(entry.created_at)}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-zinc-400">No activity logged yet.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AdminPlayerDetailSheet;
