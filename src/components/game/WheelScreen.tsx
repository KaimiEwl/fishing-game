import React, { useEffect, useMemo, useState } from 'react';
import { Flame, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WHEEL_PRIZES, type WheelPrize } from '@/types/game';
import { pickWheelPrize } from '@/hooks/useGameProgress';
import CoinIcon from './CoinIcon';
import GameScreenShell from './GameScreenShell';
import { publicAsset } from '@/lib/assets';

interface WheelScreenProps {
  coins: number;
  ready: boolean;
  tasksComplete: boolean;
  spun: boolean;
  prize: WheelPrize | null;
  onSpin: (prize: WheelPrize) => WheelPrize | null;
  onOpenTasks: () => void;
}

const WHEEL_SECTOR_COLORS = [
  '#22d3ee',
  '#a78bfa',
  '#facc15',
  '#34d399',
  '#fb7185',
  '#60a5fa',
  '#f472b6',
  '#a3e635',
  '#f8fafc',
];

const SEGMENT_DEGREES = 360 / WHEEL_PRIZES.length;
const SPIN_DURATION_MS = 1800;

const WheelScreen: React.FC<WheelScreenProps> = ({ coins, ready, tasksComplete, spun, prize, onSpin, onOpenTasks }) => {
  const [spinning, setSpinning] = useState(false);
  const [displayPrize, setDisplayPrize] = useState<WheelPrize | null>(prize);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!spinning) setDisplayPrize(prize);
  }, [prize, spinning]);

  const wheelGradient = useMemo(() => {
    const stops = WHEEL_PRIZES.map((_, index) => {
      const start = index * SEGMENT_DEGREES;
      const end = (index + 1) * SEGMENT_DEGREES;
      return `${WHEEL_SECTOR_COLORS[index]} ${start}deg ${end}deg`;
    }).join(', ');
    return `conic-gradient(from 0deg, ${stops})`;
  }, []);

  const handleSpin = () => {
    if (!tasksComplete) {
      onOpenTasks();
      return;
    }
    if (!ready || spinning || spun) return;
    const plannedPrize = pickWheelPrize();
    const prizeIndex = WHEEL_PRIZES.findIndex((item) => item.id === plannedPrize.id);
    const segmentCenter = (prizeIndex * SEGMENT_DEGREES) + (SEGMENT_DEGREES / 2);
    const nextRotation = Math.ceil(rotation / 360) * 360 + (360 * 5) - segmentCenter;

    setSpinning(true);
    setDisplayPrize(null);
    setRotation(nextRotation);

    window.setTimeout(() => {
      const result = onSpin(plannedPrize);
      setDisplayPrize(result);
      setSpinning(false);
    }, SPIN_DURATION_MS);
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
          <div
            className={`absolute inset-0 rounded-full transition-[filter,box-shadow,transform] ease-out ${ready ? 'shadow-[0_0_80px_rgba(34,211,238,0.38)] brightness-110' : 'shadow-[0_0_45px_rgba(0,0,0,0.65)] grayscale-[0.35]'}`}
            style={{
              background: wheelGradient,
              transform: `rotate(${rotation}deg)`,
              transitionDuration: `${SPIN_DURATION_MS}ms`,
            }}
          >
            <div className="absolute inset-0 rounded-full border-[10px] border-black/55 ring-1 ring-cyan-100/20" />
            <div className="absolute inset-5 rounded-full border-4 border-black/35 bg-black/35 backdrop-blur-[1px]" />
            <div className="absolute inset-10 rounded-full">
              {WHEEL_PRIZES.map((item, index) => (
                <div
                  key={item.id}
                  className="absolute left-1/2 top-1/2 origin-left text-[10px] font-black text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.55)] sm:text-xs"
                  style={{ transform: `rotate(${index * SEGMENT_DEGREES + SEGMENT_DEGREES / 2}deg) translateX(52px) rotate(90deg)` }}
                >
                  {item.secret ? 'SECRET' : item.coins.toLocaleString()}
                </div>
              ))}
            </div>
          </div>
          <div className="absolute left-1/2 top-0 z-10 h-9 w-6 -translate-x-1/2 rounded-b bg-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.65)]" />
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
