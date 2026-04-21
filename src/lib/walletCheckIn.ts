export const WALLET_CHECK_IN_RECEIVER_ADDRESS = '0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D' as const;
export const WALLET_CHECK_IN_AMOUNT_MON = '0.0001' as const;

export const formatStreakDays = (days: number) => `${days} day${days === 1 ? '' : 's'}`;
