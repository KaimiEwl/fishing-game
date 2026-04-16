import React from 'react';
import { publicAsset } from '@/lib/assets';
import FishIcon from './FishIcon';

interface GameLoadingScreenProps {
  visible: boolean;
}

const GameLoadingScreen: React.FC<GameLoadingScreenProps> = ({ visible }) => {
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
        <div className="relative h-40 w-48">
          <div className="absolute inset-x-8 bottom-1 h-5 rounded-full bg-black/35 blur-sm" />
          <img
            src={publicAsset('assets/pepe_final.png')}
            alt="MonadFish loading mascot"
            className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)] animate-float"
            draggable={false}
          />
          <FishIcon fishId="goldfish" className="absolute -right-2 top-8 h-12 w-12 animate-pulse" />
        </div>

        <h1 className="mt-5 text-3xl font-black tracking-tight">MonadFish</h1>
        <p className="mt-2 text-sm font-medium text-white/65">Loading the lake...</p>

        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-zinc-900">
          <div className="h-full w-1/2 animate-[shimmer_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-zinc-800 via-cyan-300 to-zinc-700" />
        </div>
      </div>
    </div>
  );
};

export default GameLoadingScreen;
