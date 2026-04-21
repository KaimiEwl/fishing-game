import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Eye,
  MessageSquare,
  Pencil,
  Search,
  Shield,
  Trash2,
  TrendingUp,
  Users,
  Coins,
} from 'lucide-react';
import {
  useAdmin,
  type AdminPlayer,
  type AdminPlayerDetails,
  type AdminPlayerActivityEntry,
  type AdminPlayerMessage,
  type AdminSuspiciousPlayer,
  type AdminSuspiciousSummary,
  type AdminSocialTaskVerification,
  type AdminStats,
  type AdminWeeklyPayoutBatch,
  type AdminWeeklyPayoutPreviewEntry,
  type AdminWithdrawRequest,
  type AdminWithdrawSummary,
  type SocialTaskStatus,
  type WithdrawRequestStatus,
} from '@/hooks/useAdmin';
import AdminPlayerDetailSheet from '@/components/AdminPlayerDetailSheet';
import AdminPlayerMessageCenter from '@/components/AdminPlayerMessageCenter';
import AdminSuspiciousCenter from '@/components/AdminSuspiciousCenter';
import AdminSocialTaskCenter from '@/components/AdminSocialTaskCenter';
import AdminWithdrawRequestCenter from '@/components/AdminWithdrawRequestCenter';
import AdminWeeklyPayoutCenter from '@/components/AdminWeeklyPayoutCenter';
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
import { cn } from '@/lib/utils';

const ROD_NAMES = ['Starter', 'Bamboo', 'Carbon', 'Pro', 'Legendary'];

type AdminTab = 'overview' | 'players' | 'messages' | 'withdrawals' | 'weekly' | 'social';

type EditablePlayerForm = Pick<
  AdminPlayer,
  'coins' | 'bait' | 'daily_free_bait' | 'level' | 'xp' | 'rod_level' | 'equipped_rod' | 'login_streak'
> & {
  nickname: string;
};

