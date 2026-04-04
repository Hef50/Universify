/**
 * EmailContext
 *
 * Manages the email newsletter integration state for the Universify client:
 *   - Bot URL configuration
 *   - Event import / sync
 *   - Persistence in localStorage
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { Event } from '@/types/event';
import {
  checkEmailBotHealth,
  fetchCachedEmailEvents,
  triggerEmailImport,
} from '@/lib/email';
import { useEvents } from './EventsContext';

// ─── Types ─────────────────────────────────────────────────────────────

interface EmailConfig {
  botUrl: string;
  autoImport: boolean;
  importDays: number;
}

interface EmailContextType {
  // Configuration
  config: EmailConfig;
  setBotUrl: (url: string) => void;
  setAutoImport: (enabled: boolean) => void;
  setImportDays: (days: number) => void;

  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  connect: () => Promise<boolean>;

  // Events import
  emailEvents: Event[];
  isImporting: boolean;
  importError: string | null;
  lastImportTime: Date | null;
  importedCount: number;
  importEvents: () => Promise<number>;
  clearImportedEvents: () => void;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

// ─── Storage keys ───────────────────────────────────────────────────────

const EMAIL_CONFIG_KEY = 'universify_email_config';
const EMAIL_EVENTS_KEY = 'universify_email_events';
const EMAIL_LAST_IMPORT_KEY = 'universify_email_last_import';

const DEFAULT_CONFIG: EmailConfig = {
  botUrl: 'http://localhost:3002',
  autoImport: false,
  importDays: 7,
};

// ─── Storage helpers ────────────────────────────────────────────────────

function loadFromStorage<T>(key: string, fallback: T): T {
  if (Platform.OS !== 'web') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: any): void {
  if (Platform.OS !== 'web') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save to localStorage (${key}):`, err);
  }
}

// ─── Provider ───────────────────────────────────────────────────────────

export const EmailProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addExternalEvents, removeExternalEvents } = useEvents();

  const [config, setConfig] = useState<EmailConfig>(() =>
    loadFromStorage(EMAIL_CONFIG_KEY, DEFAULT_CONFIG)
  );

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [emailEvents, setEmailEvents] = useState<Event[]>(() =>
    loadFromStorage(EMAIL_EVENTS_KEY, [])
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [lastImportTime, setLastImportTime] = useState<Date | null>(() => {
    const stored = loadFromStorage<string | null>(EMAIL_LAST_IMPORT_KEY, null);
    if (!stored || stored === 'null') return null;
    const d = new Date(stored);
    return isNaN(d.getTime()) ? null : d;
  });
  const [importedCount, setImportedCount] = useState(0);

  // Persist config changes
  useEffect(() => {
    saveToStorage(EMAIL_CONFIG_KEY, config);
  }, [config]);

  // Load cached email events into EventsContext on mount
  useEffect(() => {
    if (emailEvents.length > 0) {
      addExternalEvents(emailEvents);
    }
  }, []); // Only on mount

  // Auto-import on mount if enabled
  useEffect(() => {
    if (config.autoImport) {
      connect().then((ok) => {
        if (ok) importEvents();
      });
    }
  }, []); // Only on mount

  // ── Config setters ──

  const setBotUrl = useCallback((url: string) => {
    setConfig((prev) => ({ ...prev, botUrl: url }));
    setIsConnected(false);
  }, []);

  const setAutoImport = useCallback((enabled: boolean) => {
    setConfig((prev) => ({ ...prev, autoImport: enabled }));
  }, []);

  const setImportDays = useCallback((days: number) => {
    setConfig((prev) => ({ ...prev, importDays: days }));
  }, []);

  // ── Connection ──

  const connect = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const health = await checkEmailBotHealth(config.botUrl);
      if (health && health.status === 'ok') {
        setIsConnected(true);
        setIsConnecting(false);
        return true;
      } else {
        setConnectionError('Email bot is not responding. Make sure the email-bot server is running.');
        setIsConnected(false);
        setIsConnecting(false);
        return false;
      }
    } catch (err: any) {
      setConnectionError(
        err.message || 'Could not connect to email bot. Is it running on the configured URL?'
      );
      setIsConnected(false);
      setIsConnecting(false);
      return false;
    }
  }, [config.botUrl]);

  // ── Events import ──

  const importEvents = useCallback(async (): Promise<number> => {
    setIsImporting(true);
    setImportError(null);

    try {
      // Trigger the bot to scan the inbox
      await triggerEmailImport(config.botUrl, config.importDays);

      // Fetch the full updated event list from the bot store
      const events = await fetchCachedEmailEvents(config.botUrl);

      // Deduplicate by id
      const uniqueMap = new Map<string, Event>();
      for (const event of events) {
        uniqueMap.set(event.id, event);
      }
      const dedupedEvents = Array.from(uniqueMap.values());

      setEmailEvents(dedupedEvents);
      saveToStorage(EMAIL_EVENTS_KEY, dedupedEvents);

      const now = new Date();
      setLastImportTime(now);
      saveToStorage(EMAIL_LAST_IMPORT_KEY, now.toISOString());
      setImportedCount(dedupedEvents.length);

      // Push into EventsContext so they appear across the whole app
      addExternalEvents(dedupedEvents);

      console.log(`Imported ${dedupedEvents.length} events from email newsletters`);
      return dedupedEvents.length;
    } catch (err: any) {
      const msg = err.message || 'Failed to import email events';
      setImportError(msg);
      console.error('Email import error:', msg);
      return 0;
    } finally {
      setIsImporting(false);
    }
  }, [config.botUrl, config.importDays, addExternalEvents]);

  const clearImportedEvents = useCallback(() => {
    removeExternalEvents('email-');
    setEmailEvents([]);
    saveToStorage(EMAIL_EVENTS_KEY, []);
    setImportedCount(0);
    setLastImportTime(null);
    saveToStorage(EMAIL_LAST_IMPORT_KEY, null);
  }, [removeExternalEvents]);

  // ── Context value ──

  const value: EmailContextType = {
    config,
    setBotUrl,
    setAutoImport,
    setImportDays,
    isConnected,
    isConnecting,
    connectionError,
    connect,
    emailEvents,
    isImporting,
    importError,
    lastImportTime,
    importedCount,
    importEvents,
    clearImportedEvents,
  };

  return <EmailContext.Provider value={value}>{children}</EmailContext.Provider>;
};

// ─── Hook ───────────────────────────────────────────────────────────────

export const useEmail = (): EmailContextType => {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error('useEmail must be used within an EmailProvider');
  }
  return context;
};
