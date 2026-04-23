import React, { useEffect, useRef, useState } from 'react';
import { ChefHat, Flame, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FISH_DATA, GRILL_RECIPES, type CaughtFish, type GrillRecipe } from '@/types/game';
import GameScreenShell from './GameScreenShell';
import FishIcon from './FishIcon';
import { publicAsset } from '@/lib/assets';
import QuestBoard, { QuestBoardCard } from './QuestBoard';

interface GrillScreenProps {
  inventory: CaughtFish[];
  onCook: (recipe: GrillRecipe) => Promise<boolean> | boolean;
  onCookStartSound?: () => void;
}

const COOKING_ANIMATION_MS = 1650;
const COOKING_RESULT_MS = 2300;

const inventoryCount = (inventory: CaughtFish[], fishId: string) => (
  inventory.find((item) => item.fishId === fishId)?.quantity ?? 0
);

const GrillScreen: React.FC<GrillScreenProps> = ({ inventory, onCook, onCookStartSound }) => {
  const [cookPhase, setCookPhase] = useState<'idle' | 'cooking' | 'result'>('idle');
  const [activeRecipe, setActiveRecipe] = useState<GrillRecipe | null>(null);
  const [cookProgress, setCookProgress] = useState(0);
  const [isMobileLayout, setIsMobileLayout] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  ));
  const cookingTimerRef = useRef<number | null>(null);
  const resultTimerRef = useRef<number | null>(null);
  const cookingLocked = cookPhase !== 'idle';

  useEffect(() => () => {
    if (cookingTimerRef.current) window.clearTimeout(cookingTimerRef.current);
    if (resultTimerRef.current) window.clearTimeout(resultTimerRef.current);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobileLayout(event.matches);

    setIsMobileLayout(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const boardViewportInsets = isMobileLayout
    ? {
        mobile: {
          left: '16.4%',
          right: '16.4%',
          top: '16.0%',
          bottom: '18.6%',
        },
      }
    : {
        desktop: {
          left: '13.4%',
          right: '13.2%',
          top: '17.0%',
          bottom: '13.8%',
        },
      };

  const startCooking = (recipe: GrillRecipe) => {
    if (cookingLocked) return;

    if (cookingTimerRef.current) window.clearTimeout(cookingTimerRef.current);
    if (resultTimerRef.current) window.clearTimeout(resultTimerRef.current);

    setActiveRecipe(recipe);
    setCookPhase('cooking');
    setCookProgress(0);
    onCookStartSound?.();

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setCookProgress(100));
    });

    cookingTimerRef.current = window.setTimeout(() => {
      void (async () => {
        const cooked = await onCook(recipe);
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
      })();
    }, COOKING_ANIMATION_MS);
  };

  return (
    <GameScreenShell
      title="Grill"
      subtitle="Cook fish into dishes. Score goes to the leaderboard, dishes are saved in Inventory -> Dishes, and you can sell them there for gold."
      backgroundImage={isMobileLayout ? publicAsset('assets/grill_board_mobile_reference.webp') : publicAsset('assets/grill_board_reference.webp')}
      backgroundFit="cover"
      overlayClassName="bg-[linear-gradient(180deg,rgba(8,6,3,0.14)_0%,rgba(10,8,5,0.18)_48%,rgba(6,5,3,0.24)_100%)]"
      headerHidden
      shellPaddingClassName="px-0 pb-[calc(var(--bottom-nav-clearance,6rem)+0.35rem)] pt-0"
      contentWrapperClassName="mx-auto mt-0 min-h-0 w-full flex-1 overflow-hidden"
    >
      <div className="relative h-full">
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
                  <p className="mt-3 text-sm font-semibold text-white/75">
                    Dish saved to Inventory {'->'} Dishes. Sell it there later for gold.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <QuestBoard
          layout={isMobileLayout ? 'mobile' : 'desktop'}
          viewportInsets={boardViewportInsets}
        >
          <div className="grid gap-2.5 md:grid-cols-2 md:gap-3">
            {GRILL_RECIPES.map((recipe) => {
              const canCook = Object.entries(recipe.ingredients).every(([fishId, amount]) => (
                inventoryCount(inventory, fishId) >= amount
              ));

              return (
                <QuestBoardCard key={recipe.id}>
                  <div className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-[1rem] font-black text-[#f8e8bf] sm:text-lg">{recipe.name}</h2>
                        <p className="mt-1 text-[0.78rem] leading-5 text-[#f8e8bf]/70 sm:text-sm sm:leading-6">{recipe.description}</p>
                      </div>
                      <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#8f6a38]/70 bg-[rgba(16,11,8,0.84)] px-2 py-1 text-sm font-black text-[#f3c777]">
                        <Trophy className="h-4 w-4" />
                        {recipe.score}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
                      {Object.entries(recipe.ingredients).map(([fishId, amount]) => {
                        const fish = FISH_DATA.find((item) => item.id === fishId);
                        const owned = inventoryCount(inventory, fishId);
                        if (!fish) return null;

                        return (
                          <div
                            key={fishId}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#6f4928] bg-[rgba(15,10,7,0.72)] px-2 py-1.5 text-xs text-[#f8e8bf]"
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
                      className="mt-auto h-10 w-full rounded-[1rem] border border-[#7f5227] bg-[linear-gradient(180deg,#8c531f_0%,#6e4117_42%,#4f2f14_100%)] text-[0.82rem] font-black uppercase tracking-[0.04em] text-[#f8db9a] shadow-[inset_0_1px_0_rgba(255,220,160,0.22),0_10px_16px_rgba(0,0,0,0.28)] transition-all duration-200 hover:brightness-110 disabled:border-[#3a2817] disabled:bg-[linear-gradient(180deg,#2f241c_0%,#231b15_100%)] disabled:text-[#8c7b63] disabled:shadow-none sm:h-11 sm:text-sm"
                    >
                      <ChefHat className="mr-2 h-4 w-4" />
                      {cookingLocked && activeRecipe?.id === recipe.id ? 'Cooking...' : 'Cook dish'}
                    </Button>
                  </div>
                </QuestBoardCard>
              );
            })}
          </div>
        </QuestBoard>
      </div>
    </GameScreenShell>
  );
};

export default GrillScreen;
