import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { useAdmin, type AdminPlayer, type AdminStats } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Users, Coins, TrendingUp, Activity, Search, ArrowUpDown, Pencil, Trash2, Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FishIcon from '@/components/game/FishIcon';
import { getErrorMessage } from '@/lib/errorUtils';

const ROD_NAMES = ['Starter', 'Bamboo', 'Carbon', 'Pro', 'Legendary'];

type EditablePlayerForm = Pick<AdminPlayer, 'coins' | 'bait' | 'level' | 'xp' | 'rod_level' | 'equipped_rod' | 'login_streak'> & {
  nickname: string;
};

type TopListField = 'level' | 'coins' | 'total_catches';

export default function Admin() {
  const { address } = useAccount();
  const { isAdmin, loading, checkAdmin, listPlayers, updatePlayer, deletePlayer, getStats } = useAdmin(address);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [editPlayer, setEditPlayer] = useState<AdminPlayer | null>(null);
  const [editForm, setEditForm] = useState<EditablePlayerForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  const fetchPlayers = useCallback(async () => {
    try {
      const data = await listPlayers({ search, sort_by: sortBy, sort_dir: sortDir, page, per_page: 20 });
      setPlayers(data.players);
      setTotal(data.total);
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    }
  }, [listPlayers, search, sortBy, sortDir, page, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    }
  }, [getStats, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchPlayers();
      fetchStats();
    }
  }, [isAdmin, fetchPlayers, fetchStats]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortBy(column);
    setSortDir('desc');
  };

  const openEdit = (player: AdminPlayer) => {
    setEditPlayer(player);
    setEditForm({
      coins: player.coins,
      bait: player.bait,
      level: player.level,
      xp: player.xp,
      rod_level: player.rod_level,
      equipped_rod: player.equipped_rod,
      login_streak: player.login_streak,
      nickname: player.nickname ?? '',
    });
  };

  const handleSave = async () => {
    if (!editPlayer || !editForm) return;

    setSaving(true);
    try {
      const updates = {
        ...editForm,
        xp_to_next: editForm.level * 100,
        nickname: editForm.nickname || null,
      };

      await updatePlayer(editPlayer.id, updates);
      toast({ title: 'Saved' });
      setEditPlayer(null);
      setEditForm(null);
      fetchPlayers();
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete player?')) return;

    try {
      await deletePlayer(id);
      toast({ title: 'Deleted' });
      fetchPlayers();
      fetchStats();
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse text-lg">Checking admin access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Shield className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">Access denied</h1>
        <p className="text-muted-foreground">This wallet does not have admin permissions.</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to game
        </Button>
      </div>
    );
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>

        <Tabs defaultValue="stats">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-6">
            {stats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <StatCard icon={<Users className="w-5 h-5" />} label="Players" value={stats.totalPlayers} />
                  <StatCard icon={<Activity className="w-5 h-5" />} label="Active 24h" value={stats.activeToday} />
                  <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Avg level" value={stats.avgLevel} />
                  <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Max level" value={stats.maxLevel} />
                  <StatCard icon={<Coins className="w-5 h-5" />} label="Total coins" value={stats.totalCoins.toLocaleString()} />
                  <StatCard icon={<FishIcon fishId="carp" className="w-5 h-5" />} label="Total catches" value={stats.totalCatches.toLocaleString()} />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Level distribution</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(stats.levelDistribution).map(([bracket, count]) => (
                          <div key={bracket} className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-16">Lv. {bracket}</span>
                            <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                              <div
                                className="bg-primary h-full rounded-full transition-all"
                                style={{ width: `${((count as number) / stats.totalPlayers) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-10 text-right">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-base">Rod distribution</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(stats.rodDistribution).map(([rod, count]) => (
                          <div key={rod} className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-28">{ROD_NAMES[Number(rod)] || `Rod ${rod}`}</span>
                            <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                              <div
                                className="bg-accent-foreground h-full rounded-full transition-all"
                                style={{ width: `${((count as number) / stats.totalPlayers) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-10 text-right">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <TopList title="Top by level" players={stats.topByLevel} field="level" />
                  <TopList title="Top by coins" players={stats.topByCoins} field="coins" />
                  <TopList title="Top by catches" players={stats.topByCatches} field="total_catches" />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search wallet address..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={fetchPlayers}>Refresh</Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-36">Nickname</TableHead>
                      <TableHead className="w-52">Wallet</TableHead>
                      <SortableHead label="Level" col="level" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <SortableHead label="Coins" col="coins" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <SortableHead label="Bait" col="bait" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <SortableHead label="Catches" col="total_catches" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <TableHead>Rod</TableHead>
                      <SortableHead label="Created" col="created_at" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="text-sm font-medium">
                          {player.nickname || <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {player.wallet_address.slice(0, 6)}...{player.wallet_address.slice(-4)}
                        </TableCell>
                        <TableCell>{player.level}</TableCell>
                        <TableCell>{player.coins.toLocaleString()}</TableCell>
                        <TableCell>{player.bait}</TableCell>
                        <TableCell>{player.total_catches}</TableCell>
                        <TableCell>{ROD_NAMES[player.rod_level] || player.rod_level}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(player.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(player)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(player.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {players.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No players found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>←</Button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>→</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!editPlayer} onOpenChange={() => { setEditPlayer(null); setEditForm(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit player</DialogTitle>
            </DialogHeader>
            {editPlayer && editForm && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-mono">{editPlayer.wallet_address}</p>
                <div>
                  <label className="text-xs text-muted-foreground">Nickname</label>
                  <Input
                    value={editForm.nickname}
                    onChange={(event) => setEditForm((current) => current ? { ...current, nickname: event.target.value } : current)}
                    maxLength={20}
                    placeholder="No nickname"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="Level" value={editForm.level} onChange={(value) => setEditForm((current) => current ? { ...current, level: Number(value) } : current)} />
                  <EditField label="XP" value={editForm.xp} onChange={(value) => setEditForm((current) => current ? { ...current, xp: Number(value) } : current)} />
                  <EditField label="Coins" value={editForm.coins} onChange={(value) => setEditForm((current) => current ? { ...current, coins: Number(value) } : current)} />
                  <EditField label="Bait" value={editForm.bait} onChange={(value) => setEditForm((current) => current ? { ...current, bait: Number(value) } : current)} />
                  <EditField label="Max rod" value={editForm.rod_level} onChange={(value) => setEditForm((current) => current ? { ...current, rod_level: Number(value) } : current)} />
                  <EditField label="Equipped rod" value={editForm.equipped_rod} onChange={(value) => setEditForm((current) => current ? { ...current, equipped_rod: Number(value) } : current)} />
                  <EditField label="Login streak" value={editForm.login_streak} onChange={(value) => setEditForm((current) => current ? { ...current, login_streak: Number(value) } : current)} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditPlayer(null); setEditForm(null); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center gap-1">
        <div className="text-primary">{icon}</div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function SortableHead({ label, col, current, dir, onSort }: { label: string; col: string; current: string; dir: string; onSort: (c: string) => void }) {
  return (
    <TableHead>
      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => onSort(col)}>
        {label}
        <ArrowUpDown className={`w-3 h-3 ${current === col ? 'text-primary' : 'text-muted-foreground'}`} />
      </button>
    </TableHead>
  );
}

function TopList({ title, players, field }: { title: string; players: AdminPlayer[]; field: TopListField }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        {players.slice(0, 5).map((player, index) => {
          const value = player[field];
          return (
            <div key={player.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {index + 1}. <span className="font-mono">{player.wallet_address.slice(0, 6)}...{player.wallet_address.slice(-4)}</span>
              </span>
              <span className="font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : '—'}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function EditField({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input type="number" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
