import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PlayerStatItemProps {
  icon: ReactNode;
  label: string;
  value: number;
  compact?: boolean;
}

const PlayerStatItem = ({ icon, label, value, compact = false }: PlayerStatItemProps) => (
  <div
    className={cn(
      'flex min-w-0 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/85',
      compact ? 'min-h-10 px-2 py-1' : 'px-2.5 py-1.5',
    )}
  >
    <span className="shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className={cn('truncate leading-tight text-zinc-400', compact ? 'text-[10px]' : 'text-xs')}>
        {label}
      </p>
      <p className={cn('font-bold leading-tight text-zinc-100', compact ? 'text-xs' : 'text-sm')}>
        {value}
      </p>
    </div>
  </div>
);

export default PlayerStatItem;
