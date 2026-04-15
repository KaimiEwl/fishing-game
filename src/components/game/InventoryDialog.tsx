import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CaughtFish, FISH_DATA, RARITY_COLORS, RARITY_NAMES } from '@/types/game';
import CoinIcon from './CoinIcon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { publicAsset } from '@/lib/assets';
import { Backpack, Check, ShipWheel } from 'lucide-react';
import FishIcon from './FishIcon';

const ROD_INFO = [
  { name: 'Starter', image: publicAsset('assets/rod_basic.png'), color: '#aaa', bonus: 0 },
  { name: 'Bamboo', image: publicAsset('assets/rod_bamboo.png'), color: '#22aa44', bonus: 5 },
  { name: 'Carbon', image: publicAsset('assets/rod_carbon.png'), color: '#2255cc', bonus: 10 },
  { name: 'Pro', image: publicAsset('assets/rod_pro.png'), color: '#9944ff', bonus: 15 },
  { name: 'Legendary', image: publicAsset('assets/rod_legendary.png'), color: '#ffcc00', bonus: 25 },
];

interface InventoryDialogProps {
  inventory: CaughtFish[];
  rodLevel: number;
  equippedRod: number;
  nftRods: number[];
  onEquipRod: (level: number) => void;
  onSellFish: (fishId: string) => void;
}

