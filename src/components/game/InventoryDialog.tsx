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
          className="relative inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-black/55 px-3 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 hover:scale-105 active:scale-95 sm:h-14 sm:min-w-[8.25rem]"
        >
          <Backpack className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="hidden text-sm font-bold sm:inline">Inventory</span>
          {totalFish > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold min-w-[18px] text-center leading-tight">
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
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isEquipped
                          ? 'bg-primary/10 border-primary/40'
                          : 'bg-muted/50 border-border hover:bg-muted/70'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden relative ${hasNft ? 'ring-2 ring-yellow-500' : ''}`}>
                        <img src={rod.image} alt={rod.name} className="h-10 object-contain" />
                        {hasNft && (
                          <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[7px] font-bold px-1 rounded">
                            NFT
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {rod.name}
                          {hasNft && <span className="text-yellow-500 text-xs">✨</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {rod.bonus > 0 ? `+${rod.bonus}% rare fish chance` : 'Standard chance'}
                        </div>
                      </div>

                      {isEquipped ? (
                        <span className="text-primary font-bold text-sm whitespace-nowrap inline-flex items-center gap-1">
                          <Check className="h-4 w-4" /> Equipped
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEquipRod(level)}
                          className="border-primary/30 hover:border-primary/50"
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
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border hover:bg-muted/70 transition-colors overflow-hidden">
      <div
        className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${RARITY_COLORS[fish.rarity]}20, ${RARITY_COLORS[fish.rarity]}40)`,
          border: `2px solid ${RARITY_COLORS[fish.rarity]}50`
        }}
      >
        <FishIcon fish={fish} className="h-8 w-8" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{fish.name}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
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

      <div className="text-right flex items-center gap-2 shrink-0">
        <div>
          <p className="font-bold text-sm">x{quantity}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-0.5"><CoinIcon size={12} /> {totalValue}</p>
        </div>
        <Button
          size="sm"
          onClick={onSell}
          className="bg-green-600 hover:bg-green-700 text-white text-xs px-2"
        >
          <CoinIcon size={12} /> +{fish.price}
        </Button>
      </div>
    </div>
  );
};

export default InventoryDialog;
