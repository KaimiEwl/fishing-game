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
