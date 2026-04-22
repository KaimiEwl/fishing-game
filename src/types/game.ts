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
  dailyFreeBait: number;
  dailyFreeBaitResetAt: string | null;
  bonusBaitGrantedTotal: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  rodLevel: number; // Max owned rod level
  equippedRod: number; // Currently equipped rod level
  inventory: CaughtFish[];
  cookedDishes: CookedDishStack[];
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

export interface CookedDishStack {
  recipeId: string;
  quantity: number;
  createdAt: Date;
}

export type GameState = 'idle' | 'casting' | 'waiting' | 'biting' | 'catching' | 'result';

export interface GameResult {
  success: boolean;
  fish?: Fish;
}

export type GameTab = 'fish' | 'tasks' | 'shop' | 'grill' | 'wheel' | 'leaderboard' | 'map';

export type DailyTaskId = 'check_in' | 'catch_10' | 'rare_1' | 'grill_1' | 'spend_1000';
export type SpecialTaskId = 'invite_friend' | 'wallet_check_in';
export type SocialTaskId = 'twitter_follow' | 'twitter_repost' | 'twitter_like' | 'discord_join' | 'telegram_join';
export type TaskId = DailyTaskId | SpecialTaskId;

export interface WalletCheckInSummary {
  todayCheckedIn: boolean;
  streakDays: number;
  lastCheckInAt: string | null;
  lastCheckInDate: string | null;
  lastCheckInTxHash: string | null;
  receiverAddress: string;
  amountMon: string;
  source?: 'server' | 'local';
}

export interface DailyTask {
  id: DailyTaskId;
  title: string;
  description: string;
  target: number;
  rewardCoins?: number;
  rewardBait?: number;
}

export interface SpecialTask {
  id: SpecialTaskId;
  title: string;
  description: string;
  target: number;
  rewardCoins?: number;
  rewardBait?: number;
}

export interface SocialTask {
  id: SocialTaskId;
  title: string;
  description: string;
  verificationMode: 'manual' | 'automatic';
  rewardCoins?: number;
  rewardBait?: number;
}

export interface DailyTaskProgress extends DailyTask {
  progress: number;
  claimed: boolean;
}

export interface SpecialTaskProgress extends SpecialTask {
  progress: number;
  claimed: boolean;
}

export type SocialTaskStatus = 'available' | 'pending_verification' | 'verified' | 'claimed';

export interface SocialTaskProgress extends SocialTask {
  status: SocialTaskStatus;
  proofUrl: string | null;
  updatedAt: string | null;
  verifiedByWallet: string | null;
  canClaim: boolean;
}

export interface WheelPrize {
  id: string;
  label: string;
  type: 'coins' | 'fish' | 'mon';
  coins?: number;
  fishId?: string;
  quantity?: number;
  mon?: number;
  secret?: boolean;
}

export type DailyTaskStateMap = Record<DailyTaskId, { progress: number; claimed: boolean }>;
export type SpecialTaskStateMap = Record<SpecialTaskId, { progress: number; claimed: boolean }>;

export interface GameProgressSnapshot {
  date: string;
  tasks: DailyTaskStateMap;
  specialTasks: SpecialTaskStateMap;
  lastWalletCheckInTxHash?: string | null;
  wheelSpun: boolean;
  wheelPrize: WheelPrize | null;
  dailyWheelRolls: number;
  dailyRollRewardGranted: boolean;
  paidWheelRolls: number;
  grillScore: number;
  dishesToday: number;
}

export interface GrillRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: Record<string, number>;
  score: number;
}

export interface GrillLeaderboardEntry {
  id: string;
  name: string;
  score: number;
  dishes: number;
  walletAddress?: string;
  updatedAt: string;
}

