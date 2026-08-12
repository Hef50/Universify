import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDevMode } from '@/contexts/DevModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette, FontScales } from '@/constants/theme';
import { DEV_ACCOUNTS } from '@/constants/devAccounts';
import { generateDevEvents, DEV_EVENT_PREFIX } from '@/utils/devTools';
import { isSupabaseConfigured } from '@/lib/supabase';
import { storage } from '@/lib/storage';

/**
 * Dev-mode panel: password-gated testing tools.
 *
 * The gate is a client-side convenience latch (the password ships in the
 * bundle) — everything behind it is local-only and can never touch real
 * user data. See contexts/DevModeContext.tsx.
 */
export default function DevScreen() {
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);
  const {
    isDevMode,
    devUser,
    enableDevMode,
    disableDevMode,
    signInAsDevUser,
    signOutDevUser,
  } = useDevMode();
  const { currentUser } = useAuth();
  const { events, addExternalEvents, removeExternalEvents, refreshEvents } = useEvents();
  const { settings, updateSettings, resetSettings } = useSettings();

  const [password, setPassword] = useState('');
  const [gateError, setGateError] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const flash = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  /* ── Locked state: password gate ── */
  if (!isDevMode) {
    return (
      <View style={styles.gateContainer}>
        <View style={styles.gateCard}>
          <View style={styles.gateIcon}>
            <Ionicons name="construct-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.gateTitle}>Developer Mode</Text>
          <Text style={styles.gateBody}>
            Testing tools for the CMUnify team: test accounts that bypass CMU
            sign-in, data seeding, and theme controls. Enter the dev password
            to continue.
          </Text>
          <TextInput
            style={[styles.gateInput, gateError && styles.gateInputError]}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setGateError(false);
            }}
            placeholder="Dev password"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            autoCapitalize="none"
            onSubmitEditing={() => {
              if (!enableDevMode(password)) setGateError(true);
            }}
          />
          {gateError && <Text style={styles.gateErrorText}>Wrong password.</Text>}
          <TouchableOpacity
            style={styles.gateButton}
            onPress={() => {
              if (!enableDevMode(password)) setGateError(true);
            }}
          >
            <Text style={styles.gateButtonText}>Unlock</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.gateBack}>← Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ── Unlocked: the panel ── */
  const seededCount = events.filter((e) => e.id.startsWith(DEV_EVENT_PREFIX)).length;

  const clearLocalState = async () => {
    // Everything except auth/dev-mode keys, which have their own controls
    const keys = [
      'universify_settings',
      'universify_scheduled_events',
      'universify_google_events',
      'universify_google_events_last_sync',
      'universify_gcal_event_map',
      'universify_fired_reminders',
      'universify_slack_config',
      'universify_slack_events',
      'universify_slack_last_import',
    ];
    await Promise.all(keys.map((k) => storage.removeItem(k).catch(() => {})));
    await resetSettings();
    flash('Local app state cleared');
  };

  const testNotification = () => {
    if (Platform.OS !== 'web' || typeof Notification === 'undefined') {
      flash('Notifications are web-only');
      return;
    }
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        new Notification('CMUnify test notification', {
          body: 'This is what an event reminder looks like.',
        });
        flash('Notification fired');
      } else {
        flash(`Notification permission: ${perm}`);
      }
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Developer Mode</Text>
          <Text style={styles.subtitle}>Local testing tools — nothing here touches real data</Text>
        </View>
        <TouchableOpacity
          style={styles.exitButton}
          onPress={() => {
            disableDevMode();
            router.replace('/');
          }}
        >
          <Text style={styles.exitButtonText}>Exit dev mode</Text>
        </TouchableOpacity>
      </View>

      {statusMessage && (
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerText}>{statusMessage}</Text>
        </View>
      )}

      {/* Test accounts */}
      <Section styles={styles} title="Test accounts" icon="person-circle-outline" colors={colors}>
        <Text style={styles.sectionHint}>
          Sign in without CMU SSO. Personas are local-only: RSVPs, schedules,
          and created events stay on this device.
        </Text>
        {DEV_ACCOUNTS.map((account) => {
          const active = devUser?.id === account.user.id;
          return (
            <TouchableOpacity
              key={account.user.id}
              style={[styles.accountRow, active && styles.accountRowActive]}
              onPress={() => {
                signInAsDevUser(account.user.id);
                flash(`Signed in as ${account.user.name}`);
              }}
            >
              <View style={styles.accountAvatar}>
                <Text style={styles.accountAvatarText}>
                  {account.user.name.split(' ').map((p) => p[0]).join('')}
                </Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{account.user.name}</Text>
                <Text style={styles.accountDescription}>{account.description}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
            </TouchableOpacity>
          );
        })}
        <View style={styles.buttonRow}>
          {devUser && (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)')}>
                <Text style={styles.actionButtonText}>Open app as {devUser.name.split(' ')[0]}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quietButton}
                onPress={() => {
                  signOutDevUser();
                  flash('Signed out of test account');
                }}
              >
                <Text style={styles.quietButtonText}>Sign out</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Section>

      {/* Data tools */}
      <Section styles={styles} title="Test data" icon="server-outline" colors={colors}>
        <Text style={styles.sectionHint}>
          Seeded events are pinned to the next 7 days (bundled mock data has
          fixed dates), tagged dev-seed, and removable in one tap.
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              addExternalEvents(generateDevEvents(10));
              flash('Seeded 10 events across this week');
            }}
          >
            <Text style={styles.actionButtonText}>Seed 10 events this week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quietButton}
            onPress={() => {
              removeExternalEvents(DEV_EVENT_PREFIX);
              flash('Removed seeded events');
            }}
          >
            <Text style={styles.quietButtonText}>Clear seeded ({seededCount})</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.quietButton}
            onPress={() => {
              refreshEvents();
              flash('Events reloaded');
            }}
          >
            <Text style={styles.quietButtonText}>Reload events</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quietButton} onPress={clearLocalState}>
            <Text style={styles.quietButtonText}>Reset local app state</Text>
          </TouchableOpacity>
        </View>
      </Section>

      {/* Theme playground */}
      <Section styles={styles} title="Theme playground" icon="color-palette-outline" colors={colors}>
        <Text style={styles.rowLabel}>Theme</Text>
        <View style={styles.pillRow}>
          {(['light', 'dark', 'system'] as const).map((theme) => (
            <TouchableOpacity
              key={theme}
              style={[styles.pill, settings.theme === theme && styles.pillActive]}
              onPress={() => updateSettings({ theme })}
            >
              <Text style={[styles.pillText, settings.theme === theme && styles.pillTextActive]}>
                {theme}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.rowLabel}>Font size</Text>
        <View style={styles.pillRow}>
          {(Object.keys(FontScales) as (keyof typeof FontScales)[]).map((size) => (
            <TouchableOpacity
              key={size}
              style={[styles.pill, settings.fontSize === size && styles.pillActive]}
              onPress={() => updateSettings({ fontSize: size })}
            >
              <Text style={[styles.pillText, settings.fontSize === size && styles.pillTextActive]}>
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.rowLabel}>High contrast</Text>
          <Switch
            value={settings.accessibility.highContrast}
            onValueChange={(value) =>
              updateSettings({
                accessibility: { ...settings.accessibility, highContrast: value },
              })
            }
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.rowLabel}>Reduce motion</Text>
          <Switch
            value={settings.accessibility.reduceMotion}
            onValueChange={(value) =>
              updateSettings({
                accessibility: { ...settings.accessibility, reduceMotion: value },
              })
            }
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </Section>

      {/* Shortcuts */}
      <Section styles={styles} title="Shortcuts" icon="flash-outline" colors={colors}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.quietButton} onPress={() => router.push('/(tabs)/calendar')}>
            <Text style={styles.quietButtonText}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quietButton} onPress={() => router.push('/(tabs)/find')}>
            <Text style={styles.quietButtonText}>Find</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quietButton} onPress={() => router.push('/(tabs)/create')}>
            <Text style={styles.quietButtonText}>Create</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.quietButton} onPress={() => router.push('/resources')}>
            <Text style={styles.quietButtonText}>Freshman guide</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quietButton} onPress={testNotification}>
            <Text style={styles.quietButtonText}>Test notification</Text>
          </TouchableOpacity>
        </View>
      </Section>

      {/* Diagnostics */}
      <Section styles={styles} title="Diagnostics" icon="information-circle-outline" colors={colors}>
        <DiagRow styles={styles} label="Platform" value={Platform.OS} />
        <DiagRow
          styles={styles}
          label="Supabase"
          value={isSupabaseConfigured ? 'configured' : 'offline demo mode'}
        />
        <DiagRow styles={styles} label="Events loaded" value={String(events.length)} />
        <DiagRow styles={styles} label="Signed in as" value={currentUser ? `${currentUser.name} (${currentUser.id})` : 'nobody'} />
        <DiagRow styles={styles} label="Theme" value={`${settings.theme} / hc=${settings.accessibility.highContrast ? 'on' : 'off'}`} />
      </Section>
    </ScrollView>
  );
}

