import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminPlayer } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';

type TopListField = 'level' | 'coins' | 'total_catches';

interface AdminTopListProps {
  title: string;
  players: AdminPlayer[];
  field: TopListField;
  toneClass?: string;
}

const AdminTopList = ({ title, players, field, toneClass }: AdminTopListProps) => (
  <Card className={cn(toneClass)}>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-1">
      {players.slice(0, 5).map((player, index) => {
        const value = player[field];
        return (
          <div key={player.id} className="flex min-w-0 items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-muted-foreground">
              {index + 1}.{' '}
              <span className="font-mono">
                {player.wallet_address.slice(0, 6)}...{player.wallet_address.slice(-4)}
              </span>
            </span>
            <span className="shrink-0 font-bold text-foreground">
              {typeof value === 'number' ? value.toLocaleString() : '-'}
            </span>
          </div>
        );
      })}
    </CardContent>
  </Card>
);

export type { TopListField };
export default AdminTopList;