export const FISH_DATA: Fish[] = [
  {
    id: 'carp',
    name: 'Carp',
    emoji: '✨',
    rarity: 'common',
    chance: 45.14,
    price: 8,
    xp: 10,
    description: 'A common fish, but great for a stew!'
  },
  {
    id: 'perch',
    name: 'Perch',
    emoji: '🐠',
    rarity: 'uncommon',
    chance: 28,
    price: 15,
    xp: 20,
    description: 'A striped predator with vivid colors'
  },
  {
    id: 'bream',
    name: 'Bream',
    emoji: '🐡',
    rarity: 'rare',
    chance: 15,
    price: 35,
    xp: 35,
    description: 'A large fish with golden sides'
  },
  {
    id: 'catfish',
    name: 'Catfish',
    emoji: '🐙',
    rarity: 'epic',
    chance: 8,
    price: 75,
    xp: 50,
    description: 'A giant of the deep with whiskers'
  },
  {
    id: 'goldfish',
    name: 'Goldfish',
    emoji: '✨',
    rarity: 'legendary',
    chance: 3,
    price: 200,
    xp: 100,
    description: 'Grants wishes... well, almost!'
  },
  {
    id: 'mutant',
    name: 'Mutant Fish',
    emoji: '👾',
    rarity: 'mythical',
    chance: 0.8,
    price: 800,
    xp: 200,
    description: 'Something strange from the depths... NFT-ready!'
  },
  {
    id: 'pike',
    name: 'Purple Fish',
    emoji: '🦈',
    rarity: 'secret',
    chance: 0.05,
    price: 10000,
    xp: 1000,
    description: 'A majestic purple predator! extremely rare!'
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
    id: 'check_in',
    title: 'Daily check-in',
    description: 'Open the game and claim your daily check-in reward.',
    target: 1,
    rewardCoins: 100,
  },
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
    rewardCoins: 100,
  },
  {
    id: 'grill_1',
    title: 'Cook 1 dish',
    description: 'Make any grilled dish today.',
    target: 1,
    rewardCoins: 100,
  },
  {
    id: 'spend_1000',
    title: 'Spend 1000 gold',
    description: 'Spend 1000 gold in the shop today.',
    target: 1000,
    rewardBait: 10,
  },
];

export const SPECIAL_TASKS: SpecialTask[] = [
  {
    id: 'wallet_check_in',
    title: 'Wallet streak check-in',
    description: 'Send a small MON check-in today to keep your streak alive and unlock this daily special reward.',
    target: 1,
    rewardBait: 10,
  },
  {
    id: 'invite_friend',
    title: 'Invite a friend',
    description: 'Invite 1 friend today after they connect a wallet.',
    target: 1,
    rewardBait: 10,
  },
];

export const SOCIAL_TASKS: SocialTask[] = [
  {
    id: 'twitter_follow',
    title: 'Follow on X',
    description: 'Social task scaffold for future X follow verification.',
    verificationMode: 'manual',
  },
  {
    id: 'twitter_repost',
    title: 'Repost on X',
    description: 'Social task scaffold for future repost verification.',
    verificationMode: 'manual',
  },
  {
    id: 'twitter_like',
    title: 'Like on X',
    description: 'Social task scaffold for future like verification.',
    verificationMode: 'manual',
  },
  {
    id: 'discord_join',
    title: 'Join Discord',
    description: 'Social task scaffold for future Discord verification.',
    verificationMode: 'manual',
  },
  {
    id: 'telegram_join',
    title: 'Join Telegram',
    description: 'Social task scaffold for future Telegram verification.',
    verificationMode: 'manual',
  },
];

export const WHEEL_PRIZES: WheelPrize[] = [
  { id: 'coin_1', type: 'coins', label: '50 coins', coins: 50 },
  { id: 'coin_25', type: 'coins', label: '100 coins', coins: 100 },
  { id: 'coin_75', type: 'coins', label: '250 coins', coins: 250 },
  { id: 'coin_150', type: 'coins', label: '500 coins', coins: 500 },
  { id: 'coin_300', type: 'coins', label: '750 coins', coins: 750 },
  { id: 'coin_750', type: 'coins', label: '1,000 coins', coins: 1000 },
  { id: 'coin_1500', type: 'coins', label: '1,500 coins', coins: 1500 },
  { id: 'coin_10000', type: 'coins', label: '2,500 coins', coins: 2500 },
  { id: 'secret_meteor', type: 'coins', label: 'Secret Meteor Prize', coins: 5000, secret: true },
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
    description: 'A signature dish for serious grillers.',
    ingredients: { goldfish: 1, mutant: 1 },
    score: 1200,
  },
];

export const ROD_BONUSES = [0, 5, 10, 15, 25]; // % bonus to rare fish chance per rod level
export const XP_PER_LEVEL = 100;
export const CATCH_CHANCE = 60; // Base 60% chance to catch something
export const BAIT_COST = 80; // Cost per 1 bait

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
