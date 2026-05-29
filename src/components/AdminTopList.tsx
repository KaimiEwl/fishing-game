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
    <CardHeader className="pb-3">
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-1.5">
      {players.slice(0, 5).map((player, index) => {
        const value = player[field];
        return (
          <div key={player.id} className="admin-list-row">
            <span className="admin-list-rank">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              <span className="font-mono">
                {player.wallet_address.slice(0, 6)}...{player.wallet_address.slice(-4)}
              </span>
            </span>
            <span className="admin-list-value">
              {typeof value === 'number' ? value.toLocaleString() : '-'}
            </span>
          </div>
        );
      })}
      {players.length === 0 && (
        <div className="rounded-lg border border-dashed border-black/10 px-3 py-6 text-center text-xs text-muted-foreground">
          No entries yet
        </div>
      )}
    </CardContent>
  </Card>
);

export type { TopListField };
export default AdminTopList;
