import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ROD_DISPLAY_INFO } from '@/lib/rodAssets';

interface RodPreviewBadgeProps {
  rodLevel: number;
  ownedRodLevel: number;
  nftRods: number[];
}

const NFT_BONUSES = [
  { rarityBonus: 3, xpBonus: 10, sellBonus: 0 },
  { rarityBonus: 5, xpBonus: 15, sellBonus: 10 },
  { rarityBonus: 7, xpBonus: 20, sellBonus: 15 },
  { rarityBonus: 10, xpBonus: 25, sellBonus: 20 },
  { rarityBonus: 15, xpBonus: 30, sellBonus: 25 },
] as const;

const RodPreviewBadge = ({ rodLevel, ownedRodLevel, nftRods }: RodPreviewBadgeProps) => {
  const displayRodLevel = Math.max(rodLevel, ownedRodLevel);
  const rod = ROD_DISPLAY_INFO[displayRodLevel] || ROD_DISPLAY_INFO[0];
  const hasNft = nftRods.includes(displayRodLevel);
  const nftData = NFT_BONUSES[displayRodLevel];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`absolute bottom-1 right-[calc(100%+0.55rem)] flex h-12 w-12 cursor-pointer flex-col items-center justify-center rounded-xl border border-cyan-300/20 bg-black/85 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-zinc-950 active:scale-95 sm:bottom-1.5 sm:h-14 sm:w-14 ${
              hasNft ? 'ring-2 ring-cyan-300/40' : ''
            }`}
          >
            <img src={rod.image} alt={rod.name} className="h-7 object-contain drop-shadow-md sm:h-8" />
            {rod.bonus > 0 && (
              <span className="mt-0.5 text-[9px] font-bold leading-none text-cyan-100">+{rod.bonus}%</span>
            )}
            {hasNft && (
              <div className="absolute -right-1.5 -top-1.5 rounded-sm border border-cyan-300/40 bg-cyan-300 px-1.5 text-[8px] font-bold text-black shadow-sm">
                NFT
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] border-cyan-300/15 bg-black/95 p-3 text-zinc-100 backdrop-blur-md">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold" style={{ color: rod.color }}>
              {rod.name}
            </p>
            <p className="text-xs text-zinc-500">Level {displayRodLevel + 1}</p>
            {rod.bonus > 0 ? (
              <p className="text-xs text-zinc-200">+{rod.bonus}% rare fish chance</p>
            ) : (
              <p className="text-xs text-zinc-200">Standard catch chance</p>
            )}
            {hasNft && nftData && (
              <div className="mt-1 border-t border-cyan-300/15 pt-1 text-xs text-cyan-100">
                <p className="font-bold">NFT bonuses:</p>
                <p>+{nftData.rarityBonus}% chance</p>
                <p>+{nftData.xpBonus}% XP</p>
                {nftData.sellBonus > 0 && <p>+{nftData.sellBonus}% price</p>}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default RodPreviewBadge;
