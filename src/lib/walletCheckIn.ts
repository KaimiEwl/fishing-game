import type { WalletCheckInSummary } from '@/types/game';

const readFlag = (value: string | undefined, fallback: boolean) => {
  if (value == null || value.trim() === '') return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

export const WALLET_CHECK_IN_RECEIVER_ADDRESS = '0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D' as const;
export const WALLET_CHECK_IN_AMOUNT_MON = '0.0001' as const;
export const WALLET_CHECK_IN_REPEAT_TEST_MODE = readFlag(
  import.meta.env.VITE_WALLET_CHECK_IN_REPEAT_TEST_MODE,
  false,
);

export const formatStreakDays = (days: number) => `${days} day${days === 1 ? '' : 's'}`;

const buildSummary = (
  partial: Partial<WalletCheckInSummary> = {},
  source: WalletCheckInSummary['source'] = 'server',
): WalletCheckInSummary => ({
  todayCheckedIn: false,
  repeatTestMode: WALLET_CHECK_IN_REPEAT_TEST_MODE,
  streakDays: 0,
  lastCheckInAt: null,
  lastCheckInDate: null,
  lastCheckInTxHash: null,
  receiverAddress: WALLET_CHECK_IN_RECEIVER_ADDRESS,
  amountMon: WALLET_CHECK_IN_AMOUNT_MON,
  source,
  ...partial,
});

export const getDefaultWalletCheckInSummary = () => buildSummary();

export const normalizeWalletCheckInSummary = (
  summary: WalletCheckInSummary | null | undefined,
  source: WalletCheckInSummary['source'] = 'server',
): WalletCheckInSummary => {
  if (!summary) return buildSummary({}, source);
  return buildSummary(summary, source);
};
