export type FishRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical' | 'secret';

export interface Fish {
  id: string;
  name: string;
  emoji: string;
  rarity: FishRarity;
  chance: number; // Percentage of successful catches
  price: number;
  xp: number;
  description: string;
}

export interface PlayerState {
  coins: number;
  bait: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  rodLevel: number; // Max owned rod level
  equippedRod: number; // Currently equipped rod level
  inventory: CaughtFish[];
  totalCatches: number;
  dailyBonusClaimed: boolean;
  loginStreak: number;
  nftRods: number[]; // Array of rod levels that have been minted as NFT
  nickname: string | null;
  avatarUrl: string | null;
}

export interface CaughtFish {
  fishId: string;
  caughtAt: Date;
  quantity: number;
}

export type GameState = 'idle' | 'casting' | 'waiting' | 'biting' | 'catching' | 'result';

export interface GameResult {
  success: boolean;
  fish?: Fish;
}

export type GameTab = 'fish' | 'tasks' | 'shop' | 'grill' | 'wheel' | 'leaderboard';

export type DailyTaskId = 'catch_10' | 'rare_1' | 'grill_1';

export interface DailyTask {
  id: DailyTaskId;
  title: string;
  description: string;
  target: number;
  rewardCoins: number;
}

export interface DailyTaskProgress extends DailyTask {
  progress: number;
  claimed: boolean;
}

export interface WheelPrize {
  id: string;
  label: string;
  coins: number;
  secret?: boolean;
}

export interface GrillRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: Record<string, number>;
  score: number;
}

export const FISH_DATA: Fish[] = [
  {
    id: 'carp',
    name: 'Carp',
    emoji: '✨',
    rarity: 'common',
    chance: 40,
    price: 10,
    xp: 10,
    description: 'A common fish, but great for a stew!'
  },
  {
    id: 'perch',
    name: 'Perch',
    emoji: '🐠',
    rarity: 'uncommon',
    chance: 25,
    price: 25,
    xp: 20,
    description: 'A striped predator with vivid colors'
  },
  {
    id: 'bream',
    name: 'Bream',
    emoji: '🐡',
    rarity: 'rare',
    chance: 15,
    price: 50,
    xp: 35,
    description: 'A large fish with golden sides'
  },
  {
    id: 'pike',
    name: 'Pike',
    emoji: '🦈',
    rarity: 'epic',
    chance: 10,
    price: 100,
    xp: 50,
    description: 'A toothy predator! Be careful!'
  },
  {
    id: 'catfish',
    name: 'Catfish',
    emoji: '🐙',
    rarity: 'legendary',
    chance: 6,
    price: 250,
    xp: 100,
    description: 'A giant of the deep with whiskers'
  },
  {
    id: 'goldfish',
    name: 'Goldfish',
    emoji: '✨',
    rarity: 'mythical',
    chance: 3,
    price: 500,
    xp: 200,
    description: 'Grants wishes... well, almost!'
  },
  {
    id: 'mutant',
    name: 'Mutant Fish',
    emoji: '👾',
    rarity: 'secret',
    chance: 1,
    price: 1000,
    xp: 500,
    description: 'Something strange from the depths... NFT-ready!'
  },
  {
    id: 'leviathan',
    name: 'Cosmic Leviathan',
    emoji: '🌌',
    rarity: 'mythical',
    chance: 0.01,
    price: 50000,
    xp: 10000,
    description: 'Legend of the ocean! 1 in 10,000 fishers have seen it...'
  }
];

export const RARITY_COLORS: Record<FishRarity, string> = {
  common: 'hsl(var(--common))',
  uncommon: 'hsl(var(--uncommon))',
  rare: 'hsl(var(--rare))',
  epic: 'hsl(var(--epic))',
  legendary: 'hsl(var(--legendary))',
  mythical: 'hsl(var(--gold))',
  secret: 'hsl(280, 100%, 70%)'
};