const formatWallet = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`;

export default function Admin() {
  const { address } = useAccount();
  const {
    isAdmin,
    loading,
    checkAdmin,
    listPlayers,
    getPlayerDetails,
    listPlayerActivity,
    listPlayerMessages,
    sendPlayerMessage,
    listWithdrawRequests,
    getAdminWithdrawSummary,
    getSuspiciousSummary,
    listSuspiciousPlayers,
    approveWithdrawRequest,
    rejectWithdrawRequest,
    markWithdrawPaid,
    grantMonReward,
    previewWeeklyPayouts,
    applyWeeklyPayouts,
    listWeeklyPayoutBatches,
    listSocialTaskVerifications,
    setSocialTaskVerification,
    updatePlayer,
    deletePlayer,
    getStats,
  } = useAdmin(address);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<AdminPlayer | null>(null);
  const [selectedPlayerDetails, setSelectedPlayerDetails] = useState<AdminPlayerDetails | null>(null);
  const [selectedPlayerActivity, setSelectedPlayerActivity] = useState<AdminPlayerActivityEntry[]>([]);
  const [selectedPlayerMessages, setSelectedPlayerMessages] = useState<AdminPlayerMessage[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<AdminWithdrawRequest[]>([]);
  const [withdrawSummary, setWithdrawSummary] = useState<AdminWithdrawSummary | null>(null);
  const [suspiciousSummary, setSuspiciousSummary] = useState<AdminSuspiciousSummary | null>(null);
  const [suspiciousPlayers, setSuspiciousPlayers] = useState<AdminSuspiciousPlayer[]>([]);
  const [withdrawFilter, setWithdrawFilter] = useState<WithdrawRequestStatus | 'all'>('pending');
  const [weeklyPreview, setWeeklyPreview] = useState<AdminWeeklyPayoutPreviewEntry[]>([]);
  const [weeklyPreviewWeekKey, setWeeklyPreviewWeekKey] = useState<string | null>(null);
  const [weeklyAlreadyApplied, setWeeklyAlreadyApplied] = useState(false);
  const [weeklyBatches, setWeeklyBatches] = useState<AdminWeeklyPayoutBatch[]>([]);
  const [socialVerifications, setSocialVerifications] = useState<AdminSocialTaskVerification[]>([]);
  const [socialFilter, setSocialFilter] = useState<SocialTaskStatus | 'all'>('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [withdrawsLoading, setWithdrawsLoading] = useState(false);
  const [suspiciousLoading, setSuspiciousLoading] = useState(false);
  const [processingWithdrawId, setProcessingWithdrawId] = useState<string | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyApplying, setWeeklyApplying] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialProcessingId, setSocialProcessingId] = useState<string | null>(null);
  const [editPlayer, setEditPlayer] = useState<AdminPlayer | null>(null);
  const [editForm, setEditForm] = useState<EditablePlayerForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void checkAdmin();
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

  const fetchWithdrawSummary = useCallback(async () => {
    try {
      const data = await getAdminWithdrawSummary();
      setWithdrawSummary(data);
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    }
  }, [getAdminWithdrawSummary, toast]);

  const fetchWithdrawRequests = useCallback(async () => {
    setWithdrawsLoading(true);
    try {
      const data = await listWithdrawRequests({
        status: withdrawFilter,
        limit: 100,
      });
      setWithdrawRequests(data);
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setWithdrawsLoading(false);
    }
  }, [listWithdrawRequests, toast, withdrawFilter]);

  const fetchSuspiciousData = useCallback(async () => {
    setSuspiciousLoading(true);
    try {
      const [summary, players] = await Promise.all([
        getSuspiciousSummary(),
        listSuspiciousPlayers(20),
      ]);
      setSuspiciousSummary(summary);
      setSuspiciousPlayers(players);
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSuspiciousLoading(false);
    }
  }, [getSuspiciousSummary, listSuspiciousPlayers, toast]);

  const fetchWeeklyData = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const [previewData, batches] = await Promise.all([
        previewWeeklyPayouts(),
        listWeeklyPayoutBatches(12),
      ]);
      setWeeklyPreviewWeekKey(previewData.weekKey);
      setWeeklyPreview(previewData.preview);
      setWeeklyAlreadyApplied(previewData.alreadyApplied);
      setWeeklyBatches(batches);
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setWeeklyLoading(false);
    }
  }, [listWeeklyPayoutBatches, previewWeeklyPayouts, toast]);

  const fetchSocialData = useCallback(async () => {
    setSocialLoading(true);
    try {
      const data = await listSocialTaskVerifications({
        status: socialFilter,
        limit: 100,
      });
      setSocialVerifications(data);
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSocialLoading(false);
    }
  }, [listSocialTaskVerifications, socialFilter, toast]);

  const loadSelectedPlayerContext = useCallback(async (player: AdminPlayer, openDetails = false) => {
    setSelectedPlayer(player);
    setSelectedPlayerDetails(null);
    setSelectedPlayerActivity([]);
    setSelectedPlayerMessages([]);
    setDetailsLoading(true);
    setMessagesLoading(true);

    try {
      const [details, activity, messages] = await Promise.all([
        getPlayerDetails(player.id),
        listPlayerActivity(player.id, 50),
        listPlayerMessages(player.id, 50),
      ]);

      setSelectedPlayerDetails(details);
      setSelectedPlayerActivity(activity);
      setSelectedPlayerMessages(messages);

      if (openDetails) {
        setDetailOpen(true);
      }
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setDetailsLoading(false);
      setMessagesLoading(false);
    }
  }, [getPlayerDetails, listPlayerActivity, listPlayerMessages, toast]);

  useEffect(() => {
    if (isAdmin) {
      void fetchPlayers();
      void fetchStats();
      void fetchWithdrawSummary();
    }
  }, [fetchPlayers, fetchStats, fetchWithdrawSummary, isAdmin]);

  useEffect(() => {
    if (isAdmin && activeTab === 'withdrawals') {
      void fetchWithdrawRequests();
      void fetchWithdrawSummary();
    }
  }, [activeTab, fetchWithdrawRequests, fetchWithdrawSummary, isAdmin]);

  useEffect(() => {
    if (isAdmin && activeTab === 'weekly') {
      void fetchWeeklyData();
    }
  }, [activeTab, fetchWeeklyData, isAdmin]);

  useEffect(() => {
    if (isAdmin && activeTab === 'overview') {
      void fetchSuspiciousData();
    }
  }, [activeTab, fetchSuspiciousData, isAdmin]);

  useEffect(() => {
    if (isAdmin && activeTab === 'social') {
      void fetchSocialData();
    }
  }, [activeTab, fetchSocialData, isAdmin]);

  const totalPages = Math.ceil(total / 20);

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
      daily_free_bait: player.daily_free_bait,
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

  const syncUpdatedPlayer = useCallback((updatedPlayer: AdminPlayer) => {
    setPlayers((current) => current.map((player) => player.id === updatedPlayer.id ? updatedPlayer : player));
    setSelectedPlayer((current) => current?.id === updatedPlayer.id ? updatedPlayer : current);
  }, []);

  const handleSave = async () => {
    if (!editPlayer || !editForm) return;

    setSaving(true);
    try {
      const nextUpdates: Record<string, unknown> = {
        coins: editForm.coins,
        bait: editForm.bait,
        daily_free_bait: editForm.daily_free_bait,
        level: editForm.level,
        xp: editForm.xp,
        rod_level: editForm.rod_level,
        equipped_rod: editForm.equipped_rod,
        login_streak: editForm.login_streak,
        xp_to_next: editForm.level * 100,
      };

      if (Object.prototype.hasOwnProperty.call(editPlayer, 'nickname')) {
        nextUpdates.nickname = editForm.nickname || null;
      }

      const updatedPlayer = await updatePlayer(editPlayer.id, {
        ...nextUpdates,
      });
      syncUpdatedPlayer(updatedPlayer);
      toast({ title: 'Saved' });
      resetEditState();
      await fetchPlayers();
      await fetchStats();
      if (selectedPlayer?.id === updatedPlayer.id) {
        await loadSelectedPlayerContext(updatedPlayer, false);
      }
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickGrant = useCallback(async (
    player: AdminPlayer,
    field: 'coins' | 'bait' | 'daily_free_bait',
    amount: number,
  ) => {
    try {
      const currentValue = player[field] ?? 0;
      const updatedPlayer = await updatePlayer(player.id, {
        [field]: Number(currentValue) + amount,
      });
      syncUpdatedPlayer(updatedPlayer);
      await fetchStats();
      await loadSelectedPlayerContext(updatedPlayer, false);
      toast({ title: 'Grant applied', description: `${amount} ${field.replaceAll('_', ' ')} granted.` });
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    }
  }, [fetchStats, loadSelectedPlayerContext, syncUpdatedPlayer, toast, updatePlayer]);

  const handleGrantMon = useCallback(async (player: AdminPlayer, amountMon: number, adminNote?: string) => {
    try {
      await grantMonReward(player.id, amountMon, adminNote);
      toast({
        title: 'MON granted',
        description: `${amountMon} MON granted to ${player.nickname || formatWallet(player.wallet_address)}.`,
      });
      await fetchWithdrawSummary();
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    }
  }, [fetchWithdrawSummary, grantMonReward, toast]);

  const handleInspectSuspiciousPlayer = useCallback((player: AdminSuspiciousPlayer) => {
    const existingPlayer = players.find((entry) => entry.wallet_address === player.walletAddress);
    if (existingPlayer) {
      void loadSelectedPlayerContext(existingPlayer, true);
      return;
    }

    setSearch(player.walletAddress);
    setPage(1);
    setActiveTab('players');
  }, [loadSelectedPlayerContext, players]);

  const handleDelete = async (player: AdminPlayer) => {
    if (!confirm('Delete player?')) return;

    try {
      await deletePlayer(player.id);
      setPlayers((current) => current.filter((entry) => entry.id !== player.id));
      if (selectedPlayer?.id === player.id) {
        setSelectedPlayer(null);
        setSelectedPlayerDetails(null);
        setSelectedPlayerActivity([]);
        setSelectedPlayerMessages([]);
        setDetailOpen(false);
      }
      toast({ title: 'Deleted' });
      await fetchPlayers();
      await fetchStats();
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const handleSendMessage = async (title: string, body: string) => {
    if (!selectedPlayer) return;

    setMessageSending(true);
    try {
      await sendPlayerMessage(selectedPlayer.id, title, body);
      const nextMessages = await listPlayerMessages(selectedPlayer.id, 50);
      setSelectedPlayerMessages(nextMessages);
      toast({ title: 'Message sent', description: 'The player will see it in Inbox.' });
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setMessageSending(false);
    }
  };

  const handleApproveWithdraw = async (requestId: string) => {
    setProcessingWithdrawId(requestId);
    try {
      await approveWithdrawRequest(requestId);
      toast({ title: 'Withdraw approved' });
      await fetchWithdrawRequests();
      await fetchWithdrawSummary();
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setProcessingWithdrawId(null);
    }
  };

  const handleRejectWithdraw = async (requestId: string) => {
    setProcessingWithdrawId(requestId);
    try {
      await rejectWithdrawRequest(requestId);
      toast({ title: 'Withdraw rejected' });
      await fetchWithdrawRequests();
      await fetchWithdrawSummary();
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setProcessingWithdrawId(null);
    }
  };

  const handleMarkWithdrawPaid = async (requestId: string, payoutTxHash: string) => {
    setProcessingWithdrawId(requestId);
    try {
      await markWithdrawPaid(requestId, payoutTxHash);
      toast({ title: 'Withdraw marked as paid', description: 'Payout tx hash saved.' });
      await fetchWithdrawRequests();
      await fetchWithdrawSummary();
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setProcessingWithdrawId(null);
    }
  };

  const handleApplyWeeklyPayouts = async () => {
    setWeeklyApplying(true);
    try {
      await applyWeeklyPayouts();
      toast({ title: 'Weekly payout applied' });
      await fetchWeeklyData();
      await fetchWithdrawSummary();
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setWeeklyApplying(false);
    }
  };

  const handleSetSocialVerification = async (
    verification: AdminSocialTaskVerification,
    status: AdminSocialTaskVerification['status'],
  ) => {
    setSocialProcessingId(verification.id);
    try {
      await setSocialTaskVerification(
        verification.playerId,
        verification.taskId,
        status,
        verification.proofUrl ?? undefined,
      );
      toast({ title: 'Social task updated', description: `${verification.taskTitle} -> ${status.replaceAll('_', ' ')}` });
      await fetchSocialData();
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSocialProcessingId(null);
    }
  };

  const messageListTitle = useMemo(() => (
    selectedPlayer
      ? `${selectedPlayer.nickname || formatWallet(selectedPlayer.wallet_address)}`
      : 'No player selected'
  ), [selectedPlayer]);

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

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminTab)}>
          <TabsList className="grid w-full max-w-4xl grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="withdrawals" className="gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Withdrawals
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Social
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
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
                                style={{ width: `${stats.totalPlayers > 0 ? ((count as number) / stats.totalPlayers) * 100 : 0}%` }}
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
                                style={{ width: `${stats.totalPlayers > 0 ? ((count as number) / stats.totalPlayers) * 100 : 0}%` }}
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

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-300" />
                    <h2 className="text-base font-semibold text-foreground">Security watch</h2>
                  </div>
                  <AdminSuspiciousCenter
                    summary={suspiciousSummary}
                    players={suspiciousPlayers}
                    loading={suspiciousLoading}
                    onRefresh={() => void fetchSuspiciousData()}
                    onInspectPlayer={handleInspectSuspiciousPlayer}
                  />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search wallet or nickname..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={() => void fetchPlayers()}>
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
                      <TableHead className="w-40">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map((player) => (
                      <TableRow key={player.id} className={cn(selectedPlayer?.id === player.id && 'bg-primary/5')}>
                        <TableCell className="text-sm font-medium">
                          {player.nickname || <span className="italic text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {player.wallet_address.slice(0, 6)}...{player.wallet_address.slice(-4)}
                        </TableCell>
                        <TableCell>{player.level}</TableCell>
                        <TableCell>{player.coins.toLocaleString()}</TableCell>
                        <TableCell>{(player.bait + player.daily_free_bait).toLocaleString()}</TableCell>
                        <TableCell>{player.total_catches}</TableCell>
                        <TableCell>{ROD_NAMES[player.rod_level] || player.rod_level}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(player.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => void loadSelectedPlayerContext(player, true)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setActiveTab('messages');
                                void loadSelectedPlayerContext(player, false);
                              }}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(player)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => void handleDelete(player)}>
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

          <TabsContent value="messages" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[18rem,1fr]">
              <Card className="border-zinc-800 bg-zinc-950">
                <CardHeader>
                  <CardTitle className="text-base text-zinc-100">Select player</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      placeholder="Search wallet or nickname..."
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                      className="border-zinc-800 bg-black pl-9 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-2">
                    {players.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => void loadSelectedPlayerContext(player, false)}
                        className={cn(
                          'w-full rounded-lg border px-3 py-3 text-left transition-colors',
                          selectedPlayer?.id === player.id
                            ? 'border-cyan-300/25 bg-cyan-300/10 text-zinc-100'
                            : 'border-zinc-800 bg-black text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900',
                        )}
                      >
                        <p className="truncate text-sm font-semibold">{player.nickname || formatWallet(player.wallet_address)}</p>
                        <p className="mt-1 font-mono text-[11px] text-zinc-400">{player.wallet_address}</p>
                      </button>
                    ))}
                    {players.length === 0 && (
                      <p className="text-sm text-zinc-400">No players found for the current search.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-100">{messageListTitle}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Send a personal in-game inbox message. Messages are visible in Settings - Inbox.
                  </p>
                </div>
                <AdminPlayerMessageCenter
                  player={selectedPlayer}
                  messages={selectedPlayerMessages}
                  loading={messagesLoading}
                  sending={messageSending}
                  onSend={handleSendMessage}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-4">
            <AdminWithdrawRequestCenter
              requests={withdrawRequests}
              summary={withdrawSummary}
              filter={withdrawFilter}
              loading={withdrawsLoading}
              processingRequestId={processingWithdrawId}
              onFilterChange={setWithdrawFilter}
              onRefresh={() => {
                void fetchWithdrawRequests();
                void fetchWithdrawSummary();
              }}
              onApprove={handleApproveWithdraw}
              onReject={handleRejectWithdraw}
              onMarkPaid={handleMarkWithdrawPaid}
            />
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            <AdminWeeklyPayoutCenter
              weekKey={weeklyPreviewWeekKey}
              preview={weeklyPreview}
              batches={weeklyBatches}
              alreadyApplied={weeklyAlreadyApplied}
              loading={weeklyLoading}
              applying={weeklyApplying}
              onRefresh={() => {
                void fetchWeeklyData();
              }}
              onApply={() => {
                void handleApplyWeeklyPayouts();
              }}
            />
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <AdminSocialTaskCenter
              verifications={socialVerifications}
              filter={socialFilter}
              loading={socialLoading}
              processingVerificationId={socialProcessingId}
              onFilterChange={setSocialFilter}
              onRefresh={() => {
                void fetchSocialData();
              }}
              onSetStatus={(verification, status) => {
                void handleSetSocialVerification(verification, status);
              }}
            />
          </TabsContent>
        </Tabs>

        <AdminPlayerDetailSheet
          open={detailOpen}
          onOpenChange={setDetailOpen}
          details={selectedPlayerDetails}
          activity={selectedPlayerActivity}
          loading={detailsLoading}
          onQuickGrant={handleQuickGrant}
          onGrantMon={handleGrantMon}
        />

        <Dialog open={!!editPlayer} onOpenChange={resetEditState}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit player</DialogTitle>
            </DialogHeader>
            {editPlayer && editForm && (
              <div className="space-y-4">
                <p className="font-mono text-sm text-muted-foreground">{editPlayer.wallet_address}</p>
                {Object.prototype.hasOwnProperty.call(editPlayer, 'nickname') && (
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
                )}
                <div className="grid grid-cols-2 gap-3">
                  <AdminEditField label="Level" value={editForm.level} onChange={(value) => setEditForm((current) => (current ? { ...current, level: Number(value) } : current))} />
                  <AdminEditField label="XP" value={editForm.xp} onChange={(value) => setEditForm((current) => (current ? { ...current, xp: Number(value) } : current))} />
                  <AdminEditField label="Coins" value={editForm.coins} onChange={(value) => setEditForm((current) => (current ? { ...current, coins: Number(value) } : current))} />
                  <AdminEditField label="Reserve bait" value={editForm.bait} onChange={(value) => setEditForm((current) => (current ? { ...current, bait: Number(value) } : current))} />
                  <AdminEditField label="Daily bait" value={editForm.daily_free_bait} onChange={(value) => setEditForm((current) => (current ? { ...current, daily_free_bait: Number(value) } : current))} />
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
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
