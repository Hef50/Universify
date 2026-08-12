import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useMyEvents } from '@/hooks/useMyEvents';
import { AgendaList } from '@/components/events/AgendaList';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

/**
 * My Events — the Luma pattern: every event you have a relationship with
 * (RSVP'd going/maybe, pinned to your calendar, or hosting) in one
 * date-grouped timeline, split into Upcoming and Past.
 */

type MyEventsTab = 'upcoming' | 'past';

export default function MyEventsScreen() {
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);
  const { currentUser } = useAuth();
  // Same "my events" set the calendar and agenda read from
  const { myEvents, relationFor } = useMyEvents();
  const [tab, setTab] = useState<MyEventsTab>('upcoming');
  const [query, setQuery] = useState('');

  const visibleEvents = useMemo(() => {
    const now = Date.now();
    const inTab = myEvents.filter((event) => {
      const end = new Date(event.endTime).getTime();
      return tab === 'upcoming' ? end >= now : end < now;
    });
    if (tab !== 'past') return inTab;
    const q = query.trim().toLowerCase();
    if (!q) return inTab;
    return inTab.filter(
      (event) =>
        event.title.toLowerCase().includes(q) ||
        event.location.toLowerCase().includes(q)
    );
  }, [myEvents, tab, query]);

  const topBar = (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.wordmark}>
        CMU<Text style={styles.wordmarkAccent}>nify</Text>
      </Text>
      <View style={styles.backButton} />
    </View>
  );

  if (!currentUser) {
    return (
      <View style={styles.container}>
        {topBar}
        <View style={styles.signedOut}>
          <View style={styles.signedOutIconWrap}>
            <Ionicons name="calendar-outline" size={26} color={colors.textTertiary} />
          </View>
          <Text style={styles.signedOutTitle}>Sign in to see your events</Text>
          <Text style={styles.signedOutBody}>
            Your RSVPs, pinned events, and everything you host live here once
            you&apos;re signed in.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.signInButtonText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const searchActive = tab === 'past' && query.trim().length > 0;

  return (
    <View style={styles.container}>
      {topBar}

      <View style={styles.header}>
        <Text style={styles.title}>My Events</Text>
        <Text style={styles.subtitle}>
          Everything you&apos;re going to, hosting, or saved
        </Text>

        <SegmentedControl<MyEventsTab>
          options={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'past' && (
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Find an old event by title or place"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.listWrap}>
        <AgendaList
          events={visibleEvents}
          onEventPress={(event) => router.push(`/event/${event.id}`)}
          badgeFor={relationFor}
          descending={tab === 'past'}
          emptyTitle={
            tab === 'upcoming'
              ? 'No upcoming events'
              : searchActive
                ? `Nothing matched “${query.trim()}”`
                : 'No past events yet'
          }
          emptyBody={
            tab === 'upcoming'
              ? "RSVP to something or pin it to your calendar and it'll live here."
              : searchActive
                ? 'Try a different word — titles and locations are searchable.'
                : 'Once events you join wrap up, they move here.'
          }
          emptyAction={
            tab === 'upcoming'
              ? { label: 'Find events', onPress: () => router.push('/(tabs)/find') }
              : undefined
          }
        />
      </View>
    </View>
  );
}

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      maxWidth: 960,
      width: '100%',
      alignSelf: 'center',
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    wordmark: {
      fontSize: 18 * fontScale,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },
    wordmarkAccent: {
      color: colors.primary,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      gap: 14,
      maxWidth: 720,
      width: '100%',
      alignSelf: 'center',
    },
    title: {
      fontSize: 28 * fontScale,
      lineHeight: 33 * fontScale,
      fontWeight: '800',
      letterSpacing: -0.8,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 14 * fontScale,
      lineHeight: 20 * fontScale,
      color: colors.textSecondary,
      marginTop: -10,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14 * fontScale,
      color: colors.textPrimary,
    },
    listWrap: {
      flex: 1,
      maxWidth: 720,
      width: '100%',
      alignSelf: 'center',
    },
    signedOut: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    signedOutIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    signedOutTitle: {
      fontSize: 17 * fontScale,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    signedOutBody: {
      fontSize: 14 * fontScale,
      lineHeight: 20 * fontScale,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 320,
      marginBottom: 18,
    },
    signInButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    signInButtonText: {
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.onPrimary,
    },
  });
