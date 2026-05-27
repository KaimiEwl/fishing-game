import {
  BAIT_COST as ECONOMY_BAIT_COST,
  CATCH_CHANCE as ECONOMY_CATCH_CHANCE,
  DAILY_TASK_REWARDS,
  FISH_ECONOMY,
  GRILL_RECIPES as ECONOMY_GRILL_RECIPES,
  LEVIATHAN_COMMON_ROD_BONUS_CONFIG as ECONOMY_LEVIATHAN_COMMON_ROD_BONUS_CONFIG,
  NFT_ROD_DATA as ECONOMY_NFT_ROD_DATA,
  ROD_CUBE_DROP_CONFIG as ECONOMY_ROD_CUBE_DROP_CONFIG,
  ROD_ECONOMY,
  SPECIAL_TASK_REWARDS,
  SOCIAL_TASK_REWARDS,
  WHEEL_PRIZES as ECONOMY_WHEEL_PRIZES,
  XP_PER_LEVEL as ECONOMY_XP_PER_LEVEL,
} from '@/lib/economyConfig';

export type FishRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical' | 'secret';
export type RodRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

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

export interface RodDefinition {
  id: string;
  level: number;
  name: string;
  description: string;
  rarity: RodRarity;
  bonus: number;
  bobber: string;
  bobberColor: string;
  coinCost?: number;
  monUnlockCost?: string;
  monadDropChance: number;
  monadMinReward: number;
  monadMaxReward: number;
  cubeDropWeight: number;
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
  collectionBook?: CollectionBookState | null;
  rodMastery?: RodMasteryState | null;
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
  monReward?: FishingMonadReward;
  specialReward?: FishingSpecialReward;
}

export interface FishingMonadReward {
  sourceRef: string;
  amount: number;
  rodId: string;
  rodLevel: number;
  rodName: string;
  rarity: RodRarity;
  dropChance: number;
  minReward: number;
  maxReward: number;
  credited?: boolean;
}

export interface FishingSpecialReward {
  sourceRef: string;
  reason: 'leviathan_common_rod_bonus';
  type: 'rod' | 'mon_compensation';
  fishId: string;
  fishName: string;
  requiredRodId: string;
  requiredRodLevel: number;
  requiredRodName: string;
  bonusRodId: string;
  bonusRodLevel: number;
  bonusRodName: string;
  bonusRodRarity: RodRarity;
  compensationMon?: number;
  credited?: boolean;
}

export type GameTab = 'fish' | 'tasks' | 'shop' | 'grill' | 'wheel' | 'leaderboard' | 'map';

export type DailyTaskId = 'check_in' | 'catch_10' | 'rare_1' | 'grill_1' | 'spend_1000';
export type SpecialTaskId = 'invite_friend' | 'wallet_check_in';
export type SocialTaskId = 'twitter_follow' | 'twitter_repost' | 'twitter_like' | 'discord_join' | 'telegram_join';
export type WeeklyMissionId =
  | 'catch_60_fish'
  | 'catch_6_rare'
  | 'cook_5_dishes'
  | 'sell_3_dishes'
  | 'cube_3_days'
  | 'complete_1_premium_session';
export type TaskId = DailyTaskId | SpecialTaskId;
export type ReactionQuality = 'miss' | 'good' | 'perfect';
export type PremiumDropTierId = 'zero' | 'small' | 'medium' | 'big' | 'spike' | 'jackpot';
export type PremiumSessionStatus = 'idle' | 'active' | 'completed' | 'expired';

export interface WalletCheckInSummary {
  todayCheckedIn: boolean;
  repeatTestMode?: boolean;
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
  rewardCubeCharge?: number;
}

