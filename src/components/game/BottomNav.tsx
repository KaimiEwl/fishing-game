import React from 'react';
import { cn } from '@/lib/utils';
import type { GameTab } from '@/types/game';
import bottomNavArcadePanel from '@/assets/bottom_nav_arcade_panel.png';

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
    <nav className="relative z-40 shrink-0 border-t border-cyan-900/30 bg-[#05070f] px-1.5 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] sm:px-4 sm:pt-2">
      <div className="mx-auto w-full max-w-5xl">
        <div className="relative mx-auto h-[5.55rem] w-full max-w-[min(100%,46rem)] sm:h-[6.5rem]">
          <img
            src={bottomNavArcadePanel}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full rounded-xl object-cover object-center [object-position:center_61%] select-none"
            draggable={false}
          />

          <div className="pointer-events-none absolute inset-x-[1.8%] bottom-[15%] top-[44%] grid grid-cols-6 gap-[0.8%] sm:inset-x-[1.6%] sm:bottom-[14%] sm:top-[43%]">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    'pointer-events-auto relative h-full w-full rounded-[12px] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80 active:scale-[0.98]',
                    isActive
                      ? cn(
                          'border border-white/20 bg-white/[0.04] backdrop-blur-[1px]',
                          item.glow,
                        )
                      : 'hover:bg-white/[0.03] hover:shadow-[0_0_14px_rgba(255,255,255,0.08)]',
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
