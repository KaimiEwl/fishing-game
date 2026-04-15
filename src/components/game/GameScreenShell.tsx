import React from 'react';
import CoinIcon from './CoinIcon';

interface GameScreenShellProps {
  title: string;
  subtitle: string;
  coins?: number;
  children: React.ReactNode;
}

const GameScreenShell: React.FC<GameScreenShellProps> = ({ title, subtitle, coins, children }) => {
  return (
    <section className="absolute inset-0 overflow-hidden bg-[#080914] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,255,0.26),transparent_34%),linear-gradient(180deg,#10102c_0%,#080914_48%,#05070d_100%)]" />
      <div className="relative z-10 flex h-full flex-col px-3 pb-24 pt-3 sm:px-6 sm:pb-28 sm:pt-5">
        <header className="mx-auto flex w-full max-w-5xl items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-normal sm:text-4xl">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/65 sm:text-base">{subtitle}</p>
          </div>
          {typeof coins === 'number' && (
            <div className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-amber-300/25 bg-black/40 px-3 text-sm font-bold text-amber-100 backdrop-blur-md">
              <CoinIcon size={16} />
              {coins.toLocaleString()}
            </div>
          )}
        </header>

        <div className="mx-auto mt-4 min-h-0 w-full max-w-5xl flex-1 overflow-hidden sm:mt-6">
          {children}
        </div>
      </div>
    </section>
  );
};

export default GameScreenShell;
