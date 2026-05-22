import {
  LEVIATHAN_COMMON_ROD_BONUS_CONFIG,
  ROD_DATA,
  type Fish,
  type FishingSpecialReward,
  type RodDefinition,
} from '@/types/game';
import { normalizeMonAmount } from '@/lib/monRewards';

const createAchievementSourceRef = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `leviathan-common-rod:${crypto.randomUUID()}`;
  }

  return `leviathan-common-rod:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
};

export const findRodDefinitionById = (rodId: string): RodDefinition | null => (
  ROD_DATA.find((rod) => rod.id === rodId) ?? null
);

export const buildLeviathanCommonRodBonus = (
  fish: Fish | null | undefined,
  activeRodLevel: number,
  ownedRodLevel: number,
): FishingSpecialReward | null => {
  if (!fish || fish.id !== LEVIATHAN_COMMON_ROD_BONUS_CONFIG.fishId) return null;

  const requiredRod = findRodDefinitionById(LEVIATHAN_COMMON_ROD_BONUS_CONFIG.requiredRodId);
  const bonusRod = findRodDefinitionById(LEVIATHAN_COMMON_ROD_BONUS_CONFIG.bonusRodId);
  if (!requiredRod || !bonusRod || bonusRod.level <= requiredRod.level) return null;
  if (activeRodLevel !== requiredRod.level) return null;

  const safeOwnedRodLevel = Number.isInteger(ownedRodLevel) ? Math.max(0, ownedRodLevel) : 0;
  const duplicateCompensationMon = normalizeMonAmount(
    LEVIATHAN_COMMON_ROD_BONUS_CONFIG.duplicateCompensationMon,
  );
  const alreadyOwnsBonusRod = safeOwnedRodLevel >= bonusRod.level;

  if (alreadyOwnsBonusRod && duplicateCompensationMon <= 0) return null;

  return {
    sourceRef: createAchievementSourceRef(),
    reason: 'leviathan_common_rod_bonus',
    type: alreadyOwnsBonusRod ? 'mon_compensation' : 'rod',
    fishId: fish.id,
    fishName: fish.name,
    requiredRodId: requiredRod.id,
    requiredRodLevel: requiredRod.level,
    requiredRodName: requiredRod.name,
    bonusRodId: bonusRod.id,
    bonusRodLevel: bonusRod.level,
    bonusRodName: bonusRod.name,
    bonusRodRarity: bonusRod.rarity,
    compensationMon: alreadyOwnsBonusRod ? duplicateCompensationMon : undefined,
  };
};