/* ─── Small pieces ──────────────────────────────────────────────────── */

function Section({
  styles,
  colors,
  title,
  icon,
  children,
}: {
  styles: ReturnType<typeof createStyles>;
  colors: AppPalette;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function DiagRow({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.diagRow}>
      <Text style={styles.diagLabel}>{label}</Text>
      <Text style={styles.diagValue}>{value}</Text>
    </View>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────── */

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 48,
      maxWidth: 720,
      width: '100%',
      alignSelf: 'center',
    },

    /* Gate */
    gateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: colors.background,
    },
    gateCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 28,
      alignItems: 'center',
    },
    gateIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    gateTitle: {
      fontSize: 22 * fontScale,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    gateBody: {
      fontSize: 14 * fontScale,
      lineHeight: 21 * fontScale,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    gateInput: {
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15 * fontScale,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    gateInputError: {
      borderColor: colors.danger,
    },
    gateErrorText: {
      fontSize: 13 * fontScale,
      color: colors.danger,
      alignSelf: 'flex-start',
      marginBottom: 4,
    },
    gateButton: {
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 14,
    },
    gateButtonText: {
      fontSize: 15 * fontScale,
      fontWeight: '600',
      color: colors.onPrimary,
    },
    gateBack: {
      fontSize: 14 * fontScale,
      color: colors.textSecondary,
    },

    /* Panel */
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
      gap: 12,
      flexWrap: 'wrap',
    },
    title: {
      fontSize: 26 * fontScale,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 13 * fontScale,
      color: colors.textSecondary,
      marginTop: 2,
    },
    exitButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    exitButtonText: {
      fontSize: 13 * fontScale,
      fontWeight: '600',
      color: colors.danger,
    },
    statusBanner: {
      backgroundColor: colors.infoSoft,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    statusBannerText: {
      fontSize: 14 * fontScale,
      color: colors.infoText,
      textAlign: 'center',
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      marginBottom: 14,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16 * fontScale,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    sectionHint: {
      fontSize: 13 * fontScale,
      lineHeight: 19 * fontScale,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    accountRowActive: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceAlt,
    },
    accountAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    accountAvatarText: {
      fontSize: 13 * fontScale,
      fontWeight: '700',
      color: colors.primary,
    },
    accountInfo: {
      flex: 1,
    },
    accountName: {
      fontSize: 15 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    accountDescription: {
      fontSize: 12 * fontScale,
      color: colors.textSecondary,
      marginTop: 1,
    },
    buttonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    actionButtonText: {
      fontSize: 13 * fontScale,
      fontWeight: '600',
      color: colors.onPrimary,
    },
    quietButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    quietButtonText: {
      fontSize: 13 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    rowLabel: {
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    pillRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pillText: {
      fontSize: 13 * fontScale,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    pillTextActive: {
      color: colors.onPrimary,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    diagRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    diagLabel: {
      fontSize: 13 * fontScale,
      color: colors.textSecondary,
    },
    diagValue: {
      fontSize: 13 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
      flexShrink: 1,
      textAlign: 'right',
    },
  });
