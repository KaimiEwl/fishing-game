import React, { useState } from 'react';
import {
  ArrowLeft,
  Castle,
  Flame,
  FerrisWheel,
  Landmark,
  Lock,
  MapPin,
  Ship,
  Skull,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import GameScreenShell from './GameScreenShell';

interface MapScreenProps {
  coins: number;
  onBack: () => void;
}

const locations = [
  {
    id: 'vault',
    title: 'Treasure Vault',
    hint: 'Locked',
    x: '15%',
    y: '34%',
    w: '18%',
    h: '22%',
    icon: Landmark,
    color: 'from-cyan-300 via-emerald-300 to-lime-200',
  },
  {
    id: 'skull',
    title: 'Skull Cove',
    hint: 'Locked',
    x: '42%',
    y: '22%',
    w: '19%',
    h: '24%',
    icon: Skull,
    color: 'from-amber-200 via-orange-300 to-red-300',
  },
  {
    id: 'castle',
    title: 'Coral Castle',
    hint: 'Locked',
    x: '72%',
    y: '27%',
    w: '19%',
    h: '24%',
    icon: Castle,
    color: 'from-pink-300 via-fuchsia-300 to-cyan-200',
  },
  {
    id: 'barbecue',
    title: 'Volcano Grill',
    hint: 'Locked',
    x: '16%',
    y: '61%',
    w: '18%',
    h: '22%',
    icon: Flame,
    color: 'from-yellow-200 via-orange-400 to-red-500',
  },
  {
    id: 'market',
    title: 'Island Market',
    hint: 'Locked',
    x: '45%',
    y: '54%',
    w: '18%',
    h: '22%',
    icon: Store,
    color: 'from-teal-200 via-cyan-300 to-blue-300',
  },
  {
    id: 'carnival',
    title: 'Wheel Pier',
    hint: 'Locked',
    x: '72%',
    y: '64%',
    w: '20%',
    h: '22%',
    icon: FerrisWheel,
    color: 'from-rose-300 via-yellow-200 to-sky-300',
  },
  {
    id: 'ship',
    title: 'Ghost Ship',
    hint: 'Locked',
    x: '53%',
    y: '37%',
    w: '14%',
    h: '16%',
    icon: Ship,
    color: 'from-slate-100 via-cyan-200 to-indigo-300',
  },
] as const;

const MapScreen: React.FC<MapScreenProps> = ({ coins, onBack }) => {
  const [activeLocation, setActiveLocation] = useState<string | null>(null);

  return (
    <GameScreenShell
      title="Travel Map"
      subtitle="Locked islands are coming soon. Hover or tap a place to preview it."
      coins={coins}
      contentScrollable
    >
      <div className="flex min-h-full flex-col gap-3">
        <Button
          type="button"
          onClick={onBack}
          className="h-11 w-fit rounded-lg border border-cyan-300/25 bg-black/85 px-4 font-bold text-cyan-100 shadow-lg shadow-black/30 hover:bg-zinc-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to lake
        </Button>

        <div className="relative min-h-[34rem] overflow-hidden rounded-lg border border-cyan-300/20 bg-[#07131f] shadow-[0_24px_70px_rgba(0,0,0,0.55)] sm:min-h-[38rem]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b2f4a_0%,#0aa6c8_42%,#064b72_100%)]" />
          <div className="absolute inset-0 opacity-55 bg-[radial-gradient(circle_at_22%_30%,rgba(250,204,21,0.42),transparent_14%),radial-gradient(circle_at_78%_30%,rgba(236,72,153,0.34),transparent_16%),radial-gradient(circle_at_50%_56%,rgba(52,211,153,0.32),transparent_18%),radial-gradient(circle_at_25%_75%,rgba(248,113,113,0.36),transparent_15%),radial-gradient(circle_at_78%_74%,rgba(56,189,248,0.34),transparent_17%)]" />
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.8),transparent_3%),radial-gradient(circle_at_10%_30%,rgba(255,255,255,0.7),transparent_2%),radial-gradient(circle_at_86%_26%,rgba(255,255,255,0.55),transparent_2%)] opacity-70" />

          <div className="absolute left-[5%] top-[8%] h-10 w-[90%] border-t border-dashed border-white/35" />
          <div className="absolute left-[8%] top-[9%] flex gap-5">
            <span className="h-0 w-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-yellow-300" />
            <span className="h-0 w-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-rose-400" />
            <span className="h-0 w-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-cyan-300" />
          </div>
          <div className="absolute right-[8%] top-[9%] flex gap-5">
            <span className="h-0 w-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-orange-300" />
            <span className="h-0 w-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-lime-300" />
            <span className="h-0 w-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-sky-300" />
          </div>

          {locations.map((location) => {
            const Icon = location.icon;
            const isActive = activeLocation === location.id;

            return (
              <button
                key={location.id}
                type="button"
                className={cn(
                  'group absolute rounded-lg border border-white/25 bg-black/10 p-2 text-left outline-none transition-all duration-200',
                  isActive ? 'scale-[1.03] shadow-[0_0_38px_rgba(34,211,238,0.38)]' : 'grayscale hover:grayscale-0 focus-visible:grayscale-0 active:grayscale-0',
                )}
                style={{
                  left: location.x,
                  top: location.y,
                  width: location.w,
                  height: location.h,
                }}
                onMouseEnter={() => setActiveLocation(location.id)}
                onMouseLeave={() => setActiveLocation(null)}
                onFocus={() => setActiveLocation(location.id)}
                onBlur={() => setActiveLocation(null)}
                onTouchStart={() => setActiveLocation(location.id)}
                aria-label={`${location.title}, locked`}
              >
                <span
                  className={cn(
                    'absolute inset-0 rounded-lg bg-gradient-to-br opacity-55 transition-opacity duration-200',
                    location.color,
                    isActive ? 'opacity-90' : 'opacity-35 group-hover:opacity-90 group-focus-visible:opacity-90 group-active:opacity-90',
                  )}
                />
                <span className="absolute inset-x-2 bottom-2 h-3 rounded-full bg-white/70 blur-sm" />
                <span className="relative flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-black/20 bg-white/20 px-1 text-center backdrop-blur-[1px]">
                  <Icon className="h-7 w-7 text-black/70 sm:h-10 sm:w-10" />
                  <span className="max-w-full truncate text-[10px] font-black uppercase tracking-normal text-black sm:text-xs">
                    {location.title}
                  </span>
                  <span className="inline-flex h-9 w-11 items-center justify-center rounded-lg border border-black/25 bg-zinc-200/95 shadow-lg">
                    <Lock className="h-5 w-5 text-zinc-900" />
                  </span>
                </span>
              </button>
            );
          })}

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-xs font-bold text-cyan-50 shadow-xl backdrop-blur-md">
            <MapPin className="h-4 w-4 text-cyan-200" />
            More islands unlock later
          </div>
        </div>
      </div>
    </GameScreenShell>
  );
};

export default MapScreen;
