import FishIcon from '@/components/game/FishIcon';
import { INVENTORY_BUTTON_PANEL_SRC, INVENTORY_SHORTCUT_ICON_SRC } from '@/lib/rodAssets';

interface InventoryDialogTriggerProps {
  totalFish: number;
  variant?: 'panel' | 'shortcut';
}

const badgeClasses = {
  panel: 'absolute right-1 top-0 min-w-[24px] rounded-full bg-[#ffd86c] px-2 py-0.5 text-center text-xs font-bold leading-tight text-black shadow-lg ring-2 ring-black/55 sm:right-2 sm:top-1',
  shortcut: 'absolute right-0 top-0 min-w-[24px] rounded-full bg-[#ffd86c] px-2 py-0.5 text-center text-xs font-bold leading-tight text-black shadow-lg ring-2 ring-black/55 sm:right-0.5 sm:top-0.5',
} as const;

const InventoryDialogTrigger = ({
  totalFish,
  variant = 'panel',
}: InventoryDialogTriggerProps) => (
  <span className="group/inv relative inline-flex items-center justify-center bg-transparent p-0 shadow-none transition-transform hover:scale-[1.03] active:scale-95">
    {variant === 'shortcut' ? (
      <img
        src={INVENTORY_SHORTCUT_ICON_SRC}
        alt=""
        aria-hidden="true"
        className="block w-20 object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.36)] transition-transform duration-300 group-hover/inv:scale-[1.02] sm:w-24"
        draggable={false}
      />
    ) : (
      <img
        src={INVENTORY_BUTTON_PANEL_SRC}
        alt=""
        aria-hidden="true"
        className="block w-[10.5rem] object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.42)] sm:w-[13.25rem]"
        draggable={false}
      />
    )}
    <span className="sr-only">Inventory</span>
    {totalFish > 0 && <span className={badgeClasses[variant]}>{totalFish}</span>}
    {variant === 'shortcut' && (
      <span className="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex">
        <FishIcon fishId="goldfish" size="badge" tone="muted" />
      </span>
    )}
  </span>
);

export default InventoryDialogTrigger;
