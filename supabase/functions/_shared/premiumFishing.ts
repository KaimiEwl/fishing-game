export type PremiumReactionQuality = 'miss' | 'good' | 'perfect';
export type PremiumDropTierId = 'zero' | 'small' | 'medium' | 'big' | 'spike' | 'jackpot';
export type PremiumSessionStatus = 'active' | 'completed' | 'expired' | 'cancelled';
export type FishRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical' | 'secret';

export interface PremiumFishDefinition {
  id: string;
  name: string;
  rarity: FishRarity;
  baseChance: number;
  price: number;
  xp: number;
}

export interface PremiumDropTierConfig {
  id: PremiumDropTierId;
  chance: number;
  monAmount: number;
}

export interface PremiumSessionEngineState {
  recoveredMonTotal: number;
  luckMeterStacks: number;
  zeroDropStreak: number;
  rescueEligible: boolean;
  hotStreakCastsRemaining: number;
}

export interface PremiumSessionRowLike {
  id: string;
  status: string;
  price_mon: number | string;
  casts_total: number;
  casts_used: number;
  luck_meter_stacks: number;
  zero_drop_streak: number;
  rescue_eligible: boolean;
  recovered_mon_total: number | string;
}

export interface PremiumCastRowLike {
  mon_drop_tier: string;
  created_at: string | null;
}

export interface PremiumSessionStateView {
  sessionId: string | null;
  status: PremiumSessionStatus | 'idle';
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

export interface PremiumFishRollResult extends PremiumFishDefinition {
  adjustedWeight: number;
}

export interface PremiumMonDropResult {
  tierId: PremiumDropTierId;
  monAmount: number;
  guaranteedRewardTier: PremiumDropTierId | null;
  pityTriggered: boolean;
  rescueTriggered: boolean;
  luckMeterBefore: number;
  luckMeterAfter: number;
  zeroDropStreakAfter: number;
}

export interface PremiumCastResolution {
  fish: PremiumFishRollResult;
  reactionQuality: PremiumReactionQuality;
  bonusCoinsAwarded: number;
  bonusXpAwarded: number;
  albumPointsAwarded: number;
  rodMasteryPointsAwarded: number;
  monDrop: PremiumMonDropResult;
  recoveredMonTotal: number;
  hotStreakActive: boolean;
  hotStreakCastsRemainingAfter: number;
}

export const PREMIUM_SESSION_COST_MON = '3';
export const PREMIUM_SESSION_CASTS = 20;
const PREMIUM_SESSION_BONUS_COINS_PER_CAST = 12;
const PREMIUM_SESSION_BONUS_XP_PER_CAST = 18;
const PREMIUM_SESSION_ALBUM_POINTS_PER_CAST = 1;
const PREMIUM_SESSION_ROD_MASTERY_POINTS_PER_CAST = 1;
const PREMIUM_LUCK_METER_MAX_STACKS = 12;
const PREMIUM_RESCUE_PROC_CHANCE = 0.08;

const PREMIUM_MON_DROP_TABLE: ReadonlyArray<PremiumDropTierConfig> = [
  { id: 'zero', chance: 0.758, monAmount: 0 },
  { id: 'small', chance: 0.15, monAmount: 0.07 },
  { id: 'medium', chance: 0.065, monAmount: 0.2 },
  { id: 'big', chance: 0.02, monAmount: 0.65 },
  { id: 'spike', chance: 0.006, monAmount: 2.25 },
  { id: 'jackpot', chance: 0.001, monAmount: 6 },
] as const;

const PREMIUM_FISH_POOL: ReadonlyArray<PremiumFishDefinition> = [
  { id: 'carp', name: 'Carp', rarity: 'common', baseChance: 45.14, price: 8, xp: 10 },
  { id: 'perch', name: 'Perch', rarity: 'uncommon', baseChance: 28, price: 15, xp: 20 },
  { id: 'bream', name: 'Bream', rarity: 'rare', baseChance: 15, price: 35, xp: 35 },
  { id: 'catfish', name: 'Catfish', rarity: 'epic', baseChance: 8, price: 75, xp: 50 },
  { id: 'goldfish', name: 'Goldfish', rarity: 'legendary', baseChance: 3, price: 200, xp: 100 },
  { id: 'mutant', name: 'Mutant Fish', rarity: 'mythical', baseChance: 0.8, price: 800, xp: 200 },
  { id: 'pike', name: 'Purple Fish', rarity: 'secret', baseChance: 0.05, price: 10000, xp: 1000 },
  { id: 'leviathan', name: 'Cosmic Leviathan', rarity: 'mythical', baseChance: 0.01, price: 50000, xp: 10000 },
] as const;

const PREMIUM_FISH_WEIGHT_MODIFIERS: Readonly<Record<FishRarity, number>> = {
  common: 0.78,
  uncommon: 1.05,
  rare: 1.18,
  epic: 1.28,
  legendary: 1.42,
  mythical: 1.58,
  secret: 1.9,
} as const;

const PREMIUM_LUCK_METER_BONUS: Readonly<Record<Exclude<PremiumDropTierId, 'zero'>, number>> = {
  small: 0.002,
  medium: 0.0012,
  big: 0.0005,
  spike: 0.00015,
  jackpot: 0.00002,
} as const;

const PREMIUM_RESCUE_REWARDS = [
  { tierId: 'medium' as const, monAmount: 0.18, weight: 0.5 },
  { tierId: 'medium' as const, monAmount: 0.35, weight: 0.35 },
  { tierId: 'big' as const, monAmount: 0.65, weight: 0.15 },
] as const;

const premiumDropTierOrder: readonly PremiumDropTierId[] = [
  'zero',
  'small',
  'medium',
  'big',
  'spike',
  'jackpot',
] as const;

const pickWeighted = <T>(items: readonly T[], getWeight: (item: T) => number, random = Math.random) => {
  const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0);
  if (totalWeight <= 0) {
    return items[items.length - 1];
  }

