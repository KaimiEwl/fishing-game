import type { PlayerState } from '@/types/game';

const readFlag = (value: string | undefined, fallback: boolean) => {
  if (value == null || value.trim() === '') return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

export const DAILY_FREE_BAIT = 30;
export const WALLET_CONNECT_BAIT_BONUS = 10;
export const REFERRAL_BAIT_BONUS = 10;
export const MAX_REWARDED_REFERRALS_PER_INVITER = 10;
export const MAX_EXTRA_BAIT_FROM_DAILIES_PER_DAY = 0;
export const TARGET_PAID_BAIT_RTP = 0.32;

export const BAIT_BUCKETS_V2_ENABLED = readFlag(import.meta.env.VITE_BAIT_BUCKETS_V2_ENABLED, true);
export const WALLET_BAIT_BONUS_ENABLED = readFlag(import.meta.env.VITE_WALLET_BAIT_BONUS_ENABLED, true);
export const REFERRAL_BAIT_ENABLED = readFlag(import.meta.env.VITE_REFERRAL_BAIT_ENABLED, true);
export const LEGACY_DAILY_BONUS_DISABLED = readFlag(import.meta.env.VITE_LEGACY_DAILY_BONUS_DISABLED, true);

export const BAIT_PACKAGES = [
  { amount: 5, cost: 400, label: 'Small bait pack' },
  { amount: 10, cost: 800, label: 'Double bait pack' },
  { amount: 25, cost: 2000, label: 'Big bait pack' },
  { amount: 50, cost: 4000, label: 'Bulk bait box' },
] as const;

export const getVisibleBaitTotal = (player: Pick<PlayerState, 'bait' | 'dailyFreeBait'>) => (
  player.bait + (BAIT_BUCKETS_V2_ENABLED ? player.dailyFreeBait : 0)
);
