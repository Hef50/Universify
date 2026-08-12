import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useEvents } from '@/contexts/EventsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { FilterProvider, useFilters } from '@/contexts/FilterContext';
import { RecommendationsList } from '@/components/recommendations/RecommendationsList';
import { EventDetailSidebar } from '@/components/events/EventDetailSidebar';
import { FilterDrawer } from '@/components/layout/FilterDrawer';
import { Event } from '@/types/event';
import { getUpcomingEvents } from '@/utils/eventHelpers';
import { useUserInterests, rankEventsForUser } from '@/hooks/useRecommendations';
import { useScheduledEvents, getWeekKey } from '@/hooks/useScheduledEvents';

function HomeScreenContent() {
  const { events } = useEvents();
  const { settings } = useSettings();
  const { currentUser } = useAuth();
  const { isDesktop } = useResponsive();
  const { filteredEvents } = useFilters();
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Events the user engaged with (scheduled, RSVP'd, created) form the
  // interest profile that the recommendation engine mines.
  const { allScheduledIds } = useScheduledEvents(currentUser?.id, getWeekKey(new Date()));
  const engagedEvents = useMemo(() => {
    const userId = currentUser?.id;
    const createdIds = new Set(currentUser?.createdEvents ?? []);
    const scheduledIds = new Set(allScheduledIds);
    return events.filter(
      (event) =>
        scheduledIds.has(event.id) ||
        createdIds.has(event.id) ||
        (userId != null && event.attendees.some((a) => a.userId === userId))
    );
  }, [events, currentUser, allScheduledIds]);

  const { topInterests } = useUserInterests({ events: engagedEvents });

  // Ranked recommendations: interest profile + explicit category preferences
  // + popularity, over upcoming events (respecting any active filters).
  const recommendations = useMemo(() => {
    const base = filteredEvents.length > 0 ? filteredEvents : events;
    const upcoming = getUpcomingEvents(base);
    const ranked = rankEventsForUser(
      upcoming,
      topInterests,
      currentUser?.preferences.categoryInterests ?? []
    );
    return ranked.slice(0, 20);
  }, [events, filteredEvents, currentUser, topInterests]);

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

export default function HomeScreen() {
  const { events } = useEvents();

  return (
    <FilterProvider events={events}>
      <HomeScreenContent />
    </FilterProvider>
  );
}

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });
