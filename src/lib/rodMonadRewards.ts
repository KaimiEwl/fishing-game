import {
  ROD_DATA,
  type FishingMonadReward,
  type RodDefinition,
} from '@/types/game';
import { normalizeMonAmount } from '@/lib/monRewards';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const createRewardSourceRef = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `rod-cast:${crypto.randomUUID()}`;
  }

  return `rod-cast:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
};

export const getSafeRodDefinition = (level: number | null | undefined): RodDefinition => {
  if (!Number.isInteger(level)) return ROD_DATA[0];
  return ROD_DATA.find((rod) => rod.level === level) ?? ROD_DATA[0];
};

export const getSafeEquippedRodLevel = (
  equippedRod: number | null | undefined,
  ownedRodLevel: number | null | undefined,
) => {
  const ownedLevel = Number.isInteger(ownedRodLevel) ? Math.max(0, ownedRodLevel as number) : 0;
  const equippedLevel = Number.isInteger(equippedRod) ? equippedRod as number : 0;
  const rod = getSafeRodDefinition(equippedLevel);

  if (equippedLevel < 0 || equippedLevel > ownedLevel || rod.level !== equippedLevel) {
    return 0;
  }

  return equippedLevel;
};

export const rollRodMonadReward = (
  rodLevel: number | null | undefined,
  random: () => number = Math.random,
): FishingMonadReward | null => {
  const rod = getSafeRodDefinition(rodLevel);
  const dropChance = clamp(Number(rod.monadDropChance) || 0, 0, 100);
  const minReward = Math.max(0, Number(rod.monadMinReward) || 0);
  const maxReward = Math.max(minReward, Number(rod.monadMaxReward) || 0);

  if (dropChance <= 0 || maxReward <= 0) return null;
  if (random() * 100 >= dropChance) return null;

  const amount = normalizeMonAmount(minReward + random() * (maxReward - minReward));
  if (amount <= 0) return null;

  return {
    sourceRef: createRewardSourceRef(),
    amount,
    rodId: rod.id,
    rodLevel: rod.level,
    rodName: rod.name,
    rarity: rod.rarity,
    dropChance,
    minReward,
    maxReward,
  };
};
