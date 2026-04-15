import React from 'react';
import { cn } from '@/lib/utils';
import { publicAsset } from '@/lib/assets';
import { RARITY_COLORS, type Fish } from '@/types/game';

export const FISH_IMAGE_SRC: Record<string, string> = {
  carp: publicAsset('assets/fish_carp.png'),
  perch: publicAsset('assets/fish_perch.png'),
  bream: publicAsset('assets/fish_bream.png'),
  pike: publicAsset('assets/fish_pike.png'),
  catfish: publicAsset('assets/fish_catfish.png'),
  goldfish: publicAsset('assets/fish_goldfish.png'),
  mutant: publicAsset('assets/fish_mutant.png'),
  leviathan: publicAsset('assets/fish_leviathan.png'),
};

const SIZE_CLASSES = {
  xs: 'h-5 w-5',
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-24 w-24',
} as const;

interface FishIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  fish?: Pick<Fish, 'id' | 'name' | 'rarity'>;
  fishId?: string;
  alt?: string;
  size?: keyof typeof SIZE_CLASSES;
  framed?: boolean;
  imgClassName?: string;
}

const FishIcon: React.FC<FishIconProps> = ({
  fish,
  fishId,
  alt,
  size = 'md',
  framed = false,
  className,
  imgClassName,
  style,
  ...props
}) => {
  const id = fish?.id ?? fishId ?? 'carp';
  const src = FISH_IMAGE_SRC[id] ?? FISH_IMAGE_SRC.carp;
  const rarityColor = fish?.rarity ? RARITY_COLORS[fish.rarity] : 'rgba(255,255,255,0.28)';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-visible',
        SIZE_CLASSES[size],
        framed && 'rounded-lg border bg-black/25',
        className,
      )}
      style={{
        ...(framed
          ? {
              borderColor: rarityColor,
              boxShadow: `inset 0 0 0 1px ${rarityColor}, 0 0 18px ${rarityColor}26`,
            }
          : null),
        ...style,
      }}
      {...props}
    >
      <img
        src={src}
        alt={alt ?? fish?.name ?? 'Fish'}
        className={cn(
          'block h-full w-full object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.32)]',
          imgClassName,
        )}
        draggable={false}
      />
    </span>
  );
};

export default FishIcon;
