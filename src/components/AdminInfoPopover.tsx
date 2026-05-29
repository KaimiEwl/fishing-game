import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface AdminInfoPopoverProps {
  title: string;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

const AdminInfoPopover = ({
  title,
  children,
  align = 'end',
  className,
}: AdminInfoPopoverProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Info: ${title}`}
        className={cn(
          'admin-glass-icon-button h-8 w-8 shrink-0 rounded-full border-black/10 bg-white text-slate-500 shadow-sm shadow-black/5 hover:bg-slate-50 hover:text-blue-600',
          className,
        )}
      >
        <Info className="h-4 w-4" />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      align={align}
      sideOffset={8}
      className="admin-glass-popover z-[80] w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-black/10 bg-white p-4 text-slate-600 shadow-xl shadow-black/10"
    >
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <div className="mt-2 space-y-2 text-sm leading-6">
        {children}
      </div>
    </PopoverContent>
  </Popover>
);

export default AdminInfoPopover;
