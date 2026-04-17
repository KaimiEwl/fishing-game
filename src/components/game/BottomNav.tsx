import React from 'react';
import { cn } from '@/lib/utils';
import type { GameTab } from '@/types/game';
import bottomNavArcadeStrip from '@/assets/bottom_nav_arcade_strip.png';

interface BottomNavProps {
  activeTab: GameTab;
  onTabChange: (tab: GameTab) => void;
  wheelReady: boolean;
}

const navItems: Array<{ id: GameTab; label: string; glow: string }> = [
  { id: 'fish', label: 'Fish', glow: 'shadow-[0_0_18px_rgba(59,130,246,0.45),0_0_36px_rgba(14,165,233,0.22)]' },
  { id: 'tasks', label: 'Tasks', glow: 'shadow-[0_0_18px_rgba(74,222,128,0.48),0_0_36px_rgba(34,197,94,0.22)]' },
  { id: 'shop', label: 'Shop', glow: 'shadow-[0_0_18px_rgba(250,204,21,0.48),0_0_36px_rgba(245,158,11,0.22)]' },
  { id: 'grill', label: 'Grill', glow: 'shadow-[0_0_18px_rgba(248,113,113,0.5),0_0_36px_rgba(239,68,68,0.24)]' },
  { id: 'wheel', label: 'Cube', glow: 'shadow-[0_0_18px_rgba(96,165,250,0.48),0_0_36px_rgba(56,189,248,0.24)]' },
  { id: 'leaderboard', label: 'Board', glow: 'shadow-[0_0_18px_rgba(255,255,255,0.35),0_0_36px_rgba(250,204,21,0.18)]' },
];

const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  wheelReady,
}) => {
  return (
    <nav className="relative z-40 shrink-0 bg-[#05070f] px-2 pt-1 pb-[max(0.45rem,env(safe-area-inset-bottom))] sm:px-4 sm:pt-2">
      <div className="mx-auto w-full max-w-[min(100%,41rem)] sm:max-w-[42rem]">
        <div className="relative mx-auto w-full">
          <img
            src={bottomNavArcadeStrip}
            alt=""
            aria-hidden="true"
            className="pointer-events-none block w-full select-none object-contain"
            draggable={false}
          />

          <div className="pointer-events-none absolute inset-x-[1.1%] inset-y-[2.5%] grid grid-cols-6 gap-[0.8%] sm:inset-x-[1%] sm:inset-y-[2.5%]">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    'pointer-events-auto relative h-full w-full rounded-[14px] transition duration-200 focus-visible:outline-none active:scale-[0.985]',
                    isActive
                      ? cn(
                          'ring-2 ring-inset ring-white/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]',
                          item.glow,
                        )
                      : 'hover:ring-1 hover:ring-white/18 hover:shadow-[0_0_10px_rgba(255,255,255,0.04)]',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <span className="sr-only">{item.label}</span>
                  {item.id === 'wheel' && wheelReady && (
                    <span className="absolute right-[10%] top-[10%] h-2.5 w-2.5 rounded-full bg-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