const InventoryDialog: React.FC<InventoryDialogProps> = ({ inventory, rodLevel, equippedRod, nftRods, onEquipRod, onSellFish }) => {
  const totalFish = inventory.reduce((sum, f) => sum + f.quantity, 0);

  const inventoryItems = inventory.map(item => {
    const fishData = FISH_DATA.find(f => f.id === item.fishId);
    return { ...item, fish: fishData };
  }).filter(item => item.fish);

  const rarityOrder = ['secret', 'mythical', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
  inventoryItems.sort((a, b) => {
    const aIndex = rarityOrder.indexOf(a.fish!.rarity);
    const bIndex = rarityOrder.indexOf(b.fish!.rarity);
    return aIndex - bIndex;
  });

  const ownedRods = Array.from({ length: rodLevel + 1 }, (_, i) => i);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          aria-label={`Open inventory, ${totalFish} fish`}
          className="group/inv relative inline-flex h-14 min-w-14 items-center justify-center gap-2.5 rounded-xl border border-violet-400/30 px-4 text-white shadow-[0_0_20px_rgba(139,92,246,0.25)] backdrop-blur-md transition-all hover:scale-105 hover:shadow-[0_0_28px_rgba(139,92,246,0.4)] active:scale-95 sm:h-14 sm:min-w-[8.25rem] sm:rounded-lg sm:border-white/15 sm:shadow-lg sm:hover:shadow-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.55), rgba(59,7,100,0.65))',
          }}
        >
          <Backpack className="h-6 w-6 sm:h-6 sm:w-6 drop-shadow-md" />
          <span className="text-sm font-bold sm:inline">Inventory</span>
          {totalFish > 0 && (
            <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs font-bold min-w-[22px] text-center leading-tight shadow-lg ring-2 ring-black/30">
              {totalFish}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-md max-h-[calc(100svh-1rem)] bg-card/95 backdrop-blur-md border-2 border-primary/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Backpack className="h-5 w-5 text-primary" />
            Inventory
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="fish" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fish" className="gap-1.5"><FishIcon fishId="carp" className="h-4 w-4" /> Fish ({totalFish})</TabsTrigger>
            <TabsTrigger value="rods" className="gap-1.5"><ShipWheel className="h-4 w-4" /> Rods ({ownedRods.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="fish" className="mt-4">
            <ScrollArea className="h-[min(250px,35vh)] pr-4">
              {inventoryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <FishIcon fishId="carp" className="mb-4 h-12 w-12 opacity-70" />
                  <p className="text-muted-foreground">Inventory is empty</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cast your rod to catch some fish!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inventoryItems.map((item) => (
                    <InventoryItem
                      key={item.fishId}
                      fishId={item.fishId}
                      fish={item.fish!}
                      quantity={item.quantity}
                      onSell={() => onSellFish(item.fishId)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="rods" className="mt-4">
            <ScrollArea className="h-[min(250px,35vh)] pr-2">
              <div className="space-y-2">
                {ownedRods.map((level) => {
                  const rod = ROD_INFO[level];
                  const isEquipped = equippedRod === level;
                  const hasNft = nftRods.includes(level);

                  return (
                    <div
                      key={level}
                      className={`flex items-center gap-4 p-3 rounded-xl border shadow-sm transition-all ${
                        isEquipped
                          ? 'bg-primary/10 border-primary bg-gradient-to-r from-primary/10 to-transparent'
                          : 'bg-card border-border/50 hover:bg-accent hover:border-accent'
                      }`}
                    >
                      <div className={`w-14 h-14 shrink-0 rounded-xl flex items-center justify-center overflow-visible bg-black/20 relative ${hasNft ? 'ring-2 ring-yellow-500' : ''}`}>
                        <img src={rod.image} alt={rod.name} className="h-12 object-contain drop-shadow-md hover:scale-110 transition-transform" />
                        {hasNft && (
                          <div className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-black text-[8px] font-bold px-1.5 rounded-sm shadow-sm border border-yellow-300">
                            NFT
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base flex items-center gap-2">
                          {rod.name}
                          {hasNft && <span className="text-yellow-500 text-xs shadow-sm">✨</span>}
                        </div>
                        <div className="text-sm font-medium text-muted-foreground mt-0.5">
                          {rod.bonus > 0 ? `+${rod.bonus}% legendary chance` : 'Standard rod'}
                        </div>
                      </div>

                      {isEquipped ? (
                        <span className="text-primary font-bold text-sm whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10">
                          <Check className="h-4 w-4" /> Equipped
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => onEquipRod(level)}
                          className="bg-primary/90 hover:bg-primary font-bold px-5 rounded-lg shadow-sm"
                        >
                          Equip
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

interface InventoryItemProps {
  fishId: string;
  fish: typeof FISH_DATA[0];
  quantity: number;
  onSell: () => void;
}

const InventoryItem: React.FC<InventoryItemProps> = ({ fish, quantity, onSell }) => {
  const totalValue = fish.price * quantity;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all overflow-hidden group">
      <div
        className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center overflow-visible shadow-inner"
        style={{
          background: `linear-gradient(135deg, ${RARITY_COLORS[fish.rarity]}30, ${RARITY_COLORS[fish.rarity]}10)`,
          border: `1px solid ${RARITY_COLORS[fish.rarity]}40`
        }}
      >
        <FishIcon fish={fish} className="h-12 w-12 drop-shadow-md group-hover:scale-110 transition-transform" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-sm truncate drop-shadow-sm" style={{ color: RARITY_COLORS[fish.rarity] }}>{fish.name}</span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider backdrop-blur-sm"
            style={{
              backgroundColor: `${RARITY_COLORS[fish.rarity]}20`,
              color: RARITY_COLORS[fish.rarity]
            }}
          >
            {RARITY_NAMES[fish.rarity]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{fish.description}</p>
      </div>

      <div className="text-right flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 shrink-0">
        <div className="flex flex-col items-end">
          <span className="font-bold text-sm bg-muted/50 px-2 py-0.5 rounded-md mb-1">x{quantity}</span>
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 drop-shadow-sm">Total: {totalValue} <CoinIcon size={12} /></span>
        </div>
        <Button
          size="sm"
          onClick={onSell}
          className="bg-green-500 hover:bg-green-600 shadow text-white font-bold px-4 rounded-lg flex items-center gap-1.5"
        >
          Sell (+{fish.price})
        </Button>
      </div>
    </div>
  );
};

export default InventoryDialog;
