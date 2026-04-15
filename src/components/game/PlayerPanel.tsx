import React from 'react';
import { PlayerState, FISH_DATA, RARITY_COLORS } from '@/types/game';
import CoinIcon from './CoinIcon';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import SettingsDialog from './SettingsDialog';

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

  return (
    <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-20 group">
      <Card className="relative p-2 sm:p-3 bg-card/80 backdrop-blur-md border border-primary/20 shadow-lg cursor-pointer">
        <div className="absolute -top-2 -left-2 flex gap-1 z-10">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="w-3 h-3 text-primary-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-64 p-2 text-xs">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 font-semibold">Fish</th>
                    <th className="text-right py-1 font-semibold">Chance</th>
                    <th className="text-right py-1 font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {FISH_DATA.map((fish) => (
                    <tr key={fish.id} className="border-b border-border/50 last:border-0">
                      <td className="py-1" style={{ color: RARITY_COLORS[fish.rarity] }}>
                        {fish.emoji} {fish.name}
                      </td>
                      <td className="text-right py-1 text-muted-foreground">{fish.chance}%</td>
                      <td className="text-right py-1 text-muted-foreground flex items-center justify-end gap-1">{fish.price}<CoinIcon size={12} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 pt-2 border-t border-border/50 flex justify-center gap-2 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
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
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
            {player.avatarUrl ? (
              <AvatarImage src={player.avatarUrl} alt="Avatar" />
            ) : null}
            <AvatarFallback
              className="text-sm sm:text-lg font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(270, 70%, 65%))',
              }}
            >
              {player.level}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {player.nickname || `Level ${player.level}`}
            </p>
            {player.nickname && (
              <p className="text-xs text-muted-foreground">Lv. {player.level}</p>
            )}
            <Progress value={xpPercentage} className="h-1.5 sm:h-2 w-20 sm:w-24" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">{player.xp}/{player.xpToNextLevel} XP</p>
          </div>
        </div>
      </Card>

      <Card className="mt-1 p-3 bg-card/70 backdrop-blur-md border border-primary/20 shadow-lg hidden group-hover:block">
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <StatItem icon={<CoinIcon size={16} />} label="Coins" value={player.coins} />
            <StatItem icon="🪱" label="Bait" value={player.bait} />
            <StatItem icon="🎣" label="Catches" value={player.totalCatches} />
            <StatItem icon="🐟" label="In inventory" value={totalFishCount} />
          </div>
        </div>
      </Card>
    </div>
  );
};

const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2 py-1">
    <span>{icon}</span>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold text-foreground">{value}</p>
    </div>
  </div>
);

export default PlayerPanel;