export const RARITY_NAMES: Record<FishRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythical: 'Mythical',
  secret: 'Secret'
};

export const DAILY_TASKS: DailyTask[] = [
  {
    id: 'catch_10',
    title: 'Catch 10 fish',
    description: 'Land 10 fish today.',
    target: 10,
    rewardCoins: 100,
  },
  {
    id: 'rare_1',
    title: 'Catch 1 rare fish',
    description: 'Catch any rare, epic, legendary, mythical, or secret fish today.',
    target: 1,
    rewardCoins: 250,
  },
  {
    id: 'grill_1',
    title: 'Cook 1 dish',
    description: 'Make any grilled dish today.',
    target: 1,
    rewardCoins: 150,
  },
];

export const WHEEL_PRIZES: WheelPrize[] = [
  { id: 'coin_1', label: '1 coin', coins: 1 },
  { id: 'coin_25', label: '25 coins', coins: 25 },
  { id: 'coin_75', label: '75 coins', coins: 75 },
  { id: 'coin_150', label: '150 coins', coins: 150 },
  { id: 'coin_300', label: '300 coins', coins: 300 },
  { id: 'coin_750', label: '750 coins', coins: 750 },
  { id: 'coin_1500', label: '1,500 coins', coins: 1500 },
  { id: 'coin_10000', label: '10,000 coins', coins: 10000 },
  { id: 'secret_meteor', label: 'Secret Meteor Prize', coins: 7777, secret: true },
];

export const GRILL_RECIPES: GrillRecipe[] = [
  {
    id: 'lake_skewer',
    name: 'Lake Skewer',
    description: 'Simple grilled fish for steady points.',
    ingredients: { carp: 2 },
    score: 25,
  },
  {
    id: 'crispy_perch_plate',
    name: 'Crispy Perch Plate',
    description: 'A clean uncommon plate with better grill value.',
    ingredients: { perch: 2, carp: 1 },
    score: 65,
  },
  {
    id: 'rare_bream_steak',
    name: 'Rare Bream Steak',
    description: 'A richer dish that starts to matter on the board.',
    ingredients: { bream: 1, perch: 1 },
    score: 150,
  },
  {
    id: 'deepwater_platter',
    name: 'Deepwater Platter',
    description: 'High score dish made from stronger catches.',
    ingredients: { pike: 1, catfish: 1 },
    score: 420,
  },
  {
    id: 'cosmic_grill',
    name: 'Cosmic Grill',
    description: 'A Monad-style signature dish for serious grillers.',
    ingredients: { goldfish: 1, mutant: 1 },
    score: 1200,
  },
];

export const ROD_BONUSES = [0, 5, 10, 15, 25]; // % bonus to rare fish chance per rod level
export const XP_PER_LEVEL = 100;
export const CATCH_CHANCE = 25; // Base 25% chance to catch something
export const BAIT_COST = 5; // Cost per 1 bait

export interface NftRod {
  rodLevel: number;
  name: string;
  rarityBonus: number; // Additional % to rare fish chance
  xpBonus: number; // Additional % to XP
  sellBonus: number; // Additional % to sell price
  mintCost: string; // Cost in MON
}

export const NFT_ROD_DATA: NftRod[] = [
  { rodLevel: 0, name: 'Starter NFT', rarityBonus: 3, xpBonus: 10, sellBonus: 0, mintCost: '0.05' },
  { rodLevel: 1, name: 'Bamboo NFT', rarityBonus: 5, xpBonus: 15, sellBonus: 10, mintCost: '0.1' },
  { rodLevel: 2, name: 'Carbon NFT', rarityBonus: 7, xpBonus: 20, sellBonus: 15, mintCost: '0.2' },
  { rodLevel: 3, name: 'Pro NFT', rarityBonus: 10, xpBonus: 25, sellBonus: 20, mintCost: '0.5' },
  { rodLevel: 4, name: 'Legendary NFT', rarityBonus: 15, xpBonus: 30, sellBonus: 25, mintCost: '1.0' },
];
