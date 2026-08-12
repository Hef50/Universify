import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Image } from 'react-native';
import { Event } from '@/types/event';
import { formatDate, formatTimeRange } from '@/utils/dateHelpers';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

interface EventCardProps {
  event: Event;
  onPress: () => void;
  index?: number;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress, index = 0 }) => {
  const { colors, fontScale, reduceMotion } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  const totalRSVPs = event.rsvpCounts.going + event.rsvpCounts.maybe;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (reduceMotion) {
      // Skip the entrance animation: jump straight to the final values
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      scaleAnim.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: index * 50,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 50,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [event.id, reduceMotion, index, fadeAnim, slideAnim, scaleAnim]);

  const handlePressIn = () => {
    if (reduceMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (reduceMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
      {/* Color Bar */}
      <View style={[styles.colorBar, { backgroundColor: event.color }]} />

      {/* Flyer Image */}
      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : null}

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          {event.isClubEvent && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Club</Text>
            </View>
          )}
          {event.isSocialEvent && (
            <View style={[styles.badge, styles.socialBadge]}>
              <Text style={[styles.badgeText, styles.socialBadgeText]}>Social</Text>
            </View>
          )}
        </View>

        {/* Time & Location */}
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🕒</Text>
          <Text style={styles.infoText} numberOfLines={1}>
            {formatDate(event.startTime)} • {formatTimeRange(event.startTime, event.endTime)}
            {event.recurring ? '  🔁' : ''}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={styles.infoText} numberOfLines={1}>
            {event.location}
          </Text>
        </View>

        {/* Organizer */}
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>👤</Text>
          <Text style={styles.infoText} numberOfLines={1}>
            {event.organizer.name}
          </Text>
        </View>

        {/* Categories */}
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
            <Text style={styles.moreCategories}>
              +{event.categories.length - 3}
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {event.rsvpEnabled && (
            <View style={styles.rsvpInfo}>
              <Text style={styles.rsvpIcon}>✓</Text>
              <Text style={styles.rsvpText}>
                {totalRSVPs} {totalRSVPs === 1 ? 'person' : 'people'} interested
              </Text>
            </View>
          )}
          {event.capacity && (
            <Text style={styles.capacity}>
              {event.capacity - totalRSVPs} spots left
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
      marginBottom: 16,
    },
    colorBar: {
      height: 4,
    },
    image: {
      width: '100%',
      height: 140,
    },
    content: {
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
      gap: 8,
    },
    title: {
      flex: 1,
      fontSize: 18 * fontScale,
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
    socialBadgeText: {
      color: '#E24E8C',
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
      marginBottom: 8,
      gap: 8,
    },
    infoIcon: {
      fontSize: 14,
    },
    infoText: {
      flex: 1,
      fontSize: 14 * fontScale,
      color: colors.textSecondary,
    },
    categories: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 12,
      marginBottom: 12,
    },
    moreCategories: {
      fontSize: 12 * fontScale,
      color: colors.textTertiary,
      alignSelf: 'center',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rsvpInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    rsvpIcon: {
      fontSize: 14,
      color: colors.success,
    },
    rsvpText: {
      fontSize: 13 * fontScale,
      color: colors.textSecondary,
    },
    capacity: {
      fontSize: 13 * fontScale,
      color: colors.primary,
      fontWeight: '500',
    },
  });
