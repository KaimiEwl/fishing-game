import React from 'react';
import { ChefHat, Flame, ListChecks, ShoppingBag, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameTab } from '@/types/game';
import FishIcon from './FishIcon';

interface BottomNavProps {
  activeTab: GameTab;
  onTabChange: (tab: GameTab) => void;
  wheelReady: boolean;
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
}) => {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-5">
      <div className="mx-auto w-full max-w-3xl">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-1 rounded-lg border border-cyan-300/15 bg-black/90 p-1.5 shadow-[0_-12px_36px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:grid-cols-6">
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
                'relative flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-0.5 text-[9px] font-bold transition sm:h-16 sm:px-1 sm:text-xs',
                isActive && 'border-cyan-300/35 bg-zinc-900 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.18)]',
                !isActive && 'border-transparent bg-black text-zinc-500 hover:border-zinc-700 hover:bg-zinc-950 hover:text-zinc-200',
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
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
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
