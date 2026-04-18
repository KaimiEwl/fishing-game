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
import { Backpack, Check, ShipWheel } from 'lucide-react';
import FishIcon from './FishIcon';
import { INVENTORY_BUTTON_PANEL_SRC, ROD_DISPLAY_INFO } from '@/lib/rodAssets';
import { cn } from '@/lib/utils';

interface InventoryDialogProps {
  inventory: CaughtFish[];
  rodLevel: number;
  equippedRod: number;
  nftRods: number[];
  onEquipRod: (level: number) => void;
  onSellFish: (fishId: string) => void;
  trigger?: React.ReactNode;
  triggerClassName?: string;
  badgeClassName?: string;
}

const InventoryDialog: React.FC<InventoryDialogProps> = ({
  inventory,
  rodLevel,
  equippedRod,
  nftRods,
  onEquipRod,
  onSellFish,
  trigger,
  triggerClassName,
  badgeClassName,
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
        <button
          aria-label={`Open inventory, ${totalFish} fish`}
          className={cn(
            'group/inv relative inline-flex items-center justify-center bg-transparent p-0 shadow-none transition-transform hover:scale-[1.03] active:scale-95',
            triggerClassName,
          )}
        >
          {trigger ?? (
            <img
              src={INVENTORY_BUTTON_PANEL_SRC}
              alt=""
              aria-hidden="true"
              className="block w-[10.5rem] object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.42)] sm:w-[13.25rem]"
              draggable={false}
            />
          )}
          <span className="sr-only">Inventory</span>
          {totalFish > 0 && (
            <span className={cn(
              'absolute right-1 top-0 min-w-[24px] rounded-full bg-[#ffd86c] px-2 py-0.5 text-center text-xs font-bold leading-tight text-black shadow-lg ring-2 ring-black/55 sm:right-2 sm:top-1',
              badgeClassName,
            )}>
              {totalFish}
            </span>
          )}
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
            <TabsTrigger value="fish" className="gap-1.5 text-zinc-200 data-[state=active]:bg-black data-[state=active]:text-cyan-100"><FishIcon fishId="carp" className="h-4 w-4" /> Fish ({totalFish})</TabsTrigger>
            <TabsTrigger value="rods" className="gap-1.5 text-zinc-200 data-[state=active]:bg-black data-[state=active]:text-cyan-100"><ShipWheel className="h-4 w-4" /> Rods ({ownedRods.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="fish" className="mt-4 min-w-0">
            <ScrollArea className="h-[min(300px,42vh)] pr-2">
              {inventoryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <FishIcon fishId="carp" className="mb-4 h-12 w-12 opacity-70" />
                  <p className="text-zinc-400">Inventory is empty</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Cast your rod to catch some fish!
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
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

          <TabsContent value="rods" className="mt-4 min-w-0">
            <ScrollArea className="h-[min(300px,42vh)] pr-2">
              <div className="space-y-2">
                {ownedRods.map((level) => {
                  const rod = ROD_DISPLAY_INFO[level];
                  const isEquipped = equippedRod === level;
                  const hasNft = nftRods.includes(level);

                  return (
                    <div
                      key={level}
                      className={`grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 rounded-xl border p-3 shadow-sm transition-all ${
                        isEquipped
                          ? 'border-cyan-300/35 bg-zinc-950'
                          : 'border-zinc-800 bg-black hover:border-cyan-300/20 hover:bg-zinc-950'
                      }`}
                    >
                      <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-visible rounded-xl bg-black/60 ${hasNft ? 'ring-2 ring-cyan-300/40' : ''}`}>
                        <img src={rod.image} alt={rod.name} className="h-12 object-contain drop-shadow-md hover:scale-110 transition-transform" />
                        {hasNft && (
                          <div className="absolute -right-1.5 -top-1.5 rounded-sm border border-cyan-300/40 bg-cyan-300 px-1.5 text-[8px] font-bold text-black shadow-sm">
                            NFT
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base flex items-center gap-2">
                          {rod.name}
                          {hasNft && <span className="text-xs text-cyan-100 shadow-sm">NFT</span>}
                        </div>
                        <div className="mt-0.5 text-sm font-medium text-zinc-500">
                          {rod.bonus > 0 ? `+${rod.bonus}% legendary chance` : 'Standard rod'}
                        </div>
                      </div>

                      <div className="col-span-2 flex justify-end border-t border-zinc-800/80 pt-3">
                        {isEquipped ? (
                          <span className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-cyan-300/20 bg-zinc-950 px-3 py-1.5 text-sm font-bold text-cyan-100">
                            <Check className="h-4 w-4" /> Equipped
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => onEquipRod(level)}
                            className="min-h-10 rounded-lg border border-cyan-300/25 bg-zinc-950 px-5 font-bold text-cyan-100 shadow-sm hover:bg-black"
                          >
                            Equip
                          </Button>
                        )}
                      </div>
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
    <div className="group grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 overflow-hidden rounded-xl border border-zinc-800 bg-black p-3 shadow-sm transition-all hover:border-cyan-300/20 hover:bg-zinc-950 hover:shadow-md">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-visible rounded-xl shadow-inner"
        style={{
          background: `linear-gradient(135deg, ${RARITY_COLORS[fish.rarity]}30, ${RARITY_COLORS[fish.rarity]}10)`,
          border: `1px solid ${RARITY_COLORS[fish.rarity]}40`
        }}
      >
        <FishIcon fish={fish} className="h-12 w-12 drop-shadow-md group-hover:scale-110 transition-transform" />
      </div>

      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
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
        <p className="truncate text-xs text-zinc-500">{fish.description}</p>
      </div>

      <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-sm font-bold text-zinc-100">x{quantity}</span>
          <span className="flex items-center gap-1 text-xs font-semibold text-zinc-500 drop-shadow-sm">Total: {totalValue} <CoinIcon size={12} /></span>
        </div>
        <Button
          size="sm"
          onClick={onSell}
          className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-300/25 bg-zinc-950 px-4 font-bold text-emerald-100 shadow hover:bg-black"
        >
          Sell (+{fish.price})
        </Button>
      </div>
    </div>
  );
};

export default InventoryDialog;
