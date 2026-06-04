import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShipWheel, Sparkles } from 'lucide-react';
import { useSendTransaction } from 'wagmi';
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
import {
  FISH_DATA,
  RARITY_COLORS,
  ROD_CUBE_DROP_CONFIG,
  ROD_DATA,
  ROD_RARITY_COLORS,
  ROD_RARITY_NAMES,
  WHEEL_PRIZES,
  type WheelPrize,
} from '@/types/game';
import CoinIcon from './CoinIcon';
import FishIcon from './FishIcon';
import GameScreenShell from './GameScreenShell';
import MonadIcon from './MonadIcon';
import MonadCelebrationFireworks from './MonadCelebrationFireworks';
import { publicAsset } from '@/lib/assets';
import { ROD_DISPLAY_INFO } from '@/lib/rodAssets';
import {
  CUBE_REBALANCE_CONFIG,
  MON_CUBE_SPIN_PACKAGES,
  MON_MARKET_RECEIVER_ADDRESS,
} from '@/lib/baitEconomy';
import { isUserRejectedError } from '@/lib/errorUtils';
import { formatMonAmount } from '@/lib/monRewards';
import {
  canUseMonadPaymentIdentity,
  monadPriceLabel,
  MONAD_SHOP_TEST_MODE_ENABLED,
  sendMonadPayment,
} from '@/lib/monadTestMode';
import { duckBackgroundMusic, restoreBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { getHighestOwnedRodLevel } from '@/lib/rodMonadRewards';

interface WheelScreenProps {
  coins: number;
  rodLevel: number;
  nftRods?: number[];
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
  onBuySpin: (amount: number, txHash?: string) => void | Promise<boolean | void>;
  onOpenTasks: () => void;
  onSpinStartSound?: () => void;
  onRevealSound?: () => void;
  onRewardSound?: () => void;
  onMonadRewardSound?: () => void;
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
const SELECTION_SETTLE_FALLBACK_MS = 28_000;
const ROLL_HARD_FALLBACK_MS = SPIN_DURATION_MS + SELECTION_SETTLE_FALLBACK_MS + 4_000;
const REWARD_RESOLVE_TIMEOUT_MS = 12_000;
const LIGHT_STEP_START_MS = 55;
const LIGHT_STEP_INCREMENT_MS = 7;
const FISH_TILE_RATIO = CUBE_REBALANCE_CONFIG.enabled ? CUBE_REBALANCE_CONFIG.fishTileRatio : 0.42;
const MON_TILE_COUNT = CUBE_REBALANCE_CONFIG.enabled ? CUBE_REBALANCE_CONFIG.monTileCount : 2;
const BAIT_TILE_RATIO = CUBE_REBALANCE_CONFIG.enabled ? 0.28 : 0;
const COIN_PRIZES = WHEEL_PRIZES.filter((item) => item.type === 'coins');
const BAIT_PRIZES = WHEEL_PRIZES.filter((item) => item.type === 'bait');
const MON_PRIZES = WHEEL_PRIZES.filter((item) => item.type === 'mon' && Number(item.mon ?? 0) > 0);
const SHOWCASE_COIN_PRIZES = [...COIN_PRIZES]
  .filter((item) => Number(item.coins ?? 0) > 0)
  .sort((a, b) => Number(b.coins ?? 0) - Number(a.coins ?? 0));
const SHOWCASE_BAIT_PRIZES = [...BAIT_PRIZES]
  .filter((item) => Number(item.bait ?? 0) > 0)
  .sort((a, b) => Number(b.bait ?? 0) - Number(a.bait ?? 0));
const SHOWCASE_MON_PRIZES = [...MON_PRIZES]
  .filter((item) => Number(item.mon ?? 0) > 0)
  .sort((a, b) => Number(b.mon ?? 0) - Number(a.mon ?? 0));
const FALLBACK_MON_PRIZE: WheelPrize = {
  id: 'secret_mon_0_5',
  type: 'mon' as const,
  label: `${CUBE_REBALANCE_CONFIG.monPrizeAmount} MON`,
  mon: CUBE_REBALANCE_CONFIG.monPrizeAmount,
  secret: true,
};
type WeightedWheelPrize = WheelPrize & { cubeWeight?: number };
const COIN_PRIZE_WEIGHTS: Readonly<Record<string, number>> = {
  coin_30: 28,
  coin_60: 28,
  coin_100: 18,
  coin_175: 12,
  coin_275: 8,
  coin_450: 5,
  coin_750: 3,
  coin_1100: 2,
};
const BAIT_PRIZE_WEIGHTS: Readonly<Record<string, number>> = {
  bait_2: 30,
  bait_3: 30,
  bait_4: 20,
  bait_6: 15,
  bait_9: 9,
};
const PAID_SPIN_COST_MON = MON_CUBE_SPIN_PACKAGES[0]?.monAmount ?? '0.04';
const BUY_ROLL_ICON_SRC = publicAsset('assets/wheel_buy_roll_icon_v2.webp');
const ROLL_CUBE_ICON_SRC = publicAsset('assets/wheel_roll_cube_icon_v2.webp');
const BUY_SPIN_TOAST_ID = 'wheel-buy-spin';
const CUBE_MUSIC_DUCK_MS = 16_000;
const CUBE_MON_CELEBRATION_MS = 2600;
const CUBE_SHOWCASE_INCLUDE_MON = true;
const CUBE_SHOWCASE_TILE_INDEXES = [2, 7, 12, 17, 22, 6, 8, 10, 14, 16, 18, 21] as const;

type RotationState = { x: number; y: number; z: number };
type SpinPhase = 'idle' | 'spinning' | 'selecting';
type CubeFaces = WheelPrize[][];
type PromptType = 'tasks' | 'tomorrow' | 'wallet';
type MonCelebration = { amountLabel: string; nonce: number };

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

const faceAndTileToIndex = (faceIndex: number, tileIndex: number) => (
  faceIndex * FACE_TILE_COUNT + tileIndex
);

const randomUniqueIndexes = (count: number, maxExclusive: number, blocked = new Set<number>()) => {
  const chosen = new Set<number>();
  const targetCount = Math.max(0, Math.min(count, maxExclusive - blocked.size));

  while (chosen.size < targetCount) {
    const index = Math.floor(Math.random() * maxExclusive);
    if (!blocked.has(index)) {
      chosen.add(index);
    }
  }

  return Array.from(chosen.values());
};

const clampChance = (chance: number) => Math.max(0, Math.min(1, Number(chance) || 0));

const pickWeighted = <T,>(items: readonly T[], getWeight: (item: T) => number) => {
  const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0);
  let roll = Math.random() * totalWeight;

  for (const item of items) {
    roll -= getWeight(item);
    if (roll <= 0) return item;
  }

  return items[items.length - 1];
};

const withTimeout = async <T,>(
  promise: Promise<T> | T,
  timeoutMs: number,
  message: string,
) => new Promise<T>((resolve, reject) => {
  const timer = window.setTimeout(() => {
    reject(new Error(message));
  }, timeoutMs);

  Promise.resolve(promise)
    .then(resolve, reject)
    .finally(() => window.clearTimeout(timer));
});

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

const getRodByReward = (reward: WheelPrize) => (
  reward.type === 'rod' && typeof reward.rodLevel === 'number'
    ? ROD_DATA.find((rod) => rod.level === reward.rodLevel) ?? null
    : null
);

const getCubeRodRewardConfig = (rodId: string) => (
  ROD_CUBE_DROP_CONFIG.cubeRodRewards.find((reward) => reward.rodId === rodId) ?? null
);

const getEligibleRodDrops = (currentRodLevel: number) => (
  ROD_DATA.flatMap((rod) => {
    const rewardConfig = getCubeRodRewardConfig(rod.id);
    if (
      !rewardConfig
      || rod.level <= currentRodLevel
      || rod.level < ROD_CUBE_DROP_CONFIG.minLevel
      || rod.level > ROD_CUBE_DROP_CONFIG.maxLevel
      || rewardConfig.dropWeight <= 0
    ) {
      return [];
    }

    return [{ ...rod, cubeDropWeight: rewardConfig.dropWeight, duplicateCompensationMonads: rewardConfig.duplicateCompensationMonads }];
  })
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

const createMonPrize = (): WheelPrize => {
  const prize = MON_PRIZES.length > 0
    ? pickWeighted(MON_PRIZES, (item) => Number((item as WeightedWheelPrize).cubeWeight ?? 1))
    : FALLBACK_MON_PRIZE;
  const amount = prize.mon ?? CUBE_REBALANCE_CONFIG.monPrizeAmount;

  return {
    ...prize,
    label: `${formatMonAmount(amount)} MON`,
  };
};

const createRewardPrize = (): WheelPrize => (
  BAIT_PRIZES.length > 0 && Math.random() < BAIT_TILE_RATIO ? createBaitPrize() : createCoinPrize()
);

const createCubeTilePrize = (): WheelPrize => (
  Math.random() < FISH_TILE_RATIO ? createFishPrize() : createRewardPrize()
);

const createRodPrize = (currentRodLevel: number): WheelPrize | null => {
  const eligibleRods = getEligibleRodDrops(currentRodLevel);
  if (eligibleRods.length === 0) return null;

  const rod = pickWeighted(eligibleRods, (item) => item.cubeDropWeight);
  return {
    id: rod.id,
    type: 'rod',
    rodId: rod.id,
    rodLevel: rod.level,
    rarity: rod.rarity,
    duplicateCompensationMonads: rod.duplicateCompensationMonads,
    label: rod.name,
  };
};

const getShowcaseRodPrizes = (): WheelPrize[] => (
  ROD_DATA.flatMap((rod) => {
    const rewardConfig = getCubeRodRewardConfig(rod.id);
    if (
      !rewardConfig
      || rod.level < ROD_CUBE_DROP_CONFIG.minLevel
      || rod.level > ROD_CUBE_DROP_CONFIG.maxLevel
      || rewardConfig.dropWeight <= 0
    ) {
      return [];
    }

    return [{
      id: rod.id,
      type: 'rod' as const,
      rodId: rod.id,
      rodLevel: rod.level,
      rarity: rod.rarity,
      duplicateCompensationMonads: rewardConfig.duplicateCompensationMonads,
      label: rod.name,
    }];
  }).sort((a, b) => Number(b.rodLevel ?? 0) - Number(a.rodLevel ?? 0))
);

const cloneShowcasePrize = (prize: WheelPrize | undefined | null): WheelPrize | null => {
  if (!prize) return null;
  if (prize.type === 'mon') {
    const amount = Number(prize.mon ?? CUBE_REBALANCE_CONFIG.monPrizeAmount);
    return {
      ...prize,
      label: `${formatMonAmount(amount)} MON`,
    };
  }

  return { ...prize };
};

const getShowcasePrizes = (includeMon: boolean): WheelPrize[] => {
  const showcaseRodPrizes = getShowcaseRodPrizes();
  const showcasePrizes = [
    includeMon ? cloneShowcasePrize(SHOWCASE_MON_PRIZES[0]) : null,
    cloneShowcasePrize(showcaseRodPrizes[0]),
    cloneShowcasePrize(SHOWCASE_COIN_PRIZES[0]),
    cloneShowcasePrize(SHOWCASE_BAIT_PRIZES[0]),
    includeMon ? cloneShowcasePrize(SHOWCASE_MON_PRIZES[1]) : null,
    cloneShowcasePrize(showcaseRodPrizes[1]),
    cloneShowcasePrize(SHOWCASE_COIN_PRIZES[1]),
    includeMon ? cloneShowcasePrize(SHOWCASE_MON_PRIZES[2]) : null,
    cloneShowcasePrize(showcaseRodPrizes[2]),
    cloneShowcasePrize(SHOWCASE_BAIT_PRIZES[1]),
    includeMon ? cloneShowcasePrize(SHOWCASE_MON_PRIZES[3]) : null,
  ].filter((item): item is WheelPrize => Boolean(item));

  const seen = new Set<string>();
  return showcasePrizes.filter((item) => {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getShowcaseTileIndexes = (protectedTileIndex?: number | null) => {
  const orderedIndexes = [
    ...CUBE_SHOWCASE_TILE_INDEXES,
    ...Array.from({ length: FACE_TILE_COUNT }, (_, index) => index),
  ];
  const seen = new Set<number>();

  return orderedIndexes.filter((index) => {
    if (index === protectedTileIndex || seen.has(index)) return false;
    seen.add(index);
    return index >= 0 && index < FACE_TILE_COUNT;
  });
};

const decorateCubeFaceWithShowcase = (
  faces: CubeFaces,
  faceIndex: number,
  protectedTileIndex: number | null,
  includeMon: boolean,
) => {
  const face = faces[faceIndex];
  if (!face) return faces;

  const prizes = getShowcasePrizes(includeMon);
  const tileIndexes = getShowcaseTileIndexes(protectedTileIndex);
  prizes.forEach((prize, index) => {
    const tileIndex = tileIndexes[index];
    if (typeof tileIndex === 'number') {
      face[tileIndex] = prize;
    }
  });

  return faces;
};

const decorateCubeFacesWithShowcase = (
  faces: CubeFaces,
  includeMon: boolean,
) => {
  faces.forEach((_, faceIndex) => {
    decorateCubeFaceWithShowcase(faces, faceIndex, null, includeMon);
  });

  return faces;
};

const createPreviewCubeFaces = (currentRodLevel = 0, includeMon = true): CubeFaces => (
  decorateCubeFacesWithShowcase(
    createCubeFaces(currentRodLevel, includeMon),
    CUBE_SHOWCASE_INCLUDE_MON,
  )
);

const shouldInjectRodTile = () => (
  ROD_CUBE_DROP_CONFIG.cubeRodDropEnabled
  && Math.random() < clampChance(ROD_CUBE_DROP_CONFIG.tileInjectionChance)
);

const createCubeFaces = (currentRodLevel = 0, includeMon = true): CubeFaces => {
  const totalTiles = CUBE_SIDES.length * FACE_TILE_COUNT;
  const globalPrizes = Array.from({ length: totalTiles }, () => createCubeTilePrize());
  const reservedIndexes = new Set<number>();

  const monIndexes = includeMon && MON_TILE_COUNT > 0
    ? randomUniqueIndexes(MON_TILE_COUNT, totalTiles, reservedIndexes)
    : [];
  for (const globalIndex of monIndexes) {
    globalPrizes[globalIndex] = createMonPrize();
    reservedIndexes.add(globalIndex);
  }

  const rodIndexes = shouldInjectRodTile() && ROD_CUBE_DROP_CONFIG.tileCount > 0
    ? randomUniqueIndexes(ROD_CUBE_DROP_CONFIG.tileCount, totalTiles, reservedIndexes)
    : [];
  for (const globalIndex of rodIndexes) {
    const rodPrize = createRodPrize(currentRodLevel);
    if (!rodPrize) break;
    globalPrizes[globalIndex] = rodPrize;
    reservedIndexes.add(globalIndex);
  }

  return CUBE_SIDES.map((_, sideIndex) => (
    globalPrizes.slice(sideIndex * FACE_TILE_COUNT, (sideIndex + 1) * FACE_TILE_COUNT)
  ));
};

const getRodTileGlobalIndexes = (faces: CubeFaces) => (
  faces.flatMap((face, faceIndex) => (
    face.flatMap((item, tileIndex) => (
      item.type === 'rod' ? [faceAndTileToIndex(faceIndex, tileIndex)] : []
    ))
  ))
);

const setPrizeAtGlobalIndex = (faces: CubeFaces, globalIndex: number, prize: WheelPrize) => {
  const { faceIndex, tileIndex } = indexToFaceAndTile(globalIndex);
  faces[faceIndex][tileIndex] = prize;
};

const pickCubeTarget = (faces: CubeFaces, currentRodLevel: number): PendingTarget => {
  const totalTiles = CUBE_SIDES.length * FACE_TILE_COUNT;
  let rodIndexes = getRodTileGlobalIndexes(faces);
  const shouldHitRodJackpot = (
    ROD_CUBE_DROP_CONFIG.cubeRodDropEnabled
    && Math.random() < clampChance(ROD_CUBE_DROP_CONFIG.targetWinChance)
  );

  if (shouldHitRodJackpot && rodIndexes.length === 0) {
    const rodPrize = createRodPrize(currentRodLevel);
    const [rodIndex] = rodPrize ? randomUniqueIndexes(1, totalTiles) : [];
    if (rodPrize && typeof rodIndex === 'number') {
      setPrizeAtGlobalIndex(faces, rodIndex, rodPrize);
      rodIndexes = [rodIndex];
    }
  }

  const targetGlobalIndex = shouldHitRodJackpot && rodIndexes.length > 0
    ? rodIndexes[Math.floor(Math.random() * rodIndexes.length)]
    : randomUniqueIndexes(1, totalTiles, new Set(rodIndexes))[0] ?? 0;
  const { faceIndex, tileIndex } = indexToFaceAndTile(targetGlobalIndex);

  return {
    faceIndex,
    tileIndex,
    prize: faces[faceIndex][tileIndex],
  };
};

const getPrizeVisualMatchScore = (candidate: WheelPrize, target: WheelPrize) => {
  if (candidate.id === target.id) return 1000;
  if (candidate.type !== target.type) return 0;

  if (target.type === 'coins') {
    const candidateCoins = Number(candidate.coins ?? 0);
    const targetCoins = Number(target.coins ?? 0);
    if (candidateCoins <= 0 || targetCoins <= 0) return 20;
    return 240 - Math.min(200, Math.abs(candidateCoins - targetCoins) / Math.max(targetCoins, 1));
  }

  if (target.type === 'bait') {
    const candidateBait = Number(candidate.bait ?? 0);
    const targetBait = Number(target.bait ?? 0);
    if (candidateBait <= 0 || targetBait <= 0) return 20;
    return 260 - Math.min(180, Math.abs(candidateBait - targetBait) * 16);
  }

  if (target.type === 'mon') {
    const candidateMon = Number(candidate.mon ?? 0);
    const targetMon = Number(target.mon ?? 0);
    if (candidateMon <= 0 || targetMon <= 0) return 80;
    return 320 - Math.min(220, Math.abs(candidateMon - targetMon) / Math.max(targetMon, 0.5));
  }

  if (target.type === 'rod') {
    if (candidate.rodId === target.rodId || candidate.rodLevel === target.rodLevel) return 420;
    return 180;
  }

  if (target.type === 'fish') {
    return candidate.fishId === target.fishId ? 380 : 80;
  }

  return 60;
};

const findVisualTargetForPrize = (
  faces: CubeFaces,
  targetPrize: WheelPrize,
  fallbackFaceIndex: number,
  fallbackTileIndex: number,
): Pick<PendingTarget, 'faceIndex' | 'tileIndex'> => {
  const fallback = {
    faceIndex: mod(fallbackFaceIndex, CUBE_SIDES.length),
    tileIndex: mod(fallbackTileIndex, FACE_TILE_COUNT),
  };
  let bestTarget = fallback;
  let bestScore = 0;

  faces.forEach((face, faceIndex) => {
    face.forEach((candidatePrize, tileIndex) => {
      const score = getPrizeVisualMatchScore(candidatePrize, targetPrize);
      if (score > bestScore) {
        bestScore = score;
        bestTarget = { faceIndex, tileIndex };
      }
    });
  });

  return bestScore > 0 ? bestTarget : fallback;
};

const getRewardToastLabel = (reward: WheelPrize) => {
  const rod = getRodByReward(reward);
  if (rod && reward.duplicateCompensationApplied && reward.duplicateCompensationMonads) {
    return `${rod.name} duplicate: +${formatMonAmount(reward.duplicateCompensationMonads)} MON`;
  }

  if (rod) {
    return `${rod.name} (${ROD_RARITY_NAMES[rod.rarity]})`;
  }

  return reward.label;
};

const getMonadRewardAmount = (reward: WheelPrize) => {
  if (reward.type === 'mon') {
    return Number(reward.mon ?? CUBE_REBALANCE_CONFIG.monPrizeAmount);
  }

  if (reward.duplicateCompensationApplied && reward.duplicateCompensationMonads) {
    return Number(reward.duplicateCompensationMonads);
  }

  return 0;
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
  rodLevel,
  nftRods = [],
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
  onMonadRewardSound,
}) => {
  const highestOwnedRodLevel = getHighestOwnedRodLevel(rodLevel, nftRods);
  const canUseMonadPayment = canUseMonadPaymentIdentity(walletAddress);
  const [phase, setPhase] = useState<SpinPhase>('idle');
  const [cubeFaces] = useState<CubeFaces>(() => createPreviewCubeFaces(highestOwnedRodLevel, canUseMonadPayment));
  const [rotation, setRotation] = useState<RotationState>(() => getFaceViewRotation(0));
  const [rotationTransitionEnabled, setRotationTransitionEnabled] = useState(true);
  const [highlightedFaceIndex, setHighlightedFaceIndex] = useState<number | null>(null);
  const [highlightedTileIndex, setHighlightedTileIndex] = useState<number | null>(null);
  const [isBuyingSpin, setIsBuyingSpin] = useState(false);
  const [promptType, setPromptType] = useState<PromptType | null>(null);
  const [monCelebration, setMonCelebration] = useState<MonCelebration | null>(null);
  const timersRef = useRef<number[]>([]);
  const spinLockRef = useRef(false);
  const pendingTargetRef = useRef<PendingTarget | null>(null);
  const settleStartedRef = useRef(false);
  const selectionSettledRef = useRef(false);
  const phaseRef = useRef<SpinPhase>('idle');
  const { sendTransactionAsync } = useSendTransaction();

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  const setSpinPhase = (nextPhase: SpinPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  };

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => () => {
    clearTimers();
    restoreBackgroundMusic();
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

  const triggerMonadCelebration = (reward: WheelPrize) => {
    const monAmount = getMonadRewardAmount(reward);
    if (monAmount <= 0) return false;

    setMonCelebration({
      amountLabel: `+${formatMonAmount(monAmount)} MON`,
      nonce: Date.now(),
    });

    const timer = window.setTimeout(() => {
      setMonCelebration(null);
      restoreBackgroundMusic();
    }, CUBE_MON_CELEBRATION_MS);
    timersRef.current.push(timer);
    return true;
  };

  const renderTile = (
    item: WheelPrize,
    tileIndex: number,
    sideIndex: number,
  ) => {
    const fish = getFishByReward(item);
    const rod = getRodByReward(item);
    const isHighlighted = highlightedFaceIndex === sideIndex && highlightedTileIndex === tileIndex;
    const isMonTile = item.type === 'mon';
    const isBaitTile = item.type === 'bait';
    const isRodTile = item.type === 'rod';
    const isBigCoinTile = item.type === 'coins' && Number(item.coins ?? 0) >= 750;
    const monAmountLabel = isMonTile ? formatMonAmount(item.mon ?? CUBE_REBALANCE_CONFIG.monPrizeAmount) : '';
    const colorIndex = Math.max(WHEEL_PRIZES.findIndex((prizeItem) => prizeItem.id === item.id), 0);
    const accent = item.type === 'fish' && fish
      ? RARITY_COLORS[fish.rarity]
      : item.type === 'mon'
        ? '#14f195'
      : item.type === 'bait'
        ? '#bef264'
      : item.type === 'rod' && rod
        ? ROD_RARITY_COLORS[rod.rarity]
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
            : isRodTile
              ? 'border-amber-100/90 ring-1 ring-amber-100/80 shadow-[0_0_0_1px_rgba(251,191,36,0.24),0_0_16px_rgba(250,204,21,0.38)]'
            : isBigCoinTile
              ? 'border-yellow-100/90 ring-1 ring-yellow-100/80 shadow-[0_0_0_1px_rgba(250,204,21,0.28),0_0_18px_rgba(251,191,36,0.42)]'
            : 'border-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.58),0_5px_10px_rgba(0,0,0,0.22)]'
        }`}
        style={{
          background: item.type === 'fish' && fish
            ? `linear-gradient(135deg, ${accent}40, ${accent}18)`
            : isMonTile
              ? 'radial-gradient(circle at top, rgba(236,253,245,0.98), rgba(52,211,153,0.94) 52%, rgba(5,150,105,0.98) 100%)'
            : isBaitTile
              ? 'radial-gradient(circle at top, rgba(247,254,231,0.98), rgba(190,242,100,0.94) 55%, rgba(101,163,13,0.98) 100%)'
            : isRodTile
              ? `linear-gradient(135deg, ${accent}f2, ${accent}8f 56%, rgba(17,24,39,0.96))`
            : isBigCoinTile
              ? 'radial-gradient(circle at 50% 18%, rgba(255,251,235,0.98), rgba(250,204,21,0.96) 46%, rgba(217,119,6,0.98) 100%)'
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
          <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-0.5 text-center">
            <span className="pointer-events-none absolute inset-x-[10%] top-[16%] h-[1px] bg-white/80" />
            <span className="pointer-events-none absolute inset-x-[12%] bottom-[18%] h-[1px] bg-emerald-950/20" />
            <span className="relative z-10 text-[6px] font-black tracking-[0.14em] text-[#200052]/80 sm:text-[7px]">
              MON
            </span>
            <div className="relative z-10 flex items-center justify-center gap-0.5">
              <span className={`font-black text-[#200052] drop-shadow-[0_1px_0_rgba(255,255,255,0.68)] ${
                monAmountLabel.length >= 3 ? 'text-[9px] sm:text-[11px]' : 'text-[12px] sm:text-[14px]'
              }`}>
                {monAmountLabel}
              </span>
              <MonadIcon size="xs" className="drop-shadow-[0_1px_0_rgba(255,255,255,0.45)] sm:[&>svg]:scale-110" />
            </div>
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
        ) : item.type === 'rod' && rod ? (
          <div className="relative flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden px-0.5 text-center">
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.4),rgba(255,255,255,0)_48%)]" />
            <span className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white/85 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            {ROD_DISPLAY_INFO[rod.level]?.image ? (
              <img
                src={ROD_DISPLAY_INFO[rod.level].image}
                alt={`${rod.name} prize`}
                className="relative z-10 h-5 w-5 object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.82)] sm:h-7 sm:w-7"
              />
            ) : (
              <ShipWheel className="relative z-10 h-4 w-4 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)] sm:h-5 sm:w-5" />
            )}
            <span className="relative z-10 rounded-full bg-black/38 px-1 text-[6px] font-black tracking-[0.12em] text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] sm:text-[7px]">
              ROD
            </span>
          </div>
        ) : (
          <div className="relative flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden px-0.5">
            {isBigCoinTile ? (
              <>
                <span className="pointer-events-none absolute inset-x-[12%] top-[16%] h-[1px] bg-white/80" />
                <span className="pointer-events-none absolute -right-1 -top-1 h-5 w-5 rounded-full border border-white/45" />
                <span className="text-[6px] font-black tracking-[0.12em] text-amber-950/80 sm:text-[7px]">
                  GOLD
                </span>
              </>
            ) : null}
            {item.secret ? (
              <Sparkles className="h-3 w-3 text-black/75 sm:h-3.5 sm:w-3.5" />
            ) : (
              <CoinIcon size="xs" />
            )}
            <span className={`${isBigCoinTile ? 'text-[8px] text-amber-950 sm:text-[10px]' : 'text-[7px] text-black/85 sm:text-[8px]'} font-black`}>
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

  const finishFaceSelection = (target: PendingTarget) => {
    if (selectionSettledRef.current) return;
    selectionSettledRef.current = true;

    void (async () => {
      let keepMusicDuckedForCelebration = false;
      try {
        const result = await withTimeout(
          onResolveReward(target.prize, target.rollId),
          REWARD_RESOLVE_TIMEOUT_MS,
          'Could not apply cube reward. Please try again.',
        ) ?? target.prize;
        setSpinPhase('idle');
        setHighlightedFaceIndex(target.faceIndex);
        setHighlightedTileIndex(target.tileIndex);
        const monRewardAmount = getMonadRewardAmount(result);
        if (monRewardAmount > 0) {
          onMonadRewardSound?.();
        } else {
          onRewardSound?.();
        }
        keepMusicDuckedForCelebration = triggerMonadCelebration(result);
        toast.success(`You won: ${getRewardToastLabel(result)}`);
      } catch (error) {
        console.error('Cube reward resolve failed:', error);
        toast.error(error instanceof Error ? error.message : 'Could not apply cube reward.');
        setSpinPhase('idle');
        setHighlightedFaceIndex(target.faceIndex);
        setHighlightedTileIndex(target.tileIndex);
      } finally {
        if (!keepMusicDuckedForCelebration) {
          restoreBackgroundMusic();
        }
        spinLockRef.current = false;
      }
    })();
  };

  const startFaceSelection = (target: PendingTarget) => {
    const startPathIndex = Math.floor(Math.random() * CUBE_TILE_PATH.length);
    const targetPathIndex = CUBE_TILE_PATH.indexOf(target.tileIndex);
    const loops = 2 + Math.floor(Math.random() * 2);
    const offset = mod(targetPathIndex - startPathIndex, CUBE_TILE_PATH.length);
    const totalSteps = loops * CUBE_TILE_PATH.length + offset;
    let step = 0;

    selectionSettledRef.current = false;
    setSpinPhase('selecting');
    setHighlightedFaceIndex(target.faceIndex);

    const settleFallbackTimer = window.setTimeout(() => {
      finishFaceSelection(target);
    }, SELECTION_SETTLE_FALLBACK_MS);
    timersRef.current.push(settleFallbackTimer);

    const tick = () => {
      if (selectionSettledRef.current) return;

      const currentTileIndex = CUBE_TILE_PATH[(startPathIndex + step) % CUBE_TILE_PATH.length];
      setHighlightedTileIndex(currentTileIndex);

      if (step >= totalSteps) {
        finishFaceSelection(target);
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
    if (settleStartedRef.current || phaseRef.current !== 'spinning' || !pendingTargetRef.current) return;

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

    if (!canUseMonadPayment) {
      setPromptType('wallet');
      return;
    }

    setIsBuyingSpin(true);
    try {
      const txHash = await sendMonadPayment({
        sendTransactionAsync,
        receiverAddress: MON_MARKET_RECEIVER_ADDRESS,
        monAmount: PAID_SPIN_COST_MON,
        purpose: 'wheel-paid-roll',
      });
      toast.loading(MONAD_SHOP_TEST_MODE_ENABLED ? 'Test payment created. Adding paid cube roll...' : 'Transaction sent. Adding paid cube roll...', {
        id: BUY_SPIN_TOAST_ID,
        duration: 5600,
      });
      await onBuySpin(1, txHash);
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
    setMonCelebration(null);
    spinLockRef.current = true;

    const fallbackFaces = createCubeFaces(highestOwnedRodLevel, canUseMonadPayment);
    const localTarget = pickCubeTarget(fallbackFaces, highestOwnedRodLevel);
    let visualTarget = findVisualTargetForPrize(
      cubeFaces,
      localTarget.prize,
      localTarget.faceIndex,
      localTarget.tileIndex,
    );
    let faceIndex = visualTarget.faceIndex;
    let tileIndex = visualTarget.tileIndex;
    let targetPrize = localTarget.prize;
    let rollId: string | undefined;

    try {
      const serverRoll = await onRequestRoll?.();
      if (serverRoll) {
        targetPrize = serverRoll.prize;
        rollId = serverRoll.id;
        visualTarget = findVisualTargetForPrize(
          cubeFaces,
          targetPrize,
          serverRoll.target_face_index,
          serverRoll.target_tile_index,
        );
        faceIndex = visualTarget.faceIndex;
        tileIndex = visualTarget.tileIndex;
      }
    } catch (error) {
      console.error('Cube roll request failed:', error);
      toast.error(error instanceof Error ? error.message : 'Could not roll the cube.');
      spinLockRef.current = false;
      return;
    }

    setHighlightedFaceIndex(null);
    setHighlightedTileIndex(null);
    setSpinPhase('spinning');
    selectionSettledRef.current = false;
    setRotationTransitionEnabled(true);
    duckBackgroundMusic(CUBE_MUSIC_DUCK_MS, 0);
    onSpinStartSound?.();
    pendingTargetRef.current = { faceIndex, tileIndex, prize: targetPrize, rollId };
    settleStartedRef.current = false;
    setRotation((current) => getNextRotation(current, faceIndex));

    const spinTimer = window.setTimeout(() => {
      finishSpinAndReveal();
    }, SPIN_DURATION_MS + SPIN_SETTLE_BUFFER_MS);
    timersRef.current.push(spinTimer);

    const hardFallbackTimer = window.setTimeout(() => {
      finishFaceSelection({ faceIndex, tileIndex, prize: targetPrize, rollId });
    }, ROLL_HARD_FALLBACK_MS);
    timersRef.current.push(hardFallbackTimer);
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
              contentWrapperClassName="mx-auto mt-4 max-w-5xl sm:mt-6 min-h-0 w-full flex-1 overflow-visible"
            >
              <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 sm:gap-6">
                <div
                  className={`relative h-[18rem] w-full max-w-[24rem] overflow-visible sm:h-[24rem] sm:max-w-[32rem] ${
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
                    className={`absolute left-1/2 top-1/2 h-[var(--cube-size)] w-[var(--cube-size)] -translate-x-1/2 -translate-y-1/2 overflow-visible transition-[filter,transform] duration-300 ${
                      canRoll ? 'brightness-110 drop-shadow-[0_0_70px_rgba(34,211,238,0.38)]' : 'grayscale-[0.45] brightness-75'
                    } ${
                      canRoll && !spinning && !selecting ? 'hover:scale-[1.02]' : ''
                    }`}
                  >
                    <div
                      className="relative h-full w-full overflow-visible"
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
                          className="absolute inset-0 grid grid-cols-5 gap-1.5 overflow-visible rounded-lg border border-cyan-100/40 bg-slate-950/90 p-2 shadow-[inset_0_0_28px_rgba(255,255,255,0.12),0_0_28px_rgba(34,211,238,0.18)]"
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
                  {monCelebration ? (
                    <div
                      key={monCelebration.nonce}
                      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
                    >
                      <div className="relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-[1.4rem] border border-[#836EF9]/50 bg-[radial-gradient(circle_at_50%_42%,rgba(131,110,249,0.34),rgba(5,16,26,0.94)_65%)] shadow-[0_18px_54px_rgba(0,0,0,0.55),0_0_56px_rgba(20,241,149,0.34)] sm:h-56 sm:w-56">
                        <MonadCelebrationFireworks />
                        <div className="relative z-10 flex flex-col items-center">
                          <MonadIcon size="hero" className="animate-monad-logo-pop drop-shadow-[0_0_30px_rgba(20,241,149,0.88)]" />
                          <p className="mt-2 text-sm font-black uppercase text-emerald-100 sm:text-base">
                            Monad won
                          </p>
                          <p className="mt-1 text-2xl font-black text-white drop-shadow-[0_2px_12px_rgba(20,241,149,0.5)] sm:text-3xl">
                            {monCelebration.amountLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
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
                    label={`Buy roll for ${monadPriceLabel(PAID_SPIN_COST_MON)}`}
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
