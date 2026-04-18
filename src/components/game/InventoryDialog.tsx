import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CaughtFish, FISH_DATA } from '@/types/game';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Backpack, ShipWheel } from 'lucide-react';
import FishIcon from './FishIcon';
import InventoryDialogTrigger from '@/components/InventoryDialogTrigger';
import InventoryFishItem from '@/components/InventoryFishItem';
import InventoryRodCard from '@/components/InventoryRodCard';

interface InventoryDialogProps {
  inventory: CaughtFish[];
  rodLevel: number;
  equippedRod: number;
  nftRods: number[];
  onEquipRod: (level: number) => void;
  onSellFish: (fishId: string) => void;
  triggerVariant?: 'panel' | 'shortcut';
}

const InventoryDialog: React.FC<InventoryDialogProps> = ({
  inventory,
  rodLevel,
  equippedRod,
  nftRods,
  onEquipRod,
  onSellFish,
  triggerVariant = 'panel',
}) => {
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
        <button aria-label={`Open inventory, ${totalFish} fish`} className="bg-transparent p-0">
          <InventoryDialogTrigger totalFish={totalFish} variant={triggerVariant} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-1rem)] w-[min(36rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-x-hidden border border-cyan-300/15 bg-black/95 text-zinc-100 shadow-2xl backdrop-blur-md sm:max-w-[36rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-zinc-100">
            <Backpack className="h-5 w-5 text-cyan-100" />
            Inventory
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="fish" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-950">
            <TabsTrigger value="fish" className="gap-1.5 text-zinc-200 data-[state=active]:bg-black data-[state=active]:text-cyan-100"><FishIcon fishId="carp" size="badge" /> Fish ({totalFish})</TabsTrigger>
            <TabsTrigger value="rods" className="gap-1.5 text-zinc-200 data-[state=active]:bg-black data-[state=active]:text-cyan-100"><ShipWheel className="h-4 w-4" /> Rods ({ownedRods.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="fish" className="mt-4 min-w-0">
            <ScrollArea className="h-[min(300px,42vh)] pr-2">
              {inventoryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="mb-4">
                    <FishIcon fishId="carp" size="xl" tone="muted" />
                  </div>
                  <p className="text-zinc-400">Inventory is empty</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Cast your rod to catch some fish!
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {inventoryItems.map((item) => (
                    <InventoryFishItem
                      key={item.fishId}
                      fish={item.fish!}
                      quantity={item.quantity}
                      onSell={() => onSellFish(item.fishId)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="rods" className="mt-4 min-w-0">
            <ScrollArea className="h-[min(300px,42vh)] pr-2">
              <div className="space-y-2">
                {ownedRods.map((level) => {
                  const isEquipped = equippedRod === level;
                  const hasNft = nftRods.includes(level);

                  return (
                    <InventoryRodCard
                      key={level}
                      level={level}
                      isEquipped={isEquipped}
                      hasNft={hasNft}
                      onEquip={onEquipRod}
                    />
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

export default InventoryDialog;
