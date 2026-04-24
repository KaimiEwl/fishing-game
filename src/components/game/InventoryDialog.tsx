import React from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BookOpen, ChefHat, Backpack, CheckCircle2, Lock, ShipWheel, X } from 'lucide-react';
import { ALBUM_FIRST_CATCH_BONUSES } from '@/lib/baitEconomy';
import { COLLECTION_BOOK_PAGES, ensureCollectionBook } from '@/lib/collectionBook';
import { CaughtFish, FISH_DATA, GRILL_RECIPES, type CollectionBookState, type CookedDishStack } from '@/types/game';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FishIcon from './FishIcon';
import InventoryDialogTrigger from '@/components/InventoryDialogTrigger';
import InventoryFishItem from '@/components/InventoryFishItem';
import InventoryRodCard from '@/components/InventoryRodCard';
import InventoryDishItem from '@/components/InventoryDishItem';
import { publicAsset } from '@/lib/assets';

interface InventoryDialogProps {
  inventory: CaughtFish[];
  cookedDishes: CookedDishStack[];
  collectionBook?: CollectionBookState | null;
  rodLevel: number;
  equippedRod: number;
  nftRods: number[];
  onEquipRod: (level: number) => void;
  onSellFish: (fishId: string) => void;
  onSellCookedDish: (recipeId: string) => void;
  triggerVariant?: 'panel' | 'shortcut';
  collectionBookEnabled?: boolean;
}

