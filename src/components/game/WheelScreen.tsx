import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WHEEL_PRIZES, type WheelPrize } from '@/types/game';
import { pickWheelPrize } from '@/hooks/useGameProgress';
import CoinIcon from './CoinIcon';
import GameScreenShell from './GameScreenShell';
import { publicAsset } from '@/lib/assets';

interface WheelScreenProps {
  coins: number;
  ready: boolean;
  tasksComplete: boolean;
  spun: boolean;
  prize: WheelPrize | null;
  onSpin: (prize: WheelPrize) => WheelPrize | null;
  onOpenTasks: () => void;
}

const CUBE_TILE_COLORS = [
  '#22d3ee',
  '#a78bfa',
  '#facc15',
  '#34d399',
  '#fb7185',
  '#60a5fa',
  '#f472b6',
  '#a3e635',
  '#f8fafc',
];

const CUBE_SIDES = ['front', 'back', 'right', 'left', 'top', 'bottom'] as const;
const FACE_TRANSFORMS: Record<(typeof CUBE_SIDES)[number], string> = {
  front: 'rotateY(0deg) translateZ(var(--cube-half))',
  back: 'rotateY(180deg) translateZ(var(--cube-half))',
  right: 'rotateY(90deg) translateZ(var(--cube-half))',
  left: 'rotateY(-90deg) translateZ(var(--cube-half))',
  top: 'rotateX(90deg) translateZ(var(--cube-half))',
  bottom: 'rotateX(-90deg) translateZ(var(--cube-half))',
};

const WINNING_TILE_INDEX = 12;
const SPIN_DURATION_MS = 2400;
const CUBE_TEST_MODE = true;

const getTilePrize = (sideIndex: number, tileIndex: number, winningPrize: WheelPrize | null) => {
  if (sideIndex === 0 && tileIndex === WINNING_TILE_INDEX && winningPrize) {
    return winningPrize;
  }
  return WHEEL_PRIZES[(sideIndex * 25 + tileIndex) % WHEEL_PRIZES.length];
};

const getPrizeText = (item: WheelPrize) => (item.secret ? 'SECRET' : item.coins.toLocaleString());

