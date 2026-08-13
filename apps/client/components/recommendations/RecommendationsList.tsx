import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Event } from '@/types/event';
import { RecommendationCard } from './RecommendationCard';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';
import { ContentWidth, Radii, Spacing, TouchTarget, Typography } from '@/constants/design';

interface RecommendationsListProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  onRefresh?: () => void;
  showFilters?: boolean;
  onFilterPress?: () => void;
}

const getRecommendationReason = (event: Event, index: number): string => {
  if (event.rsvpCounts.going > 50) return 'Popular right now';
  if (event.isSocialEvent) return 'Social';
  if (event.isClubEvent) return 'Club event';
  return ['Based on your interests', 'Worth a look', 'New this week'][index % 3];
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export const RecommendationsList: React.FC<RecommendationsListProps> = ({
  events,
  onEventPress,
  onRefresh,
  showFilters = false,
  onFilterPress,
}) => {
  const { colors, type } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, type), [colors, type]);

  const header = showFilters ? (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>{greeting()}</Text>
          <Text style={styles.headerTitle}>What&apos;s on</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.push('/my-events')}
            accessibilityRole="button"
            accessibilityLabel="My events"
          >
            <Ionicons name="bookmark-outline" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={onFilterPress}
            accessibilityRole="button"
            accessibilityLabel="Filter events"
          >
            <Ionicons name="options-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>
      <Text style={styles.headerSubtitle}>
        {events.length} {events.length === 1 ? 'event' : 'events'} picked for you
      </Text>
    </View>
  ) : null;

  if (events.length === 0) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="sparkles-outline" size={26} color={colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Nothing to show yet</Text>
          <Text style={styles.emptyText}>
            Loosen your filters, or browse everything happening on campus.
          </Text>
          <Pressable style={styles.emptyButton} onPress={() => router.push('/(tabs)/find')}>
            <Text style={styles.emptyButtonText}>Browse all events</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <RecommendationCard
            event={item}
            index={index}
            onPress={() => onEventPress(item)}
            reason={getRecommendationReason(item, index)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={onRefresh}
        refreshing={false}
      />
    </View>
  );
};

const createStyles = (colors: AppPalette, type: Typography) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingTop: Spacing.md,
      paddingBottom: Spacing.lg,
      gap: Spacing.xs,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    headerText: {
      flex: 1,
      gap: Spacing.xxs,
    },
    eyebrow: {
      ...type.overline,
      color: colors.textTertiary,
    },
    headerTitle: {
      ...type.title1,
      color: colors.textPrimary,
    },
    headerSubtitle: {
      ...type.footnote,
      color: colors.textSecondary,
    },
    headerActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    iconButton: {
      width: TouchTarget,
      height: TouchTarget,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xxl,
      maxWidth: ContentWidth.regular,
      width: '100%',
      alignSelf: 'center',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xxl,
    },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: Radii.lg,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    emptyTitle: {
      ...type.title3,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    emptyText: {
      ...type.callout,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 320,
      marginBottom: Spacing.xl,
    },
    emptyButton: {
      backgroundColor: colors.primary,
      borderRadius: Radii.md,
      paddingHorizontal: Spacing.xl,
      minHeight: TouchTarget,
      justifyContent: 'center',
    },
    emptyButtonText: {
      ...type.subhead,
      color: colors.onPrimary,
    },
  });
