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
    <CardContent className="flex flex-col items-center gap-1 p-4">
      <div className="text-primary">{icon}</div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </CardContent>
  </Card>
);

export default AdminStatCard;
