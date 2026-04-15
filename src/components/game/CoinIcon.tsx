import React from 'react';

interface CoinIconProps {
  size?: number;
  className?: string;
}

const CoinIcon: React.FC<CoinIconProps> = ({ size = 16, className = '' }) => (
  <img
    src="/assets/coin.png"
    alt="coin"
    width={size}
    height={size}
    className={`inline-block align-middle ${className}`}
    style={{ width: size, height: size }}
  />
);

export default CoinIcon;
