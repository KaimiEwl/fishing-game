import { publicAsset } from './assets';
import { ROD_DATA } from '@/types/game';

interface RodDisplayInfo {
  name: string;
  image: string;
  color: string;
  bonus: number;
  bobber: string;
  previewFit: 'cover' | 'contain';
  previewScale: string;
}

export const INVENTORY_BUTTON_PANEL_SRC = publicAsset('assets/inventory_button_panel_v3.webp');
export const FISH_GOT_AWAY_PANEL_SRC = publicAsset('assets/fish_got_away_panel_v3.jpg');
export const BOOST_ICON_SRC = publicAsset('assets/boost_icon_v2.webp');
export const INVENTORY_SHORTCUT_ICON_SRC = publicAsset('assets/inventory_shortcut_icon_v2.webp');
const ROD_PREVIEW_VERSION = 'rod-previews-20260418b';
const versionedRodPreview = (file: string) => `${publicAsset(`assets/${file}`)}?v=${ROD_PREVIEW_VERSION}`;
const ROD_PREVIEW_PRIMARY_FILES = [
  'rod_starter_icon_v3.webp',
  'rod_green_icon_v2.webp',
  'rod_blue_icon_v2.webp',
  'rod_purple_icon_v2.webp',
  'rod_gold_icon_v2.webp',
] as const;
const ROD_PREVIEW_FALLBACK_FILES = [
  'rod_starter_icon_v3.png',
  'rod_green_icon_v2.png',
  'rod_blue_icon_v2.png',
  'rod_purple_icon_v2.png',
  'rod_gold_icon_v2.png',
] as const;

export const ROD_DISPLAY_INFO: readonly RodDisplayInfo[] = [
  ...ROD_DATA.map((rod, index) => ({
    name: rod.name.replace(/\s+Rod$/, ''),
    image: versionedRodPreview(ROD_PREVIEW_PRIMARY_FILES[index]),
    color: rod.bobberColor,
    bonus: rod.bonus,
    bobber: rod.bobber,
    previewFit: 'cover' as const,
    previewScale: '',
  })),
] as const;

export const getRodPreviewFallback = (rodLevel: number) =>
  versionedRodPreview(ROD_PREVIEW_FALLBACK_FILES[rodLevel] ?? 'rod_basic.png');

export const ROD_ICON_PRELOADS = Array.from(new Set([
  ...ROD_DISPLAY_INFO.map((rod) => rod.image),
  ...ROD_DISPLAY_INFO.map((_, index) => getRodPreviewFallback(index)),
]));
