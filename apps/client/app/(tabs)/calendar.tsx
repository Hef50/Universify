import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useEvents } from '@/contexts/EventsContext';
import { useCalendar } from '@/hooks/useCalendar';
import { useResponsive } from '@/hooks/useResponsive';
import { useSettings } from '@/contexts/SettingsContext';
import { useGoogleCalendar } from '@/contexts/GoogleCalendarContext';
import { useGoogleAuth } from '@/contexts/GoogleAuthContext';
import { supabase } from '@/lib/supabase';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { WeekView } from '@/components/calendar/WeekView';
import { ResizableSidebar } from '@/components/layout/ResizableSidebar';
import { EventDisplayCard } from '@/components/calendar/EventDisplayCard';
import { Event } from '@/types/event';
import {
  getWeekKey,
  getScheduledEventIds,
  getAllScheduledEventIds,
  scheduleEvent,
  unscheduleEvent,
} from '@/utils/scheduledEvents';

export default function CalendarScreen() {
  const { events, isLoading } = useEvents();
  const { settings, updateSettings } = useSettings();
  const { isMobile, isDesktop } = useResponsive();
  const { googleEvents, isLoading: isGoogleLoading } = useGoogleCalendar();
  const { isGoogleAuthenticated, googleSession, providerToken, refreshSession } = useGoogleAuth();
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [scheduledEventIds, setScheduledEventIds] = useState<string[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(true);
  const [customDays, setCustomDays] = useState(settings.calendarViewDays.toString());
  const [timeSelection, setTimeSelection] = useState<{ startDate: Date; endDate: Date } | null>(null);

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

  // Initialize: Schedule events with "dance" and "arts" tags in 12/3-12/7 range
  useEffect(() => {
    // Only run once on mount
    const hasInitialized = localStorage.getItem('universify_dance_arts_initialized');
    if (hasInitialized) return;

    // Find events with "dance" and "arts" tags in 12/3-12/7
    const targetEventIds: string[] = [];
    const dateRangeStart = new Date('2025-12-03T00:00:00Z');
    const dateRangeEnd = new Date('2025-12-07T23:59:59Z');

    events.forEach(event => {
      const eventStart = new Date(event.startTime);
      if (eventStart >= dateRangeStart && eventStart <= dateRangeEnd) {
        const hasDance = event.tags?.some(tag => tag.toLowerCase().includes('dance') || tag.toLowerCase() === 'dancing');
        const hasArts = event.tags?.some(tag => tag.toLowerCase() === 'arts');
        
        if (hasDance || hasArts) {
          const eventWeekKey = getWeekKey(eventStart);
          targetEventIds.push(event.id);
          scheduleEvent(event.id, eventWeekKey);
        }
      }
    });

    if (targetEventIds.length > 0) {
      localStorage.setItem('universify_dance_arts_initialized', 'true');
      console.log(`Initialized: Scheduled ${targetEventIds.length} events with dance/arts tags in 12/3-12/7`);
      // Refresh scheduled events
      const ids = getScheduledEventIds(weekKey);
      setScheduledEventIds([...ids]);
    }
  }, [events, weekKey]);

  // Filter Google events for the current view
  const googleViewEvents = useMemo(() => {
    if (displayDays.length === 0) return [];
    const viewStart = new Date(displayDays[0]);
    viewStart.setHours(0,0,0,0);
    const viewEnd = new Date(displayDays[displayDays.length - 1]);
    viewEnd.setHours(23,59,59,999);
    
    return googleEvents.filter(event => {
         const eventStart = new Date(event.startTime);
         const eventEnd = new Date(event.endTime);
         return eventStart <= viewEnd && eventEnd >= viewStart;
    });
  }, [googleEvents, displayDays]);

  // Get events to display in the calendar
  // Merge local scheduled events with Google events
  const weekEvents = useMemo(() => {
    // Local events: only show if scheduled
    const local = events.filter((event) => scheduledEventIds.includes(event.id));
    return [...local, ...googleViewEvents];
  }, [events, scheduledEventIds, googleViewEvents]);

  // Get all scheduled event IDs across all weeks to calculate relevance
  const allScheduledEventIds = useMemo(() => {
    return getAllScheduledEventIds();
  }, [weekKey, scheduledEventIds]); // Recalculate when scheduled events change

  // Get tags from all scheduled events to calculate relevance
  const scheduledEventTags = useMemo(() => {
    const scheduledIds = allScheduledEventIds;
    const scheduledEventsList = events.filter(e => scheduledIds.includes(e.id));
    const tagCounts: Record<string, number> = {};
    
    scheduledEventsList.forEach(event => {
      if (event.tags && Array.isArray(event.tags)) {
        event.tags.forEach(tag => {
          tagCounts[tag.toLowerCase()] = (tagCounts[tag.toLowerCase()] || 0) + 1;
        });
      }
    });
    
    return tagCounts;
  }, [events, allScheduledEventIds]);

  // Calculate relevance score for an event based on tag overlap with scheduled events
  const calculateRelevance = (event: Event): number => {
    if (!event.tags || !Array.isArray(event.tags)) return 0;
    
    let score = 0;
    event.tags.forEach(tag => {
      const tagLower = tag.toLowerCase();
      if (scheduledEventTags[tagLower]) {
        score += scheduledEventTags[tagLower];
      }
    });
    
    return score;
  };

  // Get all events for sidebar (sorted by date)
  // Only include Universify events (Google events are already on the calendar)
  // Filter by time selection if active
  // When time selection is active, show only top 3 most relevant events
  const sortedEvents = useMemo(() => {
    let filteredEvents = [...events];
    
    console.log(`Calendar: Starting with ${filteredEvents.length} total events`);
    
    // Filter by time selection if active
    if (timeSelection) {
      const { startDate, endDate } = timeSelection;
      const beforeTimeFilter = filteredEvents.length;
      filteredEvents = filteredEvents.filter(event => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        
        // Check if event overlaps with selected time range
        // Event overlaps if it starts before selection ends and ends after selection starts
        return eventStart < endDate && eventEnd > startDate;
      });
      console.log(`Calendar: After time selection filter: ${filteredEvents.length} events (removed ${beforeTimeFilter - filteredEvents.length} events)`);
      
      // Calculate relevance and show only top 3 most relevant events
      if (filteredEvents.length > 0 && Object.keys(scheduledEventTags).length > 0) {
        const eventsWithRelevance = filteredEvents.map(event => ({
          event,
          relevance: calculateRelevance(event)
        }));
        
        // Sort by relevance (descending), then by start time
        eventsWithRelevance.sort((a, b) => {
          if (b.relevance !== a.relevance) {
            return b.relevance - a.relevance;
          }
          return new Date(a.event.startTime).getTime() - new Date(b.event.startTime).getTime();
        });
        
        // Take only top 3
        filteredEvents = eventsWithRelevance.slice(0, 3).map(item => item.event);
        console.log(`Calendar: Showing top 3 most relevant events based on scheduled event tags`);
      }
    }
    
    console.log(`Calendar: Final filtered events: ${filteredEvents.length}`);
    
    return filteredEvents.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [events, timeSelection, scheduledEventTags]);

  const handleEventPress = (event: Event) => {
    if (isDesktop) {
      // Toggle expansion
      setExpandedCardId(prevId => prevId === event.id ? null : event.id);
    } else {
      setSelectedEvent(event);
    }
  };

  const handleScheduleEvent = async (event: Event) => {
    // Schedule locally
    scheduleEvent(event.id, weekKey);
    const updatedIds = getScheduledEventIds(weekKey);
    setScheduledEventIds([...updatedIds]); 

    // Sync to Google Calendar if authenticated
    if (isGoogleAuthenticated) {
      // Refresh session first to ensure we have the latest provider_token
      await refreshSession();
      
      // Get fresh session after refresh
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use provider_token from fresh session
      const token = session?.provider_token || providerToken || googleSession?.provider_token;
      
      if (!token) {
        console.error('No provider_token available after refresh');
        alert("No Google access token from Supabase. Try signing in again.");
        return;
      }

      // Build event object for Google API
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);

      const googleEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: start.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      if (event.location) {
        (googleEvent as any).location = event.location;
      }

      try {
        const res = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(googleEvent),
          }
        );

        const json = await res.json();

        if (!res.ok) {
          console.error("Google Calendar error:", json);
          alert(`Could not create event: ${json.error?.message || res.statusText}`);
          return;
        }

        console.log("Created event in Google Calendar:", json);
        alert("Event added to Google Calendar ✅");
      } catch (err) {
        console.error("Network error:", err);
        alert("Network error talking to Google Calendar");
      }
    }
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

          {(isLoading || isGoogleLoading) ? (
            <View style={styles.calendarLoadingContainer}>
              <ActivityIndicator size="large" color="#FF6B6B" />
              <Text style={styles.calendarLoadingText}>Loading calendar...</Text>
            </View>
          ) : (
            <WeekView
              // Use a key that changes when the week or view changes to force proper re-rendering
              key={`calendar-${weekKey}-${viewDays}-${scheduledEventIds.length}`} 
              weekDays={displayDays}
              events={weekEvents}
              onEventPress={handleEventPress}
              onSelectionChange={setTimeSelection}
              externalSelection={timeSelection}
            />
          )}
        </View>

        {/* Events Sidebar (Desktop only) */}
        {isDesktop && (
        <ResizableSidebar position="right" initialWidth={350}>
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>
                {timeSelection ? 'Selected Time Range' : 'All Events'}
              </Text>
              {timeSelection && (
                <TouchableOpacity
                  onPress={() => setTimeSelection(null)}
                  style={styles.resetButton}
                >
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
              )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  resetButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
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
