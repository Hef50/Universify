import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Event } from '@/types/event';
import { formatTime, formatDate } from '@/utils/dateHelpers';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

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
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

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
                  <Ionicons name="close-circle" size={22} color={colors.danger} />
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
                  <Ionicons name="add-circle" size={22} color={colors.success} />
                </TouchableOpacity>
              )
            )}
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{formatDate(event.startTime)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              {formatTime(event.startTime)} - {formatTime(event.endTime)}
            </Text>
          </View>

          {event.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
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
              <Ionicons name="close-circle" size={20} color={colors.danger} />
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
              <Ionicons name="add-circle" size={20} color={colors.success} />
            </TouchableOpacity>
          )
        )}
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.infoText} numberOfLines={1}>
          {formatDate(event.startTime)}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.infoText} numberOfLines={1}>
          {formatTime(event.startTime)} - {formatTime(event.endTime)}
        </Text>
      </View>

      {event.location && (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
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

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
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
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
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
      fontSize: 12 * fontScale,
      color: colors.textSecondary,
      flex: 1,
    },
    categoriesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8,
      gap: 6,
    },
    categoryBadge: {
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    categoryText: {
      fontSize: 10 * fontScale,
      color: colors.textSecondary,
    },
    moreCategories: {
      fontSize: 10 * fontScale,
      color: colors.textTertiary,
      alignSelf: 'center',
    },
    expandedContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
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
      fontSize: 20 * fontScale,
      fontWeight: 'bold',
      color: colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    descriptionSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    descriptionTitle: {
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    descriptionText: {
      fontSize: 14 * fontScale,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    closeButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    closeButtonText: {
      color: colors.onPrimary,
      fontSize: 16 * fontScale,
      fontWeight: '600',
    },
  });
