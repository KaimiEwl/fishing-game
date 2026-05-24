import React from 'react';
import type { GrillRecipe } from '@/types/game';

type RecipeIconTheme = {
  glow: string;
  plateA: string;
  plateB: string;
  fishA: string;
  fishB: string;
  fishC: string;
  flameA: string;
  flameB: string;
  accent: string;
  char: string;
  variant: 'skewer' | 'fillet' | 'steak' | 'platter' | 'cosmic';
};

const RECIPE_ICON_THEMES: Record<string, RecipeIconTheme> = {
  lake_skewer: {
    glow: 'rgba(251,191,36,0.34)',
    plateA: '#7c4317',
    plateB: '#2e1a0e',
    fishA: '#ffb347',
    fishB: '#d66722',
    fishC: '#ffe0a3',
    flameA: '#ffdc55',
    flameB: '#f97316',
    accent: '#facc15',
    char: '#4b2412',
    variant: 'skewer',
  },
  crispy_perch_plate: {
    glow: 'rgba(45,212,191,0.28)',
    plateA: '#2f7568',
    plateB: '#10251f',
    fishA: '#f7d35e',
    fishB: '#4fbc46',
    fishC: '#fff1b0',
    flameA: '#fef08a',
    flameB: '#14b8a6',
    accent: '#2dd4bf',
    char: '#31511b',
    variant: 'fillet',
  },
  rare_bream_steak: {
    glow: 'rgba(251,113,133,0.28)',
    plateA: '#7f3946',
    plateB: '#2b1620',
    fishA: '#ffc45e',
    fishB: '#e65f43',
    fishC: '#ffe6a8',
    flameA: '#fecdd3',
    flameB: '#fb7185',
    accent: '#fb923c',
    char: '#5b2018',
    variant: 'steak',
  },
  deepwater_platter: {
    glow: 'rgba(56,189,248,0.3)',
    plateA: '#28577f',
    plateB: '#111d2e',
    fishA: '#f0b46a',
    fishB: '#8b5a2b',
    fishC: '#ffdba0',
    flameA: '#a5f3fc',
    flameB: '#2563eb',
    accent: '#38bdf8',
    char: '#3a2416',
    variant: 'platter',
  },
  cosmic_grill: {
    glow: 'rgba(216,180,254,0.36)',
    plateA: '#6d3a8f',
    plateB: '#201027',
    fishA: '#f6d365',
    fishB: '#7c3aed',
    fishC: '#ffeab4',
    flameA: '#e879f9',
    flameB: '#f59e0b',
    accent: '#d8b4fe',
    char: '#2e1740',
    variant: 'cosmic',
  },
};

const GrilledFish: React.FC<{
  fill: string;
  char: string;
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
  skewer?: boolean;
}> = ({ fill, char, x, y, rotate = 0, scale = 1, skewer = false }) => (
  <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
    {skewer ? (
      <line x1="-42" y1="1" x2="43" y2="-2" stroke="#f7d48b" strokeWidth="3.2" strokeLinecap="round" />
    ) : null}
    <path
      d="M-31 1 C-25 -13 -4 -18 16 -12 C24 -9 31 -4 36 2 C30 8 22 13 12 15 C-8 20 -27 14 -31 1Z"
      fill={fill}
      stroke="#ffe3a5"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M-30 1 L-45 -12 L-40 2 L-45 15 Z" fill={fill} stroke="#ffe3a5" strokeWidth="1.8" strokeLinejoin="round" />
    <circle cx="24" cy="-3" r="2" fill="#37170f" />
    <path d="M-17 -10 C-13 -4 -13 5 -18 11" fill="none" stroke={char} strokeWidth="4" strokeLinecap="round" opacity="0.75" />
    <path d="M-2 -13 C2 -5 2 7 -4 14" fill="none" stroke={char} strokeWidth="4" strokeLinecap="round" opacity="0.75" />
    <path d="M13 -10 C17 -4 17 5 12 11" fill="none" stroke={char} strokeWidth="4" strokeLinecap="round" opacity="0.75" />
    <path d="M-24 6 C-12 13 11 14 28 4" fill="none" stroke="rgba(255,246,214,0.5)" strokeWidth="1.8" strokeLinecap="round" />
  </g>
);

