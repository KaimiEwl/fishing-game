import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { getStoredWalletSession } from '@/lib/walletSession';

type PlayerMessageRow = Tables<'player_messages'>;

export interface PlayerInboxMessage {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  deliveredAt: string;
  createdByWallet: string;
  readAt: string | null;
}

const mapPlayerMessage = (message: PlayerMessageRow): PlayerInboxMessage => ({
  id: message.id,
  title: message.title,
  body: message.body,
  createdAt: message.created_at,
  deliveredAt: message.delivered_at,
  createdByWallet: message.created_by_wallet,
  readAt: message.read_at,
});

export function usePlayerMessages(walletAddress: string | undefined, enabled: boolean) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<PlayerInboxMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const lastUnreadCountRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef(false);

  const callPlayerMessages = useCallback(async <T>(action: string, payload: Record<string, unknown> = {}) => {
    if (!walletAddress) throw new Error('Missing wallet');
    const session = getStoredWalletSession();
    if (!session || session.address.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error('Wallet session expired. Reconnect in the game first.');
    }

    const { data, error } = await supabase.functions.invoke('player-messages', {
      body: {
        action,
        wallet_address: walletAddress.toLowerCase(),
        session_token: session.token,
        ...payload,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as T;
  }, [walletAddress]);

  const refreshInbox = useCallback(async (showUnreadToast = true) => {
    if (!enabled || !walletAddress || refreshInFlightRef.current) return false;

    refreshInFlightRef.current = true;
    setLoading(true);
    try {
      const [messagesResponse, unreadResponse] = await Promise.all([
        callPlayerMessages<{ messages: PlayerMessageRow[] }>('list_my_messages', { limit: 8 }),
        callPlayerMessages<{ unread_count: number }>('get_unread_count'),
      ]);

      const nextMessages = (messagesResponse.messages ?? []).map(mapPlayerMessage);
      const nextUnreadCount = unreadResponse.unread_count ?? 0;
      const previousUnreadCount = lastUnreadCountRef.current;

      setMessages(nextMessages);
      setUnreadCount(nextUnreadCount);

      if (
        showUnreadToast
        && previousUnreadCount !== null
        && nextUnreadCount > previousUnreadCount
      ) {
        toast({
          title: 'New admin message',
          description: 'You have a new admin message in Inbox.',
        });
      }

      lastUnreadCountRef.current = nextUnreadCount;
      return true;
    } catch (error) {
      console.error('Inbox refresh failed:', error);
      return false;
    } finally {
      refreshInFlightRef.current = false;
      setLoading(false);
    }
  }, [callPlayerMessages, enabled, toast, walletAddress]);

  const markMessageRead = useCallback(async (messageId: string) => {
    if (!enabled) return null;

    try {
      const previousMessage = messages.find((message) => message.id === messageId);
      const data = await callPlayerMessages<{ message: PlayerMessageRow }>('mark_message_read', {
        message_id: messageId,
      });
      const nextMessage = mapPlayerMessage(data.message);
      setMessages((current) => current.map((message) => (
        message.id === messageId ? nextMessage : message
      )));
      const shouldDecrement = !previousMessage?.readAt && !!nextMessage.readAt ? 1 : 0;
      setUnreadCount((current) => Math.max(0, current - shouldDecrement));
      lastUnreadCountRef.current = Math.max(0, (lastUnreadCountRef.current ?? 0) - shouldDecrement);
      return nextMessage;
    } catch (error) {
      console.error('Failed to mark inbox message as read:', error);
      return null;
    }
  }, [callPlayerMessages, enabled, messages]);

  useEffect(() => {
    if (!enabled || !walletAddress) {
      setMessages([]);
      setUnreadCount(0);
      setLoading(false);
      lastUnreadCountRef.current = null;
      return;
    }

    void refreshInbox(false);
  }, [enabled, refreshInbox, walletAddress]);

  useEffect(() => {
    if (!enabled || !walletAddress) return undefined;

    const handleWindowFocus = () => {
      void refreshInbox(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshInbox(true);
      }
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshInbox(true);
      }
    }, 30000);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, refreshInbox, walletAddress]);

  return {
    messages,
    unreadCount,
    loading,
    refreshInbox,
    markMessageRead,
  };
}
