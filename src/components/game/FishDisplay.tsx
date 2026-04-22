import React from 'react';
import { Fish, RARITY_COLORS, RARITY_NAMES } from '@/types/game';
import CoinIcon from './CoinIcon';
import FishIcon from './FishIcon';

interface FishDisplayProps {
  fish: Fish;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const FishDisplay: React.FC<FishDisplayProps> = ({
  fish,
  showDetails = false,
  size = 'md',
  onClick,
}) => {
  const containerSizes = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
  };

  const imageSizes: Record<NonNullable<FishDisplayProps['size']>, React.ComponentProps<typeof FishIcon>['size']> = {
    sm: 'lg',
    md: 'hero',
    lg: 'showcase',
  };

  return (
    <div
      className={`flex flex-col items-center ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
      onClick={onClick}
    >
      <div
        className={`${containerSizes[size]} rounded-full flex items-center justify-center animate-fish-jump`}
        style={{
          background: `linear-gradient(135deg, ${RARITY_COLORS[fish.rarity]}40, ${RARITY_COLORS[fish.rarity]}20)`,
          border: `3px solid ${RARITY_COLORS[fish.rarity]}`,
          boxShadow: `0 0 20px ${RARITY_COLORS[fish.rarity]}50`,
        }}
      >
        <FishIcon fish={fish} size={imageSizes[size]} />
      </div>

      {showDetails && (
        <div className="text-center mt-2">
          <p
            className="font-bold text-lg"
            style={{ color: RARITY_COLORS[fish.rarity] }}
          >
            {fish.name}
          </p>
          <p
            className="text-sm font-medium"
            style={{ color: RARITY_COLORS[fish.rarity] }}
          >
            {RARITY_NAMES[fish.rarity]}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            +{fish.xp} XP <CoinIcon size="sm" /> {fish.price}
          </p>
        </div>
      )}
    </div>
  );
};

export default FishDisplay;
