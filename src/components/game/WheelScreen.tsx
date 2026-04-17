import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FISH_DATA, RARITY_COLORS, WHEEL_PRIZES, type Fish, type WheelPrize } from '@/types/game';
import CoinIcon from './CoinIcon';
import FishIcon from './FishIcon';
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

const FACE_VIEW_ROTATIONS = [
  { x: -18, y: -28, z: 0 },
  { x: -18, y: 152, z: 0 },
  { x: -18, y: -118, z: 0 },
  { x: -18, y: 62, z: 0 },
  { x: 72, y: -28, z: 0 },
  { x: -108, y: -28, z: 0 },
] as const;

const FACE_TILE_COUNT = 25;
const SPIN_DURATION_MS = 2400;
const LIGHT_STEP_START_MS = 55;
const LIGHT_STEP_INCREMENT_MS = 7;
const FISH_TILE_RATIO = 0.42;
const CUBE_TEST_MODE = true;
const SECRET_COIN_CHANCE = 0.015;
const REGULAR_COIN_PRIZES = WHEEL_PRIZES.filter((item) => !item.secret);

type RotationState = { x: number; y: number; z: number };
type SpinPhase = 'idle' | 'spinning' | 'selecting';
type CubeFaces = WheelPrize[][];

interface PendingTarget {
  faceIndex: number;
  tileIndex: number;
  prize: WheelPrize;
}

const mod = (value: number, base: number) => ((value % base) + base) % base;

const pickWeighted = <T,>(items: readonly T[], getWeight: (item: T) => number) => {
  const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0);
  let roll = Math.random() * totalWeight;

  for (const item of items) {
    roll -= getWeight(item);
    if (roll <= 0) return item;
  }

  return items[items.length - 1];
};

const shortCoinLabel = (amount: number) => {
  if (amount >= 1000) {
    const compact = amount % 1000 === 0 ? amount / 1000 : Number((amount / 1000).toFixed(1));
    return `${compact}K`;
  }
  return `${amount}`;
};

const getFishByReward = (reward: WheelPrize) => (
  reward.type === 'fish' && reward.fishId
    ? FISH_DATA.find((fish) => fish.id === reward.fishId) ?? null
    : null
);

const createFishPrize = (): WheelPrize => {
  const fish = pickWeighted(FISH_DATA, (item) => item.chance);
  return {
    id: `fish_${fish.id}`,
    type: 'fish',
    fishId: fish.id,
    quantity: 1,
    label: `${fish.name} x1`,
  };
};

const createCoinPrize = (): WheelPrize => {
  const roll = Math.random();
  if (roll < SECRET_COIN_CHANCE) {
    return WHEEL_PRIZES.find((item) => item.secret) ?? WHEEL_PRIZES[0];
  }
  return REGULAR_COIN_PRIZES[Math.floor(Math.random() * REGULAR_COIN_PRIZES.length)];
};

const createCubeTilePrize = (): WheelPrize => (
  Math.random() < FISH_TILE_RATIO ? createFishPrize() : createCoinPrize()
);

const createCubeFaces = (): CubeFaces => (
  CUBE_SIDES.map(() => Array.from({ length: FACE_TILE_COUNT }, () => createCubeTilePrize()))
);

const getNextRotation = (current: RotationState, targetFaceIndex: number): RotationState => {
  const target = FACE_VIEW_ROTATIONS[targetFaceIndex];
  const currentX = mod(current.x, 360);
  const currentY = mod(current.y, 360);
  const currentZ = mod(current.z, 360);
  const targetX = mod(target.x, 360);
  const targetY = mod(target.y, 360);
  const targetZ = mod(target.z, 360);

  return {
    x: current.x + 720 + mod(targetX - currentX, 360),
    y: current.y + 1080 + mod(targetY - currentY, 360),
    z: current.z + 360 + mod(targetZ - currentZ, 360),
  };
};

