import type { FishRarity, PlayerState, PremiumDropTierId } from '@/types/game';

const readFlag = (value: string | undefined, fallback: boolean) => {
  if (value == null || value.trim() === '') return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const readRolloutPercent = (value: string | undefined, fallback: number) => {
  if (value == null || value.trim() === '') return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.floor(parsed)));
};

const readAllowlist = (value: string | undefined) => (
  (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
);

export const DAILY_FREE_BAIT = 30;
export const WALLET_CONNECT_BAIT_BONUS = 0;
export const REFERRAL_BAIT_BONUS = 10;
export const MAX_REWARDED_REFERRALS_PER_INVITER = 10;
export const MAX_EXTRA_BAIT_FROM_DAILIES_PER_DAY = 0;
export const TARGET_PAID_BAIT_RTP = 0.32;

export const BAIT_BUCKETS_V2_ENABLED = readFlag(import.meta.env.VITE_BAIT_BUCKETS_V2_ENABLED, true);
export const WALLET_BAIT_BONUS_ENABLED = readFlag(import.meta.env.VITE_WALLET_BAIT_BONUS_ENABLED, true);
export const REFERRAL_BAIT_ENABLED = readFlag(import.meta.env.VITE_REFERRAL_BAIT_ENABLED, true);
export const LEGACY_DAILY_BONUS_DISABLED = readFlag(import.meta.env.VITE_LEGACY_DAILY_BONUS_DISABLED, true);
export const PREMIUM_SESSIONS_ENABLED = readFlag(import.meta.env.VITE_PREMIUM_SESSIONS_ENABLED, true);
export const COLLECTION_BOOK_ENABLED = readFlag(import.meta.env.VITE_COLLECTION_BOOK_ENABLED, true);
export const WEEKLY_MISSIONS_ENABLED = readFlag(import.meta.env.VITE_WEEKLY_MISSIONS_ENABLED, true);
export const CUBE_REBALANCE_ENABLED = readFlag(import.meta.env.VITE_CUBE_REBALANCE_ENABLED, true);
export const ECONOMY_ROLLOUT_ALLOWLIST = readAllowlist(import.meta.env.VITE_ECONOMY_ROLLOUT_ALLOWLIST);
export const PREMIUM_SESSIONS_ROLLOUT_PERCENT = readRolloutPercent(import.meta.env.VITE_PREMIUM_SESSIONS_ROLLOUT_PERCENT, 100);
export const COLLECTION_BOOK_ROLLOUT_PERCENT = readRolloutPercent(import.meta.env.VITE_COLLECTION_BOOK_ROLLOUT_PERCENT, 100);
export const WEEKLY_MISSIONS_ROLLOUT_PERCENT = readRolloutPercent(import.meta.env.VITE_WEEKLY_MISSIONS_ROLLOUT_PERCENT, 100);
export const CUBE_REBALANCE_ROLLOUT_PERCENT = readRolloutPercent(import.meta.env.VITE_CUBE_REBALANCE_ROLLOUT_PERCENT, 100);

export const BAIT_PACKAGES = [
  { amount: 5, cost: 400, label: 'Small bait pack' },
  { amount: 10, cost: 800, label: 'Double bait pack' },
  { amount: 25, cost: 2000, label: 'Big bait pack' },
  { amount: 50, cost: 4000, label: 'Bulk bait box' },
] as const;

export const FISHING_NET_PRICE_COINS = 6000;
export const FISHING_NET_DAILY_FISH_COUNT = 10;
export const FISHING_NET_PAYBACK_DAYS_ESTIMATE = 14;

export const MON_ROD_PURCHASES = [
  {
    level: 1,
    monAmount: '0.05',
    label: 'Bamboo instant unlock',
    positioning: 'About 1-2 days of rod grind skipped.',
  },
  {
    level: 2,
    monAmount: '0.15',
    label: 'Carbon instant unlock',
    positioning: 'About a week of rod grind skipped.',
  },
  {
    level: 3,
    monAmount: '0.4',
    label: 'Pro instant unlock',
    positioning: 'About a month of rod grind skipped.',
  },
  {
    level: 4,
    monAmount: '0.9',
    label: 'Legendary instant unlock',
    positioning: 'Late-game shortcut without replacing NFT value.',
  },
] as const;

export interface PremiumMonDropTierConfig {
  id: PremiumDropTierId;
  chance: number;
  monAmount: number;
}

export interface PremiumLuckMeterConfig {
  maxStacks: number;
  perZeroStackBonus: Record<Exclude<PremiumDropTierId, 'zero'>, number>;
}

export interface PremiumPityConfig {
  guaranteedMediumAtZeroStreak: number;
  guaranteedBigAtZeroStreak: number;
}

export interface PremiumRescueConfig {
  enabled: boolean;
  triggerAfterLowRecoverySessions: number;
  lowRecoveryThresholdMon: number;
  maxExpectedWeeklyMon: number;
  maxRescueTriggersPerWeek: number;
  eligibleRewards: number[];
}

export interface WeeklyMissionConfig {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardCoins?: number;
  rewardBait?: number;
  rewardCubeCharge?: number;
}

export interface CubeRebalanceConfig {
  enabled: boolean;
  targetCoinEvPerRoll: number;
  fishTileRatio: number;
  monTileCount: number;
  monPrizeAmount: number;
  preferredRewardMix: Array<'coins' | 'fish' | 'bait' | 'album' | 'mon'>;
}

export interface EconomyFeatureAvailability {
  premiumSessions: boolean;
  collectionBook: boolean;
  weeklyMissions: boolean;
  cubeRebalance: boolean;
}

export const PREMIUM_SESSION_COST_MON = '3';
export const PREMIUM_SESSION_CASTS = 20;
export const PREMIUM_SESSION_CONSUMES_BAIT = false;
export const PREMIUM_SESSION_BONUS_COINS_PER_CAST = 12;
export const PREMIUM_SESSION_BONUS_XP_PER_CAST = 18;
export const PREMIUM_SESSION_ALBUM_POINTS_PER_CAST = 1;
export const PREMIUM_SESSION_ROD_MASTERY_POINTS_PER_CAST = 1;

export const PREMIUM_MON_DROP_TABLE: ReadonlyArray<PremiumMonDropTierConfig> = [
  { id: 'zero', chance: 0.758, monAmount: 0 },
  { id: 'small', chance: 0.15, monAmount: 0.07 },
  { id: 'medium', chance: 0.065, monAmount: 0.2 },
  { id: 'big', chance: 0.02, monAmount: 0.65 },
  { id: 'spike', chance: 0.006, monAmount: 2.25 },
  { id: 'jackpot', chance: 0.001, monAmount: 6 },
] as const;

export const PREMIUM_MON_DROP_EV_PER_CAST = PREMIUM_MON_DROP_TABLE.reduce(
  (sum, tier) => sum + tier.chance * tier.monAmount,
  0,
);
export const PREMIUM_MON_DROP_EV_PER_SESSION = PREMIUM_MON_DROP_EV_PER_CAST * PREMIUM_SESSION_CASTS;

export const PREMIUM_FISH_WEIGHT_MODIFIERS: Readonly<Record<FishRarity, number>> = {
  common: 0.78,
  uncommon: 1.05,
  rare: 1.18,
  epic: 1.28,
  legendary: 1.42,
  mythical: 1.58,
  secret: 1.9,
} as const;

export const PREMIUM_LUCK_METER_CONFIG: Readonly<PremiumLuckMeterConfig> = {
  maxStacks: 12,
  perZeroStackBonus: {
    small: 0.002,
    medium: 0.0012,
    big: 0.0005,
    spike: 0.00015,
    jackpot: 0.00002,
  },
} as const;

export const PREMIUM_PITY_CONFIG: Readonly<PremiumPityConfig> = {
  guaranteedMediumAtZeroStreak: 34,
  guaranteedBigAtZeroStreak: 48,
} as const;

export const PREMIUM_RESCUE_CONFIG: Readonly<PremiumRescueConfig> = {
  enabled: true,
  triggerAfterLowRecoverySessions: 2,
  lowRecoveryThresholdMon: 0.8,
  maxExpectedWeeklyMon: 1.2,
  maxRescueTriggersPerWeek: 2,
  eligibleRewards: [0.18, 0.35, 0.65],
} as const;

export const ALBUM_FIRST_CATCH_BONUSES = {
  carp: 25,
  perch: 50,
  bream: 100,
  catfish: 200,
  goldfish: 500,
  mutant: 1500,
  pike: 5000,
  leviathan: 10000,
} as const;

export const WEEKLY_MISSION_CONFIG: ReadonlyArray<WeeklyMissionConfig> = [
  { id: 'catch_60_fish', title: 'Catch 60 fish', description: 'Keep returning through the week and land 60 fish total.', target: 60, rewardCoins: 300 },
  { id: 'catch_6_rare', title: 'Catch 6 rare+ fish', description: 'Catch 6 rare, epic, legendary, mythical, or secret fish this week.', target: 6, rewardCoins: 250 },
  { id: 'cook_5_dishes', title: 'Cook 5 dishes', description: 'Turn your catches into 5 grill dishes this week.', target: 5, rewardBait: 10 },
  { id: 'sell_3_dishes', title: 'Sell 3 dishes', description: 'Sell 3 cooked dishes from your inventory this week.', target: 3, rewardBait: 10 },
  { id: 'cube_3_days', title: 'Unlock cube on 3 days', description: 'Unlock the daily cube on 3 different days this week.', target: 3, rewardCubeCharge: 1 },
  { id: 'complete_1_premium_session', title: 'Complete 1 premium session', description: 'Finish one MON Expedition from start to finish.', target: 1, rewardCoins: 250 },
] as const;

export const WEEKLY_GRILL_PAYOUT_CONFIG = {
  totalMonBudget: 10,
  payouts: [
    { rank: 1, monAmount: 2.5 },
    { rank: 2, monAmount: 1.75 },
    { rank: 3, monAmount: 1.25 },
    { rank: 4, monAmount: 1 },
    { rank: 5, monAmount: 0.75 },
    { rank: 6, monAmount: 0.5 },
    { rank: 7, monAmount: 0.5 },
    { rank: 8, monAmount: 0.5 },
    { rank: 9, monAmount: 0.5 },
    { rank: 10, monAmount: 0.5 },
  ],
} as const;

export const CUBE_REBALANCE_CONFIG: Readonly<CubeRebalanceConfig> = {
  enabled: CUBE_REBALANCE_ENABLED,
  targetCoinEvPerRoll: 260,
  fishTileRatio: 0.46,
  monTileCount: 1,
  monPrizeAmount: 1,
  preferredRewardMix: ['fish', 'coins', 'bait', 'mon', 'album'],
} as const;

const normalizeRolloutSubject = (subject?: string | null) => {
  const normalized = subject?.trim().toLowerCase() ?? '';
  return normalized || null;
};

const hashSubjectToRolloutBucket = (subject: string) => {
  let hash = 2166136261;
  for (let index = 0; index < subject.length; index += 1) {
    hash ^= subject.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0) % 100;
};

const isFeatureEnabledForSubject = (
  enabled: boolean,
  rolloutPercent: number,
  subject?: string | null,
) => {
  if (!enabled) return false;

  const normalizedSubject = normalizeRolloutSubject(subject);
  if (normalizedSubject && ECONOMY_ROLLOUT_ALLOWLIST.includes(normalizedSubject)) {
    return true;
  }

  if (rolloutPercent >= 100) return true;
  if (rolloutPercent <= 0 || !normalizedSubject) return false;

  return hashSubjectToRolloutBucket(normalizedSubject) < rolloutPercent;
};

export const getEconomyFeatureAvailability = (subject?: string | null): EconomyFeatureAvailability => ({
  premiumSessions: isFeatureEnabledForSubject(
    PREMIUM_SESSIONS_ENABLED,
    PREMIUM_SESSIONS_ROLLOUT_PERCENT,
    subject,
  ),
  collectionBook: isFeatureEnabledForSubject(
    COLLECTION_BOOK_ENABLED,
    COLLECTION_BOOK_ROLLOUT_PERCENT,
    subject,
  ),
  weeklyMissions: isFeatureEnabledForSubject(
    WEEKLY_MISSIONS_ENABLED,
    WEEKLY_MISSIONS_ROLLOUT_PERCENT,
    subject,
  ),
  cubeRebalance: isFeatureEnabledForSubject(
    CUBE_REBALANCE_ENABLED,
    CUBE_REBALANCE_ROLLOUT_PERCENT,
    subject,
  ),
});

export const getVisibleBaitTotal = (player: Pick<PlayerState, 'bait' | 'dailyFreeBait'>) => (
  player.bait + (BAIT_BUCKETS_V2_ENABLED ? player.dailyFreeBait : 0)
);
