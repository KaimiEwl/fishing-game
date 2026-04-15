import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROD_BONUSES } from '@/types/game';
import CoinIcon from './CoinIcon';
import { publicAsset } from '@/lib/assets';
import { Check, Package, ShipWheel, ShoppingBag, Store, Worm } from 'lucide-react';

interface ShopDialogProps {
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

const ShopDialog: React.FC<ShopDialogProps> = ({
  coins,
  bait,
  rodLevel,
  nftRods = [],
  onBuyBait,
  onBuyRod,
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          aria-label="Open shop"
          className="relative inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-lg border border-amber-300/30 bg-black/55 px-3 text-amber-100 shadow-lg backdrop-blur-md transition hover:bg-black/70 hover:scale-105 active:scale-95 sm:h-14 sm:min-w-[8.25rem]"
        >
          <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="hidden text-sm font-bold sm:inline">Shop</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[calc(100svh-1rem)] bg-card/95 backdrop-blur-md border-2 border-amber-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Store className="h-5 w-5 text-amber-500" />
            Shop
            <span className="ml-auto text-base font-normal text-amber-500">
              <CoinIcon size={16} /> {coins} coins
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="bait" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bait" className="gap-1.5"><Worm className="h-4 w-4" /> Bait</TabsTrigger>
            <TabsTrigger value="rods" className="gap-1.5"><ShipWheel className="h-4 w-4" /> Rods</TabsTrigger>
          </TabsList>

          <TabsContent value="bait" className="mt-4">
            <div className="text-sm text-muted-foreground mb-3">
              Current bait supply: <span className="text-primary font-bold">{bait}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {BAIT_PACKAGES.map((pkg) => {
                const BaitIcon = pkg.icon;
                return (
                  <Button
                    key={pkg.amount}
                    variant="outline"
                    className="h-auto flex-col py-4 gap-2 rounded-lg hover:border-primary/50"
                    disabled={coins < pkg.cost}
                    onClick={() => onBuyBait(pkg.amount, pkg.cost)}
                    aria-label={pkg.label}
                  >
                    <BaitIcon className="h-6 w-6 text-primary" />
                    <span className="font-bold">{pkg.amount} bait</span>
                    <span className="text-amber-500 flex items-center gap-1"><CoinIcon size={14} /> {pkg.cost}</span>
                  </Button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="rods" className="mt-4">
            <div className="text-sm text-muted-foreground mb-3">
              Current rod: <span className="text-primary font-bold">
                {rodLevel === 0 ? 'Starter' : ROD_UPGRADES[rodLevel - 1]?.name}
              </span>
              <span className="ml-2 text-xs">(+{ROD_BONUSES[rodLevel]}% rare chance)</span>
            </div>
            <ScrollArea className="h-[min(220px,35vh)] pr-2">
              <div className="space-y-3">
                {ROD_UPGRADES.map((rod) => {
                  const isOwned = rodLevel >= rod.level;
                  const canBuy = !isOwned && coins >= rod.cost;

                  return (
                    <div
                      key={rod.level}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isOwned
                        ? 'bg-primary/10 border-primary/30'
                        : canBuy
                          ? 'bg-muted/50 border-amber-500/30 hover:border-amber-500/50'
                          : 'bg-muted/30 border-border opacity-60'
                        }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        <img src={rod.image} alt={rod.name} className="h-10 object-contain" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{rod.name}</div>
                        <div className="text-xs text-muted-foreground">
                          +{rod.bonus}% rare fish chance
                        </div>
                        <div className="text-xs mt-1" style={{ color: rod.bobberColor }}>
                          {rod.bobber}
                        </div>
                      </div>
                      {isOwned ? (
                        <span className="text-primary font-bold text-sm flex items-center gap-1">
                          <Check className="h-4 w-4" /> Owned
                          {nftRods.includes(rod.level) && <span className="text-yellow-500 text-xs">NFT</span>}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!canBuy}
                          onClick={() => onBuyRod(rod.level, rod.cost)}
                          className="bg-amber-500 hover:bg-amber-600 text-black"
                        >
                          <CoinIcon size={14} /> {rod.cost}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ShopDialog;
