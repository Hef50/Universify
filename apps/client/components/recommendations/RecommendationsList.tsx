import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Event } from '@/types/event';
import { RecommendationCard } from './RecommendationCard';

interface RecommendationsListProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  onRefresh?: () => void;
  showFilters?: boolean;
  onFilterPress?: () => void;
}

const getRecommendationReason = (event: Event, index: number): string => {
  const reasons = [
    'Popular in your area',
    'Based on your interests',
    'Trending now',
    'New event',
    'Similar to events you liked',
    'Recommended for you',
  ];
  
  if (event.rsvpCounts.going > 50) return 'Popular event';
  if (event.isSocialEvent) return 'Social event nearby';
  if (event.isClubEvent) return 'Club event';
  
  return reasons[index % reasons.length];
};

export const RecommendationsList: React.FC<RecommendationsListProps> = ({
  events,
  onEventPress,
  onRefresh,
  showFilters = false,
  onFilterPress,
}) => {
  if (events.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🎉</Text>
        <Text style={styles.emptyTitle}>No recommendations yet</Text>
        <Text style={styles.emptyText}>
          Check back later for personalized event suggestions
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showFilters && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Recommended for you</Text>
          <TouchableOpacity style={styles.filterButton} onPress={onFilterPress}>
            <Text style={styles.filterIcon}>⚙</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <RecommendationCard
            event={item}
            onPress={() => onEventPress(item)}
            reason={getRecommendationReason(item, index)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        onRefresh={onRefresh}
        refreshing={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIcon: {
    fontSize: 18,
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

