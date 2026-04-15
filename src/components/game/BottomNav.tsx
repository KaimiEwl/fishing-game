import React from 'react';
import { ChefHat, Fish, Flame, ListChecks, ShoppingBag, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameTab } from '@/types/game';

interface BottomNavProps {
  activeTab: GameTab;
  onTabChange: (tab: GameTab) => void;
  wheelReady: boolean;
}

const navItems: Array<{ id: GameTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'fish', label: 'Fish', icon: Fish },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'shop', label: 'Shop', icon: ShoppingBag },
  { id: 'grill', label: 'Grill', icon: ChefHat },
  { id: 'wheel', label: 'Wheel', icon: Flame },
  { id: 'leaderboard', label: 'Board', icon: Trophy },
];

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, wheelReady }) => {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-5">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/75 p-1.5 shadow-2xl backdrop-blur-xl sm:grid-cols-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

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
              <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
              <span className="max-w-full truncate">{item.label}</span>
              {item.id === 'wheel' && wheelReady && (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.9)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
