import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Bell,
  CalendarRange,
  Eye,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Pencil,
  RefreshCcw,
  Search,
  Shield,
  Trash2,
  TrendingUp,
  Users,
  Coins,
  WalletCards,
  type LucideIcon,
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
import AdminInfoPopover from '@/components/AdminInfoPopover';
import AdminBlockGuide from '@/components/AdminBlockGuide';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import FishIcon from '@/components/game/FishIcon';
import AdminEditField from '@/components/AdminEditField';
import AdminSortableHead from '@/components/AdminSortableHead';
import AdminStatCard from '@/components/AdminStatCard';
import AdminTopList from '@/components/AdminTopList';
import { getErrorMessage } from '@/lib/errorUtils';
import { cn } from '@/lib/utils';
import { ROD_DATA } from '@/types/game';

const ROD_NAMES = ROD_DATA.map((rod) => rod.name);

type AdminTab = 'overview' | 'players' | 'messages' | 'withdrawals' | 'weekly' | 'social';

type AdminTone = 'blue' | 'green' | 'amber' | 'rose' | 'slate' | 'violet';

type EditablePlayerForm = Pick<
  AdminPlayer,
  'coins' | 'bait' | 'daily_free_bait' | 'level' | 'xp' | 'rod_level' | 'equipped_rod' | 'login_streak'
> & {
  nickname: string;
  inventoryJson: string;
  cookedDishesJson: string;
  gameProgressJson: string;
};

