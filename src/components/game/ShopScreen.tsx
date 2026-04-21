import React from 'react';
import { Check, Package, ShipWheel, Worm } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROD_BONUSES } from '@/types/game';
import { BAIT_PACKAGES } from '@/lib/baitEconomy';
import { publicAsset } from '@/lib/assets';
import { ROD_DISPLAY_INFO } from '@/lib/rodAssets';
import CoinIcon from './CoinIcon';
import BuyCoinsDialog from './BuyCoinsDialog';
import GameScreenShell from './GameScreenShell';

interface ShopScreenProps {
  coins: number;
  bait: number;
  dailyFreeBait?: number;
  walletAddress?: string;
  rodLevel: number;
  nftRods?: number[];
  onBuyBait: (amount: number, cost: number) => void;
  onBuyRod: (level: number, cost: number) => void;
  onCoinsAdded: (amount: number) => void;
  onNftMinted: (rodLevel: number) => void;
}

const ROD_UPGRADES = [
  { level: 1, cost: 2500, name: 'Bamboo Rod', bonus: 5, image: ROD_DISPLAY_INFO[1].image, bobber: 'Green bobber', bobberColor: '#22aa44' },
  { level: 2, cost: 15000, name: 'Carbon Rod', bonus: 10, image: ROD_DISPLAY_INFO[2].image, bobber: 'Blue bobber', bobberColor: '#2255cc' },
  { level: 3, cost: 60000, name: 'Pro Rod', bonus: 15, image: ROD_DISPLAY_INFO[3].image, bobber: 'Purple bobber', bobberColor: '#9944ff' },
  { level: 4, cost: 250000, name: 'Legendary Rod', bonus: 25, image: ROD_DISPLAY_INFO[4].image, bobber: 'Golden glowing bobber', bobberColor: '#ffcc00' },
];

const ShopScreen: React.FC<ShopScreenProps> = ({
  coins,
  bait,
  dailyFreeBait = 0,
  walletAddress,
  rodLevel,
  nftRods = [],
  onBuyBait,
  onBuyRod,
  onCoinsAdded,
  onNftMinted,
}) => {
  return (
    <GameScreenShell
      title="Shop"
      subtitle="Buy bait, rods, and gold with MON without leaving the app menu."
      coins={coins}
      backgroundImage={publicAsset('assets/bg_shop.jpg')}
    >
      <Tabs defaultValue="bait" className="flex h-full min-h-0 flex-col">
        <TabsList className="grid w-full grid-cols-2 rounded-lg border border-cyan-300/15 bg-black/85 shadow-lg shadow-black/30">
          <TabsTrigger value="bait" className="gap-1.5 rounded-lg text-zinc-200 data-[state=active]:border data-[state=active]:border-cyan-300/25 data-[state=active]:bg-zinc-950 data-[state=active]:text-cyan-50 data-[state=active]:shadow-[0_0_18px_rgba(34,211,238,0.16)]"><Worm className="h-4 w-4" /> Bait</TabsTrigger>
          <TabsTrigger value="rods" className="gap-1.5 rounded-lg text-zinc-200 data-[state=active]:border data-[state=active]:border-cyan-300/25 data-[state=active]:bg-zinc-950 data-[state=active]:text-cyan-50 data-[state=active]:shadow-[0_0_18px_rgba(34,211,238,0.16)]"><ShipWheel className="h-4 w-4" /> Rods</TabsTrigger>
        </TabsList>

        <TabsContent value="bait" className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {walletAddress && (
            <div className="mb-3 rounded-lg border border-cyan-300/20 bg-black/80 p-3 text-sm font-semibold text-cyan-50/85 shadow-lg shadow-black/25">
              <div className="mb-2 text-cyan-100">Buy gold with MON</div>
              <div className="flex justify-start">
                <BuyCoinsDialog
                  walletAddress={walletAddress}
                  onCoinsAdded={onCoinsAdded}
                  rodLevel={rodLevel}
                  nftRods={nftRods}
                  onNftMinted={onNftMinted}
                />
              </div>
            </div>
          )}
          <div className="mb-3 rounded-lg border border-cyan-300/20 bg-black/80 p-3 text-sm font-semibold text-cyan-50/85 shadow-lg shadow-black/25">
            Current bait supply: <span className="font-bold text-cyan-100">{bait}</span>
            {dailyFreeBait > 0 && (
              <span className="mt-1 block text-xs font-medium text-cyan-100/70">
                {dailyFreeBait} daily free + {Math.max(0, bait - dailyFreeBait)} reserve
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {BAIT_PACKAGES.map((pkg) => {
              return (
                <Button
                  key={pkg.amount}
                  variant="outline"
                  className="h-36 flex-col gap-2 rounded-lg border-zinc-800 bg-black/75 text-zinc-100 shadow-lg shadow-black/20 hover:border-cyan-300/25 hover:bg-zinc-950 disabled:text-zinc-600"
                  disabled={coins < pkg.cost}
                  onClick={() => onBuyBait(pkg.amount, pkg.cost)}
                  aria-label={pkg.label}
                >
                  {pkg.amount >= 50 ? (
                    <Package className="h-7 w-7 text-cyan-100" />
                  ) : (
                    <Worm className="h-7 w-7 text-cyan-100" />
                  )}
                  <span className="font-bold">{pkg.amount} bait</span>
                  <span className="flex items-center gap-1 text-amber-200"><CoinIcon size="sm" /> {pkg.cost}</span>
                </Button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="rods" className="mt-4 min-h-0 flex-1">
          <div className="mb-3 rounded-lg border border-cyan-300/20 bg-black/80 p-3 text-sm font-semibold text-cyan-50/85 shadow-lg shadow-black/25">
            Current rod: <span className="font-bold text-cyan-100">
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
                    className={`flex flex-col items-stretch gap-3 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center ${isOwned
                      ? 'border-cyan-300/30 bg-zinc-950 shadow-[0_0_20px_rgba(34,211,238,0.08)]'
                      : canBuy
                        ? 'border-cyan-300/20 bg-zinc-950/88 hover:border-cyan-300/35'
                        : 'border-zinc-800 bg-zinc-950/82'
                    }`}
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/90 shadow-inner">
                      <img src={rod.image} alt={rod.name} className="h-14 w-14 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-zinc-100">{rod.name}</div>
                      <div className="text-xs font-medium text-zinc-300">+{rod.bonus}% rare fish chance</div>
                      <div className="mt-1 text-xs font-semibold" style={{ color: rod.bobberColor }}>{rod.bobber}</div>
                    </div>
                    {isOwned ? (
                      <span className="shrink-0 text-sm font-bold text-cyan-100">
                        <Check className="mr-1 inline h-4 w-4" />
                        Owned
                        {nftRods.includes(rod.level) && <span className="ml-1 text-cyan-100">NFT</span>}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!canBuy}
                        onClick={() => onBuyRod(rod.level, rod.cost)}
                        className="min-h-10 w-full shrink-0 rounded-lg border border-cyan-300/25 bg-zinc-950 text-cyan-100 hover:bg-black disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-300 sm:w-auto"
                      >
                    <CoinIcon size="sm" /> {rod.cost}
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
