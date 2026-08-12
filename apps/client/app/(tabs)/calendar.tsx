import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useEvents } from '@/contexts/EventsContext';
import { useCalendar } from '@/hooks/useCalendar';
import { useResponsive } from '@/hooks/useResponsive';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleCalendar } from '@/contexts/GoogleCalendarContext';
import { useGoogleAuth } from '@/contexts/GoogleAuthContext';
import { useScheduledEvents, getWeekKey } from '@/hooks/useScheduledEvents';
import { supabase } from '@/lib/supabase';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { WeekView } from '@/components/calendar/WeekView';
import { ResizableSidebar } from '@/components/layout/ResizableSidebar';
import { EventDisplayCard } from '@/components/calendar/EventDisplayCard';
import { Event } from '@/types/event';
import { deleteGoogleCalendarEvent } from '@/lib/googleCalendar';
import { useUserInterests, getSuggestionsForTimeRange } from '@/hooks/useRecommendations';
import { expandRecurringEvents, baseEventId } from '@/utils/recurringEvents';
import { useEventReminders } from '@/hooks/useEventReminders';
import { storage } from '@/lib/storage';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

// Universify event id -> Google Calendar event id map, persisted so
// unscheduling can delete the Google copy even after a reload
const GCAL_MAP_STORAGE_KEY = 'universify_gcal_event_map';

