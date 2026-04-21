import { Button } from '@/components/ui/button';
import CoinIcon from '@/components/game/CoinIcon';
import Wrapper from '@/components/Wrapper';
import { ChefHat, Trophy } from 'lucide-react';
import type { GrillRecipe } from '@/types/game';

interface InventoryDishItemProps {
  recipe: GrillRecipe;
  quantity: number;
  onSell: () => void;
}

const InventoryDishItem = ({ recipe, quantity, onSell }: InventoryDishItemProps) => {
  const totalValue = recipe.score * quantity;

  return (
    <Wrapper as="article" dir="column" gap={3}>
      <div className="group grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 overflow-hidden rounded-xl border border-zinc-800 bg-black p-3 shadow-sm transition-all hover:border-amber-300/20 hover:bg-zinc-950 hover:shadow-md">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-amber-300/25 bg-[linear-gradient(135deg,rgba(251,191,36,0.22),rgba(234,88,12,0.12))] shadow-inner">
          <div className="transition-transform group-hover:scale-110">
            <ChefHat className="h-7 w-7 text-amber-100" />
          </div>
        </div>

        <Wrapper dir="column" gap={1}>
          <Wrapper dir="row" gap={2} align="center" wrap>
            <span className="truncate text-sm font-bold text-amber-100 drop-shadow-sm">
              {recipe.name}
            </span>
            <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200 backdrop-blur-sm">
              Cooked dish
            </span>
          </Wrapper>
          <p className="truncate text-xs text-zinc-500">{recipe.description}</p>
        </Wrapper>

        <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3">
          <Wrapper dir="row" gap={2} align="center" wrap>
            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-sm font-bold text-zinc-100">
              x{quantity}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-zinc-500 drop-shadow-sm">
              Total: {totalValue} <CoinIcon size="xs" />
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200">
              <Trophy className="h-3.5 w-3.5" />
              {recipe.score} each
            </span>
          </Wrapper>
          <Button
            size="sm"
            onClick={onSell}
            className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-300/25 bg-zinc-950 px-4 font-bold text-emerald-100 shadow hover:bg-black"
          >
            Sell (+{recipe.score})
          </Button>
        </div>
      </div>
    </Wrapper>
  );
};

export default InventoryDishItem;
