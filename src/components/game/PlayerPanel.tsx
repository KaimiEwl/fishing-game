import React, { useState } from 'react';
import { PlayerState, FISH_DATA, RARITY_COLORS } from '@/types/game';
import CoinIcon from './CoinIcon';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Info, Trophy, Worm, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [statsOpen, setStatsOpen] = useState(false);

  return (
    <div className="fixed top-3 left-3 sm:top-5 sm:left-5 z-20 group max-w-[calc(100vw-4.75rem)]">
      <Card className="relative p-3 sm:p-3 bg-card/80 backdrop-blur-md border border-primary/20 shadow-lg cursor-pointer">
        {/* --- Action buttons: info + settings --- */}
        <div className="absolute -top-3 -left-3 sm:-top-3 sm:-left-3 flex gap-1.5 z-10">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-background/50 backdrop-blur-md shadow-md hover:scale-110 hover:bg-background/80 active:scale-95 transition-all outline-none border-primary/20"
                onClick={(e) => e.stopPropagation()}
                aria-label="Fish info"
              >
                <Info className="w-5 h-5 sm:w-4 sm:h-4 text-foreground/80" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-80 sm:w-72 p-3 text-sm">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between px-1 text-xs font-semibold text-muted-foreground mb-1">
                  <span>Fish</span>
                  <span className="text-right">Chance & Price</span>
                </div>
                {FISH_DATA.map((fish) => (
                  <div key={fish.id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/50 shadow-sm">
                    <div className="flex items-center gap-3">
                      <FishIcon fish={fish} size="sm" framed />
                      <span className="font-semibold text-sm drop-shadow-sm" style={{ color: RARITY_COLORS[fish.rarity] }}>{fish.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-medium bg-muted/50 px-1.5 py-0.5 rounded">{fish.chance}%</span>
                      <span className="flex items-center gap-1 mt-1 font-semibold">{fish.price}<CoinIcon size={12} /></span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-border flex justify-center gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
                <span>|</span>
                <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
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
        <div className="flex items-center gap-2.5 sm:gap-2">
          <Avatar className="w-11 h-11 sm:w-10 sm:h-10">
            {player.avatarUrl ? (
              <AvatarImage src={player.avatarUrl} alt="Avatar" />
            ) : null}
            <AvatarFallback
              className="text-base sm:text-lg font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(270, 70%, 65%))',
              }}
            >
              {player.level}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-sm font-semibold text-foreground truncate">
              {player.nickname || `Level ${player.level}`}
            </p>
            {player.nickname && (
              <p className="text-xs text-muted-foreground">Lv. {player.level}</p>
            )}
            <Progress value={xpPercentage} className="h-2 sm:h-2 w-24 sm:w-24 mt-0.5" />
            <p className="text-xs sm:text-xs text-muted-foreground mt-0.5">{player.xp}/{player.xpToNextLevel} XP</p>
          </div>
        </div>

        {/* --- Quick-stats row (always visible on mobile, inline) --- */}
        {isMobile && (
          <button
            type="button"
            className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            onClick={(e) => { e.stopPropagation(); setStatsOpen(v => !v); }}
            aria-label="Toggle stats"
          >
            {statsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {statsOpen ? 'Hide stats' : 'Show stats'}
          </button>
        )}

        {isMobile && statsOpen && (
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <StatItem icon={<CoinIcon size={18} />} label="Coins" value={player.coins} />
            <StatItem icon={<Worm className="h-4.5 w-4.5" />} label="Bait" value={player.bait} />
            <StatItem icon={<Trophy className="h-4.5 w-4.5" />} label="Catches" value={player.totalCatches} />
            <StatItem icon={<FishIcon fishId="carp" className="h-4.5 w-4.5" />} label="In inventory" value={totalFishCount} />
          </div>
        )}
      </Card>

      {/* --- Desktop hover stats (unchanged behaviour) --- */}
      {!isMobile && (
        <Card className="mt-1 p-3 bg-card/70 backdrop-blur-md border border-primary/20 shadow-lg hidden group-hover:block">
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
  <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-1.5">
    <span className="shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
      <p className="text-sm font-bold text-foreground leading-tight">{value}</p>
    </div>
  </div>
);

export default PlayerPanel;