  let roll = random() * totalWeight;
  for (const item of items) {
    roll -= getWeight(item);
    if (roll <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
};

const normalizeTierChance = (tiers: ReadonlyArray<PremiumDropTierConfig>) => {
  const total = tiers.reduce((sum, tier) => sum + tier.chance, 0);
  if (total <= 0) return tiers;
  return tiers.map((tier) => ({
    ...tier,
    chance: tier.chance / total,
  }));
};

const toSessionStatus = (status: string): PremiumSessionStatus | 'idle' => {
  if (status === 'active' || status === 'completed' || status === 'expired' || status === 'cancelled') {
    return status;
  }
  return 'idle';
};

const clampInt = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(value)));

const getHotStreakCastsRemainingAfter = (
  currentRemaining: number,
  tierId: PremiumDropTierId,
) => {
  if (tierId === 'big' || tierId === 'spike' || tierId === 'jackpot') {
    return 4;
  }

  return Math.max(0, currentRemaining - 1);
};

const getRescueDrop = (random = Math.random) => {
  const reward = pickWeighted(PREMIUM_RESCUE_REWARDS, (item) => item.weight, random);
  return {
    tierId: reward.tierId,
    monAmount: reward.monAmount,
  };
};

export const getPremiumGuaranteedRewardTier = (zeroDropStreak: number): PremiumDropTierId | null => {
  if (zeroDropStreak >= 48) return 'big';
  if (zeroDropStreak >= 34) return 'medium';
  return null;
};

export const buildPremiumFishPool = (
  reactionQuality: PremiumReactionQuality,
  rareFishBonusPercent = 0,
) => {
  const usePremiumWeights = reactionQuality !== 'miss';
  return PREMIUM_FISH_POOL.map((fish) => ({
    ...fish,
    adjustedWeight: fish.baseChance
      * (usePremiumWeights ? PREMIUM_FISH_WEIGHT_MODIFIERS[fish.rarity] : 1)
      * (
        fish.rarity === 'common' || fish.rarity === 'uncommon'
          ? 1
          : 1 + Math.max(0, rareFishBonusPercent) / 100
      ),
  }));
};

