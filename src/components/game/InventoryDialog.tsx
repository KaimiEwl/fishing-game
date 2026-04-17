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
          className="group/inv relative inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-[#f4cf75]/65 px-3.5 py-2 text-cyan-50 shadow-[0_16px_32px_rgba(0,0,0,0.42)] transition-all hover:scale-[1.03] hover:border-[#ffd88a] hover:brightness-105 active:scale-95 sm:min-h-14 sm:min-w-[9rem] sm:px-4.5"
          style={{
            background: 'linear-gradient(180deg, rgba(24,93,174,0.96), rgba(9,33,78,0.96))',
          }}
        >
          <span className="absolute inset-[1px] rounded-[13px] bg-[linear-gradient(180deg,rgba(56,189,248,0.18),rgba(5,16,38,0.08))]" aria-hidden="true" />
          <span className="absolute inset-x-2 top-[2px] h-[38%] rounded-full bg-white/12 blur-[2px]" aria-hidden="true" />
          <Backpack className="relative h-[18px] w-[18px] drop-shadow-md sm:h-5 sm:w-5" />
          <span className="relative text-sm font-black tracking-normal text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">Inventory</span>
          {totalFish > 0 && (
            <span className="absolute -right-2 -top-2 min-w-[22px] rounded-full bg-[#ffd86c] px-2 py-0.5 text-center text-xs font-bold leading-tight text-black shadow-lg ring-2 ring-black/55">
              {totalFish}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-1rem)] max-w-[calc(100vw-1rem)] border border-cyan-300/15 bg-black/95 text-zinc-100 shadow-2xl backdrop-blur-md sm:max-w-md">
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

          <TabsContent value="fish" className="mt-4">
            <ScrollArea className="h-[min(250px,35vh)] pr-4">
              {inventoryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <FishIcon fishId="carp" className="mb-4 h-12 w-12 opacity-70" />
                  <p className="text-zinc-400">Inventory is empty</p>
                  <p className="mt-1 text-sm text-zinc-500">
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

                      {isEquipped ? (
                        <span className="inline-flex whitespace-nowrap rounded-lg border border-cyan-300/20 bg-zinc-950 px-3 py-1.5 text-sm font-bold text-cyan-100">
                          <Check className="h-4 w-4" /> Equipped
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => onEquipRod(level)}
                          className="rounded-lg border border-cyan-300/25 bg-zinc-950 px-5 font-bold text-cyan-100 shadow-sm hover:bg-black"
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
    <div className="group flex flex-wrap items-center gap-3 overflow-hidden rounded-xl border border-zinc-800 bg-black p-3 shadow-sm transition-all hover:border-cyan-300/20 hover:bg-zinc-950 hover:shadow-md sm:flex-nowrap">
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
        <p className="truncate text-xs text-zinc-500">{fish.description}</p>
      </div>

      <div className="flex w-full shrink-0 items-end justify-between gap-2 text-right sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-4">
        <div className="flex flex-col items-end">
          <span className="mb-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-sm font-bold text-zinc-100">x{quantity}</span>
          <span className="flex items-center gap-1 text-xs font-semibold text-zinc-500 drop-shadow-sm">Total: {totalValue} <CoinIcon size={12} /></span>
        </div>
        <Button
          size="sm"
          onClick={onSell}
          className="flex min-h-10 items-center gap-1.5 rounded-lg border border-emerald-300/25 bg-zinc-950 px-4 font-bold text-emerald-100 shadow hover:bg-black"
        >
          Sell (+{fish.price})
        </Button>
      </div>
    </div>
  );
};

export default InventoryDialog;
