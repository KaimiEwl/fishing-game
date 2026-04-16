import React from 'react';
import { PlayerState, FISH_DATA, RARITY_COLORS } from '@/types/game';
import CoinIcon from './CoinIcon';
import { Card } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Info, Trophy, Worm } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import SettingsDialog from './SettingsDialog';
import FishIcon from './FishIcon';
import { useIsMobile } from '@/hooks/use-mobile';

interface PlayerPanelProps {
  player: PlayerState;
  onSetNickname?: (nickname: string) => void;
  isConnected?: boolean;
  walletAddress?: string;
  onAvatarUploaded?: (url: string) => void;
}



const PlayerPanel: React.FC<PlayerPanelProps> = ({ player, onSetNickname, isConnected = false, walletAddress, onAvatarUploaded }) => {
  const xpPercentage = (player.xp / player.xpToNextLevel) * 100;
  const totalFishCount = player.inventory.reduce((sum, f) => sum + f.quantity, 0);
  const isMobile = useIsMobile();

  return (
    <div className="fixed top-3 left-3 sm:top-5 sm:left-5 z-20 group max-w-[min(22rem,calc(100vw-4.5rem))]">
      <Card className="relative cursor-pointer border border-cyan-300/15 bg-black/85 p-3.5 text-zinc-100 shadow-[0_14px_34px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-3">
        {/* --- Action buttons: info + settings --- */}
        <div className="absolute -top-3 -left-3 sm:-top-3 sm:-left-3 flex gap-1.5 z-10">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="hidden h-11 w-11 rounded-full border border-cyan-300/20 bg-black/85 text-zinc-100 shadow-md outline-none backdrop-blur-md transition-all hover:scale-105 hover:border-cyan-300/40 hover:bg-zinc-950 active:scale-95 sm:inline-flex sm:h-8 sm:w-8"
                onClick={(e) => e.stopPropagation()}
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
                      <span className="font-semibold text-sm drop-shadow-sm" style={{ color: RARITY_COLORS[fish.rarity] }}>{fish.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs font-medium text-zinc-300">{fish.chance}%</span>
                      <span className="flex items-center gap-1 mt-1 font-semibold">{fish.price}<CoinIcon size={12} /></span>
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

        {/* --- Player identity row --- */}
        <div className="flex items-center gap-3 sm:gap-2">
          <Avatar className="h-12 w-12 sm:h-10 sm:w-10">
            {player.avatarUrl ? (
              <AvatarImage src={player.avatarUrl} alt="Avatar" />
            ) : null}
            <AvatarFallback
              className="text-base sm:text-lg font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #050505, #164e63)',
              }}
            >
              {player.level}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-base font-bold leading-tight text-zinc-100 sm:text-sm sm:font-semibold">
              {player.nickname || `Level ${player.level}`}
            </p>
            {player.nickname && (
              <p className="text-sm text-zinc-500 sm:text-xs">Lv. {player.level}</p>
            )}
            <div className="mt-1 h-2.5 w-28 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-zinc-800 sm:h-2 sm:w-24">
              <div
                className="h-full rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.45)]"
                style={{ width: `${Math.min(100, Math.max(0, xpPercentage))}%` }}
              />
            </div>
            <p className="mt-1 text-xs font-medium text-zinc-500">{player.xp}/{player.xpToNextLevel} XP</p>
          </div>
        </div>

        {/* --- Quick-stats row (always visible on mobile, inline) --- */}
        {isMobile && (
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <StatItem icon={<CoinIcon size={18} />} label="Coins" value={player.coins} />
            <StatItem icon={<Worm className="h-4.5 w-4.5" />} label="Bait" value={player.bait} />
            <StatItem icon={<Trophy className="h-4.5 w-4.5" />} label="Catches" value={player.totalCatches} />
            <StatItem icon={<FishIcon fishId="carp" className="h-4.5 w-4.5" />} label="In inventory" value={totalFishCount} />
          </div>
        )}
      </Card>

      {/* --- Desktop hover stats (unchanged behaviour) --- */}
      {!isMobile && (
        <Card className="mt-1 hidden border border-cyan-300/15 bg-black/80 p-3 text-zinc-100 shadow-lg backdrop-blur-md group-hover:block">
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <StatItem icon={<CoinIcon size={16} />} label="Coins" value={player.coins} />
              <StatItem icon={<Worm className="h-4 w-4" />} label="Bait" value={player.bait} />
              <StatItem icon={<Trophy className="h-4 w-4" />} label="Catches" value={player.totalCatches} />
              <StatItem icon={<FishIcon fishId="carp" className="h-4 w-4" />} label="In inventory" value={totalFishCount} />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/85 px-2.5 py-1.5">
    <span className="shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs leading-tight text-zinc-500">{label}</p>
      <p className="text-sm font-bold leading-tight text-zinc-100">{value}</p>
    </div>
  </div>
);

export default PlayerPanel;