const WheelScreen: React.FC<WheelScreenProps> = ({ coins, ready, tasksComplete, spun, prize, onSpin, onOpenTasks }) => {
  const [phase, setPhase] = useState<SpinPhase>('idle');
  const [displayPrize, setDisplayPrize] = useState<WheelPrize | null>(prize);
  const [cubeFaces, setCubeFaces] = useState<CubeFaces>(() => createCubeFaces());
  const [pendingTarget, setPendingTarget] = useState<PendingTarget | null>(null);
  const [rotation, setRotation] = useState<RotationState>(() => ({ ...FACE_VIEW_ROTATIONS[0] }));
  const [highlightedFaceIndex, setHighlightedFaceIndex] = useState<number | null>(null);
  const [highlightedTileIndex, setHighlightedTileIndex] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const spinLockRef = useRef(false);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => {
    if (!CUBE_TEST_MODE && phase === 'idle' && prize) {
      setDisplayPrize(prize);
    }
  }, [phase, prize]);

  useEffect(() => () => {
    clearTimers();
  }, []);

  const spinning = phase === 'spinning';
  const selecting = phase === 'selecting';
  const shownPrize = displayPrize ?? pendingTarget?.prize ?? prize;
  const canRoll = CUBE_TEST_MODE || (tasksComplete && ready && !spun);
  const rotationTransform = useMemo(
    () => `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
    [rotation],
  );

  const statusText = CUBE_TEST_MODE
    ? 'Test mode: cube can roll any time.'
    : tasksComplete
      ? 'Daily tasks complete. Roll the cube once for today.'
      : 'Complete daily tasks to unlock the cube.';

  const helperText = selecting
    ? 'The glow is picking one tile on the active face.'
    : spinning
      ? 'Cube is spinning toward a face.'
      : canRoll
        ? 'Cube stops on a face, then the glow selects one tile from that face.'
        : 'Finish daily tasks first, then come back to the cube.';

  const startFaceSelection = (target: PendingTarget) => {
    const startTileIndex = Math.floor(Math.random() * FACE_TILE_COUNT);
    const loops = 2 + Math.floor(Math.random() * 2);
    const offset = mod(target.tileIndex - startTileIndex, FACE_TILE_COUNT);
    const totalSteps = loops * FACE_TILE_COUNT + offset;
    let step = 0;

    setPhase('selecting');
    setHighlightedFaceIndex(target.faceIndex);

    const tick = () => {
      const currentIndex = (startTileIndex + step) % FACE_TILE_COUNT;
      setHighlightedTileIndex(currentIndex);

      if (step >= totalSteps) {
        const result = onSpin(target.prize) ?? target.prize;
        setDisplayPrize(result);
        setPendingTarget({ ...target, prize: result });
        setPhase('idle');
        spinLockRef.current = false;
        return;
      }

      step += 1;
      const delay = Math.min(220, LIGHT_STEP_START_MS + step * LIGHT_STEP_INCREMENT_MS);
      const timer = window.setTimeout(tick, delay);
      timersRef.current.push(timer);
    };

    tick();
  };

  const handleSpin = () => {
    if (!canRoll || spinning || selecting || spinLockRef.current) return;

    clearTimers();
    spinLockRef.current = true;

    const nextFaces = createCubeFaces();
    const faceIndex = Math.floor(Math.random() * CUBE_SIDES.length);
    const tileIndex = Math.floor(Math.random() * FACE_TILE_COUNT);
    const targetPrize = nextFaces[faceIndex][tileIndex];
    const nextTarget = { faceIndex, tileIndex, prize: targetPrize };

    setCubeFaces(nextFaces);
    setDisplayPrize(null);
    setPendingTarget(nextTarget);
    setHighlightedFaceIndex(null);
    setHighlightedTileIndex(null);
    setPhase('spinning');
    setRotation((current) => getNextRotation(current, faceIndex));

    const spinTimer = window.setTimeout(() => {
      startFaceSelection(nextTarget);
    }, SPIN_DURATION_MS);
    timersRef.current.push(spinTimer);
  };

  return (
    <GameScreenShell
      title="Daily Prize Cube"
      subtitle="Cube locks onto a face first, then the glow picks the winning tile from that face."
      coins={coins}
      backgroundImage={publicAsset('assets/bg_wheel.jpg')}
    >
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 sm:gap-5">
        <div className="rounded-lg border border-cyan-300/20 bg-black/70 px-4 py-2 text-center backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-normal text-cyan-100">{statusText}</p>
          <p className="mt-1 text-[11px] font-semibold text-zinc-300">{helperText}</p>
        </div>

        <div className="relative h-[18rem] w-full max-w-[24rem] sm:h-[24rem] sm:max-w-[32rem]" style={{ perspective: '1050px' }}>
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
                transform: rotationTransform,
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
                  {cubeFaces[sideIndex].map((item, tileIndex) => {
                    const fish = getFishByReward(item);
                    const isHighlighted = highlightedFaceIndex === sideIndex && highlightedTileIndex === tileIndex;
                    const colorIndex = Math.max(WHEEL_PRIZES.findIndex((prizeItem) => prizeItem.id === item.id), 0);
                    const accent = item.type === 'fish' && fish
                      ? RARITY_COLORS[fish.rarity]
                      : item.secret
                        ? '#f8fafc'
                        : CUBE_TILE_COLORS[colorIndex % CUBE_TILE_COLORS.length];

                    return (
                      <div
                        key={`${side}-${tileIndex}`}
                        className={`relative flex min-w-0 items-center justify-center overflow-hidden rounded-[4px] border text-[8px] font-black leading-none text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.58),0_5px_10px_rgba(0,0,0,0.22)] transition-all duration-200 sm:text-[10px] ${
                          isHighlighted
                            ? 'z-20 scale-110 border-white ring-2 ring-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.8)]'
                            : 'border-black/25'
                        }`}
                        style={{
                          background: item.type === 'fish' && fish
                            ? `linear-gradient(135deg, ${accent}40, ${accent}18)`
                            : item.secret
                              ? 'linear-gradient(135deg, #f8fafc, #fde68a 45%, #f472b6)'
                              : `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                          opacity: spinning && highlightedFaceIndex !== sideIndex ? 0.94 : 1,
                        }}
                        title={item.label}
                      >
                        {item.type === 'fish' && fish ? (
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <FishIcon fish={fish} size="xs" className="h-5 w-5 sm:h-6 sm:w-6" />
                            <span className="text-[7px] font-black text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)] sm:text-[8px]">
                              x{item.quantity ?? 1}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            {item.secret ? (
                              <Sparkles className="h-3 w-3 text-black/75 sm:h-3.5 sm:w-3.5" />
                            ) : (
                              <CoinIcon size={11} />
                            )}
                            <span className="text-[7px] font-black text-black/85 sm:text-[8px]">
                              {item.secret ? '???' : shortCoinLabel(item.coins ?? 0)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-cyan-300/20 bg-black/70 px-4 py-2 text-center backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-normal text-zinc-300">
            {displayPrize ? 'Result' : pendingTarget ? 'Locked target' : 'Cube preview'}
          </p>
          <p className="mt-1 flex items-center justify-center gap-2 text-base font-black text-cyan-100">
            {shownPrize ? (
              shownPrize.type === 'fish' && getFishByReward(shownPrize) ? (
                <>
                  <FishIcon fish={getFishByReward(shownPrize) as Fish} size="sm" />
                  {shownPrize.label}
                </>
              ) : (
                <>
                  {shownPrize.secret ? <Sparkles className="h-4 w-4" /> : <CoinIcon size={16} />}
                  {shownPrize.label}
                </>
              )
            ) : (
              'Roll to reveal'
            )}
          </p>
        </div>

        {displayPrize && !spinning && !selecting && (
          <div className="rounded-lg border border-yellow-400/30 bg-black/75 px-5 py-3 text-center shadow-[0_0_24px_rgba(250,204,21,0.18)] backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-300/80">Result</p>
            <p className="mt-1 flex items-center justify-center gap-2 text-lg font-black text-yellow-200">
              {displayPrize.type === 'fish' && getFishByReward(displayPrize) ? (
                <>
                  <FishIcon fish={getFishByReward(displayPrize) as Fish} size="sm" />
                  <span>Ты выиграл: {displayPrize.label}</span>
                </>
              ) : (
                <>
                  {displayPrize.secret ? <Sparkles className="h-5 w-5" /> : <CoinIcon size={18} />}
                  <span>Ты выиграл: {displayPrize.label}</span>
                </>
              )}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            disabled={!canRoll || spinning || selecting}
            onClick={handleSpin}
            className="h-12 min-w-56 rounded-lg border border-cyan-300/25 bg-zinc-950 px-6 text-base font-black text-cyan-100 hover:bg-black disabled:border-zinc-800 disabled:bg-zinc-950 disabled:text-zinc-600"
          >
            {canRoll ? (
              <>
                <Box className="mr-2 h-5 w-5" />
                {spinning ? 'Spinning...' : selecting ? 'Choosing tile...' : CUBE_TEST_MODE ? 'Test roll cube' : 'Roll cube'}
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

          {!canRoll && !CUBE_TEST_MODE && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenTasks}
              className="h-12 rounded-lg border-cyan-300/20 bg-black/60 px-5 font-black text-cyan-100 hover:bg-black"
            >
              Open tasks
            </Button>
          )}
        </div>
      </div>
    </GameScreenShell>
  );
};

export default WheelScreen;
