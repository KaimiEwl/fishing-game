import type { WalletCheckInSummary } from '@/types/game';

export const WALLET_CHECK_IN_RECEIVER_ADDRESS = '0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D' as const;
export const WALLET_CHECK_IN_AMOUNT_MON = '0.0001' as const;
export const WALLET_CHECK_IN_REPEAT_TEST_MODE = false as const;

export const formatStreakDays = (days: number) => `${days} day${days === 1 ? '' : 's'}`;

const buildSummary = (
  partial: Partial<WalletCheckInSummary> = {},
  source: WalletCheckInSummary['source'] = 'server',
): WalletCheckInSummary => ({
  todayCheckedIn: false,
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
