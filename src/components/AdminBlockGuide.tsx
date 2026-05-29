import {
  Activity,
  Bell,
  CalendarRange,
  Mail,
  MessageSquare,
  Search,
  Shield,
  SlidersHorizontal,
  Trophy,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AdminGuideTone = 'blue' | 'green' | 'amber' | 'rose' | 'slate' | 'violet';

export type AdminBlockGuideVariant =
  | 'overview'
  | 'stats'
  | 'distributions'
  | 'topLists'
  | 'security'
  | 'lookup'
  | 'accounts'
  | 'messageHistory'
  | 'composer'
  | 'withdrawSummary'
  | 'payoutQueue'
  | 'weeklyPreview'
  | 'weeklyHistory'
  | 'social';

interface AdminBlockGuideProps {
  variant: AdminBlockGuideVariant;
  className?: string;
  compact?: boolean;
}

interface AdminBlockGuideContent {
  title: string;
  body: string;
  steps: [string, string];
  tone: AdminGuideTone;
  primaryIcon: LucideIcon;
}

const GUIDE_CONTENT: Record<AdminBlockGuideVariant, AdminBlockGuideContent> = {
  overview: {
    title: 'Control room snapshot',
    body: 'Start here to read player volume, economy pressure, top accounts, and risk signals before changing anything.',
    steps: ['Read totals', 'Open details'],
    tone: 'blue',
    primaryIcon: Activity,
  },
  stats: {
    title: 'Live numbers',
    body: 'These cards show player count, activity, level range, total coins, and catches at a glance.',
    steps: ['Scan', 'Refresh'],
    tone: 'blue',
    primaryIcon: Activity,
  },
  distributions: {
    title: 'Progress shape',
    body: 'The bars compare levels and rods so you can spot where players are clustering.',
    steps: ['Compare', 'Watch drift'],
    tone: 'violet',
    primaryIcon: SlidersHorizontal,
  },
  topLists: {
    title: 'Leaderboard clues',
    body: 'Top lists surface unusually strong accounts and the players worth inspecting first.',
    steps: ['Rank', 'Inspect'],
    tone: 'amber',
    primaryIcon: Trophy,
  },
  security: {
    title: 'Risk radar',
    body: 'Security watch is read-only: review audit signals here, then inspect a user before taking action.',
    steps: ['Review flags', 'Inspect user'],
    tone: 'rose',
    primaryIcon: Shield,
  },
  lookup: {
    title: 'Find the player',
    body: 'Search by wallet or nickname, then use the table actions for support work.',
    steps: ['Search', 'Select'],
    tone: 'green',
    primaryIcon: Search,
  },
  accounts: {
    title: 'Account tools',
    body: 'Rows open inspection, inbox messaging, direct edits, or test cleanup for the selected user.',
    steps: ['Inspect', 'Edit'],
    tone: 'green',
    primaryIcon: Users,
  },
  messageHistory: {
    title: 'Inbox timeline',
    body: 'Read past personal messages and unread state before sending another note.',
    steps: ['Read', 'Confirm'],
    tone: 'violet',
    primaryIcon: Mail,
  },
  composer: {
    title: 'Write and send',
    body: 'Draft one message, then choose personal delivery or a careful broadcast to everyone.',
    steps: ['Draft', 'Send'],
    tone: 'blue',
    primaryIcon: MessageSquare,
  },
  withdrawSummary: {
    title: 'Payout totals',
    body: 'Summary cards separate pending, approved, rejected, and paid MON requests.',
    steps: ['Count', 'Prioritize'],
    tone: 'amber',
    primaryIcon: WalletCards,
  },
  payoutQueue: {
    title: 'Payout actions',
    body: 'Approve valid requests, reject invalid ones, or paste a tx hash when a payout is paid.',
    steps: ['Review', 'Save tx'],
    tone: 'amber',
    primaryIcon: WalletCards,
  },
  weeklyPreview: {
    title: 'Weekly reward batch',
    body: 'Preview grill winners first, then apply the MON payout batch once for the week.',
    steps: ['Preview', 'Apply'],
    tone: 'rose',
    primaryIcon: CalendarRange,
  },
  weeklyHistory: {
    title: 'Applied batches',
    body: 'History is the audit trail for weekly rewards that were already applied.',
    steps: ['Audit', 'Verify'],
    tone: 'violet',
    primaryIcon: CalendarRange,
  },
  social: {
    title: 'Social task states',
    body: 'Filter manual verification rows and move one user task to the correct state.',
    steps: ['Filter', 'Update'],
    tone: 'slate',
    primaryIcon: Bell,
  },
};

const getToneClass = (tone: AdminGuideTone) => `admin-tone-${tone}`;

const AdminBlockGuide = ({ variant, className, compact = false }: AdminBlockGuideProps) => {
  const guide = GUIDE_CONTENT[variant];
  const PrimaryIcon = guide.primaryIcon;

  return (
    <div
      className={cn(
        'admin-block-guide',
        compact && 'admin-block-guide-compact',
        getToneClass(guide.tone),
        className,
      )}
      aria-label={`${guide.title}: ${guide.body}`}
    >
      <div className="admin-block-guide-picture" aria-hidden="true">
        <div className="admin-block-guide-icon">
          <PrimaryIcon className="h-5 w-5" />
        </div>
      </div>

      <div className="admin-block-guide-copy min-w-0">
        <p className="admin-block-guide-title">{guide.title}</p>
        <p className="admin-block-guide-body">{guide.body}</p>
        <div className="admin-block-guide-steps">
          {guide.steps.map((step) => (
            <span key={step} className="admin-block-guide-chip">
              {step}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminBlockGuide;
