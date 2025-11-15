import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useEvents } from '@/contexts/EventsContext';
import { useCalendar } from '@/hooks/useCalendar';
import { useResponsive } from '@/hooks/useResponsive';
import { useSettings } from '@/contexts/SettingsContext';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { WeekView } from '@/components/calendar/WeekView';
import { ResizableSidebar } from '@/components/layout/ResizableSidebar';
import { EventDisplayCard } from '@/components/calendar/EventDisplayCard';
import { Event } from '@/types/event';
import {
  getWeekKey,
  getScheduledEventIds,
  scheduleEvent,
  unscheduleEvent,
} from '@/utils/scheduledEvents';

export default function CalendarScreen() {
  const { events, isLoading } = useEvents();
  const { settings } = useSettings();
  const { isMobile, isDesktop } = useResponsive();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [scheduledEventIds, setScheduledEventIds] = useState<string[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(true);

  const calendar = useCalendar(isMobile ? 3 : settings.calendarViewDays);
  const weekKey = getWeekKey(calendar.currentDate);

  // Get week days for date adjustment (always 7 days for week view)
  // Matches CalFrontend getWeekDays logic exactly
  const weekDays = useMemo(() => {
    const date = new Date(calendar.currentDate);
    const day = date.getDay();
    const diff = date.getDate() - day;
    const sunday = new Date(date.setDate(diff));
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d;
    });
  }, [calendar.currentDate]);

  // Use weekDays for calendar grid (always 7 days)
  const displayDays = weekDays;

  // Load scheduled events for current week (synchronous for web)
  useEffect(() => {
    setIsLoadingScheduled(true);
    const ids = getScheduledEventIds(weekKey);
    setScheduledEventIds([...ids]); // Create new array for state update
    setIsLoadingScheduled(false);
  }, [weekKey]);

  // Get events scheduled for the current week (adjusted to current week dates)
  // Matches CalFrontend weekEvents logic exactly
  const weekEvents = useMemo(() => {
    if (scheduledEventIds.length === 0) return [];
    
    return events
      .filter((event) => scheduledEventIds.includes(event.id))
      .map((event) => {
        // Adjust event dates to the current week (preserve day of week and time)
        const eventStart = new Date(event.startTime);
        const eventDayOfWeek = eventStart.getDay();
        const currentWeekDay = weekDays[eventDayOfWeek];
        const timeDiff = new Date(event.endTime).getTime() - eventStart.getTime();
        
        const newStartTime = new Date(currentWeekDay);
        newStartTime.setHours(eventStart.getHours(), eventStart.getMinutes(), 0, 0);
        
        const newEndTime = new Date(newStartTime.getTime() + timeDiff);
        
        // Preserve all event properties including location, categories, color
        return {
          ...event,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
          location: event.location,
          categories: event.categories,
          color: event.color,
        };
      });
  }, [events, scheduledEventIds, weekDays]);

  // Get all events for sidebar (sorted by date)
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [events]);

  // Helper to get adjusted event for display
  // Matches CalFrontend getAdjustedEvent logic exactly
  const getAdjustedEvent = (event: Event): Event => {
    // Use state to check if scheduled for immediate updates
    if (!scheduledEventIds.includes(event.id)) {
      return event; // Return original if not scheduled
    }
    
    // Adjust event dates to the current week (same logic as weekEvents)
    const eventStart = new Date(event.startTime);
    const eventDayOfWeek = eventStart.getDay();
    const currentWeekDay = weekDays[eventDayOfWeek];
    const timeDiff = new Date(event.endTime).getTime() - eventStart.getTime();
    
    const newStartTime = new Date(currentWeekDay);
    newStartTime.setHours(eventStart.getHours(), eventStart.getMinutes(), 0, 0);
    
    const newEndTime = new Date(newStartTime.getTime() + timeDiff);
    
    return {
      ...event,
      startTime: newStartTime.toISOString(),
      endTime: newEndTime.toISOString(),
    };
  };

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleScheduleEvent = (event: Event) => {
    // Schedule the event
    scheduleEvent(event.id, weekKey);
    // Immediately update state to trigger re-render
    const updatedIds = getScheduledEventIds(weekKey);
    setScheduledEventIds([...updatedIds]); // Create new array to ensure state update
  };

  const handleUnscheduleEvent = (event: Event) => {
    // Unschedule the event
    unscheduleEvent(event.id, weekKey);
    // Immediately update state to trigger re-render
    const updatedIds = getScheduledEventIds(weekKey);
    setScheduledEventIds([...updatedIds]); // Create new array to ensure state update
  };

  // Week navigation handlers
  const handlePrevWeek = () => {
    const newDate = new Date(calendar.currentDate);
    newDate.setDate(calendar.currentDate.getDate() - 7);
    calendar.goToDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(calendar.currentDate);
    newDate.setDate(calendar.currentDate.getDate() + 7);
    calendar.goToDate(newDate);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.calendarSection}>
          <CalendarHeader
            currentDate={calendar.currentDate}
            onToday={calendar.goToToday}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
          />
          {isLoading ? (
            <View style={styles.calendarLoadingContainer}>
              <ActivityIndicator size="large" color="#FF6B6B" />
              <Text style={styles.calendarLoadingText}>Loading calendar...</Text>
            </View>
          ) : (
            <WeekView
              key={`calendar-${weekKey}-${scheduledEventIds.join(',')}`}
              weekDays={displayDays}
              events={weekEvents}
              onEventPress={handleEventPress}
            />
          )}
        </View>

        {/* Events Sidebar (Desktop only) */}
        {isDesktop && (
        <ResizableSidebar position="right" initialWidth={350}>
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>All Events</Text>
            </View>
            {isLoading || isLoadingScheduled ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B6B" />
                <Text style={styles.loadingText}>Loading events...</Text>
              </View>
            ) : (
              <View style={styles.sidebarContent}>
                {/* Expanded card overlay */}
                {expandedCardId && (() => {
                  const expandedEvent = sortedEvents.find(e => e.id === expandedCardId);
                  if (!expandedEvent) return null;
                  // Use state to determine if scheduled for immediate UI update
                  const isScheduled = scheduledEventIds.includes(expandedEvent.id);
                  return (
                    <EventDisplayCard
                      key={`expanded-${expandedEvent.id}-${isScheduled}`}
                      event={getAdjustedEvent(expandedEvent)}
                      isScheduled={isScheduled}
                      isExpanded={true}
                      onSchedule={() => handleScheduleEvent(expandedEvent)}
                      onUnschedule={() => handleUnscheduleEvent(expandedEvent)}
                      onToggleExpand={() => setExpandedCardId(null)}
                    />
                  );
                })()}
                
                {/* Regular cards list */}
                <ScrollView
                  style={[
                    styles.eventsList,
                    expandedCardId && styles.eventsListHidden
                  ]}
                  showsVerticalScrollIndicator
                >
                  {sortedEvents.map((event) => {
                    // Use state to determine if scheduled for immediate UI update
                    const isScheduled = scheduledEventIds.includes(event.id);
                    const isExpanded = expandedCardId === event.id;
                    return (
                      <EventDisplayCard
                        key={`${event.id}-${isScheduled}`}
                        event={getAdjustedEvent(event)}
                        isScheduled={isScheduled}
                        isExpanded={false}
                        onSchedule={() => handleScheduleEvent(event)}
                        onUnschedule={() => handleUnscheduleEvent(event)}
                        onToggleExpand={() => setExpandedCardId(isExpanded ? null : event.id)}
                      />
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        </ResizableSidebar>
        )}
      </View>

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
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    padding: 24,
    gap: 24,
  },
  calendarSection: {
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
    position: 'relative',
  },
  eventsList: {
    flex: 1,
    padding: 16,
  },
  eventsListHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  comingSoon: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  calendarLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  calendarLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
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


