import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Event } from '@/types/event';
import { storage } from '@/lib/storage';

/**
 * Browser-notification reminders for scheduled events (web only).
 *
 * While the app is open, schedules a Notification REMINDER_LEAD_MS before
 * each upcoming scheduled event. Fired reminders are recorded in storage so
 * a reload doesn't re-notify for the same occurrence. Native platforms are a
 * no-op (remote push would require an EAS build + push service).
 */

const REMINDER_LEAD_MS = 30 * 60 * 1000; // 30 minutes before start
const MAX_TIMEOUT_MS = 12 * 60 * 60 * 1000; // only arm timers for the next 12h
const FIRED_KEY = 'universify_fired_reminders';

async function loadFired(): Promise<Set<string>> {
  try {
    const raw = await storage.getItem(FIRED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

async function saveFired(fired: Set<string>): Promise<void> {
  // Keep the record bounded; old entries are for events long past
  const entries = Array.from(fired).slice(-200);
  await storage.setItem(FIRED_KEY, JSON.stringify(entries));
}

export function useEventReminders(scheduledEvents: Event[], enabled: boolean) {
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!enabled || typeof Notification === 'undefined') return;
    if (scheduledEvents.length === 0) return;

    let cancelled = false;

    const arm = async () => {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {
          return;
        }
      }
      if (Notification.permission !== 'granted' || cancelled) return;

      const fired = await loadFired();
      const now = Date.now();

      for (const event of scheduledEvents) {
        const start = Date.parse(event.startTime);
        if (!Number.isFinite(start)) continue;
        const fireAt = start - REMINDER_LEAD_MS;
        const delay = fireAt - now;
        const key = `${event.id}@${event.startTime}`;

        if (delay > MAX_TIMEOUT_MS || fired.has(key)) continue;
        if (delay < -REMINDER_LEAD_MS) continue; // already started

        const timer = setTimeout(() => {
          try {
            new Notification(`Starting soon: ${event.title}`, {
              body: `${new Date(event.startTime).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}${event.location ? ` • ${event.location}` : ''}`,
              tag: key,
            });
          } catch {
            // Notification constructor can throw on some platforms; ignore
          }
          loadFired().then((current) => {
            current.add(key);
            saveFired(current).catch(() => {});
          });
        }, Math.max(delay, 0));

        timersRef.current.push(timer);
      }
    };

    arm();

    const timers = timersRef.current;
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [scheduledEvents, enabled]);
}
