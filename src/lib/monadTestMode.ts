import { parseEther } from 'viem';

const readFlag = (value: string | undefined, fallback: boolean) => {
  if (value == null || value.trim() === '') return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

export const MONAD_SHOP_TEST_MODE_ENABLED = readFlag(
  import.meta.env.VITE_MONAD_SHOP_TEST_MODE_ENABLED,
  import.meta.env.DEV,
);

export const isRealWalletAddress = (value?: string | null): value is `0x${string}` => (
  typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value.trim())
);

export const canUseMonadPaymentIdentity = (value?: string | null) => (
  isRealWalletAddress(value) || (MONAD_SHOP_TEST_MODE_ENABLED && Boolean(value?.trim()))
);

const randomHex = (byteLength: number) => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const createMonadTestTxHash = (purpose: string) => {
  const purposeHash = (Array.from(purpose)
    .reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0)
    .toString(16)
    .padStart(8, '0')
    .slice(-8);

  return `0x${purposeHash}${randomHex(28)}` as `0x${string}`;
};

export const sendMonadPayment = async ({
  sendTransactionAsync,
  receiverAddress,
  monAmount,
  purpose,
}: {
  sendTransactionAsync: (request: { to: `0x${string}`; value: bigint }) => Promise<`0x${string}` | string>;
  receiverAddress: `0x${string}`;
  monAmount: string;
  purpose: string;
}) => {
  if (MONAD_SHOP_TEST_MODE_ENABLED) {
    return createMonadTestTxHash(purpose);
  }

  return sendTransactionAsync({
    to: receiverAddress,
    value: parseEther(monAmount),
  });
};

export const monadPriceLabel = (monAmount: string) => (
  MONAD_SHOP_TEST_MODE_ENABLED ? `TEST ${monAmount} MON` : `${monAmount} MON`
);
