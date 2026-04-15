import React from 'react';
import { Check, Package, ShipWheel, Worm } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROD_BONUSES } from '@/types/game';
import { publicAsset } from '@/lib/assets';
import CoinIcon from './CoinIcon';
import GameScreenShell from './GameScreenShell';

interface ShopScreenProps {
  coins: number;
  bait: number;
  rodLevel: number;
  nftRods?: number[];
  onBuyBait: (amount: number, cost: number) => void;
  onBuyRod: (level: number, cost: number) => void;
}

const BAIT_PACKAGES = [
  { amount: 5, cost: 25, label: 'Small bait pack', icon: Worm },
  { amount: 10, cost: 45, label: 'Double bait pack', icon: Worm },
  { amount: 25, cost: 100, label: 'Big bait pack', icon: Worm },
  { amount: 50, cost: 180, label: 'Bulk bait box', icon: Package },
];

const ROD_UPGRADES = [
  { level: 1, cost: 200, name: 'Bamboo Rod', bonus: 5, image: publicAsset('assets/rod_bamboo.png'), bobber: 'Green bobber', bobberColor: '#22aa44' },
  { level: 2, cost: 500, name: 'Carbon Rod', bonus: 10, image: publicAsset('assets/rod_carbon.png'), bobber: 'Blue bobber', bobberColor: '#2255cc' },
  { level: 3, cost: 1000, name: 'Pro Rod', bonus: 15, image: publicAsset('assets/rod_pro.png'), bobber: 'Purple bobber', bobberColor: '#9944ff' },
  { level: 4, cost: 2500, name: 'Legendary Rod', bonus: 25, image: publicAsset('assets/rod_legendary.png'), bobber: 'Golden glowing bobber', bobberColor: '#ffcc00' },
];

const ShopScreen: React.FC<ShopScreenProps> = ({
  coins,
  bait,
  rodLevel,
  nftRods = [],
  onBuyBait,
  onBuyRod,
}) => {
  return (
    <GameScreenShell
      title="Shop"
      subtitle="Buy bait and rods without leaving the app menu."
      coins={coins}
      backgroundImage={publicAsset('assets/bg_shop.jpg')}
    >
      <Tabs defaultValue="bait" className="flex h-full min-h-0 flex-col">
        <TabsList className="grid w-full grid-cols-2 rounded-lg bg-black/35">
          <TabsTrigger value="bait" className="gap-1.5 rounded-lg"><Worm className="h-4 w-4" /> Bait</TabsTrigger>
          <TabsTrigger value="rods" className="gap-1.5 rounded-lg"><ShipWheel className="h-4 w-4" /> Rods</TabsTrigger>
        </TabsList>

        <TabsContent value="bait" className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <div className="mb-3 rounded-lg border border-white/10 bg-black/35 p-3 text-sm text-white/70">
            Current bait supply: <span className="font-bold text-violet-200">{bait}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {BAIT_PACKAGES.map((pkg) => {
              const BaitIcon = pkg.icon;
              return (
                <Button
                  key={pkg.amount}
                  variant="outline"
                  className="h-36 flex-col gap-2 rounded-lg border-white/10 bg-black/35 text-white hover:border-violet-300/50 hover:bg-white/10"
                  disabled={coins < pkg.cost}
                  onClick={() => onBuyBait(pkg.amount, pkg.cost)}
                  aria-label={pkg.label}
                >
                  <BaitIcon className="h-7 w-7 text-violet-200" />
                  <span className="font-bold">{pkg.amount} bait</span>
                  <span className="flex items-center gap-1 text-amber-200"><CoinIcon size={14} /> {pkg.cost}</span>
                </Button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="rods" className="mt-4 min-h-0 flex-1">
          <div className="mb-3 rounded-lg border border-white/10 bg-black/35 p-3 text-sm text-white/70">
            Current rod: <span className="font-bold text-violet-200">
              {rodLevel === 0 ? 'Starter' : ROD_UPGRADES[rodLevel - 1]?.name}
            </span>
            <span className="ml-2 text-xs">(+{ROD_BONUSES[rodLevel]}% rare chance)</span>
          </div>
          <ScrollArea className="h-[calc(100%-4.25rem)] pr-2">
            <div className="grid gap-3 lg:grid-cols-2">
              {ROD_UPGRADES.map((rod) => {
                const isOwned = rodLevel >= rod.level;
                const canBuy = !isOwned && coins >= rod.cost;

                return (
                  <article
                    key={rod.level}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${isOwned
                      ? 'border-violet-300/30 bg-violet-500/10'
                      : canBuy
                        ? 'border-amber-300/30 bg-black/35 hover:border-amber-300/50'
                        : 'border-white/10 bg-black/25 opacity-60'
                    }`}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
                      <img src={rod.image} alt={rod.name} className="h-12 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold">{rod.name}</div>
                      <div className="text-xs text-white/55">+{rod.bonus}% rare fish chance</div>
                      <div className="mt-1 text-xs" style={{ color: rod.bobberColor }}>{rod.bobber}</div>
                    </div>
                    {isOwned ? (
                      <span className="shrink-0 text-sm font-bold text-violet-200">
                        <Check className="mr-1 inline h-4 w-4" />
                        Owned
                        {nftRods.includes(rod.level) && <span className="ml-1 text-amber-200">NFT</span>}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!canBuy}
                        onClick={() => onBuyRod(rod.level, rod.cost)}
                        className="shrink-0 rounded-lg bg-amber-400 text-black hover:bg-amber-300"
                      >
                        <CoinIcon size={14} /> {rod.cost}
                      </Button>
                    )}
                  </article>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </GameScreenShell>
  );
};

export default ShopScreen;
