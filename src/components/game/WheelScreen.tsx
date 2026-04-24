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
import {
  CUBE_REBALANCE_CONFIG,
  MON_CUBE_SPIN_PACKAGES,
  MON_MARKET_RECEIVER_ADDRESS,
} from '@/lib/baitEconomy';
import { isUserRejectedError } from '@/lib/errorUtils';

interface WheelScreenProps {
  coins: number;
  availableRolls: number;
  dailyWheelRolls: number;
  paidWheelRolls: number;
  dailyTaskClaimsMet: boolean;
  walletAddress?: string;
  onRequestRoll?: () => Promise<{
    id?: string;
    cube_faces: WheelPrize[][];
    target_face_index: number;
    target_tile_index: number;
    prize: WheelPrize;
  } | null> | {
    id?: string;
    cube_faces: WheelPrize[][];
    target_face_index: number;
    target_tile_index: number;
    prize: WheelPrize;
  } | null;
  onResolveReward: (prize: WheelPrize, rollId?: string) => Promise<WheelPrize | null> | WheelPrize | null;
  onBuySpin: (amount: number) => void;
  onOpenTasks: () => void;
  onSpinStartSound?: () => void;
  onRevealSound?: () => void;
  onRewardSound?: () => void;
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
const FISH_TILE_RATIO = CUBE_REBALANCE_CONFIG.enabled ? CUBE_REBALANCE_CONFIG.fishTileRatio : 0.42;
const MON_TILE_COUNT = CUBE_REBALANCE_CONFIG.enabled ? CUBE_REBALANCE_CONFIG.monTileCount : 2;
const BAIT_TILE_RATIO = CUBE_REBALANCE_CONFIG.enabled ? 0.28 : 0;
const COIN_PRIZES = WHEEL_PRIZES.filter((item) => item.type === 'coins');
const BAIT_PRIZES = WHEEL_PRIZES.filter((item) => item.type === 'bait');
const SECRET_MON_PRIZE = WHEEL_PRIZES.find((item) => item.type === 'mon' && item.secret) ?? {
  id: 'secret_mon_1',
  type: 'mon' as const,
  label: `${CUBE_REBALANCE_CONFIG.monPrizeAmount} MON`,
  mon: CUBE_REBALANCE_CONFIG.monPrizeAmount,
  secret: true,
};
const COIN_PRIZE_WEIGHTS: Readonly<Record<string, number>> = {
  coin_60: 28,
  coin_120: 24,
  coin_200: 18,
  coin_350: 12,
  coin_550: 8,
  coin_900: 5,
  coin_1500: 3,
  coin_2200: 2,
};
const BAIT_PRIZE_WEIGHTS: Readonly<Record<string, number>> = {
  bait_3: 30,
  bait_5: 26,
  bait_8: 20,
  bait_12: 15,
  bait_18: 9,
};
const PAID_SPIN_COST_MON = MON_CUBE_SPIN_PACKAGES[0]?.monAmount ?? '0.04';
const BUY_ROLL_ICON_SRC = publicAsset('assets/wheel_buy_roll_icon_v2.webp');
const ROLL_CUBE_ICON_SRC = publicAsset('assets/wheel_roll_cube_icon_v2.webp');
const BUY_SPIN_TOAST_ID = 'wheel-buy-spin';

type RotationState = { x: number; y: number; z: number };
type SpinPhase = 'idle' | 'spinning' | 'selecting';
type CubeFaces = WheelPrize[][];
type PromptType = 'tasks' | 'tomorrow' | 'wallet';

interface PendingTarget {
  faceIndex: number;
  tileIndex: number;
  prize: WheelPrize;
  rollId?: string;
}

const CUBE_TILE_PATH = Array.from({ length: 5 }, (_, row) => {
  const rowIndices = Array.from({ length: 5 }, (_, col) => row * 5 + col);
  return row % 2 === 0 ? rowIndices : rowIndices.reverse();
}).flat();

const mod = (value: number, base: number) => ((value % base) + base) % base;

const indexToFaceAndTile = (index: number) => ({
  faceIndex: Math.floor(index / FACE_TILE_COUNT),
  tileIndex: index % FACE_TILE_COUNT,
});

const randomUniqueIndexes = (count: number, maxExclusive: number) => {
  const chosen = new Set<number>();
  while (chosen.size < count) {
    chosen.add(Math.floor(Math.random() * maxExclusive));
  }

  return Array.from(chosen.values());
};

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
  return pickWeighted(COIN_PRIZES, (item) => COIN_PRIZE_WEIGHTS[item.id] ?? 1);
};

