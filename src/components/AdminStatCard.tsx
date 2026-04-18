import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface AdminStatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
}

const AdminStatCard = ({ icon, label, value }: AdminStatCardProps) => (
  <Card>
    <CardContent className="flex flex-col items-center gap-1 p-4">
      <div className="text-primary">{icon}</div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </CardContent>
  </Card>
);

export default AdminStatCard;
