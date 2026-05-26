import FishIcon from '@/components/game/FishIcon';
import CoinIcon from '@/components/game/CoinIcon';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  LEVIATHAN_COMMON_ROD_BONUS_CONFIG,
  type Fish,
  RARITY_COLORS,
  ROD_DATA,
  ROD_RARITY_COLORS,
  ROD_RARITY_NAMES,
} from '@/types/game';

interface PlayerFishInfoRowProps {
  fish: Fish;
}

const getRodById = (id: string) => ROD_DATA.find((rod) => rod.id === id) ?? null;
const leviathanRequiredRod = getRodById(LEVIATHAN_COMMON_ROD_BONUS_CONFIG.requiredRodId);
const leviathanBonusRod = getRodById(LEVIATHAN_COMMON_ROD_BONUS_CONFIG.bonusRodId);

const PlayerFishInfoRow = ({ fish }: PlayerFishInfoRowProps) => {
  const hasLeviathanBounty = fish.id === LEVIATHAN_COMMON_ROD_BONUS_CONFIG.fishId && leviathanRequiredRod && leviathanBonusRod;

  const row = (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/85 p-2 shadow-sm transition-colors hover:border-cyan-300/25 hover:bg-zinc-950">
      <div className="flex min-w-0 items-center gap-3">
        <FishIcon fish={fish} size="sm" frame />
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold drop-shadow-sm" style={{ color: RARITY_COLORS[fish.rarity] }}>
            {fish.name}
          </span>
          {hasLeviathanBounty ? (
            <span
              className="mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]"
              style={{
                borderColor: `${ROD_RARITY_COLORS[leviathanBonusRod.rarity]}70`,
                color: ROD_RARITY_COLORS[leviathanBonusRod.rarity],
              }}
            >
              {leviathanBonusRod.name} bounty
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs font-medium text-zinc-300">
          {fish.chance}%
        </span>
        <span className="mt-1 flex items-center gap-1 font-semibold">
          {fish.price}
          <CoinIcon size="xs" />
        </span>
      </div>
    </div>
  );

  if (!hasLeviathanBounty) return row;

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>{row}</HoverCardTrigger>
      <HoverCardContent side="right" align="center" className="w-72 border-cyan-300/20 bg-black/95 text-zinc-100 shadow-2xl">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/80">Leviathan bounty</p>
        <p className="mt-2 text-sm font-black text-white">{fish.name}</p>
        <p className="mt-2 text-xs leading-5 text-zinc-300">
          Catch it with the {leviathanRequiredRod.name} and the game instantly unlocks {leviathanBonusRod.name}.
        </p>
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-400">Reward</span>
            <span className="font-black" style={{ color: ROD_RARITY_COLORS[leviathanBonusRod.rarity] }}>
              {leviathanBonusRod.name}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-zinc-400">Rarity</span>
            <span className="font-bold text-zinc-100">{ROD_RARITY_NAMES[leviathanBonusRod.rarity]}</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default PlayerFishInfoRow;
