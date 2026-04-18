import bottomNavArcadeStrip from '@/assets/bottom_nav_arcade_strip.png';
import travelIconSrc from '@/assets/map_travel_icon_cutout.png';
import { publicAsset } from './assets';
import {
  BOOST_ICON_SRC,
  FISH_GOT_AWAY_PANEL_SRC,
  INVENTORY_BUTTON_PANEL_SRC,
  INVENTORY_SHORTCUT_ICON_SRC,
  ROD_ICON_PRELOADS,
} from './rodAssets';

const MAIN_SCENE_FISH_FILES = [
  'fish_carp.png',
  'fish_perch.png',
  'fish_bream.png',
  'fish_pike.png',
  'fish_catfish.png',
  'fish_goldfish.png',
  'fish_mutant.png',
  'fish_leviathan.png',
] as const;

const MAIN_SCENE_ROD_FILES = [
  'rod_basic.png',
  'rod_bamboo.png',
  'rod_carbon.png',
  'rod_pro.png',
  'rod_legendary.png',
] as const;

export interface MainSceneAssets {
  background: HTMLImageElement;
  pepe: HTMLImageElement;
  fish: HTMLImageElement[];
  rods: HTMLImageElement[];
}

export const CRITICAL_BOOT_ASSET_URLS = [
  publicAsset('assets/bg_main.jpg'),
  publicAsset('assets/pepe_boat_v2.png'),
  ...MAIN_SCENE_FISH_FILES.map((file) => publicAsset(`assets/${file}`)),
  ...MAIN_SCENE_ROD_FILES.map((file) => publicAsset(`assets/${file}`)),
  publicAsset('assets/cast_button_blue.png'),
  publicAsset('assets/cast_button_green.png'),
  bottomNavArcadeStrip,
] as const;

export const WARM_PRELOAD_ASSET_URLS = [
  publicAsset('assets/bg_tasks.jpg'),
  publicAsset('assets/bg_wheel.jpg'),
  FISH_GOT_AWAY_PANEL_SRC,
  INVENTORY_BUTTON_PANEL_SRC,
  INVENTORY_SHORTCUT_ICON_SRC,
  BOOST_ICON_SRC,
  travelIconSrc,
  ...ROD_ICON_PRELOADS,
] as const;

const loadImageElement = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  let settled = false;

  const finalize = (fn: () => void) => {
    if (settled) return;
    settled = true;
    fn();
  };

  img.decoding = 'async';
  img.loading = 'eager';
  img.fetchPriority = 'high';
  img.onload = () => finalize(() => resolve(img));
  img.onerror = () => finalize(() => reject(new Error(`Failed to load image: ${src}`)));
  img.src = src;

  if (img.complete && img.naturalWidth > 0) {
    finalize(() => resolve(img));
  }
});

export const warmPreloadAssets = (urls: readonly string[]) => {
  urls.forEach((src) => {
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = src;
  });
};

let cachedMainSceneAssets: MainSceneAssets | null = null;

export const loadMainSceneAssets = async (
  onProgress?: (loaded: number, total: number) => void,
): Promise<MainSceneAssets> => {
  if (cachedMainSceneAssets) {
    onProgress?.(CRITICAL_BOOT_ASSET_URLS.length, CRITICAL_BOOT_ASSET_URLS.length);
    return cachedMainSceneAssets;
  }

  let loaded = 0;
  const total = CRITICAL_BOOT_ASSET_URLS.length;
  const track = async (src: string) => {
    const image = await loadImageElement(src);
    loaded += 1;
    onProgress?.(loaded, total);
    return image;
  };

  const [
    background,
    pepe,
    ...rest
  ] = await Promise.all(CRITICAL_BOOT_ASSET_URLS.map((src) => track(src)));

  cachedMainSceneAssets = {
    background,
    pepe,
    fish: rest.slice(0, MAIN_SCENE_FISH_FILES.length),
    rods: rest.slice(MAIN_SCENE_FISH_FILES.length, MAIN_SCENE_FISH_FILES.length + MAIN_SCENE_ROD_FILES.length),
  };

  return cachedMainSceneAssets;
};
