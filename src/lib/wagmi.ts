import { getDefaultConfig, type Wallet } from '@rainbow-me/rainbowkit';
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConnector } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { defineChain, type EIP1193Provider } from 'viem';

export const monadMainnet = defineChain({
  id: 143,
  name: 'Monad Mainnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monadscan',
      url: 'https://monadscan.com',
    },
  },
  testnet: false,
});

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'd3019a92452f9a108f2b4012f4abb1ed';

type BrowserEthereumProvider = EIP1193Provider & {
  isMetaMask?: true;
  isBraveWallet?: true;
  providers?: BrowserEthereumProvider[];
};

type EthereumWindow = Window & {
  ethereum?: BrowserEthereumProvider;
};

const getMetaMaskProvider = (targetWindow?: Window) => {
  const ethereum = (targetWindow as EthereumWindow | undefined)?.ethereum;
  if (!ethereum) return undefined;

  return ethereum.providers?.find((provider) => provider.isMetaMask && !provider.isBraveWallet)
    ?? (ethereum.isMetaMask && !ethereum.isBraveWallet ? ethereum : undefined)
    ?? ethereum;
};

const metaMaskExtensionWallet = (
  options: Parameters<typeof metaMaskWallet>[0],
): Wallet => {
  const wallet = metaMaskWallet(options);

  return {
    ...wallet,
    id: 'metaMask',
    name: 'MetaMask',
    installed: typeof window !== 'undefined' && Boolean(getMetaMaskProvider(window)) ? true : undefined,
    mobile: undefined,
    qrCode: undefined,
    createConnector: (walletDetails) => createConnector((config) => ({
      ...injected({
        target: () => ({
          id: walletDetails.rkDetails.id,
          name: walletDetails.rkDetails.name,
          provider: (targetWindow?: Window) => getMetaMaskProvider(targetWindow),
        }),
        unstable_shimAsyncInject: 1_000,
      })(config),
      ...walletDetails,
    })),
  };
};

export const wagmiConfig = getDefaultConfig({
  appName: 'MonadFish',
  projectId,
  chains: [monadMainnet],
  wallets: [
    {
      groupName: 'Browser',
      wallets: [
        metaMaskExtensionWallet,
        injectedWallet,
        rabbyWallet,
      ],
    },
    {
      groupName: 'Other',
      wallets: [
        rainbowWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
});
