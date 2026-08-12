import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEvents } from '@/contexts/EventsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { FilterProvider, useFilters } from '@/contexts/FilterContext';
import { SearchBar } from '@/components/ui/SearchBar';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { EventCard } from '@/components/events/EventCard';
import { EventDetailSidebar } from '@/components/events/EventDetailSidebar';
import { FilterDrawer } from '@/components/layout/FilterDrawer';
import { Event, EventCategory } from '@/types/event';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

const QUICK_FILTERS: EventCategory[] = ['Career', 'Food', 'Fun', 'Tech', 'Sports', 'Social'];

function FindScreenContent() {
  const params = useLocalSearchParams();
  const { currentUser } = useAuth();
  const {
    filteredEvents,
    searchQuery,
    searchMode,
    selectedCategories,
    activeFilterCount,
    setSearchQuery,
    setSearchMode,
    toggleCategory,
    clearAllFilters,
  } = useFilters();

  const { settings } = useSettings();
  const { isMobile } = useResponsive();
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMyEventsOnly, setShowMyEventsOnly] = useState(false);

  // Handle "my events" filter from params
  useEffect(() => {
    if (params.filterMyEvents === 'true') {
      setShowMyEventsOnly(true);
    }
  }, [params.filterMyEvents]);

  // Filter for my events
  const displayEvents = showMyEventsOnly
    ? filteredEvents.filter((event) => event.organizer.id === currentUser?.id)
    : filteredEvents;

  const numColumns = isMobile ? 1 : viewMode === 'grid' ? 3 : 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
          placeholder="Search events..."
          containerStyle={styles.searchBar}
        />

        {/* View Toggle (Desktop only) */}
        {!isMobile && (
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === 'grid' && styles.viewButtonActive]}
              onPress={() => setViewMode('grid')}
            >
              <Text style={styles.viewIcon}>▦</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === 'list' && styles.viewButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <Text style={styles.viewIcon}>☰</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Filters */}
      <View style={styles.quickFilters}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterIcon}>⚙</Text>
          <Text style={styles.filterButtonText}>Filters</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.myEventsButton, showMyEventsOnly && styles.myEventsButtonActive]}
          onPress={() => setShowMyEventsOnly(!showMyEventsOnly)}
        >
          <Text style={[styles.myEventsText, showMyEventsOnly && styles.myEventsTextActive]}>
            My Events
          </Text>
        </TouchableOpacity>

        <FlatList
          horizontal
          data={QUICK_FILTERS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <CategoryPill
              category={item}
              active={selectedCategories.includes(item)}
              onPress={() => toggleCategory(item)}
              size="medium"
              style={styles.quickFilterPill}
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersContent}
        />

        {(activeFilterCount > 0 || searchQuery || showMyEventsOnly) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              clearAllFilters();
              setShowMyEventsOnly(false);
            }}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {displayEvents.length} {displayEvents.length === 1 ? 'event' : 'events'} found
          {showMyEventsOnly && ' (My Events)'}
        </Text>
      </View>

      {/* Events List */}
      {displayEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No events found</Text>
          <Text style={styles.emptyText}>
            Try adjusting your filters or search query
          </Text>
        </View>
      ) : (
        <FlatList
          key={`${numColumns}-${viewMode}`}
          data={displayEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={numColumns > 1 ? styles.gridItem : styles.listItem}>
              <EventCard event={item} onPress={() => setSelectedEvent(item)} index={index} />
            </View>
          )}
          numColumns={numColumns}
          contentContainerStyle={[styles.listContent, settings.compactView && styles.listContentCompact]}
          showsVerticalScrollIndicator={true}
        />
      )}

      {/* Filter Drawer */}
      <FilterDrawer visible={showFilters} onClose={() => setShowFilters(false)} />

      {/* Event Detail Sidebar */}
      <EventDetailSidebar
        event={selectedEvent}
        visible={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </View>
  );
}

export default function FindScreen() {
  const { events } = useEvents();

  return (
    <FilterProvider events={events}>
      <FindScreenContent />
    </FilterProvider>
  );
}

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    searchBar: {
      flex: 1,
    },
    viewToggle: {
      flexDirection: 'row',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    viewButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    viewButtonActive: {
      backgroundColor: colors.primary,
    },
    viewIcon: {
      fontSize: 18,
    },
    quickFilters: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 8,
      gap: 6,
    },
    filterIcon: {
      fontSize: 16,
    },
    filterButtonText: {
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    filterBadge: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterBadgeText: {
      fontSize: 11 * fontScale,
      fontWeight: 'bold',
      color: colors.onPrimary,
    },
    quickFiltersContent: {
      gap: 8,
    },
    quickFilterPill: {
      marginRight: 0,
    },
    clearButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    clearButtonText: {
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.primary,
    },
    myEventsButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    myEventsButtonActive: {
      backgroundColor: colors.dangerSoft,
      borderColor: colors.primary,
    },
    myEventsText: {
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    myEventsTextActive: {
      color: colors.primary,
    },
    resultsHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
    },
    resultsCount: {
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    listContent: {
      padding: 16,
    },
    listContentCompact: {
      padding: 8,
    },
    gridItem: {
      flex: 1,
      margin: 8,
    },
    listItem: {
      marginBottom: 0,
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
      fontSize: 20 * fontScale,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 16 * fontScale,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

