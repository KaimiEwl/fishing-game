import { createPublicClient, http, parseEther, type Hex } from 'viem';
import type { WalletCheckInSummary } from '@/types/game';
import { monadMainnet } from '@/lib/wagmi';

export const WALLET_CHECK_IN_RECEIVER_ADDRESS = '0x0266Bd01196B04a7A57372Fc9fB2F34374E6327D' as const;
export const WALLET_CHECK_IN_AMOUNT_MON = '0.0001' as const;
export const WALLET_CHECK_IN_REPEAT_TEST_MODE = false as const;
const WALLET_CHECK_IN_STORAGE_KEY = 'hook_loot_wallet_check_in_v1';

const walletCheckInClient = createPublicClient({
  chain: monadMainnet,
  transport: http(monadMainnet.rpcUrls.default.http[0]),
});

export const formatStreakDays = (days: number) => `${days} day${days === 1 ? '' : 's'}`;

const toLocalDayKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayKey = (today = new Date()) => {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return toLocalDayKey(yesterday);
};

const getStorageKey = (walletAddress: string) => (
  `${WALLET_CHECK_IN_STORAGE_KEY}:${walletAddress.toLowerCase()}`
);

const buildSummary = (
  partial: Partial<WalletCheckInSummary> = {},
  source: WalletCheckInSummary['source'] = 'local',
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

export const loadLocalWalletCheckInSummary = (walletAddress: string | null | undefined): WalletCheckInSummary | null => {
  if (!walletAddress) return null;

  try {
    const raw = localStorage.getItem(getStorageKey(walletAddress));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<WalletCheckInSummary>;
    const summary = buildSummary(parsed, 'local');
    const todayKey = toLocalDayKey(new Date());
    const yesterdayKey = getYesterdayKey();

    if (summary.lastCheckInDate === todayKey) {
      return {
        ...summary,
        todayCheckedIn: true,
      };
    }

    if (summary.lastCheckInDate === yesterdayKey) {
      return {
        ...summary,
        todayCheckedIn: false,
      };
    }

    return {
      ...summary,
      todayCheckedIn: false,
      streakDays: 0,
    };
  } catch {
    return null;
  }
};

const storeLocalWalletCheckInSummary = (walletAddress: string, summary: WalletCheckInSummary) => {
  localStorage.setItem(getStorageKey(walletAddress), JSON.stringify(summary));
};

export async function verifyLocalWalletCheckInTransaction({
  walletAddress,
  txHash,
  receiverAddress = WALLET_CHECK_IN_RECEIVER_ADDRESS,
  amountMon = WALLET_CHECK_IN_AMOUNT_MON,
}: {
  walletAddress: string;
  txHash: string;
  receiverAddress?: string;
  amountMon?: string;
}): Promise<WalletCheckInSummary> {
  const normalizedWallet = walletAddress.toLowerCase();
  const expectedReceiver = receiverAddress.toLowerCase();
  const expectedValue = parseEther(amountMon);
  const existingSummary = loadLocalWalletCheckInSummary(normalizedWallet);
  const todayKey = toLocalDayKey(new Date());
  const yesterdayKey = getYesterdayKey();

  if (
    existingSummary?.todayCheckedIn
    && existingSummary.lastCheckInTxHash?.toLowerCase() === txHash.toLowerCase()
  ) {
    return existingSummary;
  }

  let receipt;
  try {
    receipt = await walletCheckInClient.getTransactionReceipt({ hash: txHash as Hex });
  } catch {
    throw new Error('Transaction is not confirmed yet. Please try again in a minute.');
  }

  if (receipt.status !== 'success') {
    throw new Error('Transaction has not been confirmed successfully yet.');
  }

  const transaction = await walletCheckInClient.getTransaction({ hash: txHash as Hex });
  if (!transaction.to) {
    throw new Error('This transaction does not have a valid recipient.');
  }

  if (transaction.from.toLowerCase() !== normalizedWallet) {
    throw new Error('This check-in transaction was sent from another wallet.');
  }

  if (transaction.to.toLowerCase() !== expectedReceiver) {
    throw new Error('This transaction was sent to the wrong wallet.');
  }

  if (transaction.value < expectedValue) {
    throw new Error(`The check-in must send at least ${amountMon} MON.`);
  }

  const block = await walletCheckInClient.getBlock({ blockHash: receipt.blockHash });
  const checkedInAt = new Date(Number(block.timestamp) * 1000);
  const checkedInDate = toLocalDayKey(checkedInAt);

  if (checkedInDate !== todayKey) {
    throw new Error('This transaction was not sent today.');
  }

  const streakDays = existingSummary?.lastCheckInDate === todayKey
    ? Math.max(existingSummary.streakDays, 1)
    : existingSummary?.lastCheckInDate === yesterdayKey
      ? existingSummary.streakDays + 1
      : 1;

  const summary = buildSummary({
    todayCheckedIn: true,
    streakDays,
    lastCheckInAt: checkedInAt.toISOString(),
    lastCheckInDate: checkedInDate,
    lastCheckInTxHash: txHash,
    receiverAddress,
    amountMon,
  }, 'local');

  storeLocalWalletCheckInSummary(normalizedWallet, summary);
  return summary;
}
