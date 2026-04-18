import FishIcon from '@/components/game/FishIcon';
import CoinIcon from '@/components/game/CoinIcon';
import { type Fish, RARITY_COLORS } from '@/types/game';

interface PlayerFishInfoRowProps {
  fish: Fish;
}

const PlayerFishInfoRow = ({ fish }: PlayerFishInfoRowProps) => (
  <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/85 p-2 shadow-sm">
    <div className="flex items-center gap-3">
      <FishIcon fish={fish} size="sm" frame />
      <span className="text-sm font-semibold drop-shadow-sm" style={{ color: RARITY_COLORS[fish.rarity] }}>
        {fish.name}
      </span>
    </div>
    <div className="flex flex-col items-end">
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

export default PlayerFishInfoRow;
