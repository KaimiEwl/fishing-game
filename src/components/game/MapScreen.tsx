import React, { useState } from 'react';
import {
  ArrowLeft,
  Lock,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import mapTreasureVaultSrc from '@/assets/map_treasure_vault_cutout.png';
import mapSkullCoveSrc from '@/assets/map_skull_cove_cutout.png';
import mapCoralCastleSrc from '@/assets/map_coral_castle_cutout.png';
import mapVolcanoGrillSrc from '@/assets/map_volcano_grill_cutout.png';
import mapIslandMarketSrc from '@/assets/map_island_market_cutout.png';
import mapWheelPierSrc from '@/assets/map_wheel_pier_cutout.png';
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
    image: mapTreasureVaultSrc,
  },
  {
    id: 'skull',
    title: 'Skull Cove',
    hint: 'Locked',
    image: mapSkullCoveSrc,
  },
  {
    id: 'castle',
    title: 'Coral Castle',
    hint: 'Locked',
    image: mapCoralCastleSrc,
  },
  {
    id: 'barbecue',
    title: 'Volcano Grill',
    hint: 'Locked',
    image: mapVolcanoGrillSrc,
  },
  {
    id: 'market',
    title: 'Island Market',
    hint: 'Locked',
    image: mapIslandMarketSrc,
  },
  {
    id: 'carnival',
    title: 'Wheel Pier',
    hint: 'Locked',
    image: mapWheelPierSrc,
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

          <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-4 gap-y-6 px-4 pb-24 pt-24 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-8 sm:px-8 sm:pt-28 lg:gap-x-10">
            {locations.map((location) => {
              const isActive = activeLocation === location.id;

              return (
                <div key={location.id} className="flex justify-center">
                  <button
                    type="button"
                    className={cn(
                      'group relative inline-flex min-w-0 overflow-visible bg-transparent text-left outline-none transition-all duration-200',
                      'drop-shadow-[0_12px_24px_rgba(0,0,0,0.38)] hover:scale-[1.03] focus-visible:scale-[1.03]',
                      isActive ? 'scale-[1.03] shadow-[0_0_38px_rgba(250,204,21,0.38)]' : '',
                    )}
                    onMouseEnter={() => setActiveLocation(location.id)}
                    onMouseLeave={() => setActiveLocation(null)}
                    onFocus={() => setActiveLocation(location.id)}
                    onBlur={() => setActiveLocation(null)}
                    onTouchStart={() => setActiveLocation(location.id)}
                    onTouchEnd={() => window.setTimeout(() => setActiveLocation(null), 500)}
                    aria-label={`${location.title}, locked`}
                  >
                    <img
                      src={location.image}
                      alt=""
                      className={cn(
                        'block h-auto w-[14rem] max-w-full transition-all duration-200 sm:w-[15.25rem]',
                        location.id === 'barbecue' ? '-translate-y-1 sm:w-[15.75rem]' : '',
                        isActive ? 'grayscale-0 saturate-125' : 'grayscale saturate-50 brightness-75 group-hover:grayscale-0 group-hover:saturate-125 group-hover:brightness-100 group-focus-visible:grayscale-0 group-focus-visible:saturate-125 group-focus-visible:brightness-100 group-active:grayscale-0 group-active:saturate-125 group-active:brightness-100',
                      )}
                    />
                    <span className="absolute left-1/2 top-1/2 inline-flex h-10 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-black/35 bg-zinc-200/95 shadow-[0_8px_18px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-105 group-active:scale-95 sm:h-12 sm:w-14">
                      <Lock className="h-5 w-5 text-zinc-900 sm:h-6 sm:w-6" />
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-xs font-bold text-cyan-50 shadow-xl backdrop-blur-md">
            <MapPin className="h-4 w-4 text-cyan-200" />
            More islands unlock later
          </div>
        </div>
      </div>
    </GameScreenShell>
  );
};

export default MapScreen;
