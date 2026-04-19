import React from 'react';
import { publicAsset } from '@/lib/assets';
import GameTitleBanner from '@/components/GameTitleBanner';

interface GameLoadingScreenProps {
  visible: boolean;
  progress?: number;
}

const GameLoadingScreen: React.FC<GameLoadingScreenProps> = ({ visible, progress = 0 }) => {
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress * 100)));

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#070914] text-white transition-opacity duration-300 ${
        visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(139,92,246,0.28),transparent_34%),linear-gradient(180deg,#0b0d28_0%,#071f2e_58%,#041018_100%)]" />
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-[linear-gradient(180deg,transparent,rgba(0,132,165,0.32))]" />

      <div className="relative flex w-full max-w-sm flex-col items-center px-6 text-center">
        <div className="relative h-52 w-full max-w-[18rem] overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_22px_60px_rgba(0,0,0,0.38)]">
          <img
            src={publicAsset('assets/loading_art_v3.jpg')}
            alt="Hook and Loot loading art"
            className="h-full w-full object-cover object-center"
            draggable={false}
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#040913] via-[#040913]/76 to-transparent" />
        </div>

        <GameTitleBanner className="mt-5 w-full max-w-[16rem]" />
        <p className="mt-2 text-sm font-medium text-white/65">
          {normalizedProgress >= 100 ? 'Ready to cast...' : 'Preparing the water...'}
        </p>

        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-zinc-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-zinc-800 via-cyan-300 to-zinc-700 transition-[width] duration-200 ease-out"
            style={{ width: `${Math.max(10, normalizedProgress)}%` }}
          />
        </div>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/75">
          {normalizedProgress}%
        </p>
      </div>
    </div>
  );
};

export default GameLoadingScreen;
