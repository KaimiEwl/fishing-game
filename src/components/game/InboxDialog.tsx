import React from 'react';
import { Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { PlayerInboxMessage } from '@/hooks/usePlayerMessages';
import PlayerInboxPanel from '@/components/PlayerInboxPanel';

interface InboxDialogProps {
  messages: PlayerInboxMessage[];
  unreadMessageCount: number;
  inboxLoading?: boolean;
  onMarkMessageRead?: (messageId: string) => void;
}

const InboxDialog: React.FC<InboxDialogProps> = ({
  messages,
  unreadMessageCount,
  inboxLoading = false,
  onMarkMessageRead,
}) => {
  if (!onMarkMessageRead || unreadMessageCount <= 0) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-11 w-11 rounded-full border border-amber-300/25 bg-black/85 text-amber-100 shadow-md outline-none backdrop-blur-md transition-all hover:scale-105 hover:border-amber-300/45 hover:bg-zinc-950 active:scale-95 sm:h-8 sm:w-8"
          aria-label="Inbox"
        >
          <Mail className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-amber-200/50 bg-amber-400 px-1 text-[10px] font-black text-black shadow-[0_0_12px_rgba(251,191,36,0.45)]">
            {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[calc(100vw-1rem)] border border-cyan-300/15 bg-black/95 text-zinc-100 shadow-2xl backdrop-blur-md sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-zinc-100">
            <Mail className="h-5 w-5 text-amber-100" />
            Inbox
          </DialogTitle>
        </DialogHeader>

        <PlayerInboxPanel
          messages={messages}
          unreadCount={unreadMessageCount}
          loading={inboxLoading}
          onMarkRead={onMarkMessageRead}
        />
      </DialogContent>
    </Dialog>
  );
};

export default InboxDialog;
