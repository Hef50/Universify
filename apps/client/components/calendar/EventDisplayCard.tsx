import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Event } from '@/types/event';
import { formatTime, formatDate } from '@/utils/dateHelpers';
import { Ionicons } from '@expo/vector-icons';

interface EventDisplayCardProps {
  event: Event;
  isScheduled: boolean;
  isExpanded?: boolean;
  onSchedule?: () => void;
  onUnschedule?: () => void;
  onToggleExpand?: () => void;
}

export const EventDisplayCard: React.FC<EventDisplayCardProps> = ({
  event,
  isScheduled,
  isExpanded = false,
  onSchedule,
  onUnschedule,
  onToggleExpand,
}) => {
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);

  if (isExpanded) {
    return (
      <View style={styles.expandedContainer}>
        <ScrollView style={styles.expandedContent} showsVerticalScrollIndicator>
          <View style={styles.expandedHeader}>
            <Text style={styles.expandedTitle}>{event.title}</Text>
            {isScheduled ? (
              onUnschedule && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onUnschedule();
                  }}
                >
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
              )
            ) : (
              onSchedule && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onSchedule();
                  }}
                >
                  <Ionicons name="add-circle" size={22} color="#10B981" />
                </TouchableOpacity>
              )
            )}
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>{formatDate(event.startTime)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              {formatTime(event.startTime)} - {formatTime(event.endTime)}
            </Text>
          </View>

          {event.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText}>{event.location}</Text>
            </View>
          )}

          {event.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{event.description}</Text>
            </View>
          )}

          {event.categories && event.categories.length > 0 && (
            <View style={styles.categoriesContainer}>
              {event.categories.map((category) => (
                <View key={category} style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onToggleExpand}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Collapsed view
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onToggleExpand}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        {isScheduled ? (
          onUnschedule && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={(e) => {
                e.stopPropagation();
                onUnschedule();
              }}
            >
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          )
        ) : (
          onSchedule && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={(e) => {
                e.stopPropagation();
                onSchedule();
              }}
            >
              <Ionicons name="add-circle" size={20} color="#10B981" />
            </TouchableOpacity>
          )
        )}
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
        <Text style={styles.infoText} numberOfLines={1}>
          {formatDate(event.startTime)}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={14} color="#6B7280" />
        <Text style={styles.infoText} numberOfLines={1}>
          {formatTime(event.startTime)} - {formatTime(event.endTime)}
        </Text>
      </View>

      {event.location && (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text style={styles.infoText} numberOfLines={1}>
            {event.location}
          </Text>
        </View>
      )}

      {event.categories && event.categories.length > 0 && (
        <View style={styles.categoriesContainer}>
          {event.categories.slice(0, 2).map((category) => (
            <View key={category} style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          ))}
          {event.categories.length > 2 && (
            <Text style={styles.moreCategories}>+{event.categories.length - 2}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  iconButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    color: '#6B7280',
  },
  moreCategories: {
    fontSize: 10,
    color: '#9CA3AF',
    alignSelf: 'center',
  },
  expandedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  expandedContent: {
    flex: 1,
    padding: 16,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  expandedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  descriptionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  descriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

