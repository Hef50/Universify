import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useEvents } from '@/contexts/EventsContext';
import { useGoogleCalendar } from '@/contexts/GoogleCalendarContext';
import { useGoogleAuth } from '@/contexts/GoogleAuthContext';
import { supabase } from '@/lib/supabase';
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
  const { 
    googleEvents, 
    isLoading: isGoogleLoading,
    getGoogleEventsForWeek
  } = useGoogleCalendar();
  const { isGoogleAuthenticated, googleSession, providerToken, refreshSession } = useGoogleAuth();
  
  // Debug logging
  useEffect(() => {
    console.log('CalendarScreen: Events from context:', {
      count: events.length,
      isLoading,
      sampleIds: events.slice(0, 3).map(e => e.id)
    });
  }, [events, isLoading]);
  const { settings } = useSettings();
  const { isMobile, isDesktop } = useResponsive();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [scheduledEventIds, setScheduledEventIds] = useState<string[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(true);

  const calendar = useCalendar(isMobile ? 3 : settings.calendarViewDays);
  const weekKey = getWeekKey(calendar.currentDate);

  // Debug logging
  useEffect(() => {
    console.log('CalendarScreen: Events from context:', {
      count: events.length,
      isLoading,
      sampleIds: events.slice(0, 3).map(e => e.id)
    });
  }, [events, isLoading]);

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

  // Get events scheduled for the current week (using original dates - no adjustment)
  const universifyWeekEvents = useMemo(() => {
    if (scheduledEventIds.length === 0) return [];
    
    // Filter events that are scheduled and fall within the current week
    const weekStart = weekDays[0];
    const weekEnd = new Date(weekDays[6]);
    weekEnd.setHours(23, 59, 59, 999);
    
    return events
      .filter((event) => {
        // Only include if scheduled
        if (!scheduledEventIds.includes(event.id)) return false;
        
        // Check if event falls within the current week
        const eventStart = new Date(event.startTime);
        return eventStart >= weekStart && eventStart <= weekEnd;
      });
      // No date adjustment - use original dates
  }, [events, scheduledEventIds, weekDays]);

  // Get Google Calendar events for the current week
  const googleWeekEvents = useMemo(() => {
    if (weekDays.length === 0) return [];
    const weekStartDate = weekDays[0];
    return getGoogleEventsForWeek(weekKey, weekStartDate);
  }, [googleEvents, weekDays, weekKey, getGoogleEventsForWeek]);

  // Merge Universify and Google Calendar events
  const weekEvents = useMemo(() => {
    return [...universifyWeekEvents, ...googleWeekEvents];
  }, [universifyWeekEvents, googleWeekEvents]);

  // Get all events for sidebar (sorted by date) - ONLY Universify public events, NOT Google events
  // Google events are already in the calendar grid and don't need to be in the sidebar
  // EventsContext already filters out Google events, so we just need to sort
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [events]);

  // Helper to get event (no adjustment - returns original event)
  // Dates are now centralized - same dates everywhere
  const getEventForDisplay = (event: Event): Event => {
    // Return original event - no date adjustment
    return event;
  };

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleScheduleEvent = async (event: Event) => {
    // Schedule the event locally first
    scheduleEvent(event.id, weekKey);
    // Immediately update state to trigger re-render
    const updatedIds = getScheduledEventIds(weekKey);
    setScheduledEventIds([...updatedIds]); // Create new array to ensure state update

    // If user is authenticated with Google Calendar, add event to their Google Calendar
    // Using EXACT same approach as GCal - direct API call with session.provider_token
    if (isGoogleAuthenticated) {
      // Refresh session first to ensure we have the latest provider_token (same as GCal pattern)
      await refreshSession();
      
      // Get fresh session after refresh
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use provider_token from fresh session (same as GCal's session.provider_token)
      const token = session?.provider_token || providerToken || googleSession?.provider_token;
      
      if (!token) {
        console.error('No provider_token available after refresh:', {
          hasSession: !!session,
          hasProviderToken: !!providerToken,
          hasGoogleSession: !!googleSession,
          sessionKeys: session ? Object.keys(session) : [],
          sessionProviderToken: session?.provider_token ? 'exists' : 'missing',
        });
        alert("No Google access token from Supabase. Try signing in again.");
        return;
      }

      // Build event object exactly like GCal does
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

      // Add location if it exists
      if (event.location) {
        (googleEvent as any).location = event.location;
      }

      console.log('Creating Google Calendar event:', {
        summary: googleEvent.summary,
        hasToken: !!token,
        tokenLength: token?.length,
      });

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

        const json = await res.json(); // Google always sends JSON on error

        if (!res.ok) {
          console.error("Google Calendar error:", json);
          alert(
            `Could not create event: ${json.error?.message || res.statusText}`
          );
          return;
        }

        console.log("Created event:", json);
        alert("Event created ✅");
      } catch (err) {
        console.error("Network error:", err);
        alert("Network error talking to Google Calendar");
      }
    }
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
          {(isLoading || isGoogleLoading) ? (
            <View style={styles.calendarLoadingContainer}>
              <ActivityIndicator size="large" color="#FF6B6B" />
              <Text style={styles.calendarLoadingText}>Loading calendar...</Text>
            </View>
          ) : (
            <WeekView
              key={`calendar-${weekKey}-${scheduledEventIds.join(',')}-${googleWeekEvents.length}`}
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
            {(isLoading || isLoadingScheduled) ? (
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
                  // EventsContext already filters out Google events, so we don't need to check here
                  // Use state to determine if scheduled for immediate UI update
                  const isScheduled = scheduledEventIds.includes(expandedEvent.id);
                  return (
                    <EventDisplayCard
                      key={`expanded-${expandedEvent.id}-${isScheduled}`}
                      event={getEventForDisplay(expandedEvent)}
                      isScheduled={isScheduled}
                      isExpanded={true}
                      onSchedule={() => handleScheduleEvent(expandedEvent)}
                      onUnschedule={() => handleUnscheduleEvent(expandedEvent)}
                      onToggleExpand={() => setExpandedCardId(null)}
                    />
                  );
                })()}
                
                {/* Regular cards list */}
                {sortedEvents.length === 0 ? (
                  <View style={styles.emptySidebarState}>
                    <Text style={styles.emptySidebarIcon}>📅</Text>
                    <Text style={styles.emptySidebarTitle}>No events available</Text>
                    <Text style={styles.emptySidebarText}>
                      Browse events in the "Find" tab to add them to your calendar
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={[
                      styles.eventsList,
                      expandedCardId && styles.eventsListHidden
                    ]}
                    showsVerticalScrollIndicator
                  >
                    {sortedEvents.map((event) => {
                      // Use state to determine if scheduled for immediate UI update
                      // EventsContext already filters out Google events, so all events here are Universify events
                      const isScheduled = scheduledEventIds.includes(event.id);
                      const isExpanded = expandedCardId === event.id;
                      
                      return (
                        <EventDisplayCard
                          key={`${event.id}-${isScheduled}`}
                          event={getEventForDisplay(event)}
                          isScheduled={isScheduled}
                          isExpanded={false}
                          onSchedule={() => handleScheduleEvent(event)}
                          onUnschedule={() => handleUnscheduleEvent(event)}
                          onToggleExpand={() => setExpandedCardId(isExpanded ? null : event.id)}
                        />
                      );
                    })}
                  </ScrollView>
                )}
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
  emptySidebarState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptySidebarIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptySidebarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySidebarText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});


