import React from 'react';
import { cn } from '@/lib/utils';
import type { GameTab } from '@/types/game';
import bottomNavArcadeStrip from '@/assets/bottom_nav_arcade_strip_v2.webp';

interface BottomNavProps {
  activeTab: GameTab;
  onTabChange: (tab: GameTab) => void;
  wheelReady: boolean;
  tasksBadgeCount?: number;
  grillBadgeCount?: number;
}

const navItems: Array<{ id: GameTab; label: string; glow: string }> = [
  { id: 'fish', label: 'Fish', glow: 'before:bg-[radial-gradient(circle,rgba(56,189,248,0.34)_0%,rgba(56,189,248,0.18)_46%,rgba(56,189,248,0)_76%)]' },
  { id: 'tasks', label: 'Tasks', glow: 'before:bg-[radial-gradient(circle,rgba(74,222,128,0.32)_0%,rgba(74,222,128,0.18)_46%,rgba(74,222,128,0)_76%)]' },
  { id: 'shop', label: 'Shop', glow: 'before:bg-[radial-gradient(circle,rgba(250,204,21,0.34)_0%,rgba(250,204,21,0.2)_46%,rgba(250,204,21,0)_76%)]' },
  { id: 'grill', label: 'Grill', glow: 'before:bg-[radial-gradient(circle,rgba(248,113,113,0.34)_0%,rgba(248,113,113,0.2)_46%,rgba(248,113,113,0)_76%)]' },
  { id: 'wheel', label: 'Cube', glow: 'before:bg-[radial-gradient(circle,rgba(96,165,250,0.34)_0%,rgba(96,165,250,0.18)_46%,rgba(96,165,250,0)_76%)]' },
  { id: 'leaderboard', label: 'Board', glow: 'before:bg-[radial-gradient(circle,rgba(250,204,21,0.3)_0%,rgba(255,255,255,0.16)_46%,rgba(255,255,255,0)_76%)]' },
];

const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  wheelReady,
  tasksBadgeCount = 0,
  grillBadgeCount = 0,
}) => {
  return (
    <nav className="relative z-40 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1 sm:px-4 sm:pt-2">
      <div className="mx-auto w-full max-w-[min(100%,34rem)] sm:max-w-[38rem]">
        <div className="relative mx-auto w-full">
          <img
            src={bottomNavArcadeStrip}
            alt=""
            aria-hidden="true"
            className="pointer-events-none block w-full select-none object-contain drop-shadow-[0_14px_26px_rgba(0,0,0,0.38)]"
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
                    'pointer-events-auto relative h-full w-full rounded-[14px] transition duration-200 focus-visible:outline-none active:scale-[0.985] before:absolute before:left-1/2 before:top-1/2 before:h-[64%] before:w-[74%] before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:opacity-0 before:transition-opacity before:duration-200',
                    isActive
                      ? cn(
                          'scale-[1.02] before:opacity-100',
                          item.glow,
                        )
                      : cn(
                          item.glow,
                          'hover:scale-[1.015] hover:before:opacity-80',
                        ),
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <span className="sr-only">{item.label}</span>
                  {item.id === 'tasks' && tasksBadgeCount > 0 && (
                    <span className="absolute right-[7%] top-[7%] inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-lime-200/80 bg-lime-400 px-1 text-[10px] font-black leading-none text-black shadow-[0_0_12px_rgba(163,230,53,0.6)]">
                      {tasksBadgeCount > 99 ? '99+' : tasksBadgeCount}
                    </span>
                  )}
                  {item.id === 'grill' && grillBadgeCount > 0 && (
                    <span className="absolute right-[7%] top-[7%] inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-amber-200/80 bg-amber-400 px-1 text-[10px] font-black leading-none text-black shadow-[0_0_12px_rgba(251,191,36,0.55)]">
                      {grillBadgeCount > 99 ? '99+' : grillBadgeCount}
                    </span>
                  )}
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
