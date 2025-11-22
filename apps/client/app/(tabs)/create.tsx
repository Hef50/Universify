import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { CreateEventForm } from '@/components/events/CreateEventForm';
import { useEvents } from '@/contexts/EventsContext';
import { useAuth } from '@/contexts/AuthContext';
import { EventFormData } from '@/types/event';
import { useResponsive } from '@/hooks/useResponsive';

export default function CreateScreen() {
  const { createEvent } = useEvents();
  const { currentUser } = useAuth();
  const { isDesktop } = useResponsive();

  const handleCreateEvent = async (eventData: EventFormData) => {
    if (!currentUser) return;

    try {
      await createEvent(eventData, currentUser.id);
      // Navigate to find page with "my events" filter or back to calendar
      router.push({
        pathname: '/(tabs)/calendar',
      });
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        <CreateEventForm
          onSubmit={handleCreateEvent}
        />
      </View>
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
    padding: 24,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  contentDesktop: {
    padding: 48,
    // On desktop, maybe add some shadow/card effect if desired, 
    // but keeping it clean and flat as requested "embedded in the layout".
  },
});
