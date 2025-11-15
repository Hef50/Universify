import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useEvents } from '@/contexts/EventsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { FilterProvider, useFilters } from '@/contexts/FilterContext';
import { RecommendationsList } from '@/components/recommendations/RecommendationsList';
import { EventDetailSidebar } from '@/components/events/EventDetailSidebar';
import { FilterDrawer } from '@/components/layout/FilterDrawer';
import { Event } from '@/types/event';
import { getRandomEvents, getUpcomingEvents } from '@/utils/eventHelpers';

function HomeScreenContent() {
  const { events } = useEvents();
  const { settings } = useSettings();
  const { currentUser } = useAuth();
  const { isMobile, isDesktop } = useResponsive();
  const {
    filteredEvents,
    selectedCategories,
    clubEvents,
    socialEvents,
    toggleCategory,
    toggleEventType,
    clearAllFilters,
  } = useFilters();

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Get recommendations based on user preferences
  const recommendations = useMemo(() => {
    let recommendedEvents = filteredEvents.length > 0 ? filteredEvents : events;

    // Filter by user's category interests if available
    if (currentUser?.preferences.categoryInterests.length) {
      const interested = recommendedEvents.filter((event) =>
        event.categories.some((cat) =>
          currentUser.preferences.categoryInterests.includes(cat)
        )
      );
      if (interested.length > 0) {
        recommendedEvents = interested;
      }
    }

    // Get upcoming events only
    recommendedEvents = getUpcomingEvents(recommendedEvents);

    // Randomize for variety
    return getRandomEvents(recommendedEvents, 20);
  }, [events, filteredEvents, currentUser]);

  // Check if user's default home page is calendar
  if (settings.defaultHomePage === 'calendar' && isDesktop) {
    // Redirect to calendar on desktop
    router.replace('/(tabs)/calendar');
    return null;
  }

  return (
    <View style={styles.container}>
      <RecommendationsList
        events={recommendations}
        onEventPress={setSelectedEvent}
        showFilters={true}
        onFilterPress={() => setShowFilters(true)}
      />

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

export default function HomeScreen() {
  const { events } = useEvents();

  return (
    <FilterProvider events={events}>
      <HomeScreenContent />
    </FilterProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
