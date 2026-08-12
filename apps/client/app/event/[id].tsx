import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useEvents } from '@/contexts/EventsContext';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { Button } from '@/components/ui/Button';
import { Event, RSVPStatus } from '@/types/event';
import { fetchEventAPI } from '@/lib/api';
import { formatDate, formatFullDate, formatTimeRange } from '@/utils/dateHelpers';
import { googleCalendarUrl, downloadIcs, shareEvent } from '@/utils/calendarLinks';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const recurrenceLabel = (event: Event): string | null => {
  if (!event.recurring) return null;
  const { frequency, interval, endDate } = event.recurring;
  const unit =
    frequency === 'daily'
      ? interval > 1 ? `every ${interval} days` : 'daily'
      : frequency === 'weekly'
        ? interval > 1 ? `every ${interval} weeks` : 'weekly'
        : interval > 1 ? `every ${interval} months` : 'monthly';
  return `Repeats ${unit}${endDate ? ` until ${formatDate(endDate)}` : ''}`;
};

function InfoRow({
  icon,
  primary,
  secondary,
  styles,
  colors,
}: {
  icon: IoniconName;
  primary: string;
  secondary?: string;
  styles: ReturnType<typeof createStyles>;
  colors: AppPalette;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.iconTile}>
        <Ionicons name={icon} size={18} color={colors.textSecondary} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoPrimary}>{primary}</Text>
        {secondary ? <Text style={styles.infoSecondary}>{secondary}</Text> : null}
      </View>
    </View>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getEventById, updateRSVP, getRSVPStatus } = useEvents();
  const { currentUser } = useAuth();
  const { colors, fontScale, reduceMotion } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  const contextEvent = id ? getEventById(id) : undefined;
  const [fetchedEvent, setFetchedEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingRSVP, setIsUpdatingRSVP] = useState(false);
  const [isChoosingRsvp, setIsChoosingRsvp] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

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
      setIsChoosingRsvp(false);
    }
  };

  // Which face the bottom bar is showing — drives the quick fade/scale swap.
  const barMode = !currentUser
    ? 'signed-out'
    : userRSVP === 'going' && !isChoosingRsvp
      ? 'going'
      : userRSVP === 'maybe' && !isChoosingRsvp
        ? 'maybe'
        : 'choose';

  const barAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion) {
      barAnim.setValue(1);
      return;
    }
    barAnim.setValue(0);
    Animated.spring(barAnim, {
      toValue: 1,
      tension: 140,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [barMode, reduceMotion, barAnim]);

  const copyAnim = useRef(new Animated.Value(0)).current;
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    []
  );

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

  const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

  const openGoogleCalendar = () => {
    const url = googleCalendarUrl(event);
    if (isWeb) {
      window.open(url, '_blank', 'noopener');
    } else {
      Linking.openURL(url);
    }
  };

  const handleShare = async () => {
    const url = isWeb ? window.location.href : Linking.createURL(`/event/${event.id}`);
    const result = await shareEvent(event, url);
    if (result !== 'copied') return;
    setShareFeedback('Link copied');
    if (reduceMotion) {
      copyAnim.setValue(1);
    } else {
      copyAnim.setValue(0);
      Animated.timing(copyAnim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    }
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setShareFeedback(null), 2200);
  };

  const chooseRsvp = (status: Exclude<RSVPStatus, null>) => {
    if (userRSVP === status) {
      setIsChoosingRsvp(false);
      return;
    }
    handleRSVP(status);
  };

  const recurrence = recurrenceLabel(event);
  const spotsLeft = event.capacity
    ? Math.max(event.capacity - (event.rsvpCounts.going + event.rsvpCounts.maybe), 0)
    : null;

  const barAnimStyle = {
    opacity: barAnim,
    transform: [
      { scale: barAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
    ],
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Cover header */}
        <View style={styles.cover}>
          {event.imageUrl ? (
            <Image source={{ uri: event.imageUrl }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={[styles.coverFill, { backgroundColor: event.color }]}>
              <View style={styles.coverCircleLarge} />
              <View style={styles.coverCircleSmall} />
            </View>
          )}
        </View>

        {/* Content card overlapping the cover */}
        <View style={styles.cardWrap}>
          <View style={styles.card}>
            <Text style={styles.title}>{event.title}</Text>

            {/* Hosted by */}
            <View style={styles.hostRow}>
              <View style={styles.hostAvatar}>
                <Text style={styles.hostInitial}>
                  {event.organizer.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.hostTextWrap}>
                <Text style={styles.hostName}>Hosted by {event.organizer.name}</Text>
                <Text style={styles.hostType}>
                  {event.organizer.type === 'club' ? 'Club' : 'Individual organizer'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Info rows */}
            <View style={styles.infoGroup}>
              <InfoRow
                icon="calendar-outline"
                primary={formatFullDate(event.startTime)}
                secondary={formatTimeRange(event.startTime, event.endTime)}
                styles={styles}
                colors={colors}
              />
              {event.location ? (
                <InfoRow
                  icon="location-outline"
                  primary={event.location}
                  styles={styles}
                  colors={colors}
                />
              ) : null}
              {recurrence ? (
                <InfoRow
                  icon="repeat-outline"
                  primary={recurrence}
                  styles={styles}
                  colors={colors}
                />
              ) : null}
              {event.rsvpEnabled ? (
                <InfoRow
                  icon="people-outline"
                  primary={`${event.rsvpCounts.going} going · ${event.rsvpCounts.maybe} maybe`}
                  secondary={
                    spotsLeft !== null
                      ? `${spotsLeft} of ${event.capacity} spots left`
                      : undefined
                  }
                  styles={styles}
                  colors={colors}
                />
              ) : null}
            </View>

            {/* Calendar + share actions */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={openGoogleCalendar}
                style={({ pressed }) => [styles.quietButton, pressed && styles.quietButtonPressed]}
              >
                <Ionicons name="calendar-clear-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.quietButtonText}>Add to Google Calendar</Text>
              </Pressable>
              <Pressable
                onPress={() => downloadIcs(event)}
                style={({ pressed }) => [styles.quietButton, pressed && styles.quietButtonPressed]}
              >
                <Ionicons name="download-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.quietButtonText}>Download .ics</Text>
              </Pressable>
              <Pressable
                onPress={handleShare}
                style={({ pressed }) => [styles.quietButton, pressed && styles.quietButtonPressed]}
              >
                <Ionicons name="share-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.quietButtonText}>Share</Text>
              </Pressable>
            </View>
            {shareFeedback ? (
              <Animated.Text style={[styles.shareFeedback, { opacity: copyAnim }]}>
                {shareFeedback}
              </Animated.Text>
            ) : null}

            {/* About */}
            {event.description ? (
              <>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.description}>{event.description}</Text>
              </>
            ) : null}

            {/* Categories */}
            {event.categories.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Categories</Text>
                <View style={styles.categories}>
                  {event.categories.map((category) => (
                    <CategoryPill
                      key={category}
                      category={category}
                      size="small"
                      color={event.color}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky-feel RSVP bar */}
      {event.rsvpEnabled && (
        <View style={styles.bottomBar}>
          <Animated.View style={[styles.bottomBarInner, barAnimStyle]}>
            {barMode === 'signed-out' ? (
              <Text style={styles.signInNote}>Sign in to RSVP</Text>
            ) : barMode === 'going' ? (
              <View style={styles.stateRowGoing}>
                <Pressable
                  style={styles.stateMain}
                  onPress={() => setIsChoosingRsvp(true)}
                  accessibilityLabel="Change your RSVP"
                >
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.stateTextGoing}>You&apos;re going</Text>
                  <Text style={styles.stateHint}>Tap to change</Text>
                </Pressable>
                {isUpdatingRSVP ? (
                  <ActivityIndicator size="small" color={colors.success} />
                ) : (
                  <Pressable
                    style={styles.clearButton}
                    onPress={() => handleRSVP(null)}
                    accessibilityLabel="Clear RSVP"
                  >
                    <Ionicons name="close" size={16} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            ) : barMode === 'maybe' ? (
              <View style={styles.stateRowMaybe}>
                <Pressable
                  style={styles.stateMain}
                  onPress={() => setIsChoosingRsvp(true)}
                  accessibilityLabel="Change your RSVP"
                >
                  <Ionicons name="help-circle" size={20} color={colors.infoText} />
                  <Text style={styles.stateTextMaybe}>You said maybe</Text>
                  <Text style={styles.stateHint}>Tap to change</Text>
                </Pressable>
                {isUpdatingRSVP ? (
                  <ActivityIndicator size="small" color={colors.infoText} />
                ) : (
                  <Pressable
                    style={styles.clearButton}
                    onPress={() => handleRSVP(null)}
                    accessibilityLabel="Clear RSVP"
                  >
                    <Ionicons name="close" size={16} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={styles.chooseRow}>
                <Button
                  title={userRSVP === 'going' ? "I'm going ✓" : "Register — I'm going"}
                  onPress={() => chooseRsvp('going')}
                  variant="primary"
                  size="medium"
                  loading={isUpdatingRSVP}
                  style={{ flex: 2 }}
                />
                <Button
                  title={userRSVP === 'maybe' ? 'Maybe ✓' : 'Maybe'}
                  onPress={() => chooseRsvp('maybe')}
                  variant="outline"
                  size="medium"
                  loading={isUpdatingRSVP}
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
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
    // Cover header
    cover: {
      width: '100%',
      height: 200,
      overflow: 'hidden',
      backgroundColor: colors.surfaceAlt,
    },
    coverImage: {
      width: '100%',
      height: '100%',
    },
    coverFill: {
      flex: 1,
    },
    coverCircleLarge: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: 'rgba(255, 255, 255, 0.16)',
      top: -80,
      right: -60,
    },
    coverCircleSmall: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(0, 0, 0, 0.10)',
      bottom: -50,
      left: -30,
    },
    // Overlapping content card
    cardWrap: {
      paddingHorizontal: 16,
      marginTop: -56,
      alignItems: 'center',
    },
    card: {
      width: '100%',
      maxWidth: 720,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    title: {
      fontSize: 26 * fontScale,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: colors.textPrimary,
      marginBottom: 14,
    },
    hostRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    hostAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    hostInitial: {
      fontSize: 15 * fontScale,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    hostTextWrap: {
      flex: 1,
    },
    hostName: {
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    hostType: {
      fontSize: 12 * fontScale,
      color: colors.textTertiary,
      marginTop: 1,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
    infoGroup: {
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconTile: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoTextWrap: {
      flex: 1,
    },
    infoPrimary: {
      fontSize: 15 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    infoSecondary: {
      fontSize: 13 * fontScale,
      color: colors.textSecondary,
      marginTop: 1,
    },
    // Quiet calendar/share buttons
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 18,
    },
    quietButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 36,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    quietButtonPressed: {
      backgroundColor: colors.surfaceAlt,
    },
    quietButtonText: {
      fontSize: 13 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    shareFeedback: {
      fontSize: 12 * fontScale,
      fontWeight: '600',
      color: colors.success,
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 13 * fontScale,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 22,
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
    // Bottom RSVP bar
    bottomBar: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
    },
    bottomBarInner: {
      width: '100%',
      maxWidth: 720,
    },
    signInNote: {
      fontSize: 14 * fontScale,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 12,
    },
    chooseRow: {
      flexDirection: 'row',
      gap: 10,
    },
    stateRowGoing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.success + '55',
      backgroundColor: colors.success + '14',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    stateRowMaybe: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.infoSoft,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    stateMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    stateTextGoing: {
      fontSize: 15 * fontScale,
      fontWeight: '700',
      color: colors.success,
    },
    stateTextMaybe: {
      fontSize: 15 * fontScale,
      fontWeight: '700',
      color: colors.infoText,
    },
    stateHint: {
      fontSize: 12 * fontScale,
      color: colors.textTertiary,
    },
    clearButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
