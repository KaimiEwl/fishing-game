import React from 'react';
import { GameState, GameResult } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import FishDisplay from './FishDisplay';
import { publicAsset } from '@/lib/assets';

const ROD_INFO = [
  { name: 'Starter', image: publicAsset('assets/rod_basic.png'), color: '#aaa', bonus: 0 },
  { name: 'Bamboo', image: publicAsset('assets/rod_bamboo.png'), color: '#22aa44', bonus: 5 },
  { name: 'Carbon', image: publicAsset('assets/rod_carbon.png'), color: '#2255cc', bonus: 10 },
  { name: 'Pro', image: publicAsset('assets/rod_pro.png'), color: '#9944ff', bonus: 15 },
  { name: 'Legendary', image: publicAsset('assets/rod_legendary.png'), color: '#ffcc00', bonus: 25 },
];

interface GameControlsProps {
  gameState: GameState;
  lastResult: GameResult | null;
  hasBait: boolean;
  onCast: () => void;
  onReelIn?: () => void;
  rodLevel?: number;
  nftRods?: number[];
  biteTimeLeft?: number;
  biteTimeTotal?: number;
}

const GameControls: React.FC<GameControlsProps> = ({
  gameState,
  lastResult,
  hasBait,
  onCast,
  onReelIn,
  rodLevel = 0,
  nftRods = [],
  biteTimeLeft = 0,
  biteTimeTotal = 1,
}) => {
  const rod = ROD_INFO[rodLevel] || ROD_INFO[0];
  const hasNft = nftRods.includes(rodLevel);
  const biteProgress = biteTimeTotal > 0 ? (biteTimeLeft / biteTimeTotal) * 100 : 0;

  return (
    <>
      {gameState !== 'idle' && (
        <div className="fixed top-[36%] sm:top-[40%] left-1/2 z-20 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2">
          {gameState === 'result' && lastResult && (
            <div className="bg-card/95 backdrop-blur-sm rounded-lg p-4 sm:p-6 border-2 border-primary/30 shadow-2xl animate-scale-in">
              {lastResult.success && lastResult.fish ? (
                <div className="flex flex-col items-center">
                  <p className="text-lg font-bold text-primary mb-2">🎉 Caught!</p>
                  <FishDisplay fish={lastResult.fish} showDetails size="lg" />
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-4xl mb-2">🌊</p>
                  <p className="text-lg font-medium text-muted-foreground">The fish got away...</p>
                  <p className="text-sm text-muted-foreground">+5 XP for trying</p>
                </div>
              )}
            </div>
          )}

          {gameState === 'casting' && (
            <div className="bg-card/90 backdrop-blur-sm rounded-lg px-6 py-3 border border-primary/30 text-center">
              <p className="text-lg font-medium text-primary animate-pulse">Casting... 🎣</p>
            </div>
          )}

          {gameState === 'waiting' && (
            <div className="bg-card/90 backdrop-blur-sm rounded-lg px-6 py-3 border border-primary/30 text-center">
              <p className="text-lg font-medium text-secondary animate-pulse">Waiting for a bite... 🎯</p>
            </div>
          )}

          {gameState === 'biting' && (
            <div className="bg-card/95 backdrop-blur-sm rounded-lg p-4 sm:p-5 border-2 border-yellow-500/60 shadow-2xl animate-scale-in flex flex-col items-center gap-3">
              <p className="text-xl font-bold text-yellow-400 animate-pulse">🐟 A bite! Reel it in!</p>
              {/* Timer bar */}
              <div className="w-48 h-3 bg-muted/40 rounded-full overflow-hidden border border-yellow-500/30">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${biteProgress}%`,
                    background: biteProgress > 40
                      ? 'linear-gradient(90deg, #22cc44, #66ff88)'
                      : biteProgress > 20
                        ? 'linear-gradient(90deg, #ffaa00, #ffcc44)'
                        : 'linear-gradient(90deg, #ff3333, #ff6644)',
                  }}
                />
              </div>
              <Button
                onClick={onReelIn}
                  className="text-lg h-14 px-8 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95 animate-bounce"
                style={{
                  background: 'linear-gradient(135deg, #ffaa00, #ff6600)',
                }}
              >
                🎣 Reel!
              </Button>
            </div>
          )}

          {gameState === 'catching' && (
            <div className="bg-card/90 backdrop-blur-sm rounded-lg px-6 py-3 border border-primary/30 text-center">
              <p className="text-lg font-medium text-accent animate-pulse">Reeling in! 🎣</p>
            </div>
          )}
        </div>
      )}

    <div className="fixed bottom-3 left-1/2 z-20 flex -translate-x-1/2 flex-col items-end gap-3 sm:bottom-5 sm:left-auto sm:right-5 sm:translate-x-0">

      {gameState === 'idle' && (
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`flex h-12 w-12 sm:h-14 sm:w-14 flex-col items-center justify-center rounded-lg border shadow-lg cursor-pointer relative backdrop-blur-md ${hasNft ? 'ring-2 ring-yellow-500' : ''}`}
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(270, 70%, 65%))',
                    borderColor: 'hsl(var(--primary) / 0.3)'
                  }}
                >
                  <img src={rod.image} alt={rod.name} className="h-8 sm:h-9 object-contain" />
                  {rod.bonus > 0 && <span className="text-[10px] font-bold text-white/90">+{rod.bonus}%</span>}
                  {hasNft && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[7px] font-bold px-1 rounded">
                      NFT
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-card/90 backdrop-blur-md border-primary/20 p-3 max-w-[200px]">
                <div className="flex flex-col gap-1">
                  <p className="font-bold text-sm" style={{ color: rod.color }}>{rod.name}</p>
                  <p className="text-xs text-muted-foreground">Level {rodLevel + 1}</p>
                  {rod.bonus > 0
                    ? <p className="text-xs text-foreground">+{rod.bonus}% rare fish chance</p>
                    : <p className="text-xs text-foreground">Standard catch chance</p>
                  }
                  {hasNft && (
                    <div className="text-xs text-yellow-500 mt-1 border-t border-yellow-500/20 pt-1">
                      <p className="font-bold">✨ NFT bonuses:</p>
                      {(() => {
                        const nftData = [
                          { rarityBonus: 3, xpBonus: 10, sellBonus: 0 },
                          { rarityBonus: 5, xpBonus: 15, sellBonus: 10 },
                          { rarityBonus: 7, xpBonus: 20, sellBonus: 15 },
                          { rarityBonus: 10, xpBonus: 25, sellBonus: 20 },
                          { rarityBonus: 15, xpBonus: 30, sellBonus: 25 },
                        ][rodLevel];
                        return nftData ? (
                          <>
                            <p>+{nftData.rarityBonus}% chance</p>
                            <p>+{nftData.xpBonus}% XP</p>
                            {nftData.sellBonus > 0 && <p>+{nftData.sellBonus}% price</p>}
                          </>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            onClick={onCast}
            disabled={!hasBait}
            className="h-12 min-w-[5.5rem] sm:h-14 sm:min-w-[8rem] px-3 sm:px-4 rounded-lg text-sm sm:text-base font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={{
              background: hasBait
                ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(270, 70%, 65%))'
                : undefined
            }}
          >
            {hasBait ? 'Cast' : 'No Bait!'}
          </Button>
        </div>
      )}
    </div>
    </>
  );
};

export default GameControls;