const GrilledFillet: React.FC<{
  fill: string;
  char: string;
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
}> = ({ fill, char, x, y, rotate = 0, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
    <path
      d="M-24 -8 C-12 -17 12 -17 25 -7 C28 2 22 12 7 15 C-11 18 -25 8 -24 -8Z"
      fill={fill}
      stroke="#ffe6aa"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M-13 -12 C-8 -4 -9 6 -15 12" fill="none" stroke={char} strokeWidth="4" strokeLinecap="round" opacity="0.74" />
    <path d="M2 -14 C7 -5 6 7 0 15" fill="none" stroke={char} strokeWidth="4" strokeLinecap="round" opacity="0.74" />
    <path d="M16 -10 C20 -3 18 6 12 12" fill="none" stroke={char} strokeWidth="4" strokeLinecap="round" opacity="0.74" />
    <path d="M-19 4 C-5 10 11 9 22 1" fill="none" stroke="rgba(255,248,220,0.45)" strokeWidth="2" strokeLinecap="round" />
  </g>
);

const GrilledSteak: React.FC<{
  fill: string;
  center: string;
  char: string;
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
}> = ({ fill, center, char, x, y, rotate = 0, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
    <path
      d="M-24 -7 C-21 -20 8 -24 24 -11 C31 -4 25 14 7 20 C-13 26 -30 10 -24 -7Z"
      fill={fill}
      stroke="#ffe2a3"
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
    <path d="M-9 -7 C-3 -13 10 -11 15 -4 C15 5 6 12 -5 11 C-14 9 -15 -1 -9 -7Z" fill={center} opacity="0.9" />
    <path d="M-18 -12 C-12 -4 -12 7 -20 15" fill="none" stroke={char} strokeWidth="4" strokeLinecap="round" opacity="0.76" />
    <path d="M3 -17 C9 -7 8 7 0 18" fill="none" stroke={char} strokeWidth="4" strokeLinecap="round" opacity="0.76" />
    <path d="M19 -10 C23 -2 20 9 12 16" fill="none" stroke={char} strokeWidth="4" strokeLinecap="round" opacity="0.76" />
  </g>
);

type RecipeGrillIconSize = 'card' | 'modal' | 'inventory';

const RecipeGrillIcon: React.FC<{ recipe: GrillRecipe; size?: RecipeGrillIconSize }> = ({ recipe, size = 'card' }) => {
  const theme = RECIPE_ICON_THEMES[recipe.id] ?? RECIPE_ICON_THEMES.lake_skewer;
  const idPrefix = `grill-${recipe.id}-${size}`;
  const sizeClass = size === 'modal'
    ? 'h-28 w-28'
    : size === 'inventory'
      ? 'h-14 w-14'
      : 'h-[4.65rem] w-[4.65rem] sm:h-20 sm:w-20';

  return (
    <div
      role="img"
      aria-label={`${recipe.name} grilled dish icon`}
      className={`relative shrink-0 ${sizeClass}`}
    >
      <svg className="h-full w-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.38)]" viewBox="0 0 96 96" aria-hidden="true">
        <defs>
          <radialGradient id={`${idPrefix}-bg`} cx="50%" cy="43%" r="62%">
            <stop offset="0%" stopColor={theme.glow} />
            <stop offset="62%" stopColor="rgba(12,8,6,0.6)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.9)" />
          </radialGradient>
          <linearGradient id={`${idPrefix}-plate`} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={theme.plateA} />
            <stop offset="100%" stopColor={theme.plateB} />
          </linearGradient>
          <linearGradient id={`${idPrefix}-fish`} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={theme.fishC} />
            <stop offset="44%" stopColor={theme.fishA} />
            <stop offset="100%" stopColor={theme.fishB} />
          </linearGradient>
          <linearGradient id={`${idPrefix}-flame`} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={theme.flameA} />
            <stop offset="100%" stopColor={theme.flameB} />
          </linearGradient>
        </defs>

        <circle cx="48" cy="48" r="45" fill={`url(#${idPrefix}-bg)`} stroke="rgba(255,226,170,0.36)" strokeWidth="2" />
        <ellipse cx="48" cy="83" rx="28" ry="5" fill="rgba(0,0,0,0.52)" />

        <path d="M24 63 C28 47 67 47 72 63 L66 80 C59 86 37 86 30 80 Z" fill={`url(#${idPrefix}-plate)`} stroke="rgba(255,221,151,0.35)" strokeWidth="1.6" />
        <path d="M22 62 C30 54 66 54 74 62 C68 70 29 70 22 62Z" fill="rgba(15,9,7,0.95)" stroke="#f2c36d" strokeWidth="2" />
        {[29, 39, 49, 59, 69].map((x) => (
          <line key={x} x1={x} y1="56.5" x2={x - 4} y2="67.8" stroke="#f6ca75" strokeWidth="1.9" strokeLinecap="round" opacity="0.86" />
        ))}
        <line x1="27" y1="61" x2="69" y2="61" stroke="#f6ca75" strokeWidth="1.8" strokeLinecap="round" opacity="0.86" />

        <path d="M38 68 C32 59 40 51 45 44 C44 54 55 56 50 69Z" fill={`url(#${idPrefix}-flame)`} opacity="0.88" />
        <path d="M54 70 C49 60 57 52 62 46 C60 56 70 59 64 71Z" fill={`url(#${idPrefix}-flame)`} opacity="0.72" />
        <path d="M47 70 C42 62 47 56 50 51 C51 59 57 62 53 71Z" fill="#fff2a8" opacity="0.55" />

        {theme.variant === 'skewer' ? (
          <>
            <GrilledFish fill={`url(#${idPrefix}-fish)`} char={theme.char} x={47} y={37} rotate={-13} scale={0.58} skewer />
            <GrilledFish fill={`url(#${idPrefix}-fish)`} char={theme.char} x={50} y={51} rotate={12} scale={0.55} skewer />
          </>
        ) : null}

        {theme.variant === 'fillet' ? (
          <>
            <GrilledFillet fill={`url(#${idPrefix}-fish)`} char={theme.char} x={39} y={38} rotate={-15} scale={0.72} />
            <GrilledFillet fill={`url(#${idPrefix}-fish)`} char={theme.char} x={57} y={49} rotate={13} scale={0.62} />
            <path d="M67 32 C73 35 75 43 70 49 C65 43 64 37 67 32Z" fill="#d9f99d" stroke="#84cc16" strokeWidth="1.4" />
          </>
        ) : null}

        {theme.variant === 'steak' ? (
          <>
            <GrilledSteak fill={`url(#${idPrefix}-fish)`} center={theme.fishC} char={theme.char} x={39} y={43} rotate={-16} scale={0.72} />
            <GrilledSteak fill={`url(#${idPrefix}-fish)`} center={theme.fishC} char={theme.char} x={59} y={47} rotate={13} scale={0.62} />
          </>
        ) : null}

        {theme.variant === 'platter' ? (
          <>
            <GrilledFish fill={`url(#${idPrefix}-fish)`} char={theme.char} x={47} y={35} rotate={-8} scale={0.64} />
            <GrilledFillet fill={`url(#${idPrefix}-fish)`} char={theme.char} x={36} y={52} rotate={13} scale={0.56} />
            <GrilledFillet fill={`url(#${idPrefix}-fish)`} char={theme.char} x={61} y={53} rotate={-14} scale={0.56} />
          </>
        ) : null}

        {theme.variant === 'cosmic' ? (
          <>
            <path d="M30 23 L33 29 L40 30 L35 35 L36 42 L30 39 L24 42 L25 35 L20 30 L27 29Z" fill={theme.accent} opacity="0.82" />
            <circle cx="72" cy="29" r="2.5" fill="#fff7ad" />
            <circle cx="22" cy="51" r="2" fill="#c4b5fd" />
            <GrilledFish fill={`url(#${idPrefix}-fish)`} char={theme.char} x={47} y={37} rotate={-12} scale={0.6} skewer />
            <GrilledFish fill={`url(#${idPrefix}-fish)`} char={theme.char} x={51} y={52} rotate={14} scale={0.57} skewer />
          </>
        ) : null}

        <path d="M28 74 C38 79 58 79 68 74" fill="none" stroke="rgba(255,240,184,0.28)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};

export default RecipeGrillIcon;
