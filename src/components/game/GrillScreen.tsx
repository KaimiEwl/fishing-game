import React from 'react';
import { ChefHat, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FISH_DATA, GRILL_RECIPES, type CaughtFish, type GrillRecipe } from '@/types/game';
import GameScreenShell from './GameScreenShell';
import FishIcon from './FishIcon';

interface GrillScreenProps {
  coins: number;
  inventory: CaughtFish[];
  grillScore: number;
  onCook: (recipe: GrillRecipe) => void;
}

const inventoryCount = (inventory: CaughtFish[], fishId: string) => (
  inventory.find((item) => item.fishId === fishId)?.quantity ?? 0
);

const GrillScreen: React.FC<GrillScreenProps> = ({ coins, inventory, grillScore, onCook }) => {
  return (
    <GameScreenShell
      title="Monad Grill"
      subtitle="Cook fish into dishes. Grill score becomes the leaderboard score."
      coins={coins}
    >
      <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-lg border border-amber-300/20 bg-black/35 p-4 backdrop-blur-md">
          <div className="flex h-full flex-col justify-between gap-4">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-amber-400 text-black">
                <Trophy className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-black">{grillScore.toLocaleString()}</h2>
              <p className="mt-1 text-sm text-white/60">total grill score</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/65">
              Stronger fish make stronger dishes. Wallet leaderboard sync comes next with Supabase.
            </div>
          </div>
        </aside>

        <ScrollArea className="min-h-0 pr-2">
          <div className="grid gap-3">
            {GRILL_RECIPES.map((recipe) => {
              const canCook = Object.entries(recipe.ingredients).every(([fishId, amount]) => (
                inventoryCount(inventory, fishId) >= amount
              ));

              return (
                <article
                  key={recipe.id}
                  className="rounded-lg border border-white/10 bg-black/35 p-4 backdrop-blur-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-black">{recipe.name}</h2>
                      <p className="mt-1 text-sm text-white/60">{recipe.description}</p>
                    </div>
                    <div className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-violet-500/20 px-2 py-1 text-sm font-black text-violet-100">
                      <Trophy className="h-4 w-4" />
                      {recipe.score}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(recipe.ingredients).map(([fishId, amount]) => {
                      const fish = FISH_DATA.find((item) => item.id === fishId);
                      const owned = inventoryCount(inventory, fishId);
                      if (!fish) return null;

                      return (
                        <div
                          key={fishId}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs"
                        >
                          <FishIcon fish={fish} size="sm" />
                          <span>{fish.name}</span>
                          <span className={owned >= amount ? 'text-emerald-300' : 'text-red-300'}>
                            {owned}/{amount}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    type="button"
                    disabled={!canCook}
                    onClick={() => onCook(recipe)}
                    className="mt-4 h-10 w-full rounded-lg bg-amber-400 text-black hover:bg-amber-300 disabled:bg-white/10 disabled:text-white/35"
                  >
                    <ChefHat className="mr-2 h-4 w-4" />
                    Cook dish
                  </Button>
                </article>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </GameScreenShell>
  );
};

export default GrillScreen;
