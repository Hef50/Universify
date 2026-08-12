import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEvents } from '@/contexts/EventsContext';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { Button } from '@/components/ui/Button';
import { Event, RSVPStatus } from '@/types/event';
import { fetchEventAPI } from '@/lib/api';
import { formatDate, formatTimeRange } from '@/utils/dateHelpers';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getEventById, updateRSVP, getRSVPStatus } = useEvents();
  const { currentUser } = useAuth();
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  const contextEvent = id ? getEventById(id) : undefined;
  const [fetchedEvent, setFetchedEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingRSVP, setIsUpdatingRSVP] = useState(false);

  const event = contextEvent ?? fetchedEvent ?? undefined;

  // Deep links can land here before the events list loads (or reference an
  // event that isn't in the current list) — fetch it directly as a fallback.
  useEffect(() => {
    if (contextEvent || !id) return;
    let cancelled = false;
    setIsLoading(true);
    fetchEventAPI(id)
      .then((result) => {
        if (!cancelled) setFetchedEvent(result);
      })
      .catch(() => {
        // Offline mode or fetch failure: fall through to not-found UI
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contextEvent, id]);

  const userRSVP: RSVPStatus =
    event && currentUser ? getRSVPStatus(event.id, currentUser.id) : null;

  const handleRSVP = async (status: RSVPStatus) => {
    if (!event || !currentUser) return;
    setIsUpdatingRSVP(true);
    try {
      await updateRSVP(event.id, currentUser.id, status);
    } finally {
      setIsUpdatingRSVP(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundTitle}>Event not found</Text>
        <Text style={styles.notFoundText}>
          This event may have been removed or the link is invalid.
        </Text>
        <Button title="Go Back" onPress={() => router.back()} variant="primary" size="medium" />
      </View>
    );
  }

  const totalRSVPs = event.rsvpCounts.going + event.rsvpCounts.maybe;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={[styles.colorBar, { backgroundColor: event.color }]} />

        {event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : null}

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{event.title}</Text>
            {event.isClubEvent && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Club</Text>
              </View>
            )}
            {event.isSocialEvent && (
              <View style={[styles.badge, styles.socialBadge]}>
                <Text style={styles.badgeText}>Social</Text>
              </View>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🕒</Text>
            <Text style={styles.infoText}>
              {formatDate(event.startTime)} • {formatTimeRange(event.startTime, event.endTime)}
            </Text>
          </View>
          {event.location ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText}>{event.location}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👤</Text>
            <Text style={styles.infoText}>{event.organizer.name}</Text>
          </View>
          {event.recurring ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🔁</Text>
              <Text style={styles.infoText}>
                Repeats {event.recurring.interval > 1 ? `every ${event.recurring.interval} ` : ''}
                {event.recurring.frequency === 'daily'
                  ? event.recurring.interval > 1 ? 'days' : 'daily'
                  : event.recurring.frequency === 'weekly'
                    ? event.recurring.interval > 1 ? 'weeks' : 'weekly'
                    : event.recurring.interval > 1 ? 'months' : 'monthly'}
                {event.recurring.endDate ? ` until ${formatDate(event.recurring.endDate)}` : ''}
              </Text>
            </View>
          ) : null}

          {event.description ? (
            <>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{event.description}</Text>
            </>
          ) : null}

          {event.categories.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Categories</Text>
              <View style={styles.categories}>
                {event.categories.map((category) => (
                  <CategoryPill key={category} category={category} size="small" color={event.color} />
                ))}
              </View>
            </>
          )}

          {event.rsvpEnabled && (
            <>
              <Text style={styles.sectionTitle}>RSVPs</Text>
              <View style={styles.rsvpStats}>
                <View style={styles.rsvpStat}>
                  <Text style={styles.rsvpCount}>{event.rsvpCounts.going}</Text>
                  <Text style={styles.rsvpLabel}>Going</Text>
                </View>
                <View style={styles.rsvpStat}>
                  <Text style={styles.rsvpCount}>{event.rsvpCounts.maybe}</Text>
                  <Text style={styles.rsvpLabel}>Maybe</Text>
                </View>
                <View style={styles.rsvpStat}>
                  <Text style={styles.rsvpCount}>{event.rsvpCounts.notGoing}</Text>
                  <Text style={styles.rsvpLabel}>Not Going</Text>
                </View>
              </View>

              {event.capacity ? (
                <Text style={styles.capacityText}>
                  {Math.max(event.capacity - totalRSVPs, 0)} of {event.capacity} spots left
                </Text>
              ) : null}

              {currentUser && (
                <View style={styles.rsvpButtons}>
                  <Button
                    title="Going"
                    onPress={() => handleRSVP(userRSVP === 'going' ? null : 'going')}
                    variant={userRSVP === 'going' ? 'primary' : 'outline'}
                    size="medium"
                    loading={isUpdatingRSVP}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Maybe"
                    onPress={() => handleRSVP(userRSVP === 'maybe' ? null : 'maybe')}
                    variant={userRSVP === 'maybe' ? 'primary' : 'outline'}
                    size="medium"
                    loading={isUpdatingRSVP}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Can't Go"
                    onPress={() => handleRSVP(userRSVP === 'not-going' ? null : 'not-going')}
                    variant={userRSVP === 'not-going' ? 'primary' : 'outline'}
                    size="medium"
                    loading={isUpdatingRSVP}
                    style={{ flex: 1 }}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 24,
      alignItems: 'center',
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      gap: 12,
      backgroundColor: colors.background,
    },
    notFoundTitle: {
      fontSize: 22 * fontScale,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    notFoundText: {
      fontSize: 15 * fontScale,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 12,
    },
    card: {
      width: '100%',
      maxWidth: 720,
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    colorBar: {
      height: 6,
    },
    image: {
      width: '100%',
      height: 220,
    },
    content: {
      padding: 24,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 16,
    },
    title: {
      flex: 1,
      fontSize: 26 * fontScale,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    badge: {
      backgroundColor: 'rgba(139, 127, 255, 0.14)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    socialBadge: {
      backgroundColor: 'rgba(255, 107, 168, 0.14)',
    },
    badgeText: {
      fontSize: 10 * fontScale,
      fontWeight: '700',
      color: '#8B7FFF',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    infoIcon: {
      fontSize: 15,
    },
    infoText: {
      flex: 1,
      fontSize: 15 * fontScale,
      color: colors.textSecondary,
    },
    sectionTitle: {
      fontSize: 16 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 20,
      marginBottom: 8,
    },
    description: {
      fontSize: 15 * fontScale,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    categories: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    rsvpStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 12,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
    },
    rsvpStat: {
      alignItems: 'center',
    },
    rsvpCount: {
      fontSize: 20 * fontScale,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    rsvpLabel: {
      fontSize: 12 * fontScale,
      color: colors.textSecondary,
      marginTop: 2,
    },
    capacityText: {
      fontSize: 13 * fontScale,
      color: colors.primary,
      fontWeight: '500',
      marginTop: 8,
    },
    rsvpButtons: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
  });
