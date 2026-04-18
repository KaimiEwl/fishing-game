import { Button } from '@/components/ui/button';
import CoinIcon from '@/components/game/CoinIcon';
import FishIcon from '@/components/game/FishIcon';
import Wrapper from '@/components/Wrapper';
import { FISH_DATA, RARITY_COLORS, RARITY_NAMES } from '@/types/game';

interface InventoryFishItemProps {
  fish: typeof FISH_DATA[0];
  quantity: number;
  onSell: () => void;
}

const InventoryFishItem = ({ fish, quantity, onSell }: InventoryFishItemProps) => {
  const totalValue = fish.price * quantity;
  const rarityColor = RARITY_COLORS[fish.rarity];

  return (
    <Wrapper as="article" dir="column" gap={3}>
      <div className="group grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 overflow-hidden rounded-xl border border-zinc-800 bg-black p-3 shadow-sm transition-all hover:border-cyan-300/20 hover:bg-zinc-950 hover:shadow-md">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-visible rounded-xl shadow-inner"
          style={{
            background: `linear-gradient(135deg, ${rarityColor}30, ${rarityColor}10)`,
            border: `1px solid ${rarityColor}40`,
          }}
        >
          <div className="transition-transform group-hover:scale-110">
            <FishIcon fish={fish} size="xl" />
          </div>
        </div>

        <Wrapper dir="column" gap={1}>
          <Wrapper dir="row" gap={2} align="center" wrap>
            <span className="truncate text-sm font-bold drop-shadow-sm" style={{ color: rarityColor }}>
              {fish.name}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm"
              style={{
                backgroundColor: `${rarityColor}20`,
                color: rarityColor,
              }}
            >
              {RARITY_NAMES[fish.rarity]}
            </span>
          </Wrapper>
          <p className="truncate text-xs text-zinc-500">{fish.description}</p>
        </Wrapper>

        <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3">
          <Wrapper dir="row" gap={2} align="center" wrap>
            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-sm font-bold text-zinc-100">
              x{quantity}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-zinc-500 drop-shadow-sm">
              Total: {totalValue} <CoinIcon size="xs" />
            </span>
          </Wrapper>
          <Button
            size="sm"
            onClick={onSell}
            className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-300/25 bg-zinc-950 px-4 font-bold text-emerald-100 shadow hover:bg-black"
          >
            Sell (+{fish.price})
          </Button>
        </div>
      </div>
    </Wrapper>
  );
};

export default InventoryFishItem;
