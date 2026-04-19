import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { toast } from 'sonner';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import WheelActionIconButton from '@/components/WheelActionIconButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FISH_DATA, RARITY_COLORS, WHEEL_PRIZES, type WheelPrize } from '@/types/game';
import CoinIcon from './CoinIcon';
import FishIcon from './FishIcon';
import GameScreenShell from './GameScreenShell';
import { publicAsset } from '@/lib/assets';
import { isUserRejectedError } from '@/lib/errorUtils';

interface WheelScreenProps {
  coins: number;
  availableRolls: number;
  dailyWheelRolls: number;
  paidWheelRolls: number;
  allTasksComplete: boolean;
  walletAddress?: string;
  onSpin: (prize: WheelPrize) => WheelPrize | null;
  onBuySpin: (amount: number) => void;
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

const BASE_REVEAL_ROTATION = { x: -18, y: -28, z: 0 } as const;
const FACE_ALIGNMENT_OFFSETS = [
  { x: 0, y: 0, z: 0 },
  { x: 0, y: 180, z: 0 },
  { x: 0, y: -90, z: 0 },
  { x: 0, y: 90, z: 0 },
  { x: -90, y: 0, z: 0 },
  { x: 90, y: 0, z: 0 },
] as const;

const FACE_TILE_COUNT = 25;
const SPIN_DURATION_MS = 2400;
const SPIN_SETTLE_BUFFER_MS = 90;
const LIGHT_STEP_START_MS = 55;
const LIGHT_STEP_INCREMENT_MS = 7;
const FISH_TILE_RATIO = 0.42;
const SECRET_COIN_CHANCE = 0.015;
const REGULAR_COIN_PRIZES = WHEEL_PRIZES.filter((item) => !item.secret);
const PAID_SPIN_COST_MON = '1';
const RECEIVER_ADDRESS = '0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D' as const;
const BUY_ROLL_ICON_SRC = publicAsset('assets/wheel_buy_roll_icon_v1.png');
const ROLL_CUBE_ICON_SRC = publicAsset('assets/wheel_roll_cube_icon_v1.png');

type RotationState = { x: number; y: number; z: number };
type SpinPhase = 'idle' | 'spinning' | 'selecting';
type CubeFaces = WheelPrize[][];
type PromptType = 'tasks' | 'tomorrow' | 'wallet';

interface PendingTarget {
  faceIndex: number;
  tileIndex: number;
  prize: WheelPrize;
}

const CUBE_TILE_PATH = Array.from({ length: 5 }, (_, row) => {
  const rowIndices = Array.from({ length: 5 }, (_, col) => row * 5 + col);
  return row % 2 === 0 ? rowIndices : rowIndices.reverse();
}).flat();

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

const getFaceViewRotation = (faceIndex: number): RotationState => {
  const offset = FACE_ALIGNMENT_OFFSETS[faceIndex] ?? FACE_ALIGNMENT_OFFSETS[0];
  return {
    x: BASE_REVEAL_ROTATION.x + offset.x,
    y: BASE_REVEAL_ROTATION.y + offset.y,
    z: BASE_REVEAL_ROTATION.z + offset.z,
  };
};

const getNextRotation = (current: RotationState, targetFaceIndex: number): RotationState => {
  const target = getFaceViewRotation(targetFaceIndex);
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

const PROMPT_CONFIG: Record<PromptType, {
  title: string;
  description: string;
  actionLabel: string;
}> = {
  tasks: {
    title: 'Finish daily tasks first',
    description: 'Complete your daily tasks to unlock 3 cube rolls.',
    actionLabel: 'Go to Tasks',
  },
  tomorrow: {
    title: 'Come back tomorrow',
    description: 'Your daily cube rolls are finished for today.',
    actionLabel: 'OK',
  },
  wallet: {
    title: 'Connect wallet first',
    description: 'Connect your wallet before buying cube rolls with MON.',
    actionLabel: 'Connect Wallet',
  },
};

const WheelScreen: React.FC<WheelScreenProps> = ({
  coins,
  availableRolls,
  dailyWheelRolls,
  paidWheelRolls,
  allTasksComplete,
  walletAddress,
  onSpin,
  onBuySpin,
  onOpenTasks,
}) => {
  const [phase, setPhase] = useState<SpinPhase>('idle');
  const [cubeFaces, setCubeFaces] = useState<CubeFaces>(() => createCubeFaces());
  const [rotation, setRotation] = useState<RotationState>(() => getFaceViewRotation(0));
  const [rotationTransitionEnabled, setRotationTransitionEnabled] = useState(true);
  const [highlightedFaceIndex, setHighlightedFaceIndex] = useState<number | null>(null);
  const [highlightedTileIndex, setHighlightedTileIndex] = useState<number | null>(null);
  const [isBuyingSpin, setIsBuyingSpin] = useState(false);
  const [promptType, setPromptType] = useState<PromptType | null>(null);
  const timersRef = useRef<number[]>([]);
  const spinLockRef = useRef(false);
  const pendingTargetRef = useRef<PendingTarget | null>(null);
  const settleStartedRef = useRef(false);
  const { sendTransactionAsync } = useSendTransaction();

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => () => {
    clearTimers();
  }, []);

  const spinning = phase === 'spinning';
  const selecting = phase === 'selecting';
  const canRoll = availableRolls > 0;
  const hasPaidRolls = paidWheelRolls > 0;
  const hasDailyRolls = dailyWheelRolls > 0;
  const rotationTransform = useMemo(
    () => `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
    [rotation],
  );

  const renderTile = (
    item: WheelPrize,
    tileIndex: number,
    sideIndex: number,
  ) => {
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
        key={`${sideIndex}-${tileIndex}`}
        className={`relative flex min-w-0 items-center justify-center overflow-hidden rounded-[4px] border text-[8px] font-black leading-none text-black transition-all duration-200 sm:text-[10px] ${
          isHighlighted
            ? 'z-20 scale-[1.16] border-white ring-4 ring-cyan-100/90 shadow-[0_0_26px_rgba(34,211,238,0.95),0_0_44px_rgba(255,255,255,0.65)]'
            : 'border-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.58),0_5px_10px_rgba(0,0,0,0.22)]'
        }`}
        style={{
          background: item.type === 'fish' && fish
            ? `linear-gradient(135deg, ${accent}40, ${accent}18)`
            : item.secret
              ? 'linear-gradient(135deg, #f8fafc, #fde68a 45%, #f472b6)'
              : `linear-gradient(135deg, ${accent}, ${accent}bb)`,
          opacity: spinning && highlightedFaceIndex !== null && highlightedFaceIndex !== sideIndex ? 0.94 : 1,
          filter: isHighlighted ? 'brightness(1.38) saturate(1.3)' : 'none',
        }}
      >
        {isHighlighted ? (
          <>
            <span className="pointer-events-none absolute inset-0 bg-white/20" />
            <span className="pointer-events-none absolute inset-[10%] rounded-[3px] border border-white/90 shadow-[0_0_16px_rgba(255,255,255,0.9)]" />
            <span className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-100/95 blur-md" />
          </>
        ) : null}
        {item.type === 'fish' && fish ? (
          <div className="flex flex-col items-center justify-center gap-0.5">
            <FishIcon fish={fish} size="xs" />
            <span className="text-[7px] font-black text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)] sm:text-[8px]">
              x{item.quantity ?? 1}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-0.5">
            {item.secret ? (
              <Sparkles className="h-3 w-3 text-black/75 sm:h-3.5 sm:w-3.5" />
            ) : (
              <CoinIcon size="xs" />
            )}
            <span className="text-[7px] font-black text-black/85 sm:text-[8px]">
              {item.secret ? '???' : shortCoinLabel(item.coins ?? 0)}
            </span>
          </div>
        )}
      </div>
    );
  };

  const snapToFace = (faceIndex: number, onSettled: () => void) => {
    setRotationTransitionEnabled(false);
    setRotation(getFaceViewRotation(faceIndex));
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setRotationTransitionEnabled(true);
        onSettled();
      });
    });
  };

  const startFaceSelection = (target: PendingTarget) => {
    const startPathIndex = Math.floor(Math.random() * CUBE_TILE_PATH.length);
    const targetPathIndex = CUBE_TILE_PATH.indexOf(target.tileIndex);
    const loops = 2 + Math.floor(Math.random() * 2);
    const offset = mod(targetPathIndex - startPathIndex, CUBE_TILE_PATH.length);
    const totalSteps = loops * CUBE_TILE_PATH.length + offset;
    let step = 0;

    setPhase('selecting');
    setHighlightedFaceIndex(target.faceIndex);

    const tick = () => {
      const currentTileIndex = CUBE_TILE_PATH[(startPathIndex + step) % CUBE_TILE_PATH.length];
      setHighlightedTileIndex(currentTileIndex);

      if (step >= totalSteps) {
        const result = onSpin(target.prize) ?? target.prize;
        setPhase('idle');
        setHighlightedFaceIndex(target.faceIndex);
        toast.success(`You won: ${result.label}`);
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

  const finishSpinAndReveal = () => {
    if (settleStartedRef.current || phase !== 'spinning' || !pendingTargetRef.current) return;

    settleStartedRef.current = true;
    const target = pendingTargetRef.current;
    pendingTargetRef.current = null;
    snapToFace(target.faceIndex, () => startFaceSelection(target));
  };

  const showRollRequirementPrompt = () => {
    if (allTasksComplete) {
      setPromptType('tomorrow');
      return;
    }

    setPromptType('tasks');
  };

  const handleBuySpin = async () => {
    if (isBuyingSpin) {
      return;
    }

    if (!walletAddress) {
      setPromptType('wallet');
      return;
    }

    setIsBuyingSpin(true);
    try {
      await sendTransactionAsync({
        to: RECEIVER_ADDRESS,
        value: parseEther(PAID_SPIN_COST_MON),
      });
      onBuySpin(1);
      toast.success('Paid cube roll added.');
    } catch (err: unknown) {
      console.error('Paid spin purchase failed:', err);
      if (isUserRejectedError(err)) {
        toast.error('Transaction cancelled.');
      } else {
        toast.error('Could not buy a roll.');
      }
    } finally {
      setIsBuyingSpin(false);
    }
  };

  const handleCubeTap = () => {
    if (canRoll) {
      toast.info('Use the Roll Cube button below.');
      return;
    }

    showRollRequirementPrompt();
  };

  const handleSpin = () => {
    if (spinning || selecting || spinLockRef.current) return;
    if (!hasDailyRolls && !hasPaidRolls) {
      showRollRequirementPrompt();
      return;
    }

    clearTimers();
    spinLockRef.current = true;

    const nextFaces = createCubeFaces();
    const faceIndex = Math.floor(Math.random() * CUBE_SIDES.length);
    const tileIndex = Math.floor(Math.random() * FACE_TILE_COUNT);
    const targetPrize = nextFaces[faceIndex][tileIndex];

    setCubeFaces(nextFaces);
    setHighlightedFaceIndex(null);
    setHighlightedTileIndex(null);
    setPhase('spinning');
    setRotationTransitionEnabled(true);
    pendingTargetRef.current = { faceIndex, tileIndex, prize: targetPrize };
    settleStartedRef.current = false;
    setRotation((current) => getNextRotation(current, faceIndex));

    const spinTimer = window.setTimeout(() => {
      finishSpinAndReveal();
    }, SPIN_DURATION_MS + SPIN_SETTLE_BUFFER_MS);
    timersRef.current.push(spinTimer);
  };

  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => {
        const activePrompt = promptType ? PROMPT_CONFIG[promptType] : null;

        const handlePromptAction = () => {
          if (promptType === 'tasks') {
            setPromptType(null);
            onOpenTasks();
            return;
          }

          if (promptType === 'wallet') {
            setPromptType(null);
            window.setTimeout(() => {
              openConnectModal?.();
            }, 80);
            return;
          }

          setPromptType(null);
        };

        return (
          <>
            <GameScreenShell
              title="Daily Prize Cube"
              subtitle="Finish daily tasks to unlock 3 cube rolls. Buy extra rolls with MON any time."
              coins={coins}
              backgroundImage={publicAsset('assets/bg_wheel_v3.png')}
            >
              <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 sm:gap-6">
                <div
                  className={`relative h-[18rem] w-full max-w-[24rem] sm:h-[24rem] sm:max-w-[32rem] ${
                    canRoll && !spinning && !selecting ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  style={{
                    perspective: '1050px',
                    '--cube-size': 'min(max(46vmin, 12rem), 20rem)',
                    '--cube-half': 'calc(var(--cube-size) / 2)',
                  } as React.CSSProperties}
                  onClick={handleCubeTap}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleCubeTap();
                    }
                  }}
                  aria-label="Cube preview"
                >
                  <div
                    className={`absolute left-1/2 top-1/2 h-[var(--cube-size)] w-[var(--cube-size)] -translate-x-1/2 -translate-y-1/2 transition-[filter,transform] duration-300 ${
                      canRoll ? 'brightness-110 drop-shadow-[0_0_70px_rgba(34,211,238,0.38)]' : 'grayscale-[0.45] brightness-75'
                    } ${
                      canRoll && !spinning && !selecting ? 'hover:scale-[1.02]' : ''
                    }`}
                  >
                    <div
                      className="relative h-full w-full"
                      onTransitionEnd={(event) => {
                        if (event.propertyName !== 'transform') return;
                        finishSpinAndReveal();
                      }}
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: rotationTransform,
                        transition: rotationTransitionEnabled
                          ? spinning
                            ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
                            : 'transform 700ms ease'
                          : 'none',
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
                          {cubeFaces[sideIndex].map((item, tileIndex) => renderTile(item, tileIndex, sideIndex))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 sm:gap-6">
                  <WheelActionIconButton
                    src={ROLL_CUBE_ICON_SRC}
                    alt="Roll cube"
                    label="Roll cube"
                    onClick={handleSpin}
                    disabled={spinning || selecting}
                    badge={canRoll ? `${availableRolls}` : null}
                    shape="banner"
                  />
                  <WheelActionIconButton
                    src={BUY_ROLL_ICON_SRC}
                    alt="Buy roll"
                    label={`Buy roll for ${PAID_SPIN_COST_MON} MON`}
                    onClick={handleBuySpin}
                    disabled={isBuyingSpin}
                    badge={hasPaidRolls ? `${paidWheelRolls}` : null}
                  />
                </div>
              </div>
            </GameScreenShell>

            <AlertDialog
              open={!!activePrompt}
              onOpenChange={(open) => {
                if (!open) {
                  setPromptType(null);
                }
              }}
            >
              <AlertDialogContent className="max-w-[calc(100vw-2rem)] border border-cyan-300/20 bg-slate-950/95 text-cyan-50 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-md sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-black text-white">
                    {activePrompt?.title}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-medium text-cyan-100/80">
                    {activePrompt?.description}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-cyan-300/20 bg-slate-900 text-cyan-50 hover:bg-slate-800">
                    Close
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handlePromptAction}
                    className="border border-cyan-300/25 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30"
                  >
                    {activePrompt?.actionLabel}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default WheelScreen;
