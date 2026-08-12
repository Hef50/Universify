import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
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
import { AgendaList } from '@/components/events/AgendaList';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useMyEvents } from '@/hooks/useMyEvents';
import { eventsInRange } from '@/utils/myEvents';

// Universify event id -> Google Calendar event id map, persisted so
// unscheduling can delete the Google copy even after a reload
const GCAL_MAP_STORAGE_KEY = 'universify_gcal_event_map';

export default function CalendarScreen() {
  const { events, isLoading, updateRSVP } = useEvents();
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
    isLoading: isLoadingScheduled,
    scheduleEvent: scheduleEventForWeek,
    unscheduleEvent: unscheduleEventForWeek,
  } = useScheduledEvents(currentUser?.id, weekKey);
  // Everything the user RSVP'd to, pinned, or is hosting — an RSVP alone is
  // enough to put an event on the calendar.
  const { myEvents, myEventIds, relationFor } = useMyEvents();

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState(settings.calendarViewDays.toString());
  const [timeSelection, setTimeSelection] = useState<{ startDate: Date; endDate: Date } | null>(null);
  // Mobile defaults to a Luma-style agenda timeline; the hour grid is opt-in
  const [mobileView, setMobileView] = useState<'agenda' | 'grid'>('agenda');
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

  // Phones show a rolling 3-day window starting today; the Sunday-aligned week
  // only makes sense with a desktop's worth of horizontal room.
  const viewDays = isMobile ? 3 : settings.calendarViewDays;

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
  // Merge the user's own events (plus their recurring occurrences within
  // the visible range) with Google events
  const weekEvents = useMemo(() => {
    if (displayDays.length === 0) return [...myEvents, ...googleViewEvents];

    const viewStart = new Date(displayDays[0]);
    viewStart.setHours(0, 0, 0, 0);
    const viewEnd = new Date(displayDays[displayDays.length - 1]);
    viewEnd.setHours(23, 59, 59, 999);

    const inView = eventsInRange(
      expandRecurringEvents(myEvents, viewStart, viewEnd),
      viewStart,
      viewEnd
    );
    return [...inView, ...googleViewEvents];
  }, [myEvents, googleViewEvents, displayDays]);

  // Interest profile mined from the events the user engaged with — the
  // recommendation engine extracts title n-grams, categories and time-of-day
  // preferences from them.
  const { topInterests } = useUserInterests({ events: myEvents });

  // Browser notifications ~30 min before the user's events (web, opt-in pref)
  useEventReminders(
    myEvents,
    currentUser?.preferences.notificationPreferences.eventReminders ?? false
  );

  // Agenda view: the user's events (with recurring occurrences) over the next
  // 60 days, in a date-grouped timeline
  const agendaEvents = useMemo(() => {
    const now = new Date();
    const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    return expandRecurringEvents(myEvents, now, horizon).filter(
      (e) => new Date(e.endTime) >= now && new Date(e.startTime) <= horizon
    );
  }, [myEvents]);

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
    if (isDesktop) {
      // Toggle expansion
      setExpandedCardId((prevId) => (prevId === baseId ? null : baseId));
    } else {
      router.push(`/event/${baseId}`);
    }
  };

  const handleScheduleEvent = async (event: Event) => {
    // Pin under the week the event actually falls in, not the week being
    // viewed, and against the series rather than a display occurrence.
    const baseId = baseEventId(event.id);
    await scheduleEventForWeek(baseId, getWeekKey(new Date(event.startTime)));

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
    const baseId = baseEventId(event.id);
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
    await unscheduleEventForWeek(baseId);

    // The × on a card means "not on my calendar" — an RSVP is enough to put an
    // event there, so clear that too rather than leaving the card unchanged.
    const relation = relationFor(event);
    if (currentUser && (relation === 'going' || relation === 'maybe')) {
      await updateRSVP(baseId, currentUser.id, null);
    }
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

  // ── Mobile: Luma-style agenda by default, hour grid opt-in ──
  if (isMobile) {
    return (
      <View style={styles.container}>
        <View style={styles.mobileHeader}>
          <Text style={styles.mobileTitle}>Calendar</Text>
          <TouchableOpacity
            style={styles.myEventsLink}
            onPress={() => router.push('/my-events')}
          >
            <Text style={styles.myEventsLinkText}>My events</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.mobileSegmentWrap}>
          <SegmentedControl
            options={[
              { value: 'agenda', label: 'Agenda' },
              { value: 'grid', label: 'Grid' },
            ]}
            value={mobileView}
            onChange={setMobileView}
          />
        </View>

        {mobileView === 'agenda' ? (
          isLoading || isLoadingScheduled ? (
            <View style={styles.calendarLoadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <AgendaList
              events={agendaEvents}
              onEventPress={handleEventPress}
              badgeFor={relationFor}
              emptyTitle="Nothing scheduled yet"
              emptyBody="Pin events from Find or Home and they'll build your week here."
              emptyAction={{ label: 'Find events', onPress: () => router.push('/(tabs)/find') }}
            />
          )
        ) : (
          <View style={styles.mobileGridWrap}>
            <View style={styles.mobileGridControls}>
              <CalendarHeader
                currentDate={calendar.currentDate}
                onToday={calendar.goToToday}
                onPrevWeek={handlePrev}
                onNextWeek={handleNext}
              />
            </View>
            {isLoading || isGoogleLoading ? (
              <View style={styles.calendarLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <WeekView
                key={`calendar-m-${weekKey}-${myEventIds.size}`}
                weekDays={displayDays}
                events={weekEvents}
                onEventPress={handleEventPress}
                onSelectionChange={setTimeSelection}
                externalSelection={timeSelection}
              />
            )}
          </View>
        )}
      </View>
    );
  }

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
              key={`calendar-${weekKey}-${viewDays}-${myEventIds.size}`}
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
                  const isScheduled = myEventIds.has(expandedEvent.id);
                  const isHosting = relationFor(expandedEvent) === 'created';
                  return (
                    <EventDisplayCard
                      key={`expanded-${expandedEvent.id}-${isScheduled}`}
                      event={expandedEvent} // Pass original event without adjustment
                      isScheduled={isScheduled}
                      isExpanded={true}
                      onSchedule={() => handleScheduleEvent(expandedEvent)}
                      // You can't remove an event you're hosting from your own calendar
                      onUnschedule={
                        isHosting ? undefined : () => handleUnscheduleEvent(expandedEvent)
                      }
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
                    const isScheduled = myEventIds.has(event.id);
                    const isHosting = relationFor(event) === 'created';
                    const isExpanded = expandedCardId === event.id;
                    return (
                      <EventDisplayCard
                        key={`${event.id}-${isScheduled}`}
                        event={event} // Pass original event
                        isScheduled={isScheduled}
                        isExpanded={false}
                        onSchedule={() => handleScheduleEvent(event)}
                        onUnschedule={
                          isHosting ? undefined : () => handleUnscheduleEvent(event)
                        }
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

    </View>
  );
}

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    mobileHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 8,
    },
    mobileTitle: {
      fontSize: 24 * fontScale,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },
    myEventsLink: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    myEventsLinkText: {
      fontSize: 13 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    mobileSegmentWrap: {
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    mobileGridWrap: {
      flex: 1,
      paddingHorizontal: 8,
    },
    mobileGridControls: {
      paddingHorizontal: 8,
      paddingBottom: 8,
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
