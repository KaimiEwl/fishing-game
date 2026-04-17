import React, { useState } from 'react';
import { PlayerState, FISH_DATA, RARITY_COLORS } from '@/types/game';
import CoinIcon from './CoinIcon';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, Package, Trophy, Worm, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import SettingsDialog from './SettingsDialog';
import FishIcon from './FishIcon';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface PlayerPanelProps {
  player: PlayerState;
  onSetNickname?: (nickname: string) => void;
  isConnected?: boolean;
  walletAddress?: string;
  onAvatarUploaded?: (url: string) => void;
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  onSetNickname,
  isConnected = false,
  walletAddress,
  onAvatarUploaded,
}) => {
  const xpPercentage = (player.xp / player.xpToNextLevel) * 100;
  const totalFishCount = player.inventory.reduce((sum, fish) => sum + fish.quantity, 0);
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => setIsExpanded((prev) => !prev);

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={toggleExpand}
          className="fixed right-3 top-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/30 bg-black/85 text-cyan-50 shadow-[0_10px_22px_rgba(0,0,0,0.45)] backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Hide level details' : 'Show level details'}
        >
          <Avatar className="h-9 w-9 border border-cyan-300/20">
            {player.avatarUrl ? <AvatarImage src={player.avatarUrl} alt="Avatar" /> : null}
            <AvatarFallback
              className="text-sm font-black text-white"
              style={{ background: 'linear-gradient(135deg, #050505, #164e63)' }}
            >
              {player.level}
            </AvatarFallback>
          </Avatar>
        </button>

        {isExpanded && (
          <div className="fixed right-3 top-[3.85rem] z-30 w-[min(17rem,calc(100vw-1.5rem))]">
            <Card className="border border-cyan-300/15 bg-black/92 p-3 text-zinc-100 shadow-[0_18px_40px_rgba(0,0,0,0.58)] backdrop-blur-xl">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-normal text-cyan-100/80">Level</p>
                  <p className="truncate text-lg font-black text-zinc-100">
                    {player.nickname || `Level ${player.level}`}
                  </p>
                  {player.nickname && (
                    <p className="text-xs font-semibold text-zinc-400">Lv. {player.level}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={toggleExpand}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-zinc-950 text-zinc-100 transition hover:border-cyan-300/35 hover:text-cyan-100 active:scale-95"
                  aria-label="Close level details"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {player.avatarUrl ? <AvatarImage src={player.avatarUrl} alt="Avatar" /> : null}
                  <AvatarFallback
                    className="text-lg font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #050505, #164e63)' }}
                  >
                    {player.level}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="h-2.5 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-zinc-800">
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
                <StatItem compact icon={<CoinIcon size={14} />} label="Coins" value={player.coins} />
                <StatItem compact icon={<Worm className="h-4 w-4 text-zinc-200" />} label="Bait" value={player.bait} />
                <StatItem compact icon={<Trophy className="h-4 w-4 text-zinc-200" />} label="Catches" value={player.totalCatches} />
                <StatItem compact icon={<Package className="h-4 w-4 text-zinc-200" />} label="Inventory" value={totalFishCount} />
              </div>

              <div className="mt-3 flex justify-end">
                <SettingsDialog
                  isConnected={isConnected}
                  nickname={player.nickname || ''}
                  onSetNickname={isConnected && !player.nickname ? onSetNickname : undefined}
                  walletAddress={walletAddress}
                  avatarUrl={player.avatarUrl}
                  onAvatarUploaded={onAvatarUploaded}
                />
              </div>
            </Card>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="fixed left-5 top-5 z-30 max-w-[min(22rem,calc(100vw-4.5rem))] transition-all">
      <Card className="relative border border-cyan-300/15 bg-black/90 p-3 text-zinc-100 shadow-[0_14px_34px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all">
        <div className="absolute -left-3 -top-3 z-10 flex gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="hidden h-11 w-11 rounded-full border border-cyan-300/20 bg-black/85 text-zinc-100 shadow-md outline-none backdrop-blur-md transition-all hover:scale-105 hover:border-cyan-300/40 hover:bg-zinc-950 active:scale-95 sm:inline-flex sm:h-8 sm:w-8"
                aria-label="Fish info"
              >
                <Info className="h-5 w-5 text-cyan-100 sm:h-4 sm:w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-[min(21rem,calc(100vw-1.5rem))] border-cyan-300/15 bg-black/95 p-3 text-sm text-zinc-100 shadow-2xl backdrop-blur-md sm:w-72">
              <div className="flex flex-col gap-2">
                <div className="mb-1 flex justify-between px-1 text-xs font-bold text-zinc-200">
                  <span>Fish</span>
                  <span className="text-right">Chance & Price</span>
                </div>
                {FISH_DATA.map((fish) => (
                  <div key={fish.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/85 p-2 shadow-sm">
                    <div className="flex items-center gap-3">
                      <FishIcon fish={fish} size="sm" framed />
                      <span className="font-semibold text-sm drop-shadow-sm" style={{ color: RARITY_COLORS[fish.rarity] }}>
                        {fish.name}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs font-medium text-zinc-300">{fish.chance}%</span>
                      <span className="mt-1 flex items-center gap-1 font-semibold">
                        {fish.price}
                        <CoinIcon size={12} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-center gap-4 border-t border-zinc-800 pt-3 text-xs font-bold uppercase tracking-wider text-zinc-300">
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
          />
        </div>

        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10">
            {player.avatarUrl ? <AvatarImage src={player.avatarUrl} alt="Avatar" /> : null}
            <AvatarFallback
              className="text-base font-bold text-white sm:text-lg"
              style={{ background: 'linear-gradient(135deg, #050505, #164e63)' }}
            >
              {player.level}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight text-zinc-100 sm:font-semibold">
              {player.nickname || `Level ${player.level}`}
            </p>
            {player.nickname && (
              <p className="text-sm text-zinc-500 sm:text-xs">Lv. {player.level}</p>
            )}
            <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-zinc-800">
              <div
                className="h-full rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.45)]"
                style={{ width: `${Math.min(100, Math.max(0, xpPercentage))}%` }}
              />
            </div>
            <p className="mt-0.5 text-[11px] font-medium leading-tight text-zinc-400 sm:mt-1 sm:text-xs sm:text-zinc-500">
              {player.xp}/{player.xpToNextLevel} XP
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <StatItem compact icon={<CoinIcon size={14} />} label="Coins" value={player.coins} />
          <StatItem compact icon={<Worm className="h-4 w-4 text-zinc-200" />} label="Bait" value={player.bait} />
          <StatItem compact icon={<Trophy className="h-4 w-4 text-zinc-200" />} label="Catches" value={player.totalCatches} />
          <StatItem compact icon={<Package className="h-4 w-4 text-zinc-200" />} label="Inventory" value={totalFishCount} />
        </div>
      </Card>
    </div>
  );
};

const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: number; compact?: boolean }> = ({
  icon,
  label,
  value,
  compact = false,
}) => (
  <div
    className={cn(
      'flex min-w-0 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/85',
      compact ? 'min-h-10 px-2 py-1' : 'px-2.5 py-1.5',
    )}
  >
    <span className="shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className={cn('truncate leading-tight text-zinc-400', compact ? 'text-[10px]' : 'text-xs')}>{label}</p>
      <p className={cn('font-bold leading-tight text-zinc-100', compact ? 'text-xs' : 'text-sm')}>{value}</p>
    </div>
  </div>
);

export default PlayerPanel;
