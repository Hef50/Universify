import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Event } from '@/types/event';
import { formatDate, formatTimeRange } from '@/utils/dateHelpers';
import { CategoryPill } from '@/components/ui/CategoryPill';

interface EventCardProps {
  event: Event;
  onPress: () => void;
  index?: number;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress, index = 0 }) => {
  const totalRSVPs = event.rsvpCounts.going + event.rsvpCounts.maybe;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
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
  }, [event.id]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
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
              <Text style={styles.badgeText}>Social</Text>
            </View>
          )}
        </View>

        {/* Time & Location */}
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🕒</Text>
          <Text style={styles.infoText} numberOfLines={1}>
            {formatDate(event.startTime)} • {formatTimeRange(event.startTime, event.endTime)}
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  colorBar: {
    height: 4,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  badge: {
    backgroundColor: '#8B7FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  socialBadge: {
    backgroundColor: '#FF6BA8',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
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
    fontSize: 14,
    color: '#6B7280',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    marginBottom: 12,
  },
  moreCategories: {
    fontSize: 12,
    color: '#9CA3AF',
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  rsvpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rsvpIcon: {
    fontSize: 14,
    color: '#6BCF7F',
  },
  rsvpText: {
    fontSize: 13,
    color: '#6B7280',
  },
  capacity: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '500',
  },
});

