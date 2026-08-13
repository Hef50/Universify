import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '@/types/event';
import { formatDate, formatTimeRange } from '@/utils/dateHelpers';
import { getAvailableSpots, getClaimedSpots } from '@/utils/eventHelpers';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';
import { Elevation, Motion, Radii, Spacing, Typography } from '@/constants/design';

interface EventCardProps {
  event: Event;
  onPress: () => void;
  index?: number;
}

/**
 * Browse card. Same anatomy as the feed card — date tile, title, quiet meta —
 * with room for the organiser, a cover image when there is one, and the
 * capacity state. One card language across the app is most of what makes it
 * feel designed rather than assembled.
 */
export const EventCard: React.FC<EventCardProps> = ({ event, onPress, index = 0 }) => {
  const { colors, type, elevation, reduceMotion } = useAppTheme();
  const styles = React.useMemo(
    () => createStyles(colors, type, elevation),
    [colors, type, elevation]
  );

  const totalRSVPs = getClaimedSpots(event);
  const spotsLeft = getAvailableSpots(event);
  const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(reduceMotion ? 0 : 12)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      scaleAnim.setValue(1);
      return;
    }
    const delay = Math.min(index, 8) * Motion.stagger;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: Motion.slow,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay,
        tension: 90,
        friction: 14,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim, index, reduceMotion]);

  const handlePressIn = () => {
    if (reduceMotion) return;
    Animated.spring(scaleAnim, { toValue: 0.985, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    if (reduceMotion) return;
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const start = new Date(event.startTime);
  const weekday = start.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <Pressable
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={event.title}
      >
        {event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={styles.cover} resizeMode="cover" />
        ) : null}

        <View style={styles.row}>
          <View style={[styles.tile, { backgroundColor: event.color }]}>
            <Text style={styles.tileWeekday}>{weekday}</Text>
            <Text style={styles.tileDay}>{start.getDate()}</Text>
          </View>

          <View style={styles.body}>
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={2}>
                {event.title}
              </Text>
              {event.isClubEvent ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Club</Text>
                </View>
              ) : event.isSocialEvent ? (
                <View style={[styles.badge, styles.socialBadge]}>
                  <Text style={[styles.badgeText, styles.socialBadgeText]}>Social</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
              <Text style={styles.infoText} numberOfLines={1}>
                {formatDate(event.startTime)} · {formatTimeRange(event.startTime, event.endTime)}
              </Text>
              {event.recurring ? (
                <Ionicons name="repeat" size={13} color={colors.textTertiary} />
              ) : null}
            </View>

            {event.location ? (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {event.location} · {event.organizer.name}
                </Text>
              </View>
            ) : null}

            <View style={styles.categories}>
              {event.categories.slice(0, 3).map((category) => (
                <CategoryPill
                  key={category}
                  category={category}
                  size="small"
                  color={event.color}
                />
              ))}
              {event.categories.length > 3 && (
                <Text style={styles.moreCategories}>+{event.categories.length - 3}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          {event.rsvpEnabled && (
            <Text style={styles.rsvpText}>
              {totalRSVPs} {totalRSVPs === 1 ? 'person' : 'people'} interested
            </Text>
          )}
          {spotsLeft !== null && (
            <Text style={[styles.capacity, spotsLeft === 0 && styles.capacityFull]}>
              {spotsLeft === 0
                ? 'Full'
                : `${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (colors: AppPalette, type: Typography, elevation: Elevation) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: Spacing.md,
      ...elevation.low,
    },
    cover: {
      width: '100%',
      height: 132,
    },
    row: {
      flexDirection: 'row',
      gap: Spacing.lg,
      padding: Spacing.lg,
    },
    tile: {
      width: 52,
      height: 52,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileWeekday: {
      ...type.overline,
      color: '#FFFFFF',
    },
    tileDay: {
      ...type.title3,
      color: '#FFFFFF',
    },
    body: {
      flex: 1,
      gap: Spacing.xs,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    title: {
      flex: 1,
      ...type.headline,
      color: colors.textPrimary,
    },
    badge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xxs,
      borderRadius: Radii.pill,
      backgroundColor: colors.surfaceAlt,
    },
    socialBadge: {
      backgroundColor: colors.infoSoft,
    },
    badgeText: {
      ...type.overline,
      color: colors.textSecondary,
    },
    socialBadgeText: {
      color: colors.infoText,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    infoText: {
      flex: 1,
      ...type.footnote,
      color: colors.textSecondary,
    },
    categories: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    moreCategories: {
      ...type.caption,
      color: colors.textTertiary,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    rsvpText: {
      ...type.caption,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    capacity: {
      ...type.caption,
      color: colors.primary,
    },
    capacityFull: {
      color: colors.textTertiary,
    },
  });
