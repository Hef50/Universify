import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEvents } from '@/contexts/EventsContext';
import { useAuth } from '@/contexts/AuthContext';
import { FilterProvider, useFilters } from '@/contexts/FilterContext';
import { SearchBar } from '@/components/ui/SearchBar';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { EventCard } from '@/components/events/EventCard';
import { EventDetailSidebar } from '@/components/events/EventDetailSidebar';
import { FilterDrawer } from '@/components/layout/FilterDrawer';
import { Event, EventCategory } from '@/types/event';
import { useResponsive } from '@/hooks/useResponsive';

const QUICK_FILTERS: EventCategory[] = ['Career', 'Food', 'Fun', 'Tech', 'Sports', 'Social'];

function FindScreenContent() {
  const params = useLocalSearchParams();
  const { currentUser } = useAuth();
  const { events } = useEvents();
  const {
    filteredEvents,
    searchQuery,
    searchMode,
    selectedCategories,
    clubEvents,
    socialEvents,
    activeFilterCount,
    setSearchQuery,
    setSearchMode,
    toggleCategory,
    toggleEventType,
    clearAllFilters,
  } = useFilters();

  const { isMobile } = useResponsive();
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
        />
      )}

      {/* Filter Drawer */}
      <FilterDrawer
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        selectedCategories={selectedCategories}
        onCategoryToggle={toggleCategory}
        clubEvents={clubEvents}
        socialEvents={socialEvents}
        onEventTypeToggle={toggleEventType}
        onClearFilters={clearAllFilters}
        onApply={() => {}}
      />

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

  // Filter out any Google Calendar events (IDs starting with "gcal-")
  // The events tab should ONLY show Universify public events from mockEvents.json
  const universifyEvents = events.filter((event) => !event.id.startsWith('gcal-'));

  return (
    <FilterProvider events={universifyEvents}>
      <FindScreenContent />
    </FilterProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  searchBar: {
    flex: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    overflow: 'hidden',
  },
  viewButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  viewButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  viewIcon: {
    fontSize: 18,
  },
  quickFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    gap: 6,
  },
  filterIcon: {
    fontSize: 16,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  myEventsButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  myEventsButtonActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FF6B6B',
  },
  myEventsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  myEventsTextActive: {
    color: '#FF6B6B',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
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

