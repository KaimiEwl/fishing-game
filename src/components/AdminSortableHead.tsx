import { ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';

interface AdminSortableHeadProps {
  label: string;
  column: string;
  current: string;
  direction: 'asc' | 'desc';
  onSort: (column: string) => void;
}

const AdminSortableHead = ({
  label,
  column,
  current,
  direction,
  onSort,
}: AdminSortableHeadProps) => (
  <TableHead>
    <button
      type="button"
      className="flex items-center gap-1 hover:text-foreground"
      onClick={() => onSort(column)}
      aria-label={`Sort by ${label} (${current === column ? direction : 'desc'})`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${current === column ? 'text-primary' : 'text-muted-foreground'}`} />
    </button>
  </TableHead>
);

export default AdminSortableHead;
