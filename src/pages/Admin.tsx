import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { Users, Coins, TrendingUp, Activity, Search, Pencil, Trash2, Shield, ArrowLeft } from 'lucide-react';
import { useAdmin, type AdminPlayer, type AdminStats } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import FishIcon from '@/components/game/FishIcon';
import AdminEditField from '@/components/AdminEditField';
import AdminSortableHead from '@/components/AdminSortableHead';
import AdminStatCard from '@/components/AdminStatCard';
import AdminTopList from '@/components/AdminTopList';
import { getErrorMessage } from '@/lib/errorUtils';

const ROD_NAMES = ['Starter', 'Bamboo', 'Carbon', 'Pro', 'Legendary'];

type EditablePlayerForm = Pick<
  AdminPlayer,
  'coins' | 'bait' | 'level' | 'xp' | 'rod_level' | 'equipped_rod' | 'login_streak'
> & {
  nickname: string;
};

export default function Admin() {
  const { address } = useAccount();
  const { isAdmin, loading, checkAdmin, listPlayers, updatePlayer, deletePlayer, getStats } =
    useAdmin(address);
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
      const data = await listPlayers({
        search,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        per_page: 20,
      });
      setPlayers(data.players);
      setTotal(data.total);
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    }
  }, [listPlayers, page, search, sortBy, sortDir, toast]);

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
  }, [fetchPlayers, fetchStats, isAdmin]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
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

  const resetEditState = () => {
    setEditPlayer(null);
    setEditForm(null);
  };

  const handleSave = async () => {
    if (!editPlayer || !editForm) return;

    setSaving(true);
    try {
      await updatePlayer(editPlayer.id, {
        ...editForm,
        xp_to_next: editForm.level * 100,
        nickname: editForm.nickname || null,
      });
      toast({ title: 'Saved' });
      resetEditState();
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="animate-pulse text-lg text-muted-foreground">Checking admin access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Shield className="h-16 w-16 text-destructive" />
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
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>

        <Tabs defaultValue="stats">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-6">
            {stats && (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                  <AdminStatCard icon={<Users className="h-5 w-5" />} label="Players" value={stats.totalPlayers} />
                  <AdminStatCard icon={<Activity className="h-5 w-5" />} label="Active 24h" value={stats.activeToday} />
                  <AdminStatCard icon={<TrendingUp className="h-5 w-5" />} label="Avg level" value={stats.avgLevel} />
                  <AdminStatCard icon={<TrendingUp className="h-5 w-5" />} label="Max level" value={stats.maxLevel} />
                  <AdminStatCard icon={<Coins className="h-5 w-5" />} label="Total coins" value={stats.totalCoins.toLocaleString()} />
                  <AdminStatCard icon={<FishIcon fishId="carp" size="xs" />} label="Total catches" value={stats.totalCatches.toLocaleString()} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Level distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(stats.levelDistribution).map(([bracket, count]) => (
                          <div key={bracket} className="flex items-center gap-3">
                            <span className="w-16 text-sm text-muted-foreground">Lv. {bracket}</span>
                            <div className="h-5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${((count as number) / stats.totalPlayers) * 100}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-sm font-medium">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Rod distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(stats.rodDistribution).map(([rod, count]) => (
                          <div key={rod} className="flex items-center gap-3">
                            <span className="w-28 text-sm text-muted-foreground">
                              {ROD_NAMES[Number(rod)] || `Rod ${rod}`}
                            </span>
                            <div className="h-5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-accent-foreground transition-all"
                                style={{ width: `${((count as number) / stats.totalPlayers) * 100}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-sm font-medium">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <AdminTopList title="Top by level" players={stats.topByLevel} field="level" />
                  <AdminTopList title="Top by coins" players={stats.topByCoins} field="coins" />
                  <AdminTopList title="Top by catches" players={stats.topByCatches} field="total_catches" />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
              <Button variant="outline" onClick={fetchPlayers}>
                Refresh
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-36">Nickname</TableHead>
                      <TableHead className="w-52">Wallet</TableHead>
                      <AdminSortableHead label="Level" column="level" current={sortBy} direction={sortDir} onSort={handleSort} />
                      <AdminSortableHead label="Coins" column="coins" current={sortBy} direction={sortDir} onSort={handleSort} />
                      <AdminSortableHead label="Bait" column="bait" current={sortBy} direction={sortDir} onSort={handleSort} />
                      <AdminSortableHead label="Catches" column="total_catches" current={sortBy} direction={sortDir} onSort={handleSort} />
                      <TableHead>Rod</TableHead>
                      <AdminSortableHead label="Created" column="created_at" current={sortBy} direction={sortDir} onSort={handleSort} />
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="text-sm font-medium">
                          {player.nickname || <span className="italic text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {player.wallet_address.slice(0, 6)}...{player.wallet_address.slice(-4)}
                        </TableCell>
                        <TableCell>{player.level}</TableCell>
                        <TableCell>{player.coins.toLocaleString()}</TableCell>
                        <TableCell>{player.bait}</TableCell>
                        <TableCell>{player.total_catches}</TableCell>
                        <TableCell>{ROD_NAMES[player.rod_level] || player.rod_level}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(player.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(player)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(player.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {players.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                          No players found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  &larr;
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  &rarr;
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!editPlayer} onOpenChange={resetEditState}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit player</DialogTitle>
            </DialogHeader>
            {editPlayer && editForm && (
              <div className="space-y-4">
                <p className="font-mono text-sm text-muted-foreground">{editPlayer.wallet_address}</p>
                <div>
                  <label className="text-xs text-muted-foreground">Nickname</label>
                  <Input
                    value={editForm.nickname}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current ? { ...current, nickname: event.target.value } : current,
                      )
                    }
                    maxLength={20}
                    placeholder="No nickname"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <AdminEditField label="Level" value={editForm.level} onChange={(value) => setEditForm((current) => (current ? { ...current, level: Number(value) } : current))} />
                  <AdminEditField label="XP" value={editForm.xp} onChange={(value) => setEditForm((current) => (current ? { ...current, xp: Number(value) } : current))} />
                  <AdminEditField label="Coins" value={editForm.coins} onChange={(value) => setEditForm((current) => (current ? { ...current, coins: Number(value) } : current))} />
                  <AdminEditField label="Bait" value={editForm.bait} onChange={(value) => setEditForm((current) => (current ? { ...current, bait: Number(value) } : current))} />
                  <AdminEditField label="Max rod" value={editForm.rod_level} onChange={(value) => setEditForm((current) => (current ? { ...current, rod_level: Number(value) } : current))} />
                  <AdminEditField label="Equipped rod" value={editForm.equipped_rod} onChange={(value) => setEditForm((current) => (current ? { ...current, equipped_rod: Number(value) } : current))} />
                  <AdminEditField label="Login streak" value={editForm.login_streak} onChange={(value) => setEditForm((current) => (current ? { ...current, login_streak: Number(value) } : current))} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={resetEditState}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
