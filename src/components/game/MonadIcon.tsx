import React from 'react';
import { cn } from '@/lib/utils';

const MONAD_SIZES = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

interface MonadIconProps {
  size?: keyof typeof MONAD_SIZES;
  className?: string;
}

const MonadIcon: React.FC<MonadIconProps> = ({ size = 'md', className }) => {
  const iconSize = MONAD_SIZES[size];

  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center align-middle', className)}
      style={{ width: iconSize, height: iconSize, minWidth: iconSize }}
    >
      <svg
        viewBox="0 0 24 24"
        role="img"
        className="h-full w-full overflow-visible"
        focusable="false"
      >
        <path
          d="M12 3c-2.599 0-9 6.4-9 9s6.401 9 9 9 9-6.401 9-9-6.401-9-9-9m-1.402 14.146c-1.097-.298-4.043-5.453-3.744-6.549s5.453-4.042 6.549-3.743c1.095.298 4.042 5.453 3.743 6.549-.298 1.095-5.453 4.042-6.549 3.743"
          fill="#836EF9"
        />
      </svg>
    </span>
  );
};

export default MonadIcon;
