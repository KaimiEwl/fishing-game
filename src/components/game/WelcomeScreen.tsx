import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import CoinIcon from './CoinIcon';
import FishIcon from './FishIcon';
import WelcomeBackdrop from '@/components/WelcomeBackdrop';
import WelcomeFeatureItem from '@/components/WelcomeFeatureItem';
import WelcomeConnectCta from '@/components/WelcomeConnectCta';

const WelcomeScreen: React.FC = () => {
  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden">
      <WelcomeBackdrop />

      <div className="relative z-10 flex max-w-lg flex-col items-center px-6 text-center">
        <div className="mb-8">
          <span className="mb-4 block text-7xl drop-shadow-lg">🎣</span>
          <h1 className="mb-2 bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(180,70%,55%))] bg-clip-text text-5xl font-bold text-transparent">
            MonadFish
          </h1>
          <p className="text-lg font-medium tracking-wide text-muted-foreground">
            Blockchain Fishing on Monad
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-primary/10 bg-card/15 p-6 backdrop-blur-md">
          <div className="mb-6 grid grid-cols-3 gap-4">
            <WelcomeFeatureItem icon={<FishIcon fishId="goldfish" size="md" />} label="7 fish species" />
            <WelcomeFeatureItem icon={<CoinIcon size="xl" />} label="Trading" />
            <WelcomeFeatureItem icon={<span className="text-2xl">⬆️</span>} label="Upgrades" />
          </div>
          <p className="text-sm leading-relaxed text-foreground/70">
            Catch fish, sell your haul, upgrade your rod, and level up. Connect your wallet and
            your progress will be saved on-chain.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <ConnectButton.Custom>
            {({ openConnectModal }) => <WelcomeConnectCta onConnect={openConnectModal} />}
          </ConnectButton.Custom>
          <p className="text-xs text-muted-foreground">
            MetaMask • Rabby • WalletConnect • Coinbase
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
