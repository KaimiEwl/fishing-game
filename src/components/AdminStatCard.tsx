import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AdminStatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  toneClass?: string;
}

const AdminStatCard = ({ icon, label, value, toneClass }: AdminStatCardProps) => (
  <Card className={cn(toneClass)}>
    <CardContent className="flex min-w-0 flex-col items-center gap-1 p-4 text-center">
      <div className="text-primary">{icon}</div>
      <p className="admin-metric-value text-center font-bold text-foreground" title={String(value)}>{value}</p>
      <p className="max-w-full truncate text-xs text-muted-foreground" title={label}>{label}</p>
    </CardContent>
  </Card>
);

export default AdminStatCard;
