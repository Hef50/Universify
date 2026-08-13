import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import {
  deleteEventMessageAPI,
  fetchEventMessagesAPI,
  postEventMessageAPI,
} from '@/lib/api';
import { isDevUserId } from '@/constants/devAccounts';
import {
  EventMessage,
  MESSAGE_STORAGE_KEY,
  MessageKind,
  MessageStore,
  addMessage,
  messagesForEvent,
  normalizeBody,
  parseMessageStore,
  removeMessage,
} from '@/utils/eventMessages';

interface UseEventMessagesOptions {
  eventId: string | undefined;
  userId: string | undefined;
  authorName: string;
  /** Only participants load a thread — matches the database policy. */
  enabled: boolean;
}

/**
 * The discussion on one event.
 *
 * Reads and writes Supabase when it is configured (row-level security limits
 * the thread to people going and the host); otherwise — offline/demo mode, or
 * a dev persona that isn't a real auth user — it keeps the thread on the
 * device so the feature is still usable end to end.
 */
export function useEventMessages({
  eventId,
  userId,
  authorName,
  enabled,
}: UseEventMessagesOptions) {
  const [messages, setMessages] = useState<EventMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocal = !isSupabaseConfigured || isDevUserId(userId);

  const readLocalStore = useCallback(async (): Promise<MessageStore> => {
    const raw = await storage.getItem(MESSAGE_STORAGE_KEY);
    return parseMessageStore(raw);
  }, []);

  const writeLocalStore = useCallback(async (next: MessageStore) => {
    await storage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const load = useCallback(async () => {
    if (!eventId || !enabled) {
      setMessages([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (isLocal) {
        const store = await readLocalStore();
        setMessages(messagesForEvent(store, eventId));
      } else {
        setMessages(await fetchEventMessagesAPI(eventId));
      }
    } catch (err) {
      console.error('Failed to load event messages:', err);
      setError('Could not load the conversation.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, enabled, isLocal, readLocalStore]);

  useEffect(() => {
    load();
  }, [load]);

  const post = useCallback(
    async (rawBody: string, kind: MessageKind = 'message'): Promise<boolean> => {
      const body = normalizeBody(rawBody);
      if (!body || !eventId || !userId) return false;
      setError(null);
      try {
        if (isLocal) {
          const message: EventMessage = {
            id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            eventId,
            userId,
            authorName,
            kind,
            body,
            createdAt: new Date().toISOString(),
          };
          const store = await readLocalStore();
          const next = addMessage(store, message);
          await writeLocalStore(next);
          setMessages(messagesForEvent(next, eventId));
        } else {
          const created = await postEventMessageAPI(eventId, userId, authorName, body, kind);
          setMessages((prev) => [...prev, created]);
        }
        return true;
      } catch (err) {
        console.error('Failed to post message:', err);
        setError('Could not post that. Try again.');
        return false;
      }
    },
    [eventId, userId, authorName, isLocal, readLocalStore, writeLocalStore]
  );

  const remove = useCallback(
    async (messageId: string) => {
      if (!eventId) return;
      setError(null);
      try {
        if (isLocal) {
          const store = await readLocalStore();
          const next = removeMessage(store, eventId, messageId);
          await writeLocalStore(next);
          setMessages(messagesForEvent(next, eventId));
        } else {
          await deleteEventMessageAPI(messageId);
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
      } catch (err) {
        console.error('Failed to delete message:', err);
        setError('Could not delete that message.');
      }
    },
    [eventId, isLocal, readLocalStore, writeLocalStore]
  );

  return {
    messages,
    announcements: messages.filter((m) => m.kind === 'announcement'),
    isLoading,
    error,
    post,
    remove,
    refresh: load,
    /** True when the thread lives on this device only. */
    isDeviceOnly: isLocal,
  };
}
