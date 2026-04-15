import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

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

export const wagmiConfig = getDefaultConfig({
  appName: 'MonadFish',
  projectId,
  chains: [monadMainnet],
});
