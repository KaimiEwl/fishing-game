import React, { useEffect, useState } from 'react';
import { GameResult, GameState } from '@/types/game';
import { Button } from '@/components/ui/button';
import FishDisplay from './FishDisplay';
import { publicAsset } from '@/lib/assets';
import { FISH_GOT_AWAY_PANEL_SRC } from '@/lib/rodAssets';
import GameStateNotice from '@/components/GameStateNotice';
import BiteMeter from '@/components/BiteMeter';
import RodPreviewBadge from '@/components/RodPreviewBadge';

const CAST_BUTTON_BLUE = publicAsset('assets/cast_button_blue.png');
const CAST_BUTTON_GREEN = publicAsset('assets/cast_button_green.png');

interface GameControlsProps {
  gameState: GameState;
  lastResult: GameResult | null;
  hasBait: boolean;
  premiumCastActive?: boolean;
  totalBait?: number;
  onCast: () => void;
  onReelIn?: () => void;
  rodLevel?: number;
  ownedRodLevel?: number;
  nftRods?: number[];
  biteTimeLeft?: number;
  biteTimeTotal?: number;
  premiumSweetSpotStart?: number;
  premiumSweetSpotEnd?: number;
  missXpReward?: number;
  isMobile?: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({
  gameState,
  lastResult,
  hasBait,
  premiumCastActive = false,
  totalBait = 0,
  onCast,
  onReelIn,
  rodLevel = 0,
  ownedRodLevel = 0,
  nftRods = [],
  biteTimeLeft = 0,
  biteTimeTotal = 1,
  premiumSweetSpotStart = 42,
  premiumSweetSpotEnd = 58,
  missXpReward = 5,
  isMobile = false,
}) => {
  const biteProgress = biteTimeTotal > 0 ? (biteTimeLeft / biteTimeTotal) * 100 : 0;
  const showPrimaryControl = gameState === 'idle' || gameState === 'biting';
  const primaryAction = gameState === 'biting' ? onReelIn : onCast;
  const primaryCanCast = premiumCastActive || hasBait;
  const primaryDisabled = gameState === 'idle' ? !primaryCanCast : false;
  const primaryLabel = gameState === 'biting'
    ? 'Hook fish'
    : premiumCastActive
      ? 'Premium cast'
      : hasBait
        ? 'Cast line'
        : 'No bait';
  const primaryStatusBadge = gameState === 'idle'
    ? premiumCastActive
      ? 'Premium cast'
      : !hasBait
        ? 'No bait'
        : null
    : null;
  const primaryButtonImage = gameState === 'biting' ? CAST_BUTTON_GREEN : CAST_BUTTON_BLUE;
  const [primaryButtonArtFailed, setPrimaryButtonArtFailed] = useState(false);

  useEffect(() => {
    setPrimaryButtonArtFailed(false);
  }, [primaryButtonImage]);

  return (
    <>
      {gameState !== 'idle' && (
        <div className="fixed left-1/2 top-[35%] z-20 w-[calc(100%-1.5rem)] max-w-[min(30rem,92vw)] -translate-x-1/2 -translate-y-1/2 sm:top-[39%]">
          {gameState === 'result' && lastResult && (
            <div className="animate-scale-in rounded-2xl border border-cyan-300/18 bg-black/84 p-3 text-zinc-100 shadow-2xl backdrop-blur-md sm:p-4">
              {lastResult.success && lastResult.fish ? (
                <div className="flex flex-col items-center">
                  <p className="mb-2 text-lg font-bold text-cyan-100">Caught!</p>
                  <FishDisplay fish={lastResult.fish} showDetails size="lg" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <img
                    src={FISH_GOT_AWAY_PANEL_SRC}
                    alt="The fish got away"
                    className="block w-full max-w-[26rem] rounded-xl object-contain shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
                    draggable={false}
                  />
                  <div className="rounded-2xl border border-amber-300/18 bg-black/72 px-4 py-2.5 shadow-lg">
                    <p className="text-2xl font-black leading-none text-amber-300 sm:text-4xl">
                      +{missXpReward} XP
                    </p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-300/80 sm:text-xs">
                      Experience for trying
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {gameState === 'casting' && (
            <GameStateNotice tone="success">Casting...</GameStateNotice>
          )}

          {gameState === 'waiting' && (
            <GameStateNotice>Waiting for a bite...</GameStateNotice>
          )}

          {gameState === 'catching' && (
            <GameStateNotice tone="success">Reeling in!</GameStateNotice>
          )}
        </div>
      )}

      {showPrimaryControl && (
        <div
          className="fixed left-1/2 z-30 -translate-x-1/2"
          style={{
            bottom: isMobile
              ? 'calc(var(--bottom-nav-clearance,0px) + 3.15rem)'
              : 'calc(var(--bottom-nav-clearance,0px) + 6.8rem)',
          }}
        >
          <div className="relative flex w-[11.75rem] justify-center sm:w-[13.5rem]">
            {gameState === 'biting' && (
              <div className="pointer-events-none absolute bottom-[calc(100%+0.7rem)] left-1/2 z-[2] -translate-x-1/2">
                <BiteMeter
                  progress={biteProgress}
                  showSweetSpot={premiumCastActive}
                  sweetSpotStart={premiumSweetSpotStart}
                  sweetSpotEnd={premiumSweetSpotEnd}
                />
              </div>
            )}

            {primaryStatusBadge && (
              <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-[2] -translate-x-1/2">
                <div className="rounded-full border border-cyan-200/25 bg-black/76 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 shadow-[0_10px_24px_rgba(0,0,0,0.35)] backdrop-blur-md sm:text-[11px]">
                  {primaryStatusBadge}
                </div>
              </div>
            )}

            <RodPreviewBadge
              rodLevel={rodLevel}
              ownedRodLevel={ownedRodLevel}
              nftRods={nftRods}
              totalBait={totalBait}
            />

            <Button
              onClick={primaryAction}
              disabled={primaryDisabled}
              aria-label={primaryLabel}
              className="relative z-[1] h-auto border-0 bg-transparent p-0 shadow-none transition-transform duration-200 hover:scale-[1.04] hover:bg-transparent active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-100 disabled:hover:scale-100"
            >
              <span className="relative block w-[11.75rem] sm:w-[13.5rem]">
                {primaryButtonArtFailed && (
                  <span
                    aria-hidden="true"
                    className={`absolute inset-[10%] rounded-[999px] border transition-all duration-200 ${
                      gameState === 'biting'
                        ? 'border-lime-300/60 bg-[linear-gradient(180deg,rgba(101,163,13,0.98),rgba(39,90,14,0.98))] shadow-[0_14px_32px_rgba(101,163,13,0.28)]'
                        : 'border-cyan-200/45 bg-[linear-gradient(180deg,rgba(56,189,248,0.95),rgba(11,70,138,0.98))] shadow-[0_14px_32px_rgba(34,211,238,0.24)]'
                    } ${primaryDisabled ? 'brightness-[0.72] saturate-[0.7] opacity-80' : ''}`}
                  />
                )}
                {!primaryButtonArtFailed && (
                  <img
                    src={primaryButtonImage}
                    alt=""
                    aria-hidden="true"
                    className={`relative block h-auto w-full select-none transition-all duration-200 ${primaryDisabled ? 'grayscale-[0.9] brightness-[0.72] opacity-90' : gameState === 'biting' ? 'drop-shadow-[0_10px_22px_rgba(163,230,53,0.22)]' : 'drop-shadow-[0_10px_22px_rgba(34,211,238,0.24)]'}`}
                    draggable={false}
                    onError={() => setPrimaryButtonArtFailed(true)}
                  />
                )}
                {primaryButtonArtFailed && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-[0.9rem] font-black uppercase tracking-[0.14em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] sm:text-[1rem]">
                    {primaryLabel}
                  </span>
                )}
              </span>
              <span className="sr-only">{primaryLabel}</span>
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default GameControls;
