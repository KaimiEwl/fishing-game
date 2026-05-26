import { ROD_DATA, type FishRarity, type PlayerState, type PremiumDropTierId } from '@/types/game';
import {
  ALBUM_FIRST_CATCH_BONUSES as ECONOMY_ALBUM_FIRST_CATCH_BONUSES,
  BAIT_PACKAGES as ECONOMY_BAIT_PACKAGES,
  CUBE_REBALANCE_CONFIG as ECONOMY_CUBE_REBALANCE_CONFIG,
  DAILY_FREE_BAIT as ECONOMY_DAILY_FREE_BAIT,
  FISHING_NET_DAILY_FISH_COUNT as ECONOMY_FISHING_NET_DAILY_FISH_COUNT,
  FISHING_NET_PAYBACK_DAYS_ESTIMATE as ECONOMY_FISHING_NET_PAYBACK_DAYS_ESTIMATE,
  FISHING_NET_PRICE_COINS as ECONOMY_FISHING_NET_PRICE_COINS,
  MAX_EXTRA_BAIT_FROM_DAILIES_PER_DAY as ECONOMY_MAX_EXTRA_BAIT_FROM_DAILIES_PER_DAY,
  MAX_REWARDED_REFERRALS as ECONOMY_MAX_REWARDED_REFERRALS,
  MON_CUBE_SPIN_PACKAGES as ECONOMY_MON_CUBE_SPIN_PACKAGES,
  MON_COIN_PACKAGES as ECONOMY_MON_COIN_PACKAGES,
  MON_FISHING_NET_PACKAGES as ECONOMY_MON_FISHING_NET_PACKAGES,
  MON_MARKET_RECEIVER_ADDRESS as ECONOMY_MON_MARKET_RECEIVER_ADDRESS,
  PREMIUM_FISH_WEIGHT_MODIFIERS as ECONOMY_PREMIUM_FISH_WEIGHT_MODIFIERS,
  PREMIUM_LUCK_METER_CONFIG as ECONOMY_PREMIUM_LUCK_METER_CONFIG,
  PREMIUM_MON_DROP_TABLE as ECONOMY_PREMIUM_MON_DROP_TABLE,
  PREMIUM_PITY_CONFIG as ECONOMY_PREMIUM_PITY_CONFIG,
  PREMIUM_RESCUE_CONFIG as ECONOMY_PREMIUM_RESCUE_CONFIG,
  PREMIUM_SESSION_ALBUM_POINTS_PER_CAST as ECONOMY_PREMIUM_SESSION_ALBUM_POINTS_PER_CAST,
  PREMIUM_SESSION_BONUS_COINS_PER_CAST as ECONOMY_PREMIUM_SESSION_BONUS_COINS_PER_CAST,
  PREMIUM_SESSION_BONUS_XP_PER_CAST as ECONOMY_PREMIUM_SESSION_BONUS_XP_PER_CAST,
  PREMIUM_SESSION_CASTS as ECONOMY_PREMIUM_SESSION_CASTS,
  PREMIUM_SESSION_CONSUMES_BAIT as ECONOMY_PREMIUM_SESSION_CONSUMES_BAIT,
  PREMIUM_SESSION_COST_MON as ECONOMY_PREMIUM_SESSION_COST_MON,
  PREMIUM_SESSION_ROD_MASTERY_POINTS_PER_CAST as ECONOMY_PREMIUM_SESSION_ROD_MASTERY_POINTS_PER_CAST,
  REFERRAL_BAIT_BONUS as ECONOMY_REFERRAL_BAIT_BONUS,
  TARGET_PAID_BAIT_RTP as ECONOMY_TARGET_PAID_BAIT_RTP,
  WALLET_CONNECT_BAIT_BONUS as ECONOMY_WALLET_CONNECT_BAIT_BONUS,
  WEEKLY_GRILL_PAYOUT_CONFIG as ECONOMY_WEEKLY_GRILL_PAYOUT_CONFIG,
  WEEKLY_MISSION_CONFIG as ECONOMY_WEEKLY_MISSION_CONFIG,
} from '@/lib/economyConfig';

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

export const DAILY_FREE_BAIT = ECONOMY_DAILY_FREE_BAIT;
export const WALLET_CONNECT_BAIT_BONUS = ECONOMY_WALLET_CONNECT_BAIT_BONUS;
export const REFERRAL_BAIT_BONUS = ECONOMY_REFERRAL_BAIT_BONUS;
export const MAX_REWARDED_REFERRALS_PER_INVITER = ECONOMY_MAX_REWARDED_REFERRALS;
export const MAX_EXTRA_BAIT_FROM_DAILIES_PER_DAY = ECONOMY_MAX_EXTRA_BAIT_FROM_DAILIES_PER_DAY;
export const TARGET_PAID_BAIT_RTP = ECONOMY_TARGET_PAID_BAIT_RTP;

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

export const BAIT_PACKAGES = ECONOMY_BAIT_PACKAGES as typeof ECONOMY_BAIT_PACKAGES;

