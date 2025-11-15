import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useEvents } from '@/contexts/EventsContext';
import { useCalendar } from '@/hooks/useCalendar';
import { useResponsive } from '@/hooks/useResponsive';
import { useSettings } from '@/contexts/SettingsContext';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { ResizableSidebar } from '@/components/layout/ResizableSidebar';
import { Event } from '@/types/event';
import { Text, ScrollView, TouchableOpacity } from 'react-native';

export default function CalendarScreen() {
  const { events } = useEvents();
  const { settings } = useSettings();
  const { isMobile, isDesktop } = useResponsive();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const calendar = useCalendar(isMobile ? 3 : settings.calendarViewDays);

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
  };

  return (
    <View style={styles.container}>
      <View style={styles.calendarContainer}>
        <CalendarHeader
          days={calendar.displayDays}
          currentDate={calendar.currentDate}
          onPrevious={calendar.previousPeriod}
          onNext={calendar.nextPeriod}
          onToday={calendar.goToToday}
          viewDays={calendar.viewDays}
          onViewDaysChange={calendar.setViewDays}
        />
        <CalendarGrid
          days={calendar.displayDays}
          events={events}
          onEventPress={handleEventPress}
        />
      </View>

      {/* Recommendations Sidebar (Desktop only) */}
      {isDesktop && (
        <ResizableSidebar position="right" initialWidth={350}>
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Recommendations</Text>
            </View>
            <ScrollView style={styles.sidebarContent}>
              <Text style={styles.comingSoon}>Recommendations coming soon</Text>
            </ScrollView>
          </View>
        </ResizableSidebar>
      )}

      {/* Event Detail Modal - Placeholder */}
      {selectedEvent && (
        <View style={styles.eventDetailOverlay}>
          <TouchableOpacity
            style={styles.eventDetailBackdrop}
            onPress={() => setSelectedEvent(null)}
          />
          <View style={styles.eventDetail}>
            <Text style={styles.eventDetailTitle}>{selectedEvent.title}</Text>
            <Text style={styles.eventDetailDescription}>
              {selectedEvent.description}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedEvent(null)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
  },
  calendarContainer: {
    flex: 1,
  },
  sidebar: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  sidebarHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  sidebarContent: {
    flex: 1,
    padding: 20,
  },
  comingSoon: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  eventDetailOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDetailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  eventDetail: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  eventDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  eventDetailDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

