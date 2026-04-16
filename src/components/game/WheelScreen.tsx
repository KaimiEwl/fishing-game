import React, { useState } from 'react';
import { Flame, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WHEEL_PRIZES, type WheelPrize } from '@/types/game';
import CoinIcon from './CoinIcon';
import GameScreenShell from './GameScreenShell';
import { publicAsset } from '@/lib/assets';

interface WheelScreenProps {
  coins: number;
  ready: boolean;
  tasksComplete: boolean;
  spun: boolean;
  prize: WheelPrize | null;
  onSpin: () => WheelPrize | null;
  onOpenTasks: () => void;
}

const WheelScreen: React.FC<WheelScreenProps> = ({ coins, ready, tasksComplete, spun, prize, onSpin, onOpenTasks }) => {
  const [spinning, setSpinning] = useState(false);
  const [displayPrize, setDisplayPrize] = useState<WheelPrize | null>(prize);

  const handleSpin = () => {
    if (!tasksComplete) {
      onOpenTasks();
      return;
    }
    if (!ready || spinning || spun) return;
    setSpinning(true);
    window.setTimeout(() => {
      const result = onSpin();
      setDisplayPrize(result);
      setSpinning(false);
    }, 1100);
  };

  return (
    <GameScreenShell
      title="Daily Wheel"
      subtitle="Complete daily tasks, spin once, and chase the secret prize."
      coins={coins}
      backgroundImage={publicAsset('assets/bg_wheel.jpg')}
    >
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-5">
        <div className="relative h-64 w-64 sm:h-80 sm:w-80">
          <div className={`absolute inset-0 rounded-full bg-[conic-gradient(#020617_0_40deg,#083344_40deg_80deg,#111827_80deg_120deg,#0f172a_120deg_160deg,#164e63_160deg_200deg,#030712_200deg_240deg,#155e75_240deg_280deg,#18181b_280deg_320deg,#000000_320deg_360deg)] transition-all ${ready ? 'shadow-[0_0_80px_rgba(34,211,238,0.38)] brightness-110' : 'shadow-[0_0_45px_rgba(0,0,0,0.65)] grayscale-[0.2]'}`} />
          <div className="absolute inset-5 rounded-full border-4 border-black/35 bg-black/45 backdrop-blur-sm" />
          <div className="absolute left-1/2 top-0 h-8 w-5 -translate-x-1/2 rounded-b bg-cyan-100" />
          <div className={`absolute inset-10 rounded-full border border-cyan-300/15 ${spinning ? 'animate-spin' : ''}`}>
            {WHEEL_PRIZES.map((item, index) => (
              <div
                key={item.id}
                className="absolute left-1/2 top-1/2 origin-left text-[10px] font-black text-white"
                style={{ transform: `rotate(${index * 40}deg) translateX(52px)` }}
              >
                {item.secret ? 'SECRET' : item.coins}
              </div>
            ))}
          </div>
          <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/20 bg-black text-cyan-100 shadow-xl">
            {spun ? <Sparkles className="h-9 w-9" /> : ready ? <Sparkles className="h-9 w-9 text-cyan-100" /> : <Flame className="h-9 w-9" />}
          </div>
        </div>

        <Button
          type="button"
          disabled={(tasksComplete && (!ready || spun)) || spinning}
          onClick={handleSpin}
          className="h-12 min-w-56 rounded-lg border border-cyan-300/25 bg-zinc-950 px-6 text-base font-black text-cyan-100 hover:bg-black disabled:border-zinc-800 disabled:bg-zinc-950 disabled:text-zinc-600"
        >
          {!tasksComplete ? (
            <>
              <Lock className="mr-2 h-5 w-5" />
              Complete daily tasks
            </>
          ) : ready ? (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              {spinning ? 'Spinning...' : 'Spin'}
            </>
          ) : spun ? (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Today spin complete
            </>
          ) : (
            <>
              <Lock className="mr-2 h-5 w-5" />
              Wheel locked
            </>
          )}
        </Button>

        {(displayPrize || prize) && (
          <div className="rounded-lg border border-cyan-300/20 bg-black/70 px-5 py-3 text-center backdrop-blur-md">
            <p className="text-sm text-zinc-500">Today prize</p>
            <p className="mt-1 flex items-center justify-center gap-2 text-xl font-black text-cyan-100">
              {(displayPrize || prize)?.secret ? <Sparkles className="h-5 w-5" /> : <CoinIcon size={18} />}
              {(displayPrize || prize)?.label}
            </p>
          </div>
        )}
      </div>
    </GameScreenShell>
  );
};

export default WheelScreen;
