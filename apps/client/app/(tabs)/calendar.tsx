import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, TextInput, ScrollView } from 'react-native';
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
  const { settings, updateSettings } = useSettings();
  const { isMobile, isDesktop } = useResponsive();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [scheduledEventIds, setScheduledEventIds] = useState<string[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(true);
  const [customDays, setCustomDays] = useState(settings.calendarViewDays.toString());

  // Use view days from settings
  const viewDays = settings.calendarViewDays;

  const calendar = useCalendar(isMobile ? 3 : viewDays);
  const weekKey = getWeekKey(calendar.currentDate);

  // Get days to display based on view mode
  const displayDays = useMemo(() => {
    const days = [];
    const startDate = new Date(calendar.currentDate);
    
    // For 7-day view (week view), align to Sunday
    if (viewDays === 7) {
      const day = startDate.getDay();
      const diff = startDate.getDate() - day;
      startDate.setDate(diff);
    }

    for (let i = 0; i < viewDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push(d);
    }
    return days;
  }, [calendar.currentDate, viewDays]);

  // Load scheduled events for current week (synchronous for web)
  useEffect(() => {
    setIsLoadingScheduled(true);
    const ids = getScheduledEventIds(weekKey);
    setScheduledEventIds([...ids]); // Create new array for state update
    setIsLoadingScheduled(false);
  }, [weekKey]);

  // Get events to display in the calendar
  // We only show events that are in the scheduled list for this week
  const weekEvents = useMemo(() => {
    if (scheduledEventIds.length === 0) return [];
    
    return events.filter((event) => scheduledEventIds.includes(event.id));
    // Note: We NO LONGER shift dates. We trust the event's actual start/end time.
    // This prevents "mysterious" shifting of one-off events.
    // If an event is scheduled for this week, it should have the correct date.
  }, [events, scheduledEventIds]);

  // Get all events for sidebar (sorted by date)
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [events]);

  const handleEventPress = (event: Event) => {
    if (isDesktop) {
      // Toggle expansion
      setExpandedCardId(prevId => prevId === event.id ? null : event.id);
    } else {
      setSelectedEvent(event);
    }
  };

  const handleScheduleEvent = (event: Event) => {
    scheduleEvent(event.id, weekKey);
    const updatedIds = getScheduledEventIds(weekKey);
    setScheduledEventIds([...updatedIds]); 
  };

  const handleUnscheduleEvent = (event: Event) => {
    unscheduleEvent(event.id, weekKey);
    const updatedIds = getScheduledEventIds(weekKey);
    setScheduledEventIds([...updatedIds]);
  };

  // Navigation handlers
  const handlePrev = () => {
    const newDate = new Date(calendar.currentDate);
    newDate.setDate(calendar.currentDate.getDate() - viewDays);
    calendar.goToDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(calendar.currentDate);
    newDate.setDate(calendar.currentDate.getDate() + viewDays);
    calendar.goToDate(newDate);
  };

  const handleViewChange = (days: number) => {
      updateSettings({ calendarViewDays: days });
      setCustomDays(days.toString());
  };

  const handleCustomDaysChange = (text: string) => {
      setCustomDays(text);
      const days = parseInt(text, 10);
      if (!isNaN(days) && days > 0 && days <= 16) {
          updateSettings({ calendarViewDays: days });
      }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.calendarSection}>
          <View style={styles.controlsRow}>
              <CalendarHeader
                currentDate={calendar.currentDate}
                onToday={calendar.goToToday}
                onPrevWeek={handlePrev}
                onNextWeek={handleNext}
              />
              
              {/* View Toggles */}
              <View style={styles.viewControls}>
                  <TouchableOpacity 
                    style={[styles.viewButton, viewDays === 1 && styles.viewButtonActive]}
                    onPress={() => handleViewChange(1)}
                  >
                      <Text style={[styles.viewButtonText, viewDays === 1 && styles.viewButtonTextActive]}>Day</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.viewButton, viewDays === 3 && styles.viewButtonActive]}
                    onPress={() => handleViewChange(3)}
                  >
                      <Text style={[styles.viewButtonText, viewDays === 3 && styles.viewButtonTextActive]}>3 Day</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.viewButton, viewDays === 7 && styles.viewButtonActive]}
                    onPress={() => handleViewChange(7)}
                  >
                      <Text style={[styles.viewButtonText, viewDays === 7 && styles.viewButtonTextActive]}>Week</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.customDaysContainer}>
                      <TextInput 
                        style={styles.customDaysInput}
                        value={customDays}
                        onChangeText={handleCustomDaysChange}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <Text style={styles.customDaysLabel}>Days</Text>
                  </View>
              </View>
          </View>

          {isLoading ? (
            <View style={styles.calendarLoadingContainer}>
              <ActivityIndicator size="large" color="#FF6B6B" />
              <Text style={styles.calendarLoadingText}>Loading calendar...</Text>
            </View>
          ) : (
            <WeekView
              // Use a key that changes when the week or view changes to force proper re-rendering
              // but NOT when events change to prevent scroll jumping
              key={`calendar-${weekKey}-${viewDays}`} 
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
                  const isScheduled = scheduledEventIds.includes(expandedEvent.id);
                  return (
                    <EventDisplayCard
                      key={`expanded-${expandedEvent.id}-${isScheduled}`}
                      event={expandedEvent} // Pass original event without adjustment
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
                    const isScheduled = scheduledEventIds.includes(event.id);
                    const isExpanded = expandedCardId === event.id;
                    return (
                      <EventDisplayCard
                        key={`${event.id}-${isScheduled}`}
                        event={event} // Pass original event
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
    display: 'flex',
    flexDirection: 'column',
  },
  controlsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
  },
  viewControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  viewButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: '#F3F4F6',
  },
  viewButtonActive: {
      backgroundColor: '#FF6B6B',
  },
  viewButtonText: {
      fontSize: 13,
      fontWeight: '500',
      color: '#6B7280',
  },
  viewButtonTextActive: {
      color: '#FFFFFF',
  },
  customDaysContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 8,
      backgroundColor: '#FFFFFF',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      paddingHorizontal: 8,
      paddingVertical: 4,
  },
  customDaysInput: {
      width: 24,
      fontSize: 13,
      textAlign: 'center',
      padding: 0,
  },
  customDaysLabel: {
      fontSize: 12,
      color: '#6B7280',
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
