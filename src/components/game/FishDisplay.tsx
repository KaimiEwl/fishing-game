import React from 'react';
import { Fish, RARITY_COLORS, RARITY_NAMES } from '@/types/game';
import CoinIcon from './CoinIcon';
import { publicAsset } from '@/lib/assets';

// Маппинг id рыбы на файл спрайта
const FISH_IMAGES: Record<string, string> = {
  'carp': publicAsset('assets/fish_carp.png'),
  'perch': publicAsset('assets/fish_perch.png'),
  'bream': publicAsset('assets/fish_bream.png'),
  'pike': publicAsset('assets/fish_pike.png'),
  'catfish': publicAsset('assets/fish_catfish.png'),
  'goldfish': publicAsset('assets/fish_goldfish.png'),
  'mutant': publicAsset('assets/fish_mutant.png'),
  'leviathan': publicAsset('assets/fish_leviathan.png'),
};

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
  onClick
}) => {
  const containerSizes = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32'
  };

  const imageSizes = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-28 h-28'
  };

  const imgSrc = FISH_IMAGES[fish.id];

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
          boxShadow: `0 0 20px ${RARITY_COLORS[fish.rarity]}50`
        }}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={fish.name}
            className={`${imageSizes[size]} object-contain`}
          />
        ) : (
          <span className="text-4xl">{fish.emoji}</span>
        )}
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
          <p className="text-muted-foreground text-sm mt-1">
            +{fish.xp} XP • <CoinIcon size={14} /> {fish.price}
          </p>
        </div>
      )}
    </div>
  );
};

export default FishDisplay;
