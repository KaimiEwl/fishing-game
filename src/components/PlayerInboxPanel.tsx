import React, { useState } from 'react';
import { Mail, MailOpen, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PlayerInboxMessage } from '@/hooks/usePlayerMessages';

interface PlayerInboxPanelProps {
  messages: PlayerInboxMessage[];
  unreadCount: number;
  loading?: boolean;
  onMarkRead: (messageId: string) => void;
}

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const PlayerInboxPanel: React.FC<PlayerInboxPanelProps> = ({
  messages,
  unreadCount,
  loading = false,
  onMarkRead,
}) => {
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);

  const handleOpenMessage = (message: PlayerInboxMessage) => {
    setOpenMessageId((current) => current === message.id ? null : message.id);
    if (!message.readAt) {
      onMarkRead(message.id);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-100">Inbox</p>
          <p className="mt-1 text-xs font-medium text-zinc-400">
            Personal admin messages appear here.
          </p>
        </div>
        <Badge className="border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/10">
          {unreadCount} unread
        </Badge>
      </div>

      <ScrollArea className="mt-3 max-h-64">
        <div className="space-y-2 pr-3">
          {messages.map((message) => {
            const isOpen = openMessageId === message.id;
            const isUnread = !message.readAt;

            return (
              <button
                key={message.id}
                type="button"
                onClick={() => handleOpenMessage(message)}
                className="w-full rounded-lg border border-zinc-800 bg-black/70 px-3 py-3 text-left transition-colors hover:border-cyan-300/20 hover:bg-black"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {isUnread ? (
                        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100" />
                      ) : (
                        <MailOpen className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                      )}
                      <p className="truncate text-sm font-semibold text-zinc-100">{message.title}</p>
                    </div>
                    <p className="mt-1 text-xs font-medium text-zinc-400">
                      {formatTimestamp(message.createdAt)}
                    </p>
                  </div>
                  {isUnread && (
                    <Badge className="border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/10">
                      New
                    </Badge>
                  )}
                </div>
                {isOpen && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                    {message.body}
                  </p>
                )}
              </button>
            );
          })}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 px-4 py-8 text-center">
              <MessageSquare className="h-5 w-5 text-zinc-500" />
              <p className="mt-3 text-sm font-semibold text-zinc-100">
                {loading ? 'Loading inbox...' : 'No messages yet'}
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-400">
                Important player-facing admin messages will show up here.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {messages.length > 0 && unreadCount > 0 && (
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 border-zinc-800 bg-black text-zinc-100 hover:bg-zinc-900"
            onClick={() => {
              const firstUnread = messages.find((message) => !message.readAt);
              if (firstUnread) {
                handleOpenMessage(firstUnread);
              }
            }}
          >
            Open first unread
          </Button>
        </div>
      )}
    </div>
  );
};

export default PlayerInboxPanel;
