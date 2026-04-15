import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import CoinIcon from './CoinIcon';

const WelcomeScreen: React.FC = () => {
  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center">
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, hsl(200, 70%, 25%) 0%, hsl(220, 50%, 18%) 40%, hsl(258, 40%, 15%) 100%)',
        }}
      />

      <div className="absolute bottom-0 left-0 right-0 h-1/3 opacity-30">
        <div 
          className="w-full h-full animate-wave"
          style={{
            background: 'linear-gradient(0deg, hsl(var(--lake-deep)) 0%, transparent 100%)',
          }}
        />
      </div>

      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-shimmer"
          style={{
            width: `${4 + i * 2}px`,
            height: `${4 + i * 2}px`,
            background: 'hsl(var(--primary) / 0.4)',
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${2 + i * 0.5}s`,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        <div className="mb-8">
          <span className="text-7xl mb-4 block drop-shadow-lg">🎣</span>
          <h1 
            className="text-5xl font-bold bg-clip-text text-transparent mb-2"
            style={{
              backgroundImage: 'linear-gradient(135deg, hsl(var(--primary)), hsl(180, 70%, 55%))',
            }}
          >
            MonadFish
          </h1>
          <p className="text-muted-foreground text-lg font-medium tracking-wide">
            Blockchain Fishing on Monad
          </p>
        </div>

        <div 
          className="rounded-2xl p-6 mb-8 backdrop-blur-md border border-primary/10"
          style={{
            background: 'hsl(var(--card) / 0.15)',
          }}
        >
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">🐟</span>
              <span className="text-xs text-muted-foreground">7 fish species</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CoinIcon size={28} />
              <span className="text-xs text-muted-foreground">Trading</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">⬆️</span>
              <span className="text-xs text-muted-foreground">Upgrades</span>
            </div>
          </div>
          <p className="text-sm text-foreground/70 leading-relaxed">
            Catch fish, sell your haul, upgrade your rod, and level up. 
            Connect your wallet — and your progress will be saved on-chain.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="px-8 py-4 rounded-xl font-bold text-lg text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(270, 80%, 55%))',
                  boxShadow: '0 4px 20px hsl(var(--primary) / 0.4)',
                }}
              >
                🔗 Connect Wallet
              </button>
            )}
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
