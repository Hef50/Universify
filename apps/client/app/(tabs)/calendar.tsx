import React, { useState } from 'react';
import { View, StyleSheet, Modal, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { useEvents } from '@/contexts/EventsContext';
import { useCalendar } from '@/hooks/useCalendar';
import { useResponsive } from '@/hooks/useResponsive';
import { useSettings } from '@/contexts/SettingsContext';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { ResizableSidebar } from '@/components/layout/ResizableSidebar';
import { Event } from '@/types/event';
import { Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSuggestions } from '@/hooks/useRecommendations';
import { useAuth } from '@/contexts/AuthContext';

export default function CalendarScreen() {
  const { events, createEvent } = useEvents();
  const { settings } = useSettings();
  const { isMobile, isDesktop } = useResponsive();
  const { currentUser } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [suggestedEvents, setSuggestedEvents] = useState<Event[]>([]);
  const [recommendationMode, setRecommendationMode] = useState(false);
  const [showTimeRangeModal, setShowTimeRangeModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [eventToAdd, setEventToAdd] = useState<Event | null>(null);
  const [timeRangeStart, setTimeRangeStart] = useState('');
  const [timeRangeEnd, setTimeRangeEnd] = useState('');
  const [suggestionStartISO, setSuggestionStartISO] = useState<string | undefined>();
  const [suggestionEndISO, setSuggestionEndISO] = useState<string | undefined>();

  const calendar = useCalendar(isMobile ? 3 : settings.calendarViewDays);

  const { suggestions, isLoading: suggestionsLoading } = useSuggestions({
    events,
    startISO: suggestionStartISO,
    endISO: suggestionEndISO,
    limit: 5,
  });

  // Update suggested events when suggestions change
  React.useEffect(() => {
    setSuggestedEvents(suggestions);
  }, [suggestions]);

  const handleEventPress = (event: Event) => {
    // Check if this is a suggested event
    const isSuggested = suggestedEvents.some(e => e.id === event.id);
    if (isSuggested) {
      setEventToAdd(event);
      setShowConfirmModal(true);
    } else {
      setSelectedEvent(event);
    }
  };

  const handleGetSuggestions = () => {
    setShowTimeRangeModal(true);
  };

  const handleTimeRangeSubmit = () => {
    if (timeRangeStart && timeRangeEnd) {
      // Convert to ISO strings
      const start = new Date(timeRangeStart);
      const end = new Date(timeRangeEnd);
      if (start < end) {
        setSuggestionStartISO(start.toISOString());
        setSuggestionEndISO(end.toISOString());
        setRecommendationMode(true);
        setShowTimeRangeModal(false);
      }
    }
  };

  const handleRecommendationDragEnd = (day: Date, startTime: Date, endTime: Date) => {
    console.log('handleRecommendationDragEnd called', { day, startTime, endTime });
    // Automatically enter recommendation mode and set time range
    setSuggestionStartISO(startTime.toISOString());
    setSuggestionEndISO(endTime.toISOString());
    setRecommendationMode(true);
    // Suggestions will automatically be fetched via useSuggestions hook
  };

  const handleAddSuggestedEvent = async () => {
    if (!eventToAdd || !currentUser) return;

    try {
      // Convert suggested event to EventFormData format
      const startDate = new Date(eventToAdd.startTime);
      const endDate = new Date(eventToAdd.endTime);
      
      // Format dates and times correctly
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const formatTime = (date: Date) => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      };
      
      const eventData = {
        title: eventToAdd.title,
        description: eventToAdd.description || '',
        startDate: formatDate(startDate),
        startTime: formatTime(startDate),
        endDate: formatDate(endDate),
        endTime: formatTime(endDate),
        location: eventToAdd.location,
        categories: eventToAdd.categories,
        isClubEvent: eventToAdd.isClubEvent,
        isSocialEvent: eventToAdd.isSocialEvent,
        capacity: eventToAdd.capacity,
        rsvpEnabled: eventToAdd.rsvpEnabled,
        attendeeVisibility: eventToAdd.attendeeVisibility,
        color: eventToAdd.color,
        tags: eventToAdd.tags,
      };

      await createEvent(eventData, currentUser.id);
      
      // Remove from suggestions
      setSuggestedEvents(prev => prev.filter(e => e.id !== eventToAdd.id));
      setShowConfirmModal(false);
      setEventToAdd(null);
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };

  const handleCancelRecommendationMode = () => {
    setRecommendationMode(false);
    setSuggestedEvents([]);
    setSuggestionStartISO(undefined);
    setSuggestionEndISO(undefined);
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
          suggestedEvents={suggestedEvents}
          onEventPress={handleEventPress}
          onRecommendationDragEnd={handleRecommendationDragEnd}
          recommendationMode={recommendationMode}
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
              {recommendationMode && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelRecommendationMode}
                >
                  <Text style={styles.cancelButtonText}>Cancel Suggestions</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.suggestionsButton}
                onPress={handleGetSuggestions}
                disabled={recommendationMode}
              >
                <Text style={styles.suggestionsButtonText}>Give me suggestions</Text>
              </TouchableOpacity>
              {recommendationMode && (
                <View style={styles.suggestionsInfo}>
                  {suggestionStartISO && suggestionEndISO && (
                    <Text style={styles.timeRangeText}>
                      Time range: {new Date(suggestionStartISO).toLocaleString()} - {new Date(suggestionEndISO).toLocaleString()}
                    </Text>
                  )}
                  {suggestionsLoading && (
                    <Text style={styles.loadingText}>Loading suggestions...</Text>
                  )}
                  {!suggestionsLoading && suggestedEvents.length > 0 && (
                    <>
                      <Text style={styles.suggestionsCount}>
                        {suggestedEvents.length} suggestions found
                      </Text>
                      <View style={styles.suggestionsList}>
                        {suggestedEvents.map((event) => (
                          <TouchableOpacity
                            key={event.id}
                            style={styles.suggestionCard}
                            onPress={() => {
                              setEventToAdd(event);
                              setShowConfirmModal(true);
                            }}
                          >
                            <Text style={styles.suggestionTitle}>{event.title}</Text>
                            <Text style={styles.suggestionTime}>
                              {new Date(event.startTime).toLocaleString()} - {new Date(event.endTime).toLocaleString()}
                            </Text>
                            {event.location && (
                              <Text style={styles.suggestionLocation}>📍 {event.location}</Text>
                            )}
                            {event.categories && event.categories.length > 0 && (
                              <View style={styles.suggestionTags}>
                                {event.categories.slice(0, 3).map((cat, idx) => (
                                  <View key={idx} style={styles.suggestionTag}>
                                    <Text style={styles.suggestionTagText}>{cat}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                  {!suggestionsLoading && suggestedEvents.length === 0 && suggestionStartISO && (
                    <Text style={styles.noSuggestionsText}>No suggestions found for this time range</Text>
                  )}
                  {!suggestionStartISO && (
                    <Text style={styles.suggestionsInfoText}>
                      Drag on the calendar to select a time range for suggestions
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </ResizableSidebar>
      )}

      {/* Time Range Selection Modal */}
      <Modal
        visible={showTimeRangeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimeRangeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time Range</Text>
            <Text style={styles.modalSubtitle}>
              Choose a time range to get event suggestions, or drag on the calendar
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Time</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DDTHH:mm (e.g., 2024-01-15T14:00)"
                value={timeRangeStart}
                onChangeText={setTimeRangeStart}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>End Time</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DDTHH:mm (e.g., 2024-01-15T16:00)"
                value={timeRangeEnd}
                onChangeText={setTimeRangeEnd}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowTimeRangeModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitModalButton]}
                onPress={handleTimeRangeSubmit}
              >
                <Text style={styles.submitModalButtonText}>Get Suggestions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal for Adding Suggested Event */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Event to Schedule?</Text>
            {eventToAdd && (
              <>
                <Text style={styles.eventConfirmTitle}>{eventToAdd.title}</Text>
                <Text style={styles.eventConfirmDetails}>
                  {new Date(eventToAdd.startTime).toLocaleString()} - {new Date(eventToAdd.endTime).toLocaleString()}
                </Text>
                {eventToAdd.location && (
                  <Text style={styles.eventConfirmDetails}>📍 {eventToAdd.location}</Text>
                )}
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowConfirmModal(false);
                  setEventToAdd(null);
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitModalButton]}
                onPress={handleAddSuggestedEvent}
              >
                <Text style={styles.submitModalButtonText}>Add to Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Event Detail Modal */}
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
  demoButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#4ECDC4',
    borderRadius: 8,
  },
  demoButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  suggestionsButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  suggestionsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionsInfo: {
    marginTop: 12,
  },
  suggestionsInfoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#4ECDC4',
    fontStyle: 'italic',
  },
  suggestionsCount: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  noSuggestionsText: {
    fontSize: 14,
    color: '#EF4444',
    fontStyle: 'italic',
  },
  timeRangeText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  suggestionsList: {
    marginTop: 12,
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  suggestionTime: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  suggestionLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  suggestionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  suggestionTag: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  suggestionTagText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelModalButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  submitModalButton: {
    backgroundColor: '#4ECDC4',
  },
  submitModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  eventConfirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
  },
  eventConfirmDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
});

