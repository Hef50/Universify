import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';
import { ContentWidth, Radii, Spacing, TouchTarget, Typography } from '@/constants/design';
import { useAuth } from '@/contexts/AuthContext';
import { useRatings } from '@/contexts/RatingsContext';
import { useMyEvents } from '@/hooks/useMyEvents';
import { AgendaList } from '@/components/events/AgendaList';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { RateEventRow } from '@/components/events/RateEventRow';
import { Event } from '@/types/event';

/**
 * My Events — every event you have a relationship with, in one timeline.
 *
 * Opens on what already happened, because that is the part with something to
 * do: rate it. Upcoming events are one tap away behind the same control, and
 * they're never mixed into the list you are rating.
 */

type MyEventsTab = 'past' | 'upcoming';

export default function MyEventsScreen() {
  const { colors, type } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, type), [colors, type]);
  const { currentUser } = useAuth();
  // Same "my events" set the calendar and agenda read from
  const { myEvents, relationFor } = useMyEvents();
  const { ratingFor, rateEvent, ratedCount } = useRatings();
  const [tab, setTab] = useState<MyEventsTab>('past');
  const [onlyUnrated, setOnlyUnrated] = useState(false);
  const [query, setQuery] = useState('');

  const isPast = tab === 'past';

  const { past, upcoming } = useMemo(() => {
    const now = Date.now();
    const split: { past: Event[]; upcoming: Event[] } = { past: [], upcoming: [] };
    for (const event of myEvents) {
      const ended = new Date(event.endTime).getTime() < now;
      (ended ? split.past : split.upcoming).push(event);
    }
    return split;
  }, [myEvents]);

  const unratedCount = useMemo(
    () => past.filter((event) => !ratingFor(event.id)).length,
    [past, ratingFor]
  );

  const visibleEvents = useMemo(() => {
    const inTab = isPast ? past : upcoming;
    const filtered = isPast && onlyUnrated
      ? inTab.filter((event) => !ratingFor(event.id))
      : inTab;
    const q = query.trim().toLowerCase();
    if (!isPast || !q) return filtered;
    return filtered.filter(
      (event) =>
        event.title.toLowerCase().includes(q) ||
        event.location.toLowerCase().includes(q)
    );
  }, [isPast, past, upcoming, onlyUnrated, query, ratingFor]);

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
            Your RSVPs, pinned events, ratings and everything you host live here
            once you&apos;re signed in.
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

  const searchActive = isPast && query.trim().length > 0;

  return (
    <View style={styles.container}>
      {topBar}

      <View style={styles.header}>
        <Text style={styles.title}>My Events</Text>
        <Text style={styles.subtitle}>
          {ratedCount > 0
            ? `You've rated ${ratedCount} ${ratedCount === 1 ? 'event' : 'events'}`
            : 'Look back on where you’ve been, and rate it'}
        </Text>

        <SegmentedControl<MyEventsTab>
          options={[
            { value: 'past', label: 'Past' },
            { value: 'upcoming', label: `Upcoming${upcoming.length ? ` (${upcoming.length})` : ''}` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {isPast && (
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setOnlyUnrated((prev) => !prev)}
              style={[styles.filterChip, onlyUnrated && styles.filterChipActive]}
              accessibilityRole="switch"
              accessibilityState={{ checked: onlyUnrated }}
            >
              <Ionicons
                name={onlyUnrated ? 'checkmark-circle' : 'ellipse-outline'}
                size={15}
                color={onlyUnrated ? colors.onPrimary : colors.textSecondary}
              />
              <Text style={[styles.filterChipText, onlyUnrated && styles.filterChipTextActive]}>
                Not yet rated{unratedCount ? ` (${unratedCount})` : ''}
              </Text>
            </Pressable>
          </View>
        )}

        {isPast && (
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Find an event by title or place"
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
          descending={isPast}
          renderFooter={
            isPast
              ? (event) => (
                  <RateEventRow
                    eventTitle={event.title}
                    rating={ratingFor(event.id)}
                    onRate={(stars, note) => rateEvent(event.id, stars, note)}
                    onClear={() => rateEvent(event.id, null)}
                  />
                )
              : undefined
          }
          emptyTitle={
            isPast
              ? searchActive
                ? `Nothing matched “${query.trim()}”`
                : onlyUnrated
                  ? 'Everything is rated'
                  : 'No past events yet'
              : 'No upcoming events'
          }
          emptyBody={
            isPast
              ? searchActive
                ? 'Try a different word — titles and locations are searchable.'
                : onlyUnrated
                  ? 'You have rated every event you went to. Nice.'
                  : 'Once events you join wrap up, they move here to rate.'
              : "RSVP to something or pin it to your calendar and it'll live here."
          }
          emptyAction={
            isPast && !searchActive && onlyUnrated
              ? { label: 'Show all past events', onPress: () => setOnlyUnrated(false) }
              : !isPast
                ? { label: 'Find events', onPress: () => router.push('/(tabs)/find') }
                : undefined
          }
        />
      </View>
    </View>
  );
}

const createStyles = (colors: AppPalette, type: Typography) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.lg,
      maxWidth: ContentWidth.wide,
      width: '100%',
      alignSelf: 'center',
    },
    backButton: {
      width: TouchTarget,
      height: TouchTarget,
      borderRadius: Radii.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    wordmark: {
      ...type.headline,
      color: colors.textPrimary,
    },
    wordmarkAccent: {
      color: colors.primary,
    },
    header: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.lg,
      gap: Spacing.md,
      maxWidth: ContentWidth.regular,
      width: '100%',
      alignSelf: 'center',
    },
    title: {
      ...type.title1,
      color: colors.textPrimary,
    },
    subtitle: {
      ...type.callout,
      color: colors.textSecondary,
      marginTop: -Spacing.sm,
      marginBottom: Spacing.xs,
    },
    filterRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      minHeight: TouchTarget - 8,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      ...type.footnote,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: colors.onPrimary,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radii.md,
      paddingHorizontal: Spacing.md,
      minHeight: TouchTarget,
    },
    searchInput: {
      flex: 1,
      ...type.callout,
      color: colors.textPrimary,
    },
    listWrap: {
      flex: 1,
      maxWidth: ContentWidth.regular,
      width: '100%',
      alignSelf: 'center',
    },
    signedOut: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xxl,
    },
    signedOutIconWrap: {
      width: 56,
      height: 56,
      borderRadius: Radii.lg,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    signedOutTitle: {
      ...type.title3,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    signedOutBody: {
      ...type.callout,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 340,
      marginBottom: Spacing.xl,
    },
    signInButton: {
      backgroundColor: colors.primary,
      borderRadius: Radii.md,
      paddingHorizontal: Spacing.xl,
      minHeight: TouchTarget,
      justifyContent: 'center',
    },
    signInButtonText: {
      ...type.subhead,
      color: colors.onPrimary,
    },
  });