export const pickPremiumFish = (
  reactionQuality: PremiumReactionQuality,
  rareFishBonusPercent = 0,
  random = Math.random,
): PremiumFishRollResult => {
  const weightedPool = buildPremiumFishPool(reactionQuality, rareFishBonusPercent);
  return pickWeighted(weightedPool, (fish) => fish.adjustedWeight, random);
};

export const buildPremiumMonDropTable = (
  luckMeterStacks: number,
  guaranteedRewardTier: PremiumDropTierId | null,
) => {
  const cappedStacks = clampInt(luckMeterStacks, 0, PREMIUM_LUCK_METER_MAX_STACKS);
  let adjustedTiers = PREMIUM_MON_DROP_TABLE.map((tier) => ({ ...tier }));

  if (guaranteedRewardTier === 'medium') {
    adjustedTiers = adjustedTiers.map((tier) => {
      if (premiumDropTierOrder.indexOf(tier.id) < premiumDropTierOrder.indexOf('medium')) {
        return { ...tier, chance: 0 };
      }
      return tier;
    });
  }

  if (guaranteedRewardTier === 'big') {
    adjustedTiers = adjustedTiers.map((tier) => {
      if (premiumDropTierOrder.indexOf(tier.id) < premiumDropTierOrder.indexOf('big')) {
        return { ...tier, chance: 0 };
      }
      return tier;
    });
  }

  if (cappedStacks > 0) {
    adjustedTiers = adjustedTiers.map((tier) => {
      if (tier.id === 'zero') return tier;
      const bonus = PREMIUM_LUCK_METER_BONUS[tier.id as Exclude<PremiumDropTierId, 'zero'>] * cappedStacks;
      return {
        ...tier,
        chance: tier.chance + bonus,
      };
    });

    const nonZeroTotal = adjustedTiers
      .filter((tier) => tier.id !== 'zero')
      .reduce((sum, tier) => sum + tier.chance, 0);

    adjustedTiers = adjustedTiers.map((tier) => (
      tier.id === 'zero'
        ? { ...tier, chance: Math.max(0, 1 - nonZeroTotal) }
        : tier
    ));
  }

  return normalizeTierChance(adjustedTiers);
};

export const resolvePremiumMonDrop = (
  state: Pick<PremiumSessionEngineState, 'luckMeterStacks' | 'zeroDropStreak' | 'rescueEligible'>,
  random = Math.random,
): PremiumMonDropResult => {
  const guaranteedRewardTier = getPremiumGuaranteedRewardTier(state.zeroDropStreak);
  const luckMeterBefore = clampInt(state.luckMeterStacks, 0, PREMIUM_LUCK_METER_MAX_STACKS);

  if (state.rescueEligible && guaranteedRewardTier === null && random() < PREMIUM_RESCUE_PROC_CHANCE) {
    const rescueDrop = getRescueDrop(random);
    return {
      tierId: rescueDrop.tierId,
      monAmount: rescueDrop.monAmount,
      guaranteedRewardTier,
      pityTriggered: false,
      rescueTriggered: true,
      luckMeterBefore,
      luckMeterAfter: 0,
      zeroDropStreakAfter: 0,
    };
  }

  const adjustedTable = buildPremiumMonDropTable(luckMeterBefore, guaranteedRewardTier);
  const selectedTier = pickWeighted(adjustedTable, (tier) => tier.chance, random);
  const hasMonDrop = selectedTier.monAmount > 0;
  const pityTriggered = guaranteedRewardTier !== null &&
    premiumDropTierOrder.indexOf(selectedTier.id) >= premiumDropTierOrder.indexOf(guaranteedRewardTier);

  return {
    tierId: selectedTier.id,
    monAmount: selectedTier.monAmount,
    guaranteedRewardTier,
    pityTriggered,
    rescueTriggered: false,
    luckMeterBefore,
    luckMeterAfter: hasMonDrop ? 0 : Math.min(PREMIUM_LUCK_METER_MAX_STACKS, luckMeterBefore + 1),
    zeroDropStreakAfter: hasMonDrop ? 0 : state.zeroDropStreak + 1,
  };
};

