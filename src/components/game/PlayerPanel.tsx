import React, { useState } from 'react';
import { PlayerState, FISH_DATA } from '@/types/game';
import type { ReferralSummary } from '@/hooks/useWalletAuth';
import type { PlayerInboxMessage } from '@/hooks/usePlayerMessages';
import CoinIcon from './CoinIcon';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Info, Package, Trophy, Worm } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SettingsDialog from './SettingsDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { cn } from '@/lib/utils';
import { getVisibleBaitTotal } from '@/lib/baitEconomy';
import PlayerStatItem from '@/components/PlayerStatItem';
import PlayerFishInfoRow from '@/components/PlayerFishInfoRow';
import PlayerLevelAvatar from '@/components/PlayerLevelAvatar';

interface PlayerPanelProps {
  player: PlayerState;
  onSetNickname?: (nickname: string) => void;
  isConnected?: boolean;
  isVerified?: boolean;
  walletAddress?: string;
  onAvatarUploaded?: (url: string) => void;
  referralSummary?: ReferralSummary | null;
  inboxMessages?: PlayerInboxMessage[];
  unreadMessageCount?: number;
  inboxLoading?: boolean;
  onMarkMessageRead?: (messageId: string) => void;
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  onSetNickname,
  isConnected = false,
  isVerified = false,
  walletAddress,
  onAvatarUploaded,
  referralSummary,
  inboxMessages = [],
  unreadMessageCount = 0,
  inboxLoading = false,
  onMarkMessageRead,
}) => {
  const xpPercentage = (player.xp / player.xpToNextLevel) * 100;
  const totalFishCount = player.inventory.reduce((sum, fish) => sum + fish.quantity, 0);
  const totalDishCount = player.cookedDishes.reduce((sum, dish) => sum + dish.quantity, 0);
  const totalBait = getVisibleBaitTotal(player);
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const isAdmin = useAdminAccess(walletAddress, isConnected && isVerified);

  return (
    <>
      <div
        className={cn(
          'fixed z-30 flex items-center gap-1.5',
          isMobile ? 'left-3 top-3' : 'left-5 top-5',
        )}
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full border border-cyan-300/20 bg-black/85 text-zinc-100 shadow-md outline-none backdrop-blur-md transition-all hover:scale-105 hover:border-cyan-300/40 hover:bg-zinc-950 active:scale-95"
              aria-label="Fish info"
            >
              <Info className="h-4 w-4 text-cyan-100" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-[min(21rem,calc(100vw-1.5rem))] border-cyan-300/15 bg-black/95 p-3 text-sm text-zinc-100 shadow-2xl backdrop-blur-md sm:w-72">
            <div className="flex flex-col gap-2">
              <div className="mb-1 flex justify-between px-1 text-xs font-bold text-zinc-200">
                <span>Fish</span>
                <span className="text-right">Chance & Price</span>
              </div>
              {FISH_DATA.map((fish) => <PlayerFishInfoRow key={fish.id} fish={fish} />)}
            </div>
            <div className="mt-4 flex justify-center gap-4 border-t border-zinc-800 pt-3 text-xs font-bold uppercase tracking-wider text-zinc-300">
              <Link to="/guide" className="transition-colors hover:text-cyan-100">Guide</Link>
              <span className="text-zinc-500">|</span>
              <Link to="/terms" className="transition-colors hover:text-cyan-100">Terms</Link>
              <span className="text-zinc-500">|</span>
              <Link to="/privacy" className="transition-colors hover:text-cyan-100">Privacy</Link>
            </div>
          </PopoverContent>
        </Popover>

        <SettingsDialog
          isConnected={isConnected}
          nickname={player.nickname || ''}
          onSetNickname={isConnected && !player.nickname ? onSetNickname : undefined}
          walletAddress={walletAddress}
          avatarUrl={player.avatarUrl}
          onAvatarUploaded={onAvatarUploaded}
          referralSummary={referralSummary}
          inboxMessages={inboxMessages}
          unreadMessageCount={unreadMessageCount}
          inboxLoading={inboxLoading}
          onMarkMessageRead={onMarkMessageRead}
          showAdminPanelEntry={isAdmin === true}
        />

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border border-cyan-300/24 bg-black/88 px-2.5 py-1.5 text-zinc-100 shadow-[0_12px_26px_rgba(0,0,0,0.48)] backdrop-blur-md transition-all hover:scale-[1.03] hover:border-cyan-300/38 hover:bg-zinc-950 active:scale-95',
            isExpanded && 'border-cyan-300/40 shadow-[0_0_20px_rgba(34,211,238,0.14)]',
          )}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Hide level details' : 'Show level details'}
        >
          <div className="rounded-full border border-cyan-300/18">
            <PlayerLevelAvatar level={player.level} avatarUrl={player.avatarUrl} size="sm" />
          </div>
          {!isMobile && (
            <>
              <span className="text-left">
                <span className="block text-[10px] font-bold uppercase tracking-normal text-cyan-100/75">Level</span>
                <span className="block max-w-[6.5rem] truncate text-sm font-black text-zinc-100">
                  {player.nickname || `Lv. ${player.level}`}
                </span>
              </span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-cyan-100 transition-transform', isExpanded && 'rotate-180')} />
            </>
          )}
        </button>
      </div>

      {isExpanded && (
        <div
          className={cn(
            'fixed z-30',
            isMobile ? 'left-3 top-[3.85rem] w-[min(18rem,calc(100vw-1.5rem))]' : 'left-5 top-[4.65rem] w-[18.75rem]',
          )}
        >
          <Card className="border border-cyan-300/16 bg-black/92 p-3 text-zinc-100 shadow-[0_18px_40px_rgba(0,0,0,0.58)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <PlayerLevelAvatar level={player.level} avatarUrl={player.avatarUrl} size="md" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black text-zinc-100">
                  {player.nickname || `Level ${player.level}`}
                </p>
                {player.nickname && (
                  <p className="text-xs font-semibold text-zinc-400">Lv. {player.level}</p>
                )}
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-zinc-800">
                  <div
                    className="h-full rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.45)]"
                    style={{ width: `${Math.min(100, Math.max(0, xpPercentage))}%` }}
                  />
                </div>
                <p className="mt-1 text-xs font-semibold text-zinc-400">
                  {player.xp}/{player.xpToNextLevel} XP
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <PlayerStatItem compact icon={<CoinIcon size="sm" />} label="Coins" value={player.coins} />
              <PlayerStatItem compact icon={<Worm className="h-4 w-4 text-zinc-200" />} label="Bait" value={totalBait} />
              <PlayerStatItem compact icon={<Trophy className="h-4 w-4 text-zinc-200" />} label="Catches" value={player.totalCatches} />
              <PlayerStatItem compact icon={<Package className="h-4 w-4 text-zinc-200" />} label="Inventory" value={totalFishCount + totalDishCount} />
            </div>
            {player.dailyFreeBait > 0 && (
              <p className="mt-2 text-xs font-medium text-zinc-400">
                {player.dailyFreeBait} daily free + {Math.max(0, player.bait)} reserve
              </p>
            )}
          </Card>
        </div>
      )}
    </>
  );
};

export default PlayerPanel;
