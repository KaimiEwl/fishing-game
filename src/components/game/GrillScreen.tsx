import React, { useEffect, useRef, useState } from 'react';
import { ChefHat, Flame, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FISH_DATA, GRILL_RECIPES, type CaughtFish, type GrillRecipe } from '@/types/game';
import GameScreenShell from './GameScreenShell';
import FishIcon from './FishIcon';
import { publicAsset } from '@/lib/assets';
import grillForegroundSrc from '@/assets/grill-foreground.png';

interface GrillScreenProps {
  coins: number;
  inventory: CaughtFish[];
  grillScore: number;
  onCook: (recipe: GrillRecipe) => boolean;
}

const COOKING_ANIMATION_MS = 1650;
const COOKING_RESULT_MS = 2300;

const inventoryCount = (inventory: CaughtFish[], fishId: string) => (
  inventory.find((item) => item.fishId === fishId)?.quantity ?? 0
);

const GrillScreen: React.FC<GrillScreenProps> = ({ coins, inventory, grillScore, onCook }) => {
  const [cookPhase, setCookPhase] = useState<'idle' | 'cooking' | 'result'>('idle');
  const [activeRecipe, setActiveRecipe] = useState<GrillRecipe | null>(null);
  const [cookProgress, setCookProgress] = useState(0);
  const cookingTimerRef = useRef<number | null>(null);
  const resultTimerRef = useRef<number | null>(null);
  const cookingLocked = cookPhase !== 'idle';

  useEffect(() => () => {
    if (cookingTimerRef.current) window.clearTimeout(cookingTimerRef.current);
    if (resultTimerRef.current) window.clearTimeout(resultTimerRef.current);
  }, []);

  const startCooking = (recipe: GrillRecipe) => {
    if (cookingLocked) return;

    if (cookingTimerRef.current) window.clearTimeout(cookingTimerRef.current);
    if (resultTimerRef.current) window.clearTimeout(resultTimerRef.current);

    setActiveRecipe(recipe);
    setCookPhase('cooking');
    setCookProgress(0);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setCookProgress(100));
    });

    cookingTimerRef.current = window.setTimeout(() => {
      const cooked = onCook(recipe);
      if (!cooked) {
        setCookPhase('idle');
        setActiveRecipe(null);
        setCookProgress(0);
        return;
      }

      setCookPhase('result');
      setCookProgress(0);
      resultTimerRef.current = window.setTimeout(() => {
        setCookPhase('idle');
        setActiveRecipe(null);
      }, COOKING_RESULT_MS);
    }, COOKING_ANIMATION_MS);
  };

  return (
    <GameScreenShell
      title="Grill"
      subtitle="Cook fish into dishes. Score goes to the leaderboard and dishes stay in your inventory."
      coins={coins}
      backgroundImage={publicAsset('assets/bg_grill.jpg')}
      contentScrollable
    >
      <div className="relative flex flex-col gap-4 pb-8 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        {cookPhase !== 'idle' && activeRecipe && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/62 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-amber-300/25 bg-black/82 p-5 text-center shadow-[0_0_45px_rgba(0,0,0,0.5)] backdrop-blur-md">
              {cookPhase === 'cooking' ? (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-300/25 bg-zinc-950 text-amber-200 shadow-[0_0_35px_rgba(251,146,60,0.22)]">
                    <Flame className="h-8 w-8 animate-pulse" />
                  </div>
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-amber-200/80">Cooking</p>
                  <h3 className="mt-2 text-2xl font-black text-white">{activeRecipe.name}</h3>
                  <p className="mt-2 text-sm font-semibold text-zinc-300">
                    The grill is firing up. Your dish is almost ready.
                  </p>
                  <div className="mt-5 overflow-hidden rounded-full border border-amber-300/18 bg-zinc-950">
                    <div
                      className="h-3 rounded-full bg-[linear-gradient(90deg,#f59e0b,#fb7185,#facc15)] transition-[width] ease-linear"
                      style={{ width: `${cookProgress}%`, transitionDuration: `${COOKING_ANIMATION_MS}ms` }}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-3 text-amber-200/85">
                    <Flame className="h-5 w-5 animate-bounce [animation-delay:-0.2s]" />
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <ChefHat className="h-5 w-5 animate-bounce [animation-delay:-0.1s]" />
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/25 bg-zinc-950 text-cyan-100 shadow-[0_0_35px_rgba(34,211,238,0.22)]">
                    <Trophy className="h-8 w-8" />
                  </div>
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-cyan-100/80">Dish ready</p>
                  <h3 className="mt-2 text-2xl font-black text-white">{activeRecipe.name}</h3>
                  <p className="mt-3 text-4xl font-black text-amber-300">+{activeRecipe.score}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300/80">
                    Grill score added
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <aside className="rounded-lg border border-cyan-300/15 bg-black/60 p-4 backdrop-blur-md">
          <div className="flex flex-col gap-4">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/20 bg-zinc-950 text-cyan-100">
                <Trophy className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-black">{grillScore.toLocaleString()}</h2>
              <p className="mt-1 text-sm text-white/60">total grill score</p>
            </div>
            <div className="pointer-events-none relative -mx-2 flex justify-center overflow-hidden py-1">
              <div className="absolute inset-x-8 bottom-3 h-10 rounded-full bg-orange-500/20 blur-2xl" />
              <img
                src={grillForegroundSrc}
                alt=""
                className="relative max-h-28 w-full max-w-sm object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.65)] sm:max-h-[140px] lg:max-h-48"
                draggable={false}
              />
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
              Stronger fish make stronger dishes. Cooking adds leaderboard score and puts the dish into inventory so you can sell it later for gold.
            </div>
          </div>
        </aside>

        <div className="flex flex-col gap-3 pb-8">
          <div className="grid gap-3">
            {GRILL_RECIPES.map((recipe) => {
              const canCook = Object.entries(recipe.ingredients).every(([fishId, amount]) => (
                inventoryCount(inventory, fishId) >= amount
              ));

              return (
                <article
                  key={recipe.id}
                  className="rounded-lg border border-cyan-300/15 bg-black/60 p-4 backdrop-blur-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-black">{recipe.name}</h2>
                      <p className="mt-1 text-sm text-white/60">{recipe.description}</p>
                    </div>
                    <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-cyan-300/20 bg-zinc-950 px-2 py-1 text-sm font-black text-cyan-100">
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
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs"
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
                    disabled={!canCook || cookingLocked}
                    onClick={() => startCooking(recipe)}
                    className="mt-4 h-10 w-full rounded-lg border border-cyan-300/25 bg-zinc-950 text-cyan-100 hover:bg-black disabled:border-zinc-800 disabled:bg-zinc-950 disabled:text-zinc-600"
                  >
                    <ChefHat className="mr-2 h-4 w-4" />
                    {cookingLocked && activeRecipe?.id === recipe.id ? 'Cooking...' : 'Cook dish'}
                  </Button>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </GameScreenShell>
  );
};

export default GrillScreen;