const formatWallet = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`;

const getDisplayCatchCount = (player: AdminPlayer) => player.display_total_catches ?? player.total_catches;

const formatEditableJson = (value: unknown) => JSON.stringify(value ?? null, null, 2);

const ADMIN_TONE_CLASSES: Record<AdminTone, { icon: string; visual: string; bar: string }> = {
  blue: {
    icon: 'border-blue-100 bg-blue-50 text-blue-600',
    visual: 'border-blue-100 bg-blue-50/70',
    bar: 'bg-blue-500',
  },
  green: {
    icon: 'border-emerald-100 bg-emerald-50 text-emerald-600',
    visual: 'border-emerald-100 bg-emerald-50/70',
    bar: 'bg-emerald-500',
  },
  amber: {
    icon: 'border-amber-100 bg-amber-50 text-amber-600',
    visual: 'border-amber-100 bg-amber-50/70',
    bar: 'bg-amber-500',
  },
  rose: {
    icon: 'border-rose-100 bg-rose-50 text-rose-600',
    visual: 'border-rose-100 bg-rose-50/70',
    bar: 'bg-rose-500',
  },
  slate: {
    icon: 'border-slate-200 bg-slate-100 text-slate-700',
    visual: 'border-slate-200 bg-slate-100/80',
    bar: 'bg-slate-500',
  },
  violet: {
    icon: 'border-violet-100 bg-violet-50 text-violet-600',
    visual: 'border-violet-100 bg-violet-50/70',
    bar: 'bg-violet-500',
  },
};

const getAdminToneClass = (tone: AdminTone) => `admin-tone-${tone}`;

const ADMIN_TAB_DETAILS: Record<AdminTab, {
  label: string;
  description: string;
  icon: LucideIcon;
  tone: AdminTone;
}> = {
  overview: {
    label: 'Overview',
    description: 'Live health, player totals, top lists, and security signals.',
    icon: LayoutDashboard,
    tone: 'blue',
  },
  players: {
    label: 'Players',
    description: 'Find an account, inspect progress, or apply small test grants.',
    icon: Users,
    tone: 'green',
  },
  messages: {
    label: 'Messages',
    description: 'Send personal inbox notes or a careful broadcast to everyone.',
    icon: Bell,
    tone: 'violet',
  },
  withdrawals: {
    label: 'Withdrawals',
    description: 'Approve, reject, and mark MON payout requests as paid.',
    icon: WalletCards,
    tone: 'amber',
  },
  weekly: {
    label: 'Weekly',
    description: 'Preview grill winners and apply one weekly reward batch.',
    icon: CalendarRange,
    tone: 'rose',
  },
  social: {
    label: 'Social',
    description: 'Review manual social-task states before a player can claim.',
    icon: MessageSquare,
    tone: 'slate',
  },
};

const ADMIN_GUIDE_CARDS: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  tone: AdminTone;
}> = [
  {
    title: 'Health first',
    description: 'Start with totals, active players, suspicious signals, and top account movement.',
    icon: Activity,
    tone: 'blue',
  },
  {
    title: 'Account work',
    description: 'Use Players for lookup, details, safe edits, test coins, bait, and MON grants.',
    icon: LifeBuoy,
    tone: 'green',
  },
  {
    title: 'Money flow',
    description: 'Withdrawals and Weekly are the only places that change payout state.',
    icon: WalletCards,
    tone: 'amber',
  },
  {
    title: 'Player contact',
    description: 'Messages reach the in-game Inbox; Social is for manual quest verification.',
    icon: Bell,
    tone: 'violet',
  },
];

const AdminGuidePopover = () => (
  <AdminInfoPopover title="Admin map">
    <div className="space-y-3">
      {ADMIN_GUIDE_CARDS.map((card) => {
        const Icon = card.icon;
        const toneClasses = ADMIN_TONE_CLASSES[card.tone];

        return (
          <div key={card.title} className={cn('grid grid-cols-[3rem,1fr] gap-3 rounded-lg border border-black/10 bg-slate-50 p-2', getAdminToneClass(card.tone))}>
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg border bg-white', toneClasses.icon)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">{card.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  </AdminInfoPopover>
);

const AdminSectionIntro = ({
  tab,
  action,
}: {
  tab: AdminTab;
  action?: ReactNode;
}) => {
  const details = ADMIN_TAB_DETAILS[tab];

  return (
    <div className={cn('flex flex-col gap-3 rounded-lg border border-black/10 bg-white/90 p-3 shadow-sm shadow-black/5 md:flex-row md:items-center md:justify-between', getAdminToneClass(details.tone))}>
      <div className="min-w-0 border-l-2 border-current/20 pl-3 text-primary">
        <h2 className="truncate text-xl font-semibold text-slate-950">{details.label}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
};

const parseEditableJson = (label: string, value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
};

const hideBootLoader = () => {
  const bootWindow = window as Window & {
    __hideBootLoader?: () => void;
    __setBootLoaderState?: (nextProgress: number, nextLabel?: string) => void;
  };

  bootWindow.__setBootLoaderState?.(1, 'Ready...');
  bootWindow.__hideBootLoader?.();
};

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
    sendBroadcastMessage,
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
  const [broadcastSending, setBroadcastSending] = useState(false);
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
    hideBootLoader();
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
      inventoryJson: formatEditableJson(player.inventory ?? []),
      cookedDishesJson: formatEditableJson(player.cooked_dishes ?? []),
      gameProgressJson: formatEditableJson(player.game_progress ?? {}),
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
      const inventory = parseEditableJson('Inventory', editForm.inventoryJson);
      const cookedDishes = parseEditableJson('Cooked dishes', editForm.cookedDishesJson);
      const gameProgress = parseEditableJson('Game progress', editForm.gameProgressJson);
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
        inventory,
        cooked_dishes: cookedDishes,
        game_progress: gameProgress,
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
      toast({ title: 'Grant applied', description: `${amount} ${field.replace(/_/g, ' ')} granted.` });
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

  const handleSendBroadcast = async (title: string, body: string) => {
    setBroadcastSending(true);
    try {
      const deliveredCount = await sendBroadcastMessage(title, body);
      if (selectedPlayer) {
        const nextMessages = await listPlayerMessages(selectedPlayer.id, 50);
        setSelectedPlayerMessages(nextMessages);
      }
      toast({
        title: 'Broadcast sent',
        description: `Inbox message delivered to ${deliveredCount.toLocaleString()} player${deliveredCount === 1 ? '' : 's'}.`,
      });
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setBroadcastSending(false);
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
      toast({ title: 'Social task updated', description: `${verification.taskTitle} -> ${status.replace(/_/g, ' ')}` });
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
      <div className="admin-shell flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4">
        <div className="admin-tone-blue w-full max-w-md rounded-lg border border-black/10 bg-white p-6 text-center shadow-sm shadow-black/5">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600">
            <Shield className="h-5 w-5" />
          </div>
          <p className="text-lg font-semibold text-slate-950">Checking admin access</p>
          <p className="mt-2 text-sm text-slate-500">Verifying the current wallet session before loading operational tools.</p>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4">
        <div className="admin-tone-rose w-full max-w-lg rounded-lg border border-black/10 bg-white p-6 text-center shadow-sm shadow-black/5">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">Access denied</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            This wallet session is not confirmed as an admin. Reconnect one of the approved test wallets from the game settings, then open the red Admin Panel entry again.
          </p>
          <Button variant="outline" className="mt-5" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to game
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell h-screen overflow-y-auto bg-[#f5f5f7] text-slate-950">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="admin-tone-blue rounded-lg border border-black/10 bg-white/95 p-4 shadow-sm shadow-black/5 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-slate-500">Hook & Loot operations</p>
                  <div className="flex min-w-0 items-center gap-2">
                    <h1 className="truncate text-3xl font-semibold text-slate-950 md:text-4xl">Admin Panel</h1>
                    <AdminGuidePopover />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:items-center">
              <div className="admin-tone-slate rounded-lg border border-black/10 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <span className="block font-semibold text-slate-950">Session wallet</span>
                <span className="font-mono">{address ? formatWallet(address) : 'stored session'}</span>
              </div>
              <Button variant="outline" onClick={() => navigate('/')} className="h-11">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to game
              </Button>
            </div>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminTab)} className="space-y-5">
          <div className="sticky top-0 z-20 -mx-4 border-b border-black/10 bg-[#f5f5f7]/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <TabsList className="admin-tab-dock grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              {(Object.keys(ADMIN_TAB_DETAILS) as AdminTab[]).map((tab) => {
                const details = ADMIN_TAB_DETAILS[tab];
                const Icon = details.icon;
                return (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className={cn(
                      'min-w-0 whitespace-normal rounded-lg border border-black/10 bg-white px-3 py-2 text-slate-500 shadow-sm shadow-black/5',
                      getAdminToneClass(details.tone),
                    )}
                  >
                    <span className="flex min-w-0 items-center justify-center gap-2 text-xs font-semibold sm:text-sm">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{details.label}</span>
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="overview" className="admin-tone-blue space-y-6">
            <AdminSectionIntro
              tab="overview"
              action={(
                <Button type="button" variant="outline" onClick={() => {
                  void fetchStats();
                  void fetchSuspiciousData();
                }}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh overview
                </Button>
              )}
            />
            <AdminBlockGuide variant="overview" />
            {stats && (
              <>
                <div className="grid gap-4 lg:grid-cols-3">
                  <AdminBlockGuide variant="stats" compact />
                  <AdminBlockGuide variant="distributions" compact />
                  <AdminBlockGuide variant="topLists" compact />
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                  <AdminStatCard toneClass={getAdminToneClass('blue')} icon={<Users className="h-5 w-5" />} label="Players" value={stats.totalPlayers} />
                  <AdminStatCard toneClass={getAdminToneClass('green')} icon={<Activity className="h-5 w-5" />} label="Active 24h" value={stats.activeToday} />
                  <AdminStatCard toneClass={getAdminToneClass('violet')} icon={<TrendingUp className="h-5 w-5" />} label="Avg level" value={stats.avgLevel} />
                  <AdminStatCard toneClass={getAdminToneClass('rose')} icon={<TrendingUp className="h-5 w-5" />} label="Max level" value={stats.maxLevel} />
                  <AdminStatCard toneClass={getAdminToneClass('amber')} icon={<Coins className="h-5 w-5" />} label="Total coins" value={stats.totalCoins.toLocaleString()} />
                  <AdminStatCard toneClass={getAdminToneClass('green')} icon={<FishIcon fishId="carp" size="xs" />} label="Total catches" value={stats.totalCatches.toLocaleString()} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className={getAdminToneClass('blue')}>
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

                  <Card className={getAdminToneClass('violet')}>
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
                  <AdminTopList toneClass={getAdminToneClass('violet')} title="Top by level" players={stats.topByLevel} field="level" />
                  <AdminTopList toneClass={getAdminToneClass('amber')} title="Top by coins" players={stats.topByCoins} field="coins" />
                  <AdminTopList toneClass={getAdminToneClass('green')} title="Top by catches" players={stats.topByCatches} field="total_catches" />
                </div>

                <AdminSuspiciousCenter
                  summary={suspiciousSummary}
                  players={suspiciousPlayers}
                  loading={suspiciousLoading}
                  onRefresh={() => void fetchSuspiciousData()}
                  onInspectPlayer={handleInspectSuspiciousPlayer}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="players" className="admin-tone-green space-y-4">
            <AdminSectionIntro tab="players" />

            <div className="admin-tone-green rounded-lg border border-black/10 bg-white/90 p-3 shadow-sm shadow-black/5">
              <AdminBlockGuide variant="lookup" compact className="mb-3" />
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-950">Find user</h3>
                </div>
                <Button variant="outline" onClick={() => void fetchPlayers()}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh players
                </Button>
              </div>
              <div className="relative max-w-xl">
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
            </div>

            <Card className="admin-tone-green overflow-hidden border-black/10 bg-white/95 shadow-sm shadow-black/5">
              <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-black/10">
                <div className="min-w-0">
                  <CardTitle className="text-base text-slate-950">User accounts</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">{total.toLocaleString()} total players</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-b border-black/10 p-3">
                  <AdminBlockGuide variant="accounts" compact />
                </div>
                <div className="overflow-x-auto">
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
                            <div className="flex items-center gap-2">
                              {player.nickname || <span className="italic text-muted-foreground">-</span>}
                              {player.is_admin && (
                                <Badge
                                  variant="secondary"
                                  className="border border-amber-500/40 bg-amber-500/15 text-[10px] uppercase text-amber-700"
                                >
                                  {player.admin_role === 'superadmin' ? 'Superadmin' : 'Admin'}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {player.wallet_address.slice(0, 6)}...{player.wallet_address.slice(-4)}
                          </TableCell>
                          <TableCell>{player.level}</TableCell>
                          <TableCell>{player.coins.toLocaleString()}</TableCell>
                          <TableCell>{(player.bait + player.daily_free_bait).toLocaleString()}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                player.catches_source === 'audit_fallback' && 'font-medium text-amber-700',
                              )}
                              title={player.catches_source === 'audit_fallback'
                                ? 'Displayed from audit logs because saved catches have not synced yet.'
                                : undefined}
                            >
                              {getDisplayCatchCount(player).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>{ROD_NAMES[player.rod_level] || player.rod_level}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(player.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="admin-row-action"
                                title="Inspect player"
                                onClick={() => void loadSelectedPlayerContext(player, true)}
                                aria-label="Inspect player"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="admin-row-action"
                                title="Message player"
                                aria-label="Message player"
                                onClick={() => {
                                  setActiveTab('messages');
                                  void loadSelectedPlayerContext(player, false);
                                }}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="admin-row-action"
                                title="Edit player"
                                onClick={() => openEdit(player)}
                                aria-label="Edit player"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="admin-row-action admin-row-action-danger"
                                title="Delete player"
                                onClick={() => void handleDelete(player)}
                                aria-label="Delete player"
                              >
                                <Trash2 className="h-4 w-4" />
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
                </div>
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

          <TabsContent value="messages" className="admin-tone-violet space-y-4">
            <AdminSectionIntro tab="messages" />

            <div className="grid gap-4 lg:grid-cols-[18rem,1fr]">
              <Card className="admin-tone-violet border-zinc-800 bg-zinc-950">
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
                <div className="admin-tone-violet rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-100">{messageListTitle}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Send a personal in-game inbox message. Messages are visible in Settings - Inbox.
                  </p>
                </div>
                <AdminPlayerMessageCenter
                  player={selectedPlayer}
                  messages={selectedPlayerMessages}
                  totalPlayers={stats?.totalPlayers ?? total}
                  loading={messagesLoading}
                  sending={messageSending}
                  broadcasting={broadcastSending}
                  onSend={handleSendMessage}
                  onSendBroadcast={handleSendBroadcast}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="withdrawals" className="admin-tone-amber space-y-4">
            <AdminSectionIntro tab="withdrawals" />

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

          <TabsContent value="weekly" className="admin-tone-rose space-y-4">
            <AdminSectionIntro tab="weekly" />

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

          <TabsContent value="social" className="admin-tone-slate space-y-4">
            <AdminSectionIntro tab="social" />

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
          <DialogContent className="admin-dialog max-w-3xl border-black/10 bg-white text-slate-950">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle>Edit player</DialogTitle>
                <AdminInfoPopover title="Edit player">
                  <p>Use basic fields for normal support edits. Advanced JSON is collapsed because it is riskier and mainly for debugging migrated progress data.</p>
                </AdminInfoPopover>
              </div>
            </DialogHeader>
            {editPlayer && editForm && (
              <div className="space-y-4">
                <div className="admin-tone-slate rounded-lg border border-black/10 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-500">Wallet</p>
                  <p className="font-mono text-sm text-slate-700">{editPlayer.wallet_address}</p>
                </div>

                <div className="admin-tone-green rounded-lg border border-black/10 bg-white p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-950">User basics</h3>
                    <AdminInfoPopover title="User basics">
                      <p>Core editable fields for one selected user: nickname, level, XP, coins, bait, rod state, and login streak.</p>
                    </AdminInfoPopover>
                  </div>
                  {Object.prototype.hasOwnProperty.call(editPlayer, 'nickname') && (
                    <div className="mb-3">
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

                <Accordion type="single" collapsible className="admin-tone-violet rounded-lg border border-black/10 bg-white">
                  <AccordionItem value="advanced-json" className="border-0">
                    <AccordionTrigger className="px-3 py-3 text-sm font-semibold text-slate-950 hover:no-underline">
                      Advanced JSON fields
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3 pt-0">
                      <div className="grid gap-3 lg:grid-cols-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Inventory JSON</label>
                          <Textarea
                            value={editForm.inventoryJson}
                            onChange={(event) =>
                              setEditForm((current) =>
                                current ? { ...current, inventoryJson: event.target.value } : current,
                              )
                            }
                            className="min-h-40 font-mono text-xs"
                            spellCheck={false}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Cooked dishes JSON</label>
                          <Textarea
                            value={editForm.cookedDishesJson}
                            onChange={(event) =>
                              setEditForm((current) =>
                                current ? { ...current, cookedDishesJson: event.target.value } : current,
                              )
                            }
                            className="min-h-40 font-mono text-xs"
                            spellCheck={false}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Game progress JSON</label>
                          <Textarea
                            value={editForm.gameProgressJson}
                            onChange={(event) =>
                              setEditForm((current) =>
                                current ? { ...current, gameProgressJson: event.target.value } : current,
                              )
                            }
                            className="min-h-40 font-mono text-xs"
                            spellCheck={false}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
