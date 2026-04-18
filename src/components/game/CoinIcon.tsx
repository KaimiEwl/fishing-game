import React from 'react';
import { Coins } from 'lucide-react';

const COIN_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 28,
} as const;

interface CoinIconProps {
  size?: keyof typeof COIN_SIZES;
}

const CoinIcon: React.FC<CoinIconProps> = ({ size = 'md' }) => {
  const iconSize = COIN_SIZES[size];

  return (
  <span
    aria-hidden="true"
    className="inline-flex shrink-0 items-center justify-center rounded-full align-middle text-amber-900 shadow-sm ring-1 ring-amber-200/70"
    style={{
      width: iconSize,
      height: iconSize,
      minWidth: iconSize,
      background: 'radial-gradient(circle at 35% 30%, #fff7b0 0%, #f7cf42 38%, #d18b00 100%)',
    }}
  >
    <Coins size={Math.max(10, Math.round(iconSize * 0.68))} strokeWidth={2.4} />
  </span>
  );
};

export default CoinIcon;
