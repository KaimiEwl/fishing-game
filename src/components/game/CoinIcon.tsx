import React from 'react';
import { Coins } from 'lucide-react';

interface CoinIconProps {
  size?: number;
  className?: string;
}

const CoinIcon: React.FC<CoinIconProps> = ({ size = 16, className = '' }) => (
  <span
    aria-hidden="true"
    className={`inline-flex shrink-0 items-center justify-center rounded-full align-middle text-amber-900 shadow-sm ring-1 ring-amber-200/70 ${className}`}
    style={{
      width: size,
      height: size,
      minWidth: size,
      background: 'radial-gradient(circle at 35% 30%, #fff7b0 0%, #f7cf42 38%, #d18b00 100%)',
    }}
  >
    <Coins size={Math.max(10, Math.round(size * 0.68))} strokeWidth={2.4} />
  </span>
);

export default CoinIcon;
