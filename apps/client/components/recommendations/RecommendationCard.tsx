import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '@/types/event';
import { formatTimeRange } from '@/utils/dateHelpers';
import { getAvailableSpots } from '@/utils/eventHelpers';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';
import { Elevation, Motion, Radii, Spacing, Typography } from '@/constants/design';

interface RecommendationCardProps {
  event: Event;
  onPress: () => void;
  reason?: string;
  index?: number;
}

/**
 * Feed card: a date tile anchors the row, the title carries the weight, and
 * everything else is quiet metadata. One accent colour per card (the event's),
 * used on the tile only — colour is information here, not decoration.
 */
export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  event,
  onPress,
  reason,
  index = 0,
}) => {
  const { colors, type, elevation, reduceMotion } = useAppTheme();
  const styles = React.useMemo(
    () => createStyles(colors, type, elevation),
    [colors, type, elevation]
  );

  const fade = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const slide = useRef(new Animated.Value(reduceMotion ? 0 : 12)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      fade.setValue(1);
      slide.setValue(0);
      return;
    }
    const delay = Math.min(index, 8) * Motion.stagger;
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: Motion.slow,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slide, {
        toValue: 0,
        delay,
        tension: 90,
        friction: 14,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide, index, reduceMotion]);

  const start = new Date(event.startTime);
  const weekday = start.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const day = start.getDate();
  const spotsLeft = getAvailableSpots(event);
  const going = event.rsvpCounts.going;

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }, { scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (!reduceMotion) {
            Animated.spring(scale, { toValue: 0.985, useNativeDriver: true }).start();
          }
        }}
        onPressOut={() => {
          if (!reduceMotion) {
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
          }
        }}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={event.title}
      >
        {/* Date tile — image when the event has one, otherwise its colour */}
        <View style={[styles.tile, { backgroundColor: event.color }]}>
          {event.imageUrl ? (
            <Image source={{ uri: event.imageUrl }} style={styles.tileImage} resizeMode="cover" />
          ) : null}
          <View style={styles.tileOverlay}>
            <Text style={styles.tileWeekday}>{weekday}</Text>
            <Text style={styles.tileDay}>{day}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {reason ? (
            <Text style={styles.reason} numberOfLines={1}>
              {reason}
            </Text>
          ) : null}

          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.metaText} numberOfLines={1}>
              {formatTimeRange(event.startTime, event.endTime)}
              {event.location ? `  ·  ${event.location}` : ''}
            </Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.categories}>
              {event.categories.slice(0, 2).map((category) => (
                <CategoryPill
                  key={category}
                  category={category}
                  size="small"
                  color={event.color}
                />
              ))}
            </View>
            {going > 0 || spotsLeft === 0 ? (
              <Text style={styles.attendance}>
                {spotsLeft === 0 ? 'Full' : `${going} going`}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (colors: AppPalette, type: Typography, elevation: Elevation) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: Spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: Radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      ...elevation.low,
    },
    tile: {
      width: 56,
      height: 56,
      borderRadius: Radii.md,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    tileImage: {
      ...StyleSheet.absoluteFillObject,
    },
    tileOverlay: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: Radii.sm,
      backgroundColor: 'rgba(0, 0, 0, 0.28)',
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
    reason: {
      ...type.overline,
      color: colors.textTertiary,
    },
    title: {
      ...type.headline,
      color: colors.textPrimary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    metaText: {
      flex: 1,
      ...type.footnote,
      color: colors.textSecondary,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    categories: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      flexShrink: 1,
    },
    attendance: {
      ...type.caption,
      color: colors.textTertiary,
    },
  });
