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
            className={`absolute bottom-1 right-[calc(100%+0.55rem)] flex h-12 w-12 cursor-pointer flex-col items-center justify-end overflow-hidden rounded-xl border border-cyan-300/30 bg-slate-950/20 shadow-[0_14px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-all hover:scale-105 active:scale-95 sm:bottom-1.5 sm:h-14 sm:w-14 ${
              hasNft ? 'ring-2 ring-cyan-300/40' : ''
            }`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(34,211,238,0.18),transparent_60%),linear-gradient(180deg,rgba(15,23,42,0.15),rgba(15,23,42,0.35))]" />
            <img
              src={rod.image}
              alt={rod.name}
              className={`absolute inset-0 h-full w-full ${rod.previewFit === 'contain' ? 'object-contain p-1.5' : 'object-cover'} ${rod.previewScale}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            {rod.bonus > 0 && (
              <span className="relative z-10 mb-1 rounded-md bg-black/55 px-1 py-[2px] text-[9px] font-bold leading-none text-cyan-50 sm:text-[10px]">
                +{rod.bonus}%
              </span>
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
