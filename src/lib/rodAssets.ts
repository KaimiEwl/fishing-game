import { publicAsset } from './assets';

export const INVENTORY_BUTTON_PANEL_SRC = publicAsset('assets/inventory_button_panel_v2.png');
export const FISH_GOT_AWAY_PANEL_SRC = publicAsset('assets/fish_got_away_panel_v2.png');
export const BOOST_ICON_SRC = publicAsset('assets/boost_icon.png');
export const INVENTORY_SHORTCUT_ICON_SRC = publicAsset('assets/inventory_shortcut_icon.png');
const ROD_PREVIEW_VERSION = 'rod-previews-20260418a';
const versionedRodPreview = (file: string) => `${publicAsset(`assets/${file}`)}?v=${ROD_PREVIEW_VERSION}`;

export const ROD_DISPLAY_INFO = [
  { name: 'Starter', image: versionedRodPreview('rod_starter_icon_v2.png'), color: '#aaa', bonus: 0, bobber: 'Standard tackle', previewFit: 'cover' as const, previewScale: '' },
  { name: 'Bamboo', image: versionedRodPreview('rod_green_icon.png'), color: '#22aa44', bonus: 5, bobber: 'Green bobber', previewFit: 'cover' as const, previewScale: '' },
  { name: 'Carbon', image: versionedRodPreview('rod_blue_icon.png'), color: '#2255cc', bonus: 10, bobber: 'Blue bobber', previewFit: 'cover' as const, previewScale: '' },
  { name: 'Pro', image: versionedRodPreview('rod_purple_icon.png'), color: '#9944ff', bonus: 15, bobber: 'Purple bobber', previewFit: 'cover' as const, previewScale: '' },
  { name: 'Legendary', image: versionedRodPreview('rod_gold_icon.png'), color: '#ffcc00', bonus: 25, bobber: 'Golden bobber', previewFit: 'cover' as const, previewScale: '' },
] as const;

export const ROD_ICON_PRELOADS = ROD_DISPLAY_INFO.slice(1).map((rod) => rod.image);