export interface WeeklyMission {
  id: WeeklyMissionId;
  title: string;
  description: string;
  target: number;
  rewardCoins?: number;
  rewardBait?: number;
  rewardCubeCharge?: number;
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

export interface WeeklyMissionProgress extends WeeklyMission {
  progress: number;
  claimed: boolean;
}

export interface PremiumCastResult {
  castIndex: number;
  reactionQuality: ReactionQuality;
  fishId: string;
  bonusCoinsAwarded: number;
  bonusXpAwarded: number;
  monDropTier: PremiumDropTierId;
  monAmount: number;
  recoveredMonTotal: number;
  luckMeterStacks: number;
  zeroDropStreak: number;
  pityTriggered: boolean;
  rescueTriggered: boolean;
  hotStreakActive: boolean;
  occurredAt: string;
}

export interface PremiumSessionState {
  sessionId: string | null;
  status: PremiumSessionStatus;
  priceMon: string;
  castsTotal: number;
  castsUsed: number;
  castsRemaining: number;
  recoveredMon: number;
  luckMeterStacks: number;
  zeroDropStreak: number;
  guaranteedRewardTier: PremiumDropTierId | null;
  rescueEligible: boolean;
  lastDropTier: PremiumDropTierId | null;
  lastCastAt: string | null;
}

export interface FishingNetCatchEntry {
  fishId: string;
  quantity: number;
}

export interface FishingNetState {
  owned: boolean;
  dailyFishCount: number;
  purchasedAt: string | null;
  readyDate: string | null;
  lastCollectedDate: string | null;
  lastNotificationDate: string | null;
  pendingCatch: FishingNetCatchEntry[];
}

export interface CollectionSpeciesState {
  fishId: string;
  discovered: boolean;
  catches: number;
  firstCaughtAt: string | null;
  lastCaughtAt: string | null;
  firstCatchBonusClaimed: boolean;
}

export interface CollectionPageState {
  pageId: string;
  completed: boolean;
  claimed: boolean;
}

export interface CollectionBookState {
  species: Record<string, CollectionSpeciesState>;
  pages: CollectionPageState[];
  totalSpeciesCaught: number;
  totalFirstCatchBonusesClaimed: number;
}

export interface RodMasteryTrackState {
  rodLevel: number;
  masteryLevel: number;
  masteryPoints: number;
  lastUpdatedAt: string | null;
}

export interface RodMasteryState {
  totalMasteryPoints: number;
  tracks: Record<string, RodMasteryTrackState>;
}

export interface WheelPrize {
  id: string;
  label: string;
  type: 'coins' | 'fish' | 'mon' | 'bait' | 'rod' | 'album' | 'premium_shard';
  coins?: number;
  fishId?: string;
  quantity?: number;
  mon?: number;
  bait?: number;
  rodId?: string;
  rodLevel?: number;
  rarity?: RodRarity;
  duplicateCompensationMonads?: number;
  duplicateCompensationApplied?: boolean;
  albumPageId?: string;
  premiumShards?: number;
  secret?: boolean;
}

export type DailyTaskStateMap = Record<DailyTaskId, { progress: number; claimed: boolean }>;
export type SpecialTaskStateMap = Record<SpecialTaskId, { progress: number; claimed: boolean }>;
export type WeeklyMissionStateMap = Record<WeeklyMissionId, { progress: number; claimed: boolean }>;

export interface GameProgressSnapshot {
  date: string;
  weekKey?: string;
  tasks: DailyTaskStateMap;
  specialTasks: SpecialTaskStateMap;
  weeklyMissions?: WeeklyMissionStateMap;
  lastWeeklyCubeUnlockDate?: string | null;
  collectionBook?: CollectionBookState | null;
  rodMastery?: RodMasteryState | null;
  premiumSession?: PremiumSessionState | null;
  fishingNet?: FishingNetState | null;
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
    ...FISH_ECONOMY.carp,
    description: 'A common fish, but great for a stew!'
  },
  {
    id: 'perch',
    name: 'Perch',
    emoji: '🐠',
    rarity: 'uncommon',
    ...FISH_ECONOMY.perch,
    description: 'A striped predator with vivid colors'
  },
  {
    id: 'bream',
    name: 'Bream',
    emoji: '🐡',
    rarity: 'rare',
    ...FISH_ECONOMY.bream,
    description: 'A large fish with golden sides'
  },
  {
    id: 'catfish',
    name: 'Catfish',
    emoji: '🐙',
    rarity: 'epic',
    ...FISH_ECONOMY.catfish,
    description: 'A giant of the deep with whiskers'
  },
  {
    id: 'goldfish',
    name: 'Goldfish',
    emoji: '✨',
    rarity: 'legendary',
    ...FISH_ECONOMY.goldfish,
    description: 'Grants wishes... well, almost!'
  },
  {
    id: 'mutant',
    name: 'Mutant Fish',
    emoji: '👾',
    rarity: 'mythical',
    ...FISH_ECONOMY.mutant,
    description: 'Something strange from the depths... NFT-ready!'
  },
  {
    id: 'pike',
    name: 'Purple Fish',
    emoji: '🦈',
    rarity: 'secret',
    ...FISH_ECONOMY.pike,
    description: 'A majestic purple predator! extremely rare!'
  },
  {
    id: 'leviathan',
    name: 'Cosmic Leviathan',
    emoji: '🌌',
    rarity: 'mythical',
    ...FISH_ECONOMY.leviathan,
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

export const ROD_DATA: readonly RodDefinition[] = [
  {
    ...ROD_ECONOMY.common_rod,
    description: 'The default starter rod. Every player owns it for free from the first cast.',
    bobber: 'Standard tackle',
    bobberColor: '#aaa',
  },
  {
    ...ROD_ECONOMY.rare_rod,
    description: 'A gold-upgrade rod with a modest rare-catch boost and a small no-fish MON range.',
    bobber: 'Blue bobber',
    bobberColor: '#60a5fa',
  },
  {
    ...ROD_ECONOMY.epic_rod,
    description: 'A stronger gold-upgrade rod for deeper runs, with higher rare-catch pressure and no-fish MON upside.',
    bobber: 'Purple bobber',
    bobberColor: '#c084fc',
  },
  {
    ...ROD_ECONOMY.legendary_rod,
    description: 'The top Monad shop rod, built for rare trophy hunts and the strongest no-fish MON pulls.',
    bobber: 'Golden glowing bobber',
    bobberColor: '#ffcc00',
  },
  {
    ...ROD_ECONOMY.legacy_gold_rod,
    description: 'A legacy tier preserved for existing saves that already reached the old level 4 rod.',
    bobber: 'Golden glowing bobber',
    bobberColor: '#ffcc00',
  },
] as const;

export const ROD_RARITY_COLORS: Record<RodRarity, string> = {
  common: '#d4d4d8',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#facc15',
};

export const ROD_RARITY_NAMES: Record<RodRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const ROD_CUBE_DROP_CONFIG = ECONOMY_ROD_CUBE_DROP_CONFIG as typeof ECONOMY_ROD_CUBE_DROP_CONFIG;

export const LEVIATHAN_COMMON_ROD_BONUS_CONFIG = ECONOMY_LEVIATHAN_COMMON_ROD_BONUS_CONFIG as typeof ECONOMY_LEVIATHAN_COMMON_ROD_BONUS_CONFIG;

export const DAILY_TASKS: DailyTask[] = [
  {
    id: 'check_in',
    title: 'Daily check-in',
    description: 'Open the game and claim your daily check-in reward.',
    target: 1,
    rewardCoins: DAILY_TASK_REWARDS.check_in.coins,
  },
  {
    id: 'catch_10',
    title: 'Catch 10 fish',
    description: 'Land 10 fish today.',
    target: 10,
    rewardCoins: DAILY_TASK_REWARDS.catch_10.coins,
  },
  {
    id: 'rare_1',
    title: 'Catch 1 rare fish',
    description: 'Catch any rare, epic, legendary, mythical, or secret fish today.',
    target: 1,
    rewardCoins: DAILY_TASK_REWARDS.rare_1.coins,
  },
  {
    id: 'grill_1',
    title: 'Cook 1 dish',
    description: 'Make any grilled dish today.',
    target: 1,
    rewardCoins: DAILY_TASK_REWARDS.grill_1.coins,
  },
  {
    id: 'spend_1000',
    title: 'Spend 1000 gold',
    description: 'Spend 1000 gold in the shop today.',
    target: 1000,
    rewardBait: DAILY_TASK_REWARDS.spend_1000.bait,
  },
];

export const SPECIAL_TASKS: SpecialTask[] = [
  {
    id: 'wallet_check_in',
    title: 'Wallet streak check-in',
    description: 'Send a small MON check-in today to keep your streak alive and unlock this daily special reward.',
    target: 1,
    rewardBait: SPECIAL_TASK_REWARDS.wallet_check_in.bait,
  },
  {
    id: 'invite_friend',
    title: 'Invite a friend',
    description: 'Invite 1 friend today after they connect a wallet.',
    target: 1,
    rewardBait: SPECIAL_TASK_REWARDS.invite_friend.bait,
  },
];

export const SOCIAL_TASKS: SocialTask[] = [
  {
    id: 'twitter_follow',
    title: 'Follow on X',
    description: 'Open the Hook & Loot X profile and keep it open for a few seconds to complete this quest.',
    verificationMode: 'automatic',
    rewardCubeCharge: SOCIAL_TASK_REWARDS.twitter_follow.cubeCharge,
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

export const WHEEL_PRIZES: WheelPrize[] = ECONOMY_WHEEL_PRIZES as WheelPrize[];

export const GRILL_RECIPES: GrillRecipe[] = [
  {
    id: 'lake_skewer',
    name: 'Lake Skewer',
    description: 'Simple grilled fish for steady points.',
    ingredients: ECONOMY_GRILL_RECIPES.lake_skewer.ingredients,
    score: ECONOMY_GRILL_RECIPES.lake_skewer.score,
  },
  {
    id: 'crispy_perch_plate',
    name: 'Crispy Perch Plate',
    description: 'A clean uncommon plate with better grill value.',
    ingredients: ECONOMY_GRILL_RECIPES.crispy_perch_plate.ingredients,
    score: ECONOMY_GRILL_RECIPES.crispy_perch_plate.score,
  },
  {
    id: 'rare_bream_steak',
    name: 'Rare Bream Steak',
    description: 'A richer dish that starts to matter on the board.',
    ingredients: ECONOMY_GRILL_RECIPES.rare_bream_steak.ingredients,
    score: ECONOMY_GRILL_RECIPES.rare_bream_steak.score,
  },
  {
    id: 'deepwater_platter',
    name: 'Deepwater Platter',
    description: 'High score dish made from a strong deepwater haul.',
    ingredients: ECONOMY_GRILL_RECIPES.deepwater_platter.ingredients,
    score: ECONOMY_GRILL_RECIPES.deepwater_platter.score,
  },
  {
    id: 'cosmic_grill',
    name: 'Cosmic Grill',
    description: 'A signature dish for serious grillers.',
    ingredients: ECONOMY_GRILL_RECIPES.cosmic_grill.ingredients,
    score: ECONOMY_GRILL_RECIPES.cosmic_grill.score,
  },
];

export const ROD_BONUSES = ROD_DATA.map((rod) => rod.bonus); // % bonus to rare fish chance per rod level
export const XP_PER_LEVEL = ECONOMY_XP_PER_LEVEL;
export const CATCH_CHANCE = ECONOMY_CATCH_CHANCE; // Base 60% chance to catch something
export const BAIT_COST = ECONOMY_BAIT_COST; // Cost per 1 bait

export interface NftRod {
  rodLevel: number;
  name: string;
  rarityBonus: number; // Additional % to rare fish chance
  xpBonus: number; // Additional % to XP
  sellBonus: number; // Additional % to sell price
  mintCost: string; // Cost in MON
}

export const NFT_ROD_DATA: NftRod[] = ECONOMY_NFT_ROD_DATA as NftRod[];
