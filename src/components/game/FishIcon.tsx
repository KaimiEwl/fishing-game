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
  badge: 'h-4 w-4',
  xs: 'h-5 w-5',
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12',
  hero: 'h-16 w-16',
  showcase: 'h-28 w-28',
} as const;

interface FishIconProps {
  fish?: Pick<Fish, 'id' | 'name' | 'rarity'>;
  fishId?: string;
  alt?: string;
  size?: keyof typeof SIZE_CLASSES;
  frame?: boolean;
  tone?: 'default' | 'muted';
  motion?: 'static' | 'pulse';
}

const FishIcon: React.FC<FishIconProps> = ({
  fish,
  fishId,
  alt,
  size = 'md',
  frame = false,
  tone = 'default',
  motion = 'static',
}) => {
  const id = fish?.id ?? fishId ?? 'carp';
  const src = FISH_IMAGE_SRC[id] ?? FISH_IMAGE_SRC.carp;
  const rarityColor = fish?.rarity ? RARITY_COLORS[fish.rarity] : 'rgba(255,255,255,0.28)';
  const isPurpleFish = id === 'pike';

  const purpleAuraStyle: React.CSSProperties = {
    background:
      'radial-gradient(circle at 36% 42%, rgba(246, 208, 255, 0.82) 0%, rgba(175, 92, 255, 0.46) 28%, rgba(105, 34, 214, 0.22) 54%, rgba(7, 3, 20, 0) 76%)',
    filter: 'blur(7px)',
  };

  const purpleBandsStyle: React.CSSProperties = {
    background:
      'linear-gradient(118deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0.34) 28%, rgba(219,162,255,0.18) 38%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.11) 68%, rgba(255,255,255,0) 100%)',
    mixBlendMode: 'screen',
    filter: 'blur(0.5px)',
  };

  const purpleGlintStyle: React.CSSProperties = {
    width: '46%',
    background:
      'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.72) 42%, rgba(240,220,255,0.34) 62%, rgba(255,255,255,0) 100%)',
    filter: 'blur(1px)',
    mixBlendMode: 'screen',
  };

  return (
    <span
      className={cn(
        'relative isolate inline-flex shrink-0 items-center justify-center overflow-visible',
        SIZE_CLASSES[size],
        frame && 'rounded-lg border bg-black/25',
        tone === 'muted' && 'opacity-65',
        motion === 'pulse' && 'animate-pulse',
      )}
      style={
        frame
          ? {
              borderColor: rarityColor,
              boxShadow: `inset 0 0 0 1px ${rarityColor}, 0 0 18px ${rarityColor}26`,
            }
          : undefined
      }
    >
      {isPurpleFish && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[10%] rounded-full opacity-90 animate-purple-fish-aura"
            style={purpleAuraStyle}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[14%] rounded-full opacity-75 animate-purple-fish-bands"
            style={purpleBandsStyle}
          />
        </>
      )}

      <span className="relative flex h-full w-full items-center justify-center">
        {isPurpleFish && (
          <img
            src={src}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 block h-full w-full scale-[1.08] object-contain opacity-45 blur-[2px] saturate-150 animate-purple-fish-aura"
            draggable={false}
          />
        )}

        <img
          src={src}
          alt={alt ?? fish?.name ?? 'Fish'}
          className={cn(
            'relative z-[1] block h-full w-full object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.32)]',
            isPurpleFish && 'animate-purple-fish-drift drop-shadow-[0_0_14px_rgba(197,116,255,0.7)]',
          )}
          draggable={false}
        />

        {isPurpleFish && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-[8%] left-[-8%] z-[2] rounded-full opacity-0 animate-purple-fish-glint"
            style={purpleGlintStyle}
          />
        )}
      </span>
    </span>
  );
};

export default FishIcon;
