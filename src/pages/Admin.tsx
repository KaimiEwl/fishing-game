import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useAdmin } from '@/hooks/useAdmin';
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

const ROD_NAMES = ['Начальная', 'Бамбуковая', 'Карбоновая', 'Проф.', 'Легендарная'];

export default function Admin() {
  const { address } = useAccount();
  const { isAdmin, loading, checkAdmin, listPlayers, updatePlayer, deletePlayer, getStats } = useAdmin(address);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [stats, setStats] = useState<any>(null);
  const [editPlayer, setEditPlayer] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { checkAdmin(); }, [checkAdmin]);

  const fetchPlayers = useCallback(async () => {
    try {
      const data = await listPlayers({ search, sort_by: sortBy, sort_dir: sortDir, page, per_page: 20 });
      setPlayers(data.players);
      setTotal(data.total);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    }
  }, [listPlayers, search, sortBy, sortDir, page, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    }
  }, [getStats, toast]);

  useEffect(() => {
    if (isAdmin) { fetchPlayers(); fetchStats(); }
  }, [isAdmin, fetchPlayers, fetchStats]);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const openEdit = (p: any) => {
    setEditPlayer(p);
    setEditForm({ coins: p.coins, bait: p.bait, level: p.level, xp: p.xp, rod_level: p.rod_level, equipped_rod: p.equipped_rod, login_streak: p.login_streak, nickname: p.nickname || '' });
  };

  const handleSave = async () => {
    if (!editPlayer) return;
    setSaving(true);
    try {
      const updates = { ...editForm, xp_to_next: editForm.level * 100, nickname: editForm.nickname || null };
      await updatePlayer(editPlayer.id, updates);
      toast({ title: 'Сохранено' });
      setEditPlayer(null);
      fetchPlayers();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить игрока?')) return;
    try {
      await deletePlayer(id);
      toast({ title: 'Удалён' });
      fetchPlayers();
      fetchStats();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse text-lg">Проверка доступа...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Shield className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">Доступ запрещён</h1>
        <p className="text-muted-foreground">У вас нет прав администратора</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Вернуться в игру
        </Button>
      </div>
    );
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Админ-панель</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> К игре
          </Button>
        </div>

        <Tabs defaultValue="stats">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="stats">📊 Статистика</TabsTrigger>
            <TabsTrigger value="players">👥 Игроки</TabsTrigger>
          </TabsList>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            {stats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <StatCard icon={<Users className="w-5 h-5" />} label="Игроков" value={stats.totalPlayers} />
                  <StatCard icon={<Activity className="w-5 h-5" />} label="Активных 24ч" value={stats.activeToday} />
                  <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Ср. уровень" value={stats.avgLevel} />
                  <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Макс. уровень" value={stats.maxLevel} />
                  <StatCard icon={<Coins className="w-5 h-5" />} label="Всего монет" value={stats.totalCoins.toLocaleString()} />
                  <StatCard icon={<FishIcon fishId="carp" className="w-5 h-5" />} label="Всего уловов" value={stats.totalCatches.toLocaleString()} />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Распределение по уровням</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(stats.levelDistribution).map(([bracket, count]) => (
                          <div key={bracket} className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-16">Ур. {bracket}</span>
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
                    <CardHeader><CardTitle className="text-base">Распределение удочек</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(stats.rodDistribution).map(([rod, count]) => (
                          <div key={rod} className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-28">{ROD_NAMES[Number(rod)] || `Удочка ${rod}`}</span>
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

                {/* Top players */}
                <div className="grid md:grid-cols-3 gap-4">
                  <TopList title="🏆 Топ по уровню" players={stats.topByLevel} field="level" />
                  <TopList title="💰 Топ по монетам" players={stats.topByCoins} field="coins" />
                  <TopList title="🎣 Топ по уловам" players={stats.topByCatches} field="total_catches" />
                </div>
              </>
            )}
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по адресу кошелька..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={fetchPlayers}>Обновить</Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-36">Никнейм</TableHead>
                      <TableHead className="w-52">Кошелёк</TableHead>
                      <SortableHead label="Ур." col="level" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <SortableHead label="Монеты" col="coins" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <SortableHead label="Наживка" col="bait" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <SortableHead label="Уловы" col="total_catches" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <TableHead>Удочка</TableHead>
                      <SortableHead label="Регистрация" col="created_at" current={sortBy} dir={sortDir} onSort={handleSort} />
                      <TableHead className="w-20">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm font-medium">{p.nickname || <span className="text-muted-foreground italic">—</span>}</TableCell>
                        <TableCell className="font-mono text-xs">{p.wallet_address.slice(0, 6)}...{p.wallet_address.slice(-4)}</TableCell>
                        <TableCell>{p.level}</TableCell>
                        <TableCell>{p.coins.toLocaleString()}</TableCell>
                        <TableCell>{p.bait}</TableCell>
                        <TableCell>{p.total_catches}</TableCell>
                        <TableCell>{ROD_NAMES[p.rod_level] || p.rod_level}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {players.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">Нет игроков</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</Button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>→</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={!!editPlayer} onOpenChange={() => setEditPlayer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редактирование игрока</DialogTitle>
            </DialogHeader>
            {editPlayer && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-mono">{editPlayer.wallet_address}</p>
                <div>
                  <label className="text-xs text-muted-foreground">Никнейм</label>
                  <Input value={editForm.nickname} onChange={e => setEditForm(f => ({ ...f, nickname: e.target.value }))} maxLength={20} placeholder="Без никнейма" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="Уровень" value={editForm.level} onChange={v => setEditForm(f => ({ ...f, level: Number(v) }))} />
                  <EditField label="XP" value={editForm.xp} onChange={v => setEditForm(f => ({ ...f, xp: Number(v) }))} />
                  <EditField label="Монеты" value={editForm.coins} onChange={v => setEditForm(f => ({ ...f, coins: Number(v) }))} />
                  <EditField label="Наживка" value={editForm.bait} onChange={v => setEditForm(f => ({ ...f, bait: Number(v) }))} />
                  <EditField label="Макс. удочка" value={editForm.rod_level} onChange={v => setEditForm(f => ({ ...f, rod_level: Number(v) }))} />
                  <EditField label="Экип. удочка" value={editForm.equipped_rod} onChange={v => setEditForm(f => ({ ...f, equipped_rod: Number(v) }))} />
                  <EditField label="Стрик логинов" value={editForm.login_streak} onChange={v => setEditForm(f => ({ ...f, login_streak: Number(v) }))} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditPlayer(null)}>Отмена</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Сохраняю...' : 'Сохранить'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
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

function TopList({ title, players, field }: { title: string; players: any[]; field: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        {players.slice(0, 5).map((p, i) => (
          <div key={p.id} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {i + 1}. <span className="font-mono">{p.wallet_address.slice(0, 6)}...{p.wallet_address.slice(-4)}</span>
            </span>
            <span className="font-bold text-foreground">{p[field]?.toLocaleString()}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EditField({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input type="number" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