export const FISHING_NET_PRICE_COINS = ECONOMY_FISHING_NET_PRICE_COINS;
export const FISHING_NET_DAILY_FISH_COUNT = ECONOMY_FISHING_NET_DAILY_FISH_COUNT;
export const FISHING_NET_PAYBACK_DAYS_ESTIMATE = ECONOMY_FISHING_NET_PAYBACK_DAYS_ESTIMATE;
export const MON_MARKET_RECEIVER_ADDRESS = ECONOMY_MON_MARKET_RECEIVER_ADDRESS as `0x${string}`;
export const MON_COIN_PACKAGES = ECONOMY_MON_COIN_PACKAGES as typeof ECONOMY_MON_COIN_PACKAGES;
export const MON_FISHING_NET_PACKAGES = ECONOMY_MON_FISHING_NET_PACKAGES as typeof ECONOMY_MON_FISHING_NET_PACKAGES;
export const MON_CUBE_SPIN_PACKAGES = ECONOMY_MON_CUBE_SPIN_PACKAGES as typeof ECONOMY_MON_CUBE_SPIN_PACKAGES;

export const MON_ROD_PURCHASES = ROD_DATA
  .filter((rod) => rod.level > 0 && rod.monUnlockCost)
  .map((rod) => ({
    level: rod.level,
    rodId: rod.id,
    name: rod.name,
    description: rod.description,
    rarity: rod.rarity,
    monAmount: rod.monUnlockCost!,
    rareCatchBonus: rod.bonus,
    monadDropChance: rod.monadDropChance,
    monadMinReward: rod.monadMinReward,
    monadMaxReward: rod.monadMaxReward,
    label: rod.name,
    positioning: `${rod.name} unlock for Monad Shop progression.`,
  }));

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
  preferredRewardMix: Array<'coins' | 'fish' | 'bait' | 'rod' | 'album' | 'mon'>;
}

export interface EconomyFeatureAvailability {
  premiumSessions: boolean;
  collectionBook: boolean;
  weeklyMissions: boolean;
  cubeRebalance: boolean;
}

export const PREMIUM_SESSION_COST_MON = ECONOMY_PREMIUM_SESSION_COST_MON;
export const PREMIUM_SESSION_CASTS = ECONOMY_PREMIUM_SESSION_CASTS;
export const PREMIUM_SESSION_CONSUMES_BAIT = ECONOMY_PREMIUM_SESSION_CONSUMES_BAIT;
export const PREMIUM_SESSION_BONUS_COINS_PER_CAST = ECONOMY_PREMIUM_SESSION_BONUS_COINS_PER_CAST;
export const PREMIUM_SESSION_BONUS_XP_PER_CAST = ECONOMY_PREMIUM_SESSION_BONUS_XP_PER_CAST;
export const PREMIUM_SESSION_ALBUM_POINTS_PER_CAST = ECONOMY_PREMIUM_SESSION_ALBUM_POINTS_PER_CAST;
export const PREMIUM_SESSION_ROD_MASTERY_POINTS_PER_CAST = ECONOMY_PREMIUM_SESSION_ROD_MASTERY_POINTS_PER_CAST;

export const PREMIUM_MON_DROP_TABLE: ReadonlyArray<PremiumMonDropTierConfig> = ECONOMY_PREMIUM_MON_DROP_TABLE as ReadonlyArray<PremiumMonDropTierConfig>;

export const PREMIUM_MON_DROP_EV_PER_CAST = PREMIUM_MON_DROP_TABLE.reduce(
  (sum, tier) => sum + tier.chance * tier.monAmount,
  0,
);
export const PREMIUM_MON_DROP_EV_PER_SESSION = PREMIUM_MON_DROP_EV_PER_CAST * PREMIUM_SESSION_CASTS;

export const PREMIUM_FISH_WEIGHT_MODIFIERS: Readonly<Record<FishRarity, number>> = ECONOMY_PREMIUM_FISH_WEIGHT_MODIFIERS as Readonly<Record<FishRarity, number>>;

export const PREMIUM_LUCK_METER_CONFIG: Readonly<PremiumLuckMeterConfig> = ECONOMY_PREMIUM_LUCK_METER_CONFIG as Readonly<PremiumLuckMeterConfig>;

export const PREMIUM_PITY_CONFIG: Readonly<PremiumPityConfig> = ECONOMY_PREMIUM_PITY_CONFIG as Readonly<PremiumPityConfig>;

export const PREMIUM_RESCUE_CONFIG: Readonly<PremiumRescueConfig> = ECONOMY_PREMIUM_RESCUE_CONFIG as Readonly<PremiumRescueConfig>;

export const ALBUM_FIRST_CATCH_BONUSES = ECONOMY_ALBUM_FIRST_CATCH_BONUSES as typeof ECONOMY_ALBUM_FIRST_CATCH_BONUSES;

export const WEEKLY_MISSION_CONFIG: ReadonlyArray<WeeklyMissionConfig> = ECONOMY_WEEKLY_MISSION_CONFIG as ReadonlyArray<WeeklyMissionConfig>;

export const WEEKLY_GRILL_PAYOUT_CONFIG = ECONOMY_WEEKLY_GRILL_PAYOUT_CONFIG as typeof ECONOMY_WEEKLY_GRILL_PAYOUT_CONFIG;

export const CUBE_REBALANCE_CONFIG: Readonly<CubeRebalanceConfig> = {
  ...ECONOMY_CUBE_REBALANCE_CONFIG,
  enabled: CUBE_REBALANCE_ENABLED,
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