const WheelScreen: React.FC<WheelScreenProps> = ({ coins, ready, tasksComplete, spun, prize, onSpin }) => {
  const [spinning, setSpinning] = useState(false);
  const [displayPrize, setDisplayPrize] = useState<WheelPrize | null>(prize);
  const [plannedPrize, setPlannedPrize] = useState<WheelPrize | null>(prize);
  const [rotation, setRotation] = useState({ x: -18, y: -28, z: 0 });
  const spinLockRef = useRef(false);
  const finishTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!spinning && prize && !CUBE_TEST_MODE) {
      setDisplayPrize(prize);
      setPlannedPrize(prize);
    }
  }, [prize, spinning]);

  useEffect(() => () => {
    if (finishTimeoutRef.current !== null) {
      window.clearTimeout(finishTimeoutRef.current);
    }
  }, []);

  const shownPrize = plannedPrize || displayPrize || prize;
  const canRoll = CUBE_TEST_MODE || (tasksComplete && ready && !spun);
  const statusText = CUBE_TEST_MODE
    ? 'Test mode: roll without daily task gates.'
    : tasksComplete
      ? 'Daily tasks complete. Roll once for today.'
      : 'Complete daily tasks to unlock the cube.';
  const cubeTransform = useMemo(
    () => `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
    [rotation],
  );

  const handleSpin = () => {
    if (!canRoll || spinning || spinLockRef.current) return;

    spinLockRef.current = true;
    const nextPrize = pickWheelPrize();
    const nextRotation = {
      x: rotation.x - 720,
      y: rotation.y - 1080,
      z: rotation.z - 360,
    };

    setSpinning(true);
    setDisplayPrize(null);
    setPlannedPrize(nextPrize);
    setRotation(nextRotation);

    if (finishTimeoutRef.current !== null) {
      window.clearTimeout(finishTimeoutRef.current);
    }

    finishTimeoutRef.current = window.setTimeout(() => {
      const result = onSpin(nextPrize) ?? nextPrize;
      setDisplayPrize(result);
      setPlannedPrize(result);
      setSpinning(false);
      spinLockRef.current = false;
      finishTimeoutRef.current = null;
    }, SPIN_DURATION_MS);
  };

  return (
    <GameScreenShell
      title="Daily Prize Cube"
      subtitle="Complete daily tasks, roll the cube once, and chase the secret prize."
      coins={coins}
      backgroundImage={publicAsset('assets/bg_wheel.jpg')}
    >
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 sm:gap-5">
        <div className="rounded-lg border border-cyan-300/20 bg-black/70 px-4 py-2 text-center backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-normal text-cyan-100">{statusText}</p>
        </div>

        <div className="relative h-[18rem] w-full max-w-[24rem] sm:h-[24rem] sm:max-w-[32rem]" style={{ perspective: '1050px' }}>
          <div className="absolute left-[3%] sm:left-[9%] top-1/2 z-20 flex -translate-y-1/2 items-center gap-1">
            <span className="rounded-lg border border-cyan-300/25 bg-black/85 px-3 py-1 bg-gradient-to-r from-cyan-900 to-black text-[11px] font-black uppercase tracking-normal text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.35)]">
              Winner
            </span>
            <span className="h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.85)]" />
          </div>

          <div
            className={`absolute left-1/2 top-1/2 h-[var(--cube-size)] w-[var(--cube-size)] -translate-x-1/2 -translate-y-1/2 transition-[filter] ${canRoll ? 'brightness-110 drop-shadow-[0_0_70px_rgba(34,211,238,0.38)]' : 'grayscale-[0.45] brightness-75'}`}
            style={{
              '--cube-size': 'min(max(46vmin, 12rem), 20rem)',
              '--cube-half': 'calc(var(--cube-size) / 2)',
            } as React.CSSProperties}
          >
            <div
              className="relative h-full w-full"
              style={{
                transformStyle: 'preserve-3d',
                transform: cubeTransform,
                transition: spinning ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)` : 'transform 700ms ease',
              }}
            >
              {CUBE_SIDES.map((side, sideIndex) => (
              <div
                key={side}
                className="absolute inset-0 grid grid-cols-5 gap-1.5 rounded-lg border border-cyan-100/40 bg-slate-950/90 p-2 shadow-[inset_0_0_28px_rgba(255,255,255,0.12),0_0_28px_rgba(34,211,238,0.18)]"
                style={{
                  transform: FACE_TRANSFORMS[side],
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                }}
              >
                {Array.from({ length: 25 }, (_, tileIndex) => {
                  const item = getTilePrize(sideIndex, tileIndex, shownPrize);
                  const isWinningTile = sideIndex === 0 && tileIndex === WINNING_TILE_INDEX;
                  const colorIndex = Math.max(WHEEL_PRIZES.findIndex((prizeItem) => prizeItem.id === item.id), 0);
                  const color = item.secret ? '#f8fafc' : CUBE_TILE_COLORS[colorIndex % CUBE_TILE_COLORS.length];

                  return (
                    <div
                      key={`${side}-${tileIndex}`}
                      className={`relative flex min-w-0 items-center justify-center overflow-hidden rounded-[4px] border text-[8px] font-black leading-none text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.58),0_5px_10px_rgba(0,0,0,0.22)] transition-all duration-200 sm:text-[10px] ${isWinningTile ? 'z-20 scale-125 border-white ring-2 ring-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.8)]' : 'border-black/25'}`}
                      style={{
                        background: item.secret
                          ? 'linear-gradient(135deg, #f8fafc, #fde68a 45%, #f472b6)'
                          : `linear-gradient(135deg, ${color}, ${color}bb)`,
                        opacity: spinning && !isWinningTile ? 0.9 : 1,
                      }}
                      title={item.label}
                    >
                      <span className="truncate px-0.5 drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]">
                        {getPrizeText(item)}
                      </span>
                      {item.secret && (
                        <Sparkles className="absolute right-0.5 top-0.5 h-2.5 w-2.5 text-black/70" />
                      )}
                    </div>
                  );
                })}
              </div>
              ))}
            </div>
          </div>

          <style>
            {`
              @keyframes popup-reveal {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
              }
            `}
          </style>

          {(!spinning && displayPrize) && (
            <div 
              className="absolute left-1/2 top-1/2 z-50 flex w-full max-w-[16rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border-2 border-yellow-400 bg-black/85 p-6 text-center shadow-[0_0_60px_rgba(250,204,21,0.65)] backdrop-blur-xl"
              style={{ animation: 'popup-reveal 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
            >
              <h2 className="text-xl font-black uppercase text-yellow-500 line-through decoration-transparent">YOU WON!</h2>
              <div className="mt-3 flex items-center justify-center gap-3 text-3xl font-black text-yellow-300 drop-shadow-[0_2px_10px_rgba(250,204,21,0.5)]">
                {displayPrize.secret ? <Sparkles className="h-8 w-8" /> : <CoinIcon size={28} />}
                {displayPrize.label}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-cyan-300/20 bg-black/70 px-4 py-2 text-center backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-normal text-zinc-300">Arrow target</p>
          <p className="mt-1 flex items-center justify-center gap-2 text-base font-black text-cyan-100">
            {shownPrize?.secret ? <Sparkles className="h-4 w-4" /> : <CoinIcon size={16} />}
            {shownPrize ? shownPrize.label : canRoll ? 'Roll to reveal' : 'Locked'}
          </p>
        </div>

        {displayPrize && !spinning && (
          <div className="rounded-lg border border-yellow-400/30 bg-black/75 px-5 py-3 text-center shadow-[0_0_24px_rgba(250,204,21,0.18)] backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-300/80">Result</p>
            <p className="mt-1 text-lg font-black text-yellow-200">
              Ты выиграл: {displayPrize.label}
            </p>
          </div>
        )}

        <Button
          type="button"
          disabled={!canRoll || spinning}
          onClick={handleSpin}
          className="h-12 min-w-56 rounded-lg border border-cyan-300/25 bg-zinc-950 px-6 text-base font-black text-cyan-100 hover:bg-black disabled:border-zinc-800 disabled:bg-zinc-950 disabled:text-zinc-600"
        >
          {canRoll ? (
            <>
              <Box className="mr-2 h-5 w-5" />
              {spinning ? 'Rolling...' : CUBE_TEST_MODE ? 'Test roll cube' : 'Roll cube'}
            </>
          ) : spun ? (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Today roll complete
            </>
          ) : (
            <>
              <Box className="mr-2 h-5 w-5" />
              Cube locked
            </>
          )}
        </Button>

      </div>
    </GameScreenShell>
  );
};

export default WheelScreen;

