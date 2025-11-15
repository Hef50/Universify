import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Event } from '@/types/event';
import { formatDate, formatTimeRange } from '@/utils/dateHelpers';
import { CategoryPill } from '@/components/ui/CategoryPill';

interface RecommendationCardProps {
  event: Event;
  onPress: () => void;
  reason?: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  event,
  onPress,
  reason,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.colorBar, { backgroundColor: event.color }]} />

      <View style={styles.content}>
        {reason && (
          <View style={styles.reasonBadge}>
            <Text style={styles.reasonText}>✨ {reason}</Text>
          </View>
        )}

        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🕒</Text>
          <Text style={styles.infoText} numberOfLines={1}>
            {formatDate(event.startTime)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={styles.infoText} numberOfLines={1}>
            {event.location}
          </Text>
        </View>

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
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  colorBar: {
    height: 3,
  },
  content: {
    padding: 14,
  },
  reasonBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  infoIcon: {
    fontSize: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
});

