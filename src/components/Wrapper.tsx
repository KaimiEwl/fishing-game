import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const gapClasses = {
  0: 'gap-0',
  1: 'gap-1',
  1.5: 'gap-1.5',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
} as const;

const paddingClasses = {
  0: 'p-0',
  1: 'p-1',
  2: 'p-2',
  3: 'p-3',
  4: 'p-4',
  5: 'p-5',
  6: 'p-6',
  8: 'p-8',
} as const;

const paddingXClasses = {
  0: 'px-0',
  1: 'px-1',
  2: 'px-2',
  3: 'px-3',
  4: 'px-4',
  5: 'px-5',
  6: 'px-6',
  8: 'px-8',
} as const;

const paddingYClasses = {
  0: 'py-0',
  1: 'py-1',
  2: 'py-2',
  3: 'py-3',
  4: 'py-4',
  5: 'py-5',
  6: 'py-6',
  8: 'py-8',
} as const;

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const;

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
} as const;

const gridColumnsClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
} as const;

type GapSize = keyof typeof gapClasses;
type PaddingSize = keyof typeof paddingClasses;
type PaddingAxisSize = keyof typeof paddingXClasses;
type AlignMode = keyof typeof alignClasses;
type JustifyMode = keyof typeof justifyClasses;
type GridColumns = keyof typeof gridColumnsClasses;

interface WrapperProps {
  children: ReactNode;
  as?: ElementType;
  dir?: 'row' | 'column' | 'grid';
  gap?: GapSize;
  padding?: PaddingSize;
  paddingX?: PaddingAxisSize;
  paddingY?: PaddingAxisSize;
  align?: AlignMode;
  justify?: JustifyMode;
  columns?: GridColumns;
  wrap?: boolean;
  fullWidth?: boolean;
  fullHeight?: boolean;
  inline?: boolean;
}

const Wrapper = ({
  children,
  as: Component = 'div',
  dir = 'column',
  gap,
  padding,
  paddingX,
  paddingY,
  align,
  justify,
  columns,
  wrap = false,
  fullWidth = false,
  fullHeight = false,
  inline = false,
}: WrapperProps) => {
  const displayClass = dir === 'grid' ? 'grid' : inline ? 'inline-flex' : 'flex';
  const directionClass = dir === 'column' ? 'flex-col' : dir === 'row' ? 'flex-row' : undefined;

  return (
    <Component
      className={cn(
        displayClass,
        directionClass,
        gap !== undefined && gapClasses[gap],
        padding !== undefined && paddingClasses[padding],
        paddingX !== undefined && paddingXClasses[paddingX],
        paddingY !== undefined && paddingYClasses[paddingY],
        align && alignClasses[align],
        justify && justifyClasses[justify],
        columns && dir === 'grid' && gridColumnsClasses[columns],
        wrap && 'flex-wrap',
        fullWidth && 'w-full',
        fullHeight && 'h-full',
      )}
    >
      {children}
    </Component>
  );
};

export default Wrapper;
