import React from 'react';
import { GameState, GameResult } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import FishDisplay from './FishDisplay';
import { publicAsset } from '@/lib/assets';

const CAST_BUTTON_BLUE = publicAsset('assets/cast_button_blue.png');
const CAST_BUTTON_GREEN = publicAsset('assets/cast_button_green.png');

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
  const showPrimaryControl = gameState === 'idle' || gameState === 'biting';
  const primaryAction = gameState === 'biting' ? onReelIn : onCast;
  const primaryDisabled = gameState === 'idle' ? !hasBait : false;
  const primaryLabel = gameState === 'biting' ? 'Hook fish' : hasBait ? 'Cast line' : 'No bait';
  const primaryButtonImage = gameState === 'biting' ? CAST_BUTTON_GREEN : CAST_BUTTON_BLUE;

  return (
    <>
      {gameState !== 'idle' && (
        <div className="fixed top-[36%] left-1/2 z-20 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 sm:top-[40%]">
          {gameState === 'result' && lastResult && (
            <div className="animate-scale-in rounded-lg border border-cyan-300/20 bg-black/90 p-4 text-zinc-100 shadow-2xl backdrop-blur-sm sm:p-6">
              {lastResult.success && lastResult.fish ? (
                <div className="flex flex-col items-center">
                  <p className="mb-2 text-lg font-bold text-cyan-100">Caught!</p>
                  <FishDisplay fish={lastResult.fish} showDetails size="lg" />
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="mb-2 text-4xl">🌊</p>
                  <p className="text-lg font-medium text-zinc-300">The fish got away...</p>
                  <p className="text-sm text-zinc-500">+5 XP for trying</p>
                </div>
              )}
            </div>
          )}

          {gameState === 'casting' && (
            <div className="rounded-lg border border-cyan-300/20 bg-black/85 px-6 py-3 text-center shadow-xl backdrop-blur-sm">
              <p className="animate-pulse text-lg font-medium text-cyan-100">Casting...</p>
            </div>
          )}

          {gameState === 'waiting' && (
            <div className="rounded-lg border border-cyan-300/20 bg-black/85 px-6 py-3 text-center shadow-xl backdrop-blur-sm">
              <p className="animate-pulse text-lg font-medium text-zinc-100">Waiting for a bite...</p>
            </div>
          )}

          {gameState === 'catching' && (
            <div className="rounded-lg border border-cyan-300/20 bg-black/85 px-6 py-3 text-center shadow-xl backdrop-blur-sm">
              <p className="animate-pulse text-lg font-medium text-cyan-100">Reeling in!</p>
            </div>
          )}
        </div>
      )}

      <div className="fixed bottom-[calc(var(--bottom-nav-clearance,0px)+1rem)] left-1/2 z-20 flex -translate-x-1/2 flex-col items-end gap-3 sm:bottom-24 sm:left-auto sm:right-5 sm:translate-x-0">
        {gameState === 'biting' && (
          <div className="w-[11.75rem] rounded-xl border border-cyan-300/18 bg-black/82 px-3 py-2 shadow-xl backdrop-blur-md sm:w-[13.5rem]">
            <div className="h-2 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
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
            <p className="mt-1.5 text-center text-[11px] font-bold uppercase tracking-normal text-cyan-100/88">
              Fish on the line
            </p>
          </div>
        )}

        {showPrimaryControl && (
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`relative flex h-12 w-12 cursor-pointer flex-col items-center justify-center rounded-xl border border-cyan-300/20 bg-black/85 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-zinc-950 active:scale-95 sm:h-14 sm:w-14 ${hasNft ? 'ring-2 ring-cyan-300/40' : ''}`}
                  >
                    <img src={rod.image} alt={rod.name} className="h-7 object-contain drop-shadow-md sm:h-8" />
                    {rod.bonus > 0 && <span className="mt-0.5 text-[9px] font-bold leading-none text-cyan-100">+{rod.bonus}%</span>}
                    {hasNft && (
                      <div className="absolute -right-1.5 -top-1.5 rounded-sm border border-cyan-300/40 bg-cyan-300 px-1.5 text-[8px] font-bold text-black shadow-sm">
                        NFT
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] border-cyan-300/15 bg-black/95 p-3 text-zinc-100 backdrop-blur-md">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold" style={{ color: rod.color }}>{rod.name}</p>
                    <p className="text-xs text-zinc-500">Level {rodLevel + 1}</p>
                    {rod.bonus > 0
                      ? <p className="text-xs text-zinc-200">+{rod.bonus}% rare fish chance</p>
                      : <p className="text-xs text-zinc-200">Standard catch chance</p>
                    }
                    {hasNft && (
                      <div className="mt-1 border-t border-cyan-300/15 pt-1 text-xs text-cyan-100">
                        <p className="font-bold">NFT bonuses:</p>
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
              onClick={primaryAction}
              disabled={primaryDisabled}
              aria-label={primaryLabel}
              className="relative h-auto border-0 bg-transparent p-0 shadow-none transition-transform duration-200 hover:scale-[1.04] hover:bg-transparent active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-100 disabled:hover:scale-100"
            >
              <span className="relative block w-[11.75rem] sm:w-[13.5rem]">
                <img
                  src={primaryButtonImage}
                  alt=""
                  aria-hidden="true"
                  className={`block h-auto w-full select-none transition-all duration-200 ${primaryDisabled ? 'grayscale-[0.9] brightness-[0.72] opacity-90' : gameState === 'biting' ? 'drop-shadow-[0_10px_22px_rgba(163,230,53,0.22)]' : 'drop-shadow-[0_10px_22px_rgba(34,211,238,0.24)]'}`}
                  draggable={false}
                />
              </span>
              <span className="sr-only">{primaryLabel}</span>
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default GameControls;