export default function CalendarScreen() {
  const { events, isLoading } = useEvents();
  const { currentUser } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { isMobile, isDesktop } = useResponsive();
  const { googleEvents, isLoading: isGoogleLoading, refreshGoogleCalendar } = useGoogleCalendar();
  const { isGoogleAuthenticated, googleSession, providerToken } = useGoogleAuth();
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  const calendar = useCalendar(isMobile ? 3 : settings.calendarViewDays);
  const weekKey = getWeekKey(calendar.currentDate);
  const {
    scheduledEventIds,
    allScheduledIds: allScheduledEventIds,
    isLoading: isLoadingScheduled,
    scheduleEvent: scheduleEventForWeek,
    unscheduleEvent: unscheduleEventForWeek,
  } = useScheduledEvents(currentUser?.id, weekKey);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState(settings.calendarViewDays.toString());
  const [timeSelection, setTimeSelection] = useState<{ startDate: Date; endDate: Date } | null>(null);
  // Map Universify event id -> Google Calendar event id when we create in Google on schedule (so we can delete on unschedule)
  const scheduleEventToGoogleIdRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    storage
      .getItem(GCAL_MAP_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          scheduleEventToGoogleIdRef.current = new Map(
            Object.entries(JSON.parse(raw) as Record<string, string>)
          );
        }
      })
      .catch((err) => console.error('Failed to load Google Calendar event map:', err));
  }, []);

  const persistGcalMap = () => {
    storage
      .setItem(
        GCAL_MAP_STORAGE_KEY,
        JSON.stringify(Object.fromEntries(scheduleEventToGoogleIdRef.current))
      )
      .catch((err) => console.error('Failed to persist Google Calendar event map:', err));
  };

  const viewDays = settings.calendarViewDays;

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
  // Merge local scheduled events (plus their recurring occurrences within
  // the visible range) with Google events
  const weekEvents = useMemo(() => {
    // Local events: only show if scheduled
    const local = events.filter((event) => scheduledEventIds.includes(event.id));
    if (displayDays.length === 0) return [...local, ...googleViewEvents];

    const viewStart = new Date(displayDays[0]);
    viewStart.setHours(0, 0, 0, 0);
    const viewEnd = new Date(displayDays[displayDays.length - 1]);
    viewEnd.setHours(23, 59, 59, 999);

    return [...expandRecurringEvents(local, viewStart, viewEnd), ...googleViewEvents];
  }, [events, scheduledEventIds, googleViewEvents, displayDays]);

  // Interest profile mined from the events the user has scheduled — the
  // recommendation engine extracts title n-grams, categories and time-of-day
  // preferences from them.
  const engagedEvents = useMemo(
    () => events.filter((e) => allScheduledEventIds.includes(e.id)),
    [events, allScheduledEventIds]
  );
  const { topInterests } = useUserInterests({ events: engagedEvents });

  // Browser notifications ~30 min before scheduled events (web, opt-in pref)
  useEventReminders(
    engagedEvents,
    currentUser?.preferences.notificationPreferences.eventReminders ?? false
  );

  // Get all events for sidebar (sorted by date)
  // Only include Universify events (Google events are already on the calendar)
  // Only show future/current events (end time >= now) so past events don't clutter the list
  // When a time range is drag-selected, show the top 5 suggested events for
  // that window, ranked by the recommendation engine (interest match +
  // popularity + how well the event fits the selected range).
  const sortedEvents = useMemo(() => {
    const now = new Date();
    const upcoming = events.filter((event) => new Date(event.endTime) >= now);

    if (timeSelection) {
      const { startDate, endDate } = timeSelection;
      return getSuggestionsForTimeRange(
        upcoming,
        topInterests,
        startDate.toISOString(),
        endDate.toISOString(),
        5
      );
    }

    return upcoming.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [events, timeSelection, topInterests]);

  const handleEventPress = (event: Event) => {
    // Recurring occurrences carry a synthetic "<id>::<date>" id; act on the
    // base event so scheduling/expansion always target the real record.
    const baseId = baseEventId(event.id);
    const base = events.find((e) => e.id === baseId) ?? event;
    if (isDesktop) {
      // Toggle expansion
      setExpandedCardId((prevId) => (prevId === baseId ? null : baseId));
    } else {
      setSelectedEvent(base);
    }
  };

  const handleScheduleEvent = async (event: Event) => {
    // Schedule locally (handles both localStorage and Supabase)
    await scheduleEventForWeek(event.id);

    // Sync to Google Calendar if authenticated
    if (isGoogleAuthenticated) {
      // refreshSession() returns session WITHOUT provider_token (Supabase known issue) - do NOT call it or we overwrite good session
      const { data: { session } } = await supabase.auth.getSession();
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

        if (json.id) {
          scheduleEventToGoogleIdRef.current.set(event.id, json.id);
          persistGcalMap();
        }
        console.log("Created event in Google Calendar:", json);
        alert("Event added to Google Calendar ✅");
      } catch (err) {
        console.error("Network error:", err);
        alert("Network error talking to Google Calendar");
      }
    }
  };

  const handleUnscheduleEvent = async (event: Event) => {
    if (isGoogleAuthenticated) {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token || providerToken || googleSession?.provider_token;
      if (token) {
        try {
          if (event.id.startsWith('gcal-')) {
            await deleteGoogleCalendarEvent(token, event.id);
          } else {
            const googleId = scheduleEventToGoogleIdRef.current.get(event.id);
            if (googleId) {
              await deleteGoogleCalendarEvent(token, googleId);
              scheduleEventToGoogleIdRef.current.delete(event.id);
              persistGcalMap();
            }
          }
          await refreshGoogleCalendar();
        } catch (err) {
          console.error('Failed to delete from Google Calendar:', err);
        }
      }
    }
    unscheduleEventForWeek(event.id);
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
              <ActivityIndicator size="large" color={colors.primary} />
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
                {timeSelection ? 'Suggested for This Time' : 'All Events'}
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
                <ActivityIndicator size="large" color={colors.primary} />
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

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
        backgroundColor: colors.surfaceAlt,
    },
    viewButtonActive: {
        backgroundColor: colors.primary,
    },
    viewButtonText: {
        fontSize: 13 * fontScale,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    viewButtonTextActive: {
        color: colors.onPrimary,
    },
    customDaysContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginLeft: 8,
        backgroundColor: colors.surface,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    customDaysInput: {
        width: 24,
        fontSize: 13 * fontScale,
        textAlign: 'center',
        padding: 0,
        color: colors.textPrimary,
    },
    customDaysLabel: {
        fontSize: 12 * fontScale,
        color: colors.textSecondary,
    },
    sidebar: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    sidebarHeader: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sidebarTitle: {
      fontSize: 18 * fontScale,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    resetButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resetButtonText: {
      fontSize: 13 * fontScale,
      fontWeight: '500',
      color: colors.textSecondary,
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
      fontSize: 14 * fontScale,
      color: colors.textSecondary,
    },
    calendarLoadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    calendarLoadingText: {
      marginTop: 12,
      fontSize: 14 * fontScale,
      color: colors.textSecondary,
    },
    eventDetailOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    eventDetailBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    eventDetail: {
      backgroundColor: colors.surface,
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
      fontSize: 24 * fontScale,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    eventDetailDescription: {
      fontSize: 16 * fontScale,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    closeButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    closeButtonText: {
      color: colors.onPrimary,
      fontSize: 16 * fontScale,
      fontWeight: '600',
    },
  });
