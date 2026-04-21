export type CubePrizeType = 'coins' | 'fish' | 'mon';

export interface CubePrize {
  id: string;
  label: string;
  type: CubePrizeType;
  coins?: number;
  fishId?: string;
  quantity?: number;
  mon?: number;
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
  secret?: boolean;
}

export const CUBE_FACE_TILE_COUNT = 25;
export const CUBE_SIDE_COUNT = 6;
export const CUBE_TOTAL_TILES = CUBE_FACE_TILE_COUNT * CUBE_SIDE_COUNT;
export const MON_CUBE_CELL_COUNT = 2;
export const MON_CUBE_PRIZE_AMOUNT = 1;
export const FISH_TILE_RATIO = 0.42;
export const SECRET_COIN_CHANCE = 0.015;

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
  { id: 'coin_1', label: '50 coins', coins: 50 },
  { id: 'coin_25', label: '100 coins', coins: 100 },
  { id: 'coin_75', label: '250 coins', coins: 250 },
  { id: 'coin_150', label: '500 coins', coins: 500 },
  { id: 'coin_300', label: '750 coins', coins: 750 },
  { id: 'coin_750', label: '1,000 coins', coins: 1000 },
  { id: 'coin_1500', label: '1,500 coins', coins: 1500 },
  { id: 'coin_10000', label: '2,500 coins', coins: 2500 },
  { id: 'secret_meteor', label: 'Secret Meteor Prize', coins: 5000, secret: true },
] as const;

const REGULAR_COIN_PRIZES = COIN_PRIZES.filter((prize) => !prize.secret);

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
  if (Math.random() < SECRET_COIN_CHANCE) {
    const secretPrize = COIN_PRIZES.find((item) => item.secret) ?? COIN_PRIZES[0];
    return { ...secretPrize, type: 'coins' };
  }

  const prize = REGULAR_COIN_PRIZES[Math.floor(Math.random() * REGULAR_COIN_PRIZES.length)];
  return { ...prize, type: 'coins' };
};

const createStandardPrize = (): CubePrize => (
  Math.random() < FISH_TILE_RATIO ? createFishPrize() : createCoinPrize()
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
