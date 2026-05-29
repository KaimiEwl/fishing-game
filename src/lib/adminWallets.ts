import { MON_MARKET_RECEIVER_ADDRESS } from '@/lib/economyConfig';

const normalizeWalletAddress = (value: string | null | undefined) => (
  typeof value === 'string' ? value.trim().toLowerCase() : ''
);

export const SEEDED_ADMIN_WALLETS = [
  MON_MARKET_RECEIVER_ADDRESS,
  '0x31a1abd4bac718c18c37bb05a177500f50d90dd1',
  '0x9d5fe38a8f5421beb292ea180c7371f02cb23574',
  '0x83dcf1a992ed597247eb465d26d8106e07c9df5d',
]
  .map(normalizeWalletAddress)
  .filter(Boolean);

const SEEDED_ADMIN_WALLET_SET = new Set(SEEDED_ADMIN_WALLETS);

export function isSeededAdminWallet(walletAddress: string | null | undefined) {
  const normalizedWallet = normalizeWalletAddress(walletAddress);
  return Boolean(normalizedWallet && SEEDED_ADMIN_WALLET_SET.has(normalizedWallet));
}
