import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROD_DISPLAY_INFO } from '@/lib/rodAssets';
import Wrapper from '@/components/Wrapper';

interface InventoryRodCardProps {
  level: number;
  isEquipped: boolean;
  hasNft: boolean;
  onEquip: (level: number) => void;
}

const InventoryRodCard = ({
  level,
  isEquipped,
  hasNft,
  onEquip,
}: InventoryRodCardProps) => {
  const rod = ROD_DISPLAY_INFO[level];

  return (
    <div
      className={`grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 rounded-xl border p-3 shadow-sm transition-all ${
        isEquipped
          ? 'border-cyan-300/35 bg-zinc-950'
          : 'border-zinc-800 bg-black hover:border-cyan-300/20 hover:bg-zinc-950'
      }`}
    >
      <div
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-visible rounded-xl bg-black/60 ${
          hasNft ? 'ring-2 ring-cyan-300/40' : ''
        }`}
      >
        <img
          src={rod.image}
          alt={rod.name}
          className="h-12 object-contain drop-shadow-md transition-transform hover:scale-110"
        />
        {hasNft && (
          <div className="absolute -right-1.5 -top-1.5 rounded-sm border border-cyan-300/40 bg-cyan-300 px-1.5 text-[8px] font-bold text-black shadow-sm">
            NFT
          </div>
        )}
      </div>

      <Wrapper dir="column" gap={1}>
        <Wrapper dir="row" gap={2} align="center" wrap>
          <span className="text-base font-semibold">{rod.name}</span>
          {hasNft && <span className="text-xs text-cyan-100 shadow-sm">NFT</span>}
        </Wrapper>
        <div className="text-sm font-medium text-zinc-500">
          {rod.bonus > 0 ? `+${rod.bonus}% legendary chance` : 'Standard rod'}
        </div>
      </Wrapper>

      <div className="col-span-2 flex justify-end border-t border-zinc-800/80 pt-3">
        {isEquipped ? (
          <span className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-cyan-300/20 bg-zinc-950 px-3 py-1.5 text-sm font-bold text-cyan-100">
            <Check className="h-4 w-4" /> Equipped
          </span>
        ) : (
          <Button
            size="sm"
            onClick={() => onEquip(level)}
            className="min-h-10 rounded-lg border border-cyan-300/25 bg-zinc-950 px-5 font-bold text-cyan-100 shadow-sm hover:bg-black"
          >
            Equip
          </Button>
        )}
      </div>
    </div>
  );
};

export default InventoryRodCard;
