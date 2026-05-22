import React from 'react';
import { publicAsset } from '@/lib/assets';
import { HIGH_FETCH_PRIORITY_PROPS } from '@/lib/imagePriority';

interface GameTitleBannerProps {
  className?: string;
  alt?: string;
}

const GameTitleBanner: React.FC<GameTitleBannerProps> = ({
  className = 'w-full max-w-[20rem]',
  alt = 'Hook and Loot title banner',
}) => (
  <img
    src={publicAsset('assets/title_banner_v2.webp')}
    alt={alt}
    className={className}
    draggable={false}
    loading="eager"
    {...HIGH_FETCH_PRIORITY_PROPS}
  />
);

export default GameTitleBanner;
