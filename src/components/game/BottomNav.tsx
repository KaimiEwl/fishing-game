import React from 'react';
import { ChefHat, ChevronDown, ChevronUp, Flame, ListChecks, ShoppingBag, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameTab } from '@/types/game';
import FishIcon from './FishIcon';

interface BottomNavProps {
  activeTab: GameTab;
  onTabChange: (tab: GameTab) => void;
  wheelReady: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const navItems: Array<{ id: GameTab; label: string; icon: React.ComponentType<{ className?: string }> | 'fish' }> = [
  { id: 'fish', label: 'Fish', icon: 'fish' },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'shop', label: 'Shop', icon: ShoppingBag },
  { id: 'grill', label: 'Grill', icon: ChefHat },
  { id: 'wheel', label: 'Wheel', icon: Flame },
  { id: 'leaderboard', label: 'Board', icon: Trophy },
];

const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  wheelReady,
  collapsed = false,
  onCollapsedChange,
}) => {
  const activeItem = navItems.find((item) => item.id === activeTab) ?? navItems[0];
  const ActiveIcon = activeItem.icon === 'fish' ? null : activeItem.icon;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-5">
      <div className="mx-auto w-full max-w-3xl">
        <button
          type="button"
          onClick={() => onCollapsedChange?.(!collapsed)}
          className="mx-auto mb-1 flex h-9 min-w-28 items-center justify-center gap-1 rounded-lg border border-white/10 bg-black/75 px-3 text-xs font-bold text-white/80 shadow-lg backdrop-blur-xl transition hover:bg-black/85 active:scale-95 sm:hidden"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {collapsed ? 'Menu' : 'Hide'}
        </button>

        {collapsed && (
          <button
            type="button"
            onClick={() => onCollapsedChange?.(false)}
            className="mx-auto flex h-11 w-full max-w-xs items-center justify-center gap-2 rounded-lg border border-violet-300/25 bg-black/80 px-4 text-sm font-black text-white shadow-2xl backdrop-blur-xl transition active:scale-95 sm:hidden"
          >
            {activeItem.icon === 'fish' ? (
              <FishIcon fishId="carp" className="h-6 w-6" />
            ) : (
              ActiveIcon && <ActiveIcon className="h-5 w-5" />
            )}
            {activeItem.label}
            {wheelReady && <span className="h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.9)]" />}
          </button>
        )}

      <div
        className={cn(
          'mx-auto grid w-full max-w-3xl grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/75 p-1.5 shadow-2xl backdrop-blur-xl transition-all duration-200 ease-out sm:grid-cols-6',
          collapsed && 'pointer-events-none max-h-0 translate-y-3 overflow-hidden border-transparent p-0 opacity-0 sm:pointer-events-auto sm:max-h-none sm:translate-y-0 sm:border-white/10 sm:p-1.5 sm:opacity-100',
        )}
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const iconClassName = 'h-4 w-4 sm:h-6 sm:w-6';
          const Icon = item.icon === 'fish' ? null : item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={cn(
                'relative flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[9px] font-bold text-white/55 transition sm:h-16 sm:px-1 sm:text-xs',
                isActive && 'bg-violet-500 text-white shadow-lg shadow-violet-500/20',
                !isActive && 'hover:bg-white/10 hover:text-white',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon === 'fish' ? (
                <FishIcon fishId="carp" className={iconClassName} />
              ) : (
                <Icon className={iconClassName} />
              )}
              <span className="max-w-full truncate">{item.label}</span>
              {item.id === 'wheel' && wheelReady && (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.9)]" />
              )}
            </button>
          );
        })}
      </div>
      </div>
    </nav>
  );
};

export default BottomNav;