const InventoryDialog: React.FC<InventoryDialogProps> = ({
  inventory,
  cookedDishes,
  collectionBook,
  rodLevel,
  equippedRod,
  nftRods,
  onEquipRod,
  onSellFish,
  onSellCookedDish,
  triggerVariant = 'panel',
  collectionBookEnabled = true,
}) => {
  const totalFish = inventory.reduce((sum, f) => sum + f.quantity, 0);
  const totalDishes = cookedDishes.reduce((sum, item) => sum + item.quantity, 0);
  const totalItems = totalFish + totalDishes;
  const normalizedCollectionBook = ensureCollectionBook(collectionBook);
  const collectionSpecies = FISH_DATA.map((fish) => ({
    fish,
    state: normalizedCollectionBook.species[fish.id],
    firstCatchBonus: ALBUM_FIRST_CATCH_BONUSES[fish.id as keyof typeof ALBUM_FIRST_CATCH_BONUSES] ?? 0,
  }));
  const completedPages = normalizedCollectionBook.pages.filter((page) => page.completed).length;
  const showCollectionTab = collectionBookEnabled;
  const tabsColumnClass = showCollectionTab ? 'grid-cols-4' : 'grid-cols-3';

  const inventoryItems = inventory.map(item => {
    const fishData = FISH_DATA.find(f => f.id === item.fishId);
    return { ...item, fish: fishData };
  }).filter(item => item.fish);

  const cookedDishItems = cookedDishes.map((item) => {
    const recipe = GRILL_RECIPES.find((entry) => entry.id === item.recipeId);
    return { ...item, recipe };
  }).filter((item) => item.recipe);

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
        <button aria-label={`Open inventory, ${totalItems} items`} className="bg-transparent p-0">
          <InventoryDialogTrigger totalFish={totalItems} variant={triggerVariant} />
        </button>
      </DialogTrigger>
      <DialogContent
        className="h-[min(90svh,46rem)] w-[min(72rem,calc(100vw-0.75rem))] max-w-none overflow-hidden border-0 bg-transparent p-0 text-[#f0d09b] shadow-[0_32px_80px_rgba(0,0,0,0.72)]"
        style={{
          backgroundImage: `url(${publicAsset('assets/inventory_board_reference.webp')})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            <Backpack className="h-5 w-5 text-cyan-100" />
            Inventory
          </DialogTitle>
        </DialogHeader>

        <div className="relative z-10 flex h-full min-h-0 flex-col px-[7.5%] pb-[8.8%] pt-[18.5%] sm:px-[17.2%] sm:pb-[9.4%] sm:pt-[18.8%]">
        <DialogClose asChild>
          <button
            type="button"
            aria-label="Close inventory"
            className="absolute right-[2.5%] top-[7%] inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#b9884c]/80 bg-[rgba(24,14,8,0.88)] text-[#f6ddb0] shadow-[0_10px_22px_rgba(0,0,0,0.4)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#e7c17a]/80 focus:ring-offset-0 sm:right-[10.6%] sm:top-[7.3%] sm:h-11 sm:w-11"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogClose>
        <Tabs defaultValue="fish" className="flex h-full min-h-0 w-full flex-col">
          <TabsList className={`grid h-auto w-full ${tabsColumnClass} gap-1 rounded-[1.1rem] border border-[#8f6a38]/70 bg-[rgba(16,11,8,0.86)] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md sm:gap-1.5 sm:rounded-[1.35rem] sm:p-1.5`}>
            <TabsTrigger value="fish" className="h-9 gap-1 rounded-[0.8rem] px-1.5 text-[0.62rem] font-black uppercase tracking-[0.02em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:h-10 sm:rounded-[0.95rem] sm:px-2 sm:text-[0.78rem]"><FishIcon fishId="carp" size="badge" /> Fish ({totalFish})</TabsTrigger>
            <TabsTrigger value="dishes" className="h-9 gap-1 rounded-[0.8rem] px-1.5 text-[0.62rem] font-black uppercase tracking-[0.02em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:h-10 sm:rounded-[0.95rem] sm:px-2 sm:text-[0.78rem]"><ChefHat className="h-4 w-4" /> Grill Stuff ({totalDishes})</TabsTrigger>
            {showCollectionTab && (
              <TabsTrigger value="album" className="h-9 gap-1 rounded-[0.8rem] px-1.5 text-[0.62rem] font-black uppercase tracking-[0.02em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:h-10 sm:rounded-[0.95rem] sm:px-2 sm:text-[0.78rem]"><BookOpen className="h-4 w-4" /> Achievements</TabsTrigger>
            )}
            <TabsTrigger value="rods" className="h-9 gap-1 rounded-[0.8rem] px-1.5 text-[0.62rem] font-black uppercase tracking-[0.02em] text-[#ead4aa] data-[state=active]:border data-[state=active]:border-[#b6884b] data-[state=active]:bg-[rgba(48,31,14,0.92)] data-[state=active]:text-[#f8dfab] sm:h-10 sm:rounded-[0.95rem] sm:px-2 sm:text-[0.78rem]"><ShipWheel className="h-4 w-4" /> Rods ({ownedRods.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="fish" className="mt-3 min-h-0 min-w-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-2">
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

          <TabsContent value="dishes" className="mt-3 min-h-0 min-w-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-2">
              {cookedDishItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10">
                    <ChefHat className="h-8 w-8 text-amber-100" />
                  </div>
                  <p className="text-zinc-400">No grill stuff yet</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Your cooked grill stuff will show up here for selling later.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {cookedDishItems.map((item) => (
                    <InventoryDishItem
                      key={item.recipeId}
                      recipe={item.recipe!}
                      quantity={item.quantity}
                      onSell={() => onSellCookedDish(item.recipeId)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {showCollectionTab && (
            <TabsContent value="album" className="mt-3 min-h-0 min-w-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-2">
                <div className="space-y-3 pr-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200/80">Achievements found</p>
                      <p className="mt-1 text-2xl font-black text-white">
                        {normalizedCollectionBook.totalSpeciesCaught} / {FISH_DATA.length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/80">Achievement pages</p>
                      <p className="mt-1 text-2xl font-black text-white">
                        {completedPages} / {COLLECTION_BOOK_PAGES.length}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {COLLECTION_BOOK_PAGES.map((page) => {
                      const pageState = normalizedCollectionBook.pages.find((item) => item.pageId === page.id);
                      const discoveredCount = page.fishIds.filter((fishId) => normalizedCollectionBook.species[fishId]?.discovered).length;

                      return (
                        <div key={page.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-white">{page.title}</p>
                              <p className="mt-1 text-xs text-zinc-400">{page.description}</p>
                            </div>
                            {pageState?.completed ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Complete
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-black px-2 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                {discoveredCount}/{page.fishIds.length}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {collectionSpecies.map(({ fish, state, firstCatchBonus }) => (
                      <article
                        key={fish.id}
                        className={`rounded-xl border p-3 ${state.discovered ? 'border-emerald-300/20 bg-black' : 'border-zinc-800 bg-zinc-950/70'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={state.discovered ? '' : 'opacity-35'}>
                            <FishIcon fishId={fish.id} size="lg" tone={state.discovered ? 'default' : 'muted'} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`truncate text-sm font-black ${state.discovered ? 'text-white' : 'text-zinc-400'}`}>
                                {state.discovered ? fish.name : 'Unknown species'}
                              </p>
                              {state.discovered ? (
                                <span className="rounded-full bg-emerald-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
                                  x{state.catches}
                                </span>
                              ) : (
                                <Lock className="h-4 w-4 text-zinc-500" />
                              )}
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                              {state.discovered ? fish.description : `First catch bonus: +${firstCatchBonus} coins`}
                            </p>
                            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/80">
                              First catch +{firstCatchBonus} coins
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          <TabsContent value="rods" className="mt-3 min-h-0 min-w-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryDialog;
