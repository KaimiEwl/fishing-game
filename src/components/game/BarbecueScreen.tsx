import React from 'react';
import { ArrowLeft, ChefHat, Flame, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CaughtFish, FISH_DATA, RARITY_COLORS, RARITY_NAMES } from '@/types/game';
import CoinIcon from './CoinIcon';
import FishIcon from './FishIcon';

interface BarbecueScreenProps {
  inventory: CaughtFish[];
  coins: number;
  onBack: () => void;
  onGrillFish: (fishId: string) => void;
}

const BarbecueScreen: React.FC<BarbecueScreenProps> = ({ inventory, coins, onBack, onGrillFish }) => {
  const totalFish = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const grillItems = inventory
    .map((item) => ({ ...item, fish: FISH_DATA.find((fish) => fish.id === item.fishId) }))
    .filter((item) => item.fish);

  return (
    <section className="absolute inset-0 z-10 overflow-hidden bg-[#120f1d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(255,111,49,0.36),transparent_42%),linear-gradient(180deg,#151534_0%,#16111f_45%,#0b0810_100%)]" />
      <div className="absolute bottom-0 left-0 right-0 h-36 bg-[linear-gradient(180deg,transparent,rgba(255,89,36,0.22))]" />

      <div className="relative z-10 flex h-full flex-col p-3 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            className="h-10 rounded-lg border-white/15 bg-black/35 px-3 text-white backdrop-blur-md hover:bg-black/55 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Fishing
          </Button>

          <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-300/20 bg-black/35 px-3 text-sm font-bold text-amber-100 backdrop-blur-md">
            <CoinIcon size="md" />
            {coins}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center py-5 sm:py-8">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-lg border border-amber-300/25 bg-amber-500/15 text-amber-200 shadow-lg">
              <Flame className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold sm:text-4xl">Barbecue</h1>
            <p className="mt-2 text-sm text-white/70 sm:text-base">
              Grill your catch and turn it into coins.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/35 p-3 shadow-2xl backdrop-blur-md sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3 text-sm text-white/75">
              <span className="inline-flex items-center gap-2">
                <Utensils className="h-4 w-4 text-amber-200" />
                Ready to grill
              </span>
              <span>{totalFish} fish</span>
            </div>

            {grillItems.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/5 px-4 text-center">
                <div className="mb-3">
                  <FishIcon fishId="carp" size="xl" tone="muted" />
                </div>
                <p className="font-semibold">No fish on the grill yet</p>
                <p className="mt-1 text-sm text-white/60">Catch something first, then come back here.</p>
              </div>
            ) : (
              <ScrollArea className="h-[min(52vh,420px)] pr-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  {grillItems.map((item) => {
                    const fish = item.fish!;
                    return (
                      <div
                        key={item.fishId}
                        className="flex items-center gap-3 rounded-lg border bg-white/[0.08] p-3 backdrop-blur-sm"
                        style={{ borderColor: RARITY_COLORS[fish.rarity] }}
                      >
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-black/30"
                          style={{ boxShadow: `inset 0 0 0 1px ${RARITY_COLORS[fish.rarity]}` }}
                        >
                          <FishIcon fish={fish} size="xl" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-bold">{fish.name}</p>
                            <span className="rounded bg-black/35 px-1.5 py-0.5 text-[10px]" style={{ color: RARITY_COLORS[fish.rarity] }}>
                              {RARITY_NAMES[fish.rarity]}
                            </span>
                          </div>
                          <p className="text-xs text-white/55">x{item.quantity}</p>
                        </div>

                        <Button
                          type="button"
                          onClick={() => onGrillFish(item.fishId)}
                          className="h-10 shrink-0 rounded-lg bg-amber-500 px-3 text-black hover:bg-amber-400"
                        >
                          <ChefHat className="mr-1.5 h-4 w-4" />
                          <CoinIcon size="sm" /> +{fish.price}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BarbecueScreen;