export const resolvePremiumCast = (
  reactionQuality: PremiumReactionQuality,
  state: PremiumSessionEngineState,
  options: { rareFishBonusPercent?: number } = {},
  random = Math.random,
): PremiumCastResolution => {
  const fish = pickPremiumFish(reactionQuality, options.rareFishBonusPercent ?? 0, random);
  const monDrop = resolvePremiumMonDrop(state, random);
  const hotStreakWasActive = state.hotStreakCastsRemaining > 0;
  const hotStreakCastsRemainingAfter = getHotStreakCastsRemainingAfter(state.hotStreakCastsRemaining, monDrop.tierId);
  const hasReactionBonus = reactionQuality !== 'miss';
  const hotMultiplier = hotStreakWasActive ? 1.25 : 1;
  const bonusCoinsAwarded = hasReactionBonus
    ? Math.round(PREMIUM_SESSION_BONUS_COINS_PER_CAST * hotMultiplier)
    : 0;
  const bonusXpAwarded = hasReactionBonus
    ? Math.round(PREMIUM_SESSION_BONUS_XP_PER_CAST * hotMultiplier)
    : 0;

  return {
    fish,
    reactionQuality,
    bonusCoinsAwarded,
    bonusXpAwarded,
    albumPointsAwarded: PREMIUM_SESSION_ALBUM_POINTS_PER_CAST + (hotStreakWasActive ? 1 : 0),
    rodMasteryPointsAwarded: PREMIUM_SESSION_ROD_MASTERY_POINTS_PER_CAST,
    monDrop,
    recoveredMonTotal: Number((state.recoveredMonTotal + monDrop.monAmount).toFixed(8)),
    hotStreakActive: hotStreakWasActive || hotStreakCastsRemainingAfter > 0,
    hotStreakCastsRemainingAfter,
  };
};

export const buildPremiumSessionState = (
  sessionRow: PremiumSessionRowLike | null,
  lastCast: PremiumCastRowLike | null = null,
): PremiumSessionStateView => {
  if (!sessionRow) {
    return {
      sessionId: null,
      status: 'idle',
      priceMon: PREMIUM_SESSION_COST_MON,
      castsTotal: PREMIUM_SESSION_CASTS,
      castsUsed: 0,
      castsRemaining: 0,
      recoveredMon: 0,
      luckMeterStacks: 0,
      zeroDropStreak: 0,
      guaranteedRewardTier: null,
      rescueEligible: false,
      lastDropTier: null,
      lastCastAt: null,
    };
  }

  const castsTotal = Math.max(0, Number(sessionRow.casts_total ?? 0));
  const castsUsed = clampInt(Number(sessionRow.casts_used ?? 0), 0, castsTotal);
  const zeroDropStreak = Math.max(0, Number(sessionRow.zero_drop_streak ?? 0));

  return {
    sessionId: sessionRow.id,
    status: toSessionStatus(sessionRow.status),
    priceMon: String(sessionRow.price_mon ?? PREMIUM_SESSION_COST_MON),
    castsTotal,
    castsUsed,
    castsRemaining: Math.max(0, castsTotal - castsUsed),
    recoveredMon: Number(sessionRow.recovered_mon_total ?? 0),
    luckMeterStacks: clampInt(Number(sessionRow.luck_meter_stacks ?? 0), 0, PREMIUM_LUCK_METER_MAX_STACKS),
    zeroDropStreak,
    guaranteedRewardTier: getPremiumGuaranteedRewardTier(zeroDropStreak),
    rescueEligible: Boolean(sessionRow.rescue_eligible),
    lastDropTier: lastCast && premiumDropTierOrder.includes(lastCast.mon_drop_tier as PremiumDropTierId)
      ? lastCast.mon_drop_tier as PremiumDropTierId
      : null,
    lastCastAt: lastCast?.created_at ?? null,
  };
};
