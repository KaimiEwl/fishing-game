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
  <Card className={cn('admin-stat-card', toneClass)}>
    <CardContent className="grid min-h-[7rem] min-w-0 grid-cols-[minmax(0,1fr)_2.35rem] items-start gap-3 p-4">
      <div className="min-w-0">
        <p className="admin-stat-label" title={label}>{label}</p>
        <p className="admin-stat-value admin-metric-value font-bold text-foreground" title={String(value)}>{value}</p>
      </div>
      <div className="admin-stat-icon" aria-hidden="true">{icon}</div>
    </CardContent>
  </Card>
);

export default AdminStatCard;
