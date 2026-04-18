import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminPlayer } from '@/hooks/useAdmin';

type TopListField = 'level' | 'coins' | 'total_catches';

interface AdminTopListProps {
  title: string;
  players: AdminPlayer[];
  field: TopListField;
}

const AdminTopList = ({ title, players, field }: AdminTopListProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-1">
      {players.slice(0, 5).map((player, index) => {
        const value = player[field];
        return (
          <div key={player.id} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {index + 1}.{' '}
              <span className="font-mono">
                {player.wallet_address.slice(0, 6)}...{player.wallet_address.slice(-4)}
              </span>
            </span>
            <span className="font-bold text-foreground">
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
