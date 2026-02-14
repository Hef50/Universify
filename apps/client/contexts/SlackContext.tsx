/**
 * SlackContext
 *
 * Manages the Slack integration state for the Universify client:
 *   - Bot URL configuration
 *   - Connected channels
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
  SlackChannel,
  checkSlackBotHealth,
  fetchSlackChannels,
  fetchSlackEventsFromChannel,
} from '@/lib/slack';
import { useEvents } from './EventsContext';

// ─── Types ─────────────────────────────────────────────────────────────

interface SlackConfig {
  botUrl: string;
  selectedChannelIds: string[];
  autoImport: boolean;
}

interface SlackContextType {
  // Configuration
  config: SlackConfig;
  setBotUrl: (url: string) => void;
  setAutoImport: (enabled: boolean) => void;

  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  connect: () => Promise<boolean>;

  // Channels
  channels: SlackChannel[];
  isLoadingChannels: boolean;
  refreshChannels: () => Promise<void>;
  toggleChannel: (channelId: string) => void;

  // Events import
  slackEvents: Event[];
  isImporting: boolean;
  importError: string | null;
  lastImportTime: Date | null;
  importedCount: number;
  importEvents: () => Promise<number>;
  clearImportedEvents: () => void;
}

const SlackContext = createContext<SlackContextType | undefined>(undefined);

// ─── Storage keys ──────────────────────────────────────────────────────

const SLACK_CONFIG_KEY = 'universify_slack_config';
const SLACK_EVENTS_KEY = 'universify_slack_events';
const SLACK_LAST_IMPORT_KEY = 'universify_slack_last_import';

const DEFAULT_CONFIG: SlackConfig = {
  botUrl: 'http://localhost:3001',
  selectedChannelIds: [],
  autoImport: false,
};

// ─── Storage helpers ───────────────────────────────────────────────────

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

// ─── Provider ──────────────────────────────────────────────────────────

export const SlackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addExternalEvents, removeExternalEvents } = useEvents();

  // Config
  const [config, setConfig] = useState<SlackConfig>(() =>
    loadFromStorage(SLACK_CONFIG_KEY, DEFAULT_CONFIG)
  );

  // Connection
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Channels
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);

  // Events
  const [slackEvents, setSlackEvents] = useState<Event[]>(() =>
    loadFromStorage(SLACK_EVENTS_KEY, [])
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [lastImportTime, setLastImportTime] = useState<Date | null>(() => {
    const stored = loadFromStorage<string | null>(SLACK_LAST_IMPORT_KEY, null);
    return stored ? new Date(stored) : null;
  });
  const [importedCount, setImportedCount] = useState(0);

  // Persist config changes
  useEffect(() => {
    saveToStorage(SLACK_CONFIG_KEY, config);
  }, [config]);

  // Load cached Slack events into EventsContext on mount
  useEffect(() => {
    if (slackEvents.length > 0) {
      addExternalEvents(slackEvents);
    }
  }, []); // Only on mount

  // Auto-import on mount if enabled
  useEffect(() => {
    if (config.autoImport && config.selectedChannelIds.length > 0) {
      connect().then((ok) => {
        if (ok) importEvents();
      });
    }
  }, []); // Only on mount

  // ── Config setters ──

  const setBotUrl = useCallback((url: string) => {
    setConfig((prev) => ({ ...prev, botUrl: url }));
    setIsConnected(false);
    setChannels([]);
  }, []);

  const setAutoImport = useCallback((enabled: boolean) => {
    setConfig((prev) => ({ ...prev, autoImport: enabled }));
  }, []);

  // ── Connection ──

  const connect = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const health = await checkSlackBotHealth(config.botUrl);
      if (health && health.status === 'ok') {
        setIsConnected(true);
        setIsConnecting(false);
        // Auto-fetch channels on successful connection
        refreshChannels();
        return true;
      } else {
        setConnectionError('Bot is not responding. Make sure the slack-bot server is running.');
        setIsConnected(false);
        setIsConnecting(false);
        return false;
      }
    } catch (err: any) {
      setConnectionError(
        err.message || 'Could not connect to Slack bot. Is it running on the configured URL?'
      );
      setIsConnected(false);
      setIsConnecting(false);
      return false;
    }
  }, [config.botUrl]);

  // ── Channels ──

  const refreshChannels = useCallback(async () => {
    setIsLoadingChannels(true);
    try {
      const chs = await fetchSlackChannels(config.botUrl);
      setChannels(chs);
    } catch (err: any) {
      console.error('Failed to fetch Slack channels:', err.message);
    } finally {
      setIsLoadingChannels(false);
    }
  }, [config.botUrl]);

  const toggleChannel = useCallback((channelId: string) => {
    setConfig((prev) => {
      const selected = prev.selectedChannelIds.includes(channelId)
        ? prev.selectedChannelIds.filter((id) => id !== channelId)
        : [...prev.selectedChannelIds, channelId];
      return { ...prev, selectedChannelIds: selected };
    });
  }, []);

  // ── Events import ──

  const importEvents = useCallback(async (): Promise<number> => {
    if (config.selectedChannelIds.length === 0) {
      setImportError('No channels selected. Select at least one channel to import from.');
      return 0;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      let allEvents: Event[] = [];

      for (const channelId of config.selectedChannelIds) {
        const events = await fetchSlackEventsFromChannel(config.botUrl, channelId, 50);
        allEvents = [...allEvents, ...events];
      }

      // Deduplicate by id
      const uniqueMap = new Map<string, Event>();
      for (const event of allEvents) {
        uniqueMap.set(event.id, event);
      }
      const dedupedEvents = Array.from(uniqueMap.values());

      // Save to state and localStorage
      setSlackEvents(dedupedEvents);
      saveToStorage(SLACK_EVENTS_KEY, dedupedEvents);

      // Update last import time
      const now = new Date();
      setLastImportTime(now);
      saveToStorage(SLACK_LAST_IMPORT_KEY, now.toISOString());
      setImportedCount(dedupedEvents.length);

      // Push to EventsContext
      addExternalEvents(dedupedEvents);

      console.log(`Imported ${dedupedEvents.length} events from Slack`);
      return dedupedEvents.length;
    } catch (err: any) {
      const msg = err.message || 'Failed to import events from Slack';
      setImportError(msg);
      console.error('Slack import error:', msg);
      return 0;
    } finally {
      setIsImporting(false);
    }
  }, [config.botUrl, config.selectedChannelIds, addExternalEvents]);

  const clearImportedEvents = useCallback(() => {
    // Remove Slack events from EventsContext
    removeExternalEvents('slack-');
    // Clear local state
    setSlackEvents([]);
    saveToStorage(SLACK_EVENTS_KEY, []);
    setImportedCount(0);
    setLastImportTime(null);
    saveToStorage(SLACK_LAST_IMPORT_KEY, null);
  }, [removeExternalEvents]);

  // ── Context value ──

  const value: SlackContextType = {
    config,
    setBotUrl,
    setAutoImport,
    isConnected,
    isConnecting,
    connectionError,
    connect,
    channels,
    isLoadingChannels,
    refreshChannels,
    toggleChannel,
    slackEvents,
    isImporting,
    importError,
    lastImportTime,
    importedCount,
    importEvents,
    clearImportedEvents,
  };

  return <SlackContext.Provider value={value}>{children}</SlackContext.Provider>;
};

// ─── Hook ──────────────────────────────────────────────────────────────

export const useSlack = (): SlackContextType => {
  const context = useContext(SlackContext);
  if (context === undefined) {
    throw new Error('useSlack must be used within a SlackProvider');
  }
  return context;
};