const createBaitPrize = (): WheelPrize => (
  pickWeighted(BAIT_PRIZES, (item) => BAIT_PRIZE_WEIGHTS[item.id] ?? 1)
);

const createRewardPrize = (): WheelPrize => (
  BAIT_PRIZES.length > 0 && Math.random() < BAIT_TILE_RATIO ? createBaitPrize() : createCoinPrize()
);

const createCubeTilePrize = (): WheelPrize => (
  Math.random() < FISH_TILE_RATIO ? createFishPrize() : createRewardPrize()
);

const createCubeFaces = (): CubeFaces => {
  const cubeFaces = CUBE_SIDES.map(() => Array.from({ length: FACE_TILE_COUNT }, () => createCubeTilePrize()));

  if (MON_TILE_COUNT > 0) {
    const monIndexes = randomUniqueIndexes(MON_TILE_COUNT, CUBE_SIDES.length * FACE_TILE_COUNT);
    for (const globalIndex of monIndexes) {
      const { faceIndex, tileIndex } = indexToFaceAndTile(globalIndex);
      cubeFaces[faceIndex][tileIndex] = {
        ...SECRET_MON_PRIZE,
        label: `${SECRET_MON_PRIZE.mon ?? CUBE_REBALANCE_CONFIG.monPrizeAmount} MON`,
      };
    }
  }

  return cubeFaces;
};

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
    description: 'Claim any 3 daily tasks to unlock 3 cube rolls.',
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
  dailyTaskClaimsMet,
  walletAddress,
  onRequestRoll,
  onResolveReward,
  onBuySpin,
  onOpenTasks,
  onSpinStartSound,
  onRevealSound,
  onRewardSound,
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
    const isMonTile = item.type === 'mon';
    const isBaitTile = item.type === 'bait';
    const colorIndex = Math.max(WHEEL_PRIZES.findIndex((prizeItem) => prizeItem.id === item.id), 0);
    const accent = item.type === 'fish' && fish
      ? RARITY_COLORS[fish.rarity]
      : item.type === 'mon'
        ? '#14f195'
      : item.type === 'bait'
        ? '#bef264'
        : item.secret
        ? '#f8fafc'
        : CUBE_TILE_COLORS[colorIndex % CUBE_TILE_COLORS.length];

    return (
      <div
        key={`${sideIndex}-${tileIndex}`}
        className={`relative flex min-w-0 items-center justify-center overflow-hidden rounded-[4px] border text-[8px] font-black leading-none text-black transition-all duration-200 sm:text-[10px] ${
          isHighlighted
            ? 'z-20 scale-[1.16] border-white ring-4 ring-cyan-100/90 shadow-[0_0_26px_rgba(34,211,238,0.95),0_0_44px_rgba(255,255,255,0.65)]'
            : isMonTile
              ? 'border-emerald-100/90 ring-1 ring-emerald-100/85 shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_0_16px_rgba(20,241,149,0.45)]'
            : isBaitTile
              ? 'border-lime-100/90 ring-1 ring-lime-100/80 shadow-[0_0_0_1px_rgba(101,163,13,0.2),0_0_14px_rgba(190,242,100,0.35)]'
            : 'border-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.58),0_5px_10px_rgba(0,0,0,0.22)]'
        }`}
        style={{
          background: item.type === 'fish' && fish
            ? `linear-gradient(135deg, ${accent}40, ${accent}18)`
            : isMonTile
              ? 'radial-gradient(circle at top, rgba(236,253,245,0.98), rgba(52,211,153,0.94) 52%, rgba(5,150,105,0.98) 100%)'
            : isBaitTile
              ? 'radial-gradient(circle at top, rgba(247,254,231,0.98), rgba(190,242,100,0.94) 55%, rgba(101,163,13,0.98) 100%)'
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
        ) : item.type === 'mon' ? (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden px-0.5 text-center">
            <span className="pointer-events-none absolute inset-x-[10%] top-[16%] h-[1px] bg-white/80" />
            <span className="pointer-events-none absolute inset-x-[12%] bottom-[18%] h-[1px] bg-emerald-950/20" />
            <span className="text-[8px] font-black tracking-[0.08em] text-emerald-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] sm:text-[10px]">
              {item.mon ?? 1} MON
            </span>
          </div>
        ) : item.type === 'bait' ? (
          <div className="relative flex h-full w-full flex-col items-center justify-center px-0.5 text-center">
            <span className="text-[6px] font-black tracking-[0.14em] text-lime-950/85 sm:text-[7px]">
              BAIT
            </span>
            <span className="text-[8px] font-black text-lime-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.6)] sm:text-[10px]">
              +{item.bait ?? 0}
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
        void (async () => {
          try {
            const result = await onResolveReward(target.prize, target.rollId) ?? target.prize;
            setPhase('idle');
            setHighlightedFaceIndex(target.faceIndex);
            onRewardSound?.();
            toast.success(`You won: ${result.label}`);
          } catch (error) {
            console.error('Cube reward resolve failed:', error);
            toast.error(error instanceof Error ? error.message : 'Could not apply cube reward.');
            setPhase('idle');
            setHighlightedFaceIndex(target.faceIndex);
          } finally {
            spinLockRef.current = false;
          }
        })();
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
    onRevealSound?.();
    snapToFace(target.faceIndex, () => startFaceSelection(target));
  };

  const showRollRequirementPrompt = () => {
    if (dailyTaskClaimsMet) {
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
        to: MON_MARKET_RECEIVER_ADDRESS,
        value: parseEther(PAID_SPIN_COST_MON),
      });
      toast.loading('Transaction sent. Adding paid cube roll...', {
        id: BUY_SPIN_TOAST_ID,
        duration: 5600,
      });
      onBuySpin(1);
      toast.success('Paid cube roll added.', {
        id: BUY_SPIN_TOAST_ID,
        duration: 5600,
      });
    } catch (err: unknown) {
      console.error('Paid spin purchase failed:', err);
      if (isUserRejectedError(err)) {
        toast.error('Transaction cancelled.', {
          id: BUY_SPIN_TOAST_ID,
          duration: 5600,
        });
      } else {
        toast.error('Could not buy a roll.', {
          id: BUY_SPIN_TOAST_ID,
          duration: 5600,
        });
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

  const handleSpin = async () => {
    if (spinning || selecting || spinLockRef.current) return;
    if (!hasDailyRolls && !hasPaidRolls) {
      showRollRequirementPrompt();
      return;
    }

    clearTimers();
    spinLockRef.current = true;

    let nextFaces = createCubeFaces();
    let faceIndex = Math.floor(Math.random() * CUBE_SIDES.length);
    let tileIndex = Math.floor(Math.random() * FACE_TILE_COUNT);
    let targetPrize = nextFaces[faceIndex][tileIndex];
    let rollId: string | undefined;

    try {
      const serverRoll = await onRequestRoll?.();
      if (serverRoll) {
        nextFaces = serverRoll.cube_faces;
        faceIndex = serverRoll.target_face_index;
        tileIndex = serverRoll.target_tile_index;
        targetPrize = serverRoll.prize;
        rollId = serverRoll.id;
      }
    } catch (error) {
      console.error('Cube roll request failed:', error);
      toast.error(error instanceof Error ? error.message : 'Could not roll the cube.');
      spinLockRef.current = false;
      return;
    }

    setCubeFaces(nextFaces);
    setHighlightedFaceIndex(null);
    setHighlightedTileIndex(null);
    setPhase('spinning');
    setRotationTransitionEnabled(true);
    onSpinStartSound?.();
    pendingTargetRef.current = { faceIndex, tileIndex, prize: targetPrize, rollId };
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
              subtitle="Claim any 3 daily tasks to unlock 3 cube rolls. Buy extra rolls with MON any time."
              coins={coins}
              backgroundImage={publicAsset('assets/bg_wheel_v4.jpg')}
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
