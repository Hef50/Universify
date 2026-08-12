import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '@/types/event';
import { formatTimeRange } from '@/utils/dateHelpers';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

/**
 * Luma-style agenda: events grouped by day along a vertical timeline —
 * date headers ("Today", "Tomorrow", "Fri, Aug 14"), a dot-and-line spine,
 * and compact event cards with time, location, attendance, and the user's
 * own status (Going / Maybe / Created / Scheduled) surfaced as a chip.
 */

export type AgendaBadge = 'going' | 'maybe' | 'created' | 'scheduled';

interface AgendaListProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  /** Optional per-event badge showing the user's relationship to it */
  badgeFor?: (event: Event) => AgendaBadge | null;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: { label: string; onPress: () => void };
  /** Sort descending (for "Past" lists) */
  descending?: boolean;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  const label = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return date.getFullYear() === now.getFullYear()
    ? label
    : `${label}, ${date.getFullYear()}`;
}

const BADGE_LABELS: Record<AgendaBadge, string> = {
  going: 'Going',
  maybe: 'Maybe',
  created: 'Hosting',
  scheduled: 'Scheduled',
};

export const AgendaList: React.FC<AgendaListProps> = ({
  events,
  onEventPress,
  badgeFor,
  emptyTitle = 'Nothing here yet',
  emptyBody = 'Events you add will show up in this timeline.',
  emptyAction,
  descending = false,
}) => {
  const { colors, fontScale, reduceMotion } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  const groups = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      const diff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      return descending ? -diff : diff;
    });
    const byDay = new Map<string, { date: Date; events: Event[] }>();
    for (const event of sorted) {
      const start = new Date(event.startTime);
      const key = dayKey(start);
      if (!byDay.has(key)) byDay.set(key, { date: start, events: [] });
      byDay.get(key)!.events.push(event);
    }
    return [...byDay.values()];
  }, [events, descending]);

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="calendar-clear-outline" size={26} color={colors.textTertiary} />
        </View>
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyBody}>{emptyBody}</Text>
        {emptyAction && (
          <Pressable style={styles.emptyButton} onPress={emptyAction.onPress}>
            <Text style={styles.emptyButtonText}>{emptyAction.label}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  let itemIndex = 0;
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {groups.map((group, groupIndex) => (
        <View key={dayKey(group.date)} style={styles.group}>
          {/* Date header on the spine */}
          <View style={styles.dateRow}>
            <View style={styles.spineDot} />
            <Text style={styles.dateLabel}>{dayLabel(group.date)}</Text>
            <View style={styles.dateRule} />
          </View>

          <View style={styles.groupBody}>
            {/* Spine line (skipped for the last group so it doesn't dangle) */}
            {groupIndex < groups.length - 1 && <View style={styles.spineLine} />}
            <View style={styles.cards}>
              {group.events.map((event) => (
                <AgendaCard
                  key={event.id}
                  event={event}
                  index={itemIndex++}
                  onPress={() => onEventPress(event)}
                  badge={badgeFor?.(event) ?? null}
                  styles={styles}
                  colors={colors}
                  reduceMotion={reduceMotion}
                />
              ))}
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

function AgendaCard({
  event,
  index,
  onPress,
  badge,
  styles,
  colors,
  reduceMotion,
}: {
  event: Event;
  index: number;
  onPress: () => void;
  badge: AgendaBadge | null;
  styles: ReturnType<typeof createStyles>;
  colors: AppPalette;
  reduceMotion: boolean;
}) {
  const fade = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const slide = useRef(new Animated.Value(reduceMotion ? 0 : 14)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      fade.setValue(1);
      slide.setValue(0);
      return;
    }
    const delay = Math.min(index, 8) * 45;
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, delay, tension: 90, friction: 14, useNativeDriver: true }),
    ]).start();
  }, [fade, slide, index, reduceMotion]);

  const going = event.rsvpCounts.going;

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }, { scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (!reduceMotion) {
            Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
          }
        }}
        onPressOut={() => {
          if (!reduceMotion) {
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
          }
        }}
        style={styles.card}
      >
        <View style={[styles.cardAccent, { backgroundColor: event.color }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTime}>
              {formatTimeRange(event.startTime, event.endTime)}
            </Text>
            {badge && (
              <View
                style={[
                  styles.badge,
                  badge === 'going' && styles.badgeGoing,
                  badge === 'created' && styles.badgeCreated,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    badge === 'going' && styles.badgeTextGoing,
                    badge === 'created' && styles.badgeTextCreated,
                  ]}
                >
                  {BADGE_LABELS[badge]}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {event.title}
          </Text>
          <View style={styles.cardMetaRow}>
            {event.location ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
            ) : null}
            {event.rsvpEnabled && going > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={13} color={colors.textTertiary} />
                <Text style={styles.metaText}>{going} going</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 32,
    },
    group: {
      marginBottom: 4,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    spineDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    dateLabel: {
      fontSize: 14 * fontScale,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    dateRule: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    groupBody: {
      position: 'relative',
      paddingLeft: 18,
      paddingBottom: 16,
    },
    spineLine: {
      position: 'absolute',
      left: 3.5,
      top: 0,
      bottom: -10,
      width: 1,
      backgroundColor: colors.border,
    },
    cards: {
      gap: 10,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingRight: 12,
      overflow: 'hidden',
    },
    cardAccent: {
      width: 4,
      alignSelf: 'stretch',
    },
    cardBody: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 3,
      gap: 8,
    },
    cardTime: {
      fontSize: 12 * fontScale,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    cardTitle: {
      fontSize: 16 * fontScale,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 5,
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 1,
    },
    metaText: {
      fontSize: 12 * fontScale,
      color: colors.textTertiary,
      flexShrink: 1,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
    },
    badgeGoing: {
      backgroundColor: 'rgba(5, 150, 105, 0.12)',
    },
    badgeCreated: {
      backgroundColor: 'rgba(139, 92, 246, 0.12)',
    },
    badgeText: {
      fontSize: 11 * fontScale,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    badgeTextGoing: {
      color: colors.success,
    },
    badgeTextCreated: {
      color: '#8B5CF6',
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    emptyIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    emptyTitle: {
      fontSize: 17 * fontScale,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    emptyBody: {
      fontSize: 14 * fontScale,
      lineHeight: 20 * fontScale,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 300,
      marginBottom: 18,
    },
    emptyButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    emptyButtonText: {
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.onPrimary,
    },
  });
