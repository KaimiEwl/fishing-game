import { publicAsset } from './assets';

export const INVENTORY_BUTTON_PANEL_SRC = publicAsset('assets/inventory_button_panel_v2.png');
export const FISH_GOT_AWAY_PANEL_SRC = publicAsset('assets/fish_got_away_panel_v2.png');
export const BOOST_ICON_SRC = publicAsset('assets/boost_icon.png');

export const ROD_DISPLAY_INFO = [
  { name: 'Starter', image: publicAsset('assets/rod_basic.png'), color: '#aaa', bonus: 0, bobber: 'Standard tackle' },
  { name: 'Bamboo', image: publicAsset('assets/rod_green_icon.png'), color: '#22aa44', bonus: 5, bobber: 'Green bobber' },
  { name: 'Carbon', image: publicAsset('assets/rod_blue_icon.png'), color: '#2255cc', bonus: 10, bobber: 'Blue bobber' },
  { name: 'Pro', image: publicAsset('assets/rod_purple_icon.png'), color: '#9944ff', bonus: 15, bobber: 'Purple bobber' },
  { name: 'Legendary', image: publicAsset('assets/rod_gold_icon.png'), color: '#ffcc00', bonus: 25, bobber: 'Golden bobber' },
] as const;

export const ROD_ICON_PRELOADS = ROD_DISPLAY_INFO.slice(1).map((rod) => rod.image);
