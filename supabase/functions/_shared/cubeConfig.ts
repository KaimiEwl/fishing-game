export type CubePrizeType = 'coins' | 'fish' | 'mon' | 'bait';

export interface CubePrize {
  id: string;
  label: string;
  type: CubePrizeType;
  coins?: number;
  fishId?: string;
  quantity?: number;
  mon?: number;
  bait?: number;
  secret?: boolean;
}

interface FishDefinition {
  id: string;
  name: string;
  chance: number;
}

interface CoinPrizeDefinition {
  id: string;
  label: string;
  coins: number;
}

interface BaitPrizeDefinition {
  id: string;
  label: string;
  bait: number;
}

export const CUBE_FACE_TILE_COUNT = 25;
export const CUBE_SIDE_COUNT = 6;
export const CUBE_TOTAL_TILES = CUBE_FACE_TILE_COUNT * CUBE_SIDE_COUNT;
export const MON_CUBE_CELL_COUNT = 1;
export const MON_CUBE_PRIZE_AMOUNT = 1;
export const FISH_TILE_RATIO = 0.46;
export const BAIT_TILE_RATIO = 0.28;

const FISH_POOL: ReadonlyArray<FishDefinition> = [
  { id: 'carp', name: 'Carp', chance: 45.14 },
  { id: 'perch', name: 'Perch', chance: 28 },
  { id: 'bream', name: 'Bream', chance: 15 },
  { id: 'catfish', name: 'Catfish', chance: 8 },
  { id: 'goldfish', name: 'Goldfish', chance: 3 },
  { id: 'mutant', name: 'Mutant Fish', chance: 0.8 },
  { id: 'pike', name: 'Purple Fish', chance: 0.05 },
  { id: 'leviathan', name: 'Cosmic Leviathan', chance: 0.01 },
] as const;

const COIN_PRIZES: ReadonlyArray<CoinPrizeDefinition> = [
  { id: 'coin_60', label: '60 coins', coins: 60 },
  { id: 'coin_120', label: '120 coins', coins: 120 },
  { id: 'coin_200', label: '200 coins', coins: 200 },
  { id: 'coin_350', label: '350 coins', coins: 350 },
  { id: 'coin_550', label: '550 coins', coins: 550 },
  { id: 'coin_900', label: '900 coins', coins: 900 },
  { id: 'coin_1500', label: '1,500 coins', coins: 1500 },
  { id: 'coin_2200', label: '2,200 coins', coins: 2200 },
] as const;

const COIN_PRIZE_WEIGHTS: Readonly<Record<string, number>> = {
  coin_60: 28,
  coin_120: 24,
  coin_200: 18,
  coin_350: 12,
  coin_550: 8,
  coin_900: 5,
  coin_1500: 3,
  coin_2200: 2,
} as const;

const BAIT_PRIZES: ReadonlyArray<BaitPrizeDefinition> = [
  { id: 'bait_3', label: '3 bait', bait: 3 },
  { id: 'bait_5', label: '5 bait', bait: 5 },
  { id: 'bait_8', label: '8 bait', bait: 8 },
  { id: 'bait_12', label: '12 bait', bait: 12 },
  { id: 'bait_18', label: '18 bait', bait: 18 },
] as const;

const BAIT_PRIZE_WEIGHTS: Readonly<Record<string, number>> = {
  bait_3: 30,
  bait_5: 26,
  bait_8: 20,
  bait_12: 15,
  bait_18: 9,
} as const;

const pickWeighted = <T>(items: readonly T[], getWeight: (item: T) => number) => {
  const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0);
  let roll = Math.random() * totalWeight;

  for (const item of items) {
    roll -= getWeight(item);
    if (roll <= 0) return item;
  }

  return items[items.length - 1];
};

const createFishPrize = (): CubePrize => {
  const fish = pickWeighted(FISH_POOL, (item) => item.chance);
  return {
    id: `fish_${fish.id}`,
    label: `${fish.name} x1`,
    type: 'fish',
    fishId: fish.id,
    quantity: 1,
  };
};

const createCoinPrize = (): CubePrize => {
  const prize = pickWeighted(COIN_PRIZES, (item) => COIN_PRIZE_WEIGHTS[item.id] ?? 1);
  return { ...prize, type: 'coins' };
};

const createBaitPrize = (): CubePrize => {
  const prize = pickWeighted(BAIT_PRIZES, (item) => BAIT_PRIZE_WEIGHTS[item.id] ?? 1);
  return { ...prize, type: 'bait' };
};

const createRewardPrize = (): CubePrize => (
  Math.random() < BAIT_TILE_RATIO ? createBaitPrize() : createCoinPrize()
);

const createStandardPrize = (): CubePrize => (
  Math.random() < FISH_TILE_RATIO ? createFishPrize() : createRewardPrize()
);

const createMonPrize = (): CubePrize => ({
  id: 'mon_1',
  label: '1 MON',
  type: 'mon',
  mon: MON_CUBE_PRIZE_AMOUNT,
});

const indexToFaceAndTile = (index: number) => ({
  faceIndex: Math.floor(index / CUBE_FACE_TILE_COUNT),
  tileIndex: index % CUBE_FACE_TILE_COUNT,
});

const randomUniqueIndexes = (count: number, maxExclusive: number) => {
  const chosen = new Set<number>();

  while (chosen.size < count) {
    chosen.add(Math.floor(Math.random() * maxExclusive));
  }

  return Array.from(chosen.values());
};

export interface CubeRollResult {
  cubeFaces: CubePrize[][];
  targetFaceIndex: number;
  targetTileIndex: number;
  prize: CubePrize;
}

export const buildServerCubeRoll = (): CubeRollResult => {
  const globalPrizes = Array.from({ length: CUBE_TOTAL_TILES }, () => createStandardPrize());
  const monIndexes = randomUniqueIndexes(MON_CUBE_CELL_COUNT, CUBE_TOTAL_TILES);

  for (const monIndex of monIndexes) {
    globalPrizes[monIndex] = createMonPrize();
  }

  const selectedIndex = Math.floor(Math.random() * CUBE_TOTAL_TILES);
  const { faceIndex, tileIndex } = indexToFaceAndTile(selectedIndex);
  const cubeFaces = Array.from({ length: CUBE_SIDE_COUNT }, (_, sideIndex) => (
    globalPrizes.slice(sideIndex * CUBE_FACE_TILE_COUNT, (sideIndex + 1) * CUBE_FACE_TILE_COUNT)
  ));

  return {
    cubeFaces,
    targetFaceIndex: faceIndex,
    targetTileIndex: tileIndex,
    prize: globalPrizes[selectedIndex],
  };
};
