import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Mail, Send } from 'lucide-react';
import type { AdminPlayer, AdminPlayerMessage } from '@/hooks/useAdmin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

interface AdminPlayerMessageCenterProps {
  player: AdminPlayer | null;
  messages: AdminPlayerMessage[];
  loading?: boolean;
  sending?: boolean;
  onSend: (title: string, body: string) => Promise<void> | void;
}

const MESSAGE_TEMPLATES = [
  {
    label: 'Welcome',
    title: 'Welcome to Hook & Loot',
    body: 'Thanks for playing. Keep an eye on your tasks, referrals, and daily bait reset.',
  },
  {
    label: 'Support reply',
    title: 'Support update',
    body: 'We checked your account and posted this update to help you continue normally.',
  },
  {
    label: 'Economy note',
    title: 'Account reward update',
    body: 'A manual account adjustment was applied. Please reload the game if the balance does not refresh immediately.',
  },
];

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const AdminPlayerMessageCenter: React.FC<AdminPlayerMessageCenterProps> = ({
  player,
  messages,
  loading = false,
  sending = false,
  onSend,
}) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    setTitle('');
    setBody('');
  }, [player?.id]);

  const unreadCount = useMemo(() => messages.filter((message) => !message.read_at).length, [messages]);

  const handleTemplate = (template: typeof MESSAGE_TEMPLATES[number]) => {
    setTitle(template.title);
    setBody(template.body);
  };

  const handleSend = async () => {
    const nextTitle = title.trim();
    const nextBody = body.trim();
    if (!player || !nextTitle || !nextBody) return;

    await onSend(nextTitle, nextBody);
    setTitle('');
    setBody('');
  };

  if (!player) {
    return (
      <Card className="border-zinc-800 bg-zinc-950">
        <CardContent className="py-12 text-center text-sm text-zinc-400">
          Select a player to view inbox history and send a personal message.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-base text-zinc-100">
            <span>Message history</span>
            <Badge className="border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/10">
              {unreadCount} unread
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[28rem] pr-3">
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="rounded-lg border border-zinc-800 bg-black/60 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-100">{message.title}</p>
                      <p className="mt-1 text-xs text-zinc-400">{formatDateTime(message.created_at)}</p>
                    </div>
                    {message.read_at ? (
                      <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Read
                      </Badge>
                    ) : (
                      <Badge className="border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/10">
                        <Mail className="mr-1 h-3 w-3" />
                        Unread
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-200">{message.body}</p>
                </div>
              ))}

              {messages.length === 0 && (
                <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-400">
                  {loading ? 'Loading message history...' : 'No personal messages sent yet.'}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <CardTitle className="text-base text-zinc-100">Send personal message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {MESSAGE_TEMPLATES.map((template) => (
              <Button
                key={template.label}
                type="button"
                variant="outline"
                className="border-zinc-800 bg-black text-zinc-100 hover:bg-zinc-900"
                onClick={() => handleTemplate(template)}
              >
                {template.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">Title</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="Message title"
              className="border-zinc-800 bg-black text-zinc-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">Body</label>
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={2000}
              placeholder="Write the message the player should see in Inbox."
              className="min-h-40 border-zinc-800 bg-black text-zinc-100"
            />
          </div>

          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !title.trim() || !body.trim()}
            className="w-full gap-2"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : 'Send message'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPlayerMessageCenter;
