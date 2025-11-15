import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { CreateEventForm } from '@/components/events/CreateEventForm';
import { useEvents } from '@/contexts/EventsContext';
import { useAuth } from '@/contexts/AuthContext';
import { EventFormData } from '@/types/event';

export default function CreateScreen() {
  const [showForm, setShowForm] = useState(false);
  const { createEvent } = useEvents();
  const { currentUser } = useAuth();

  // Show form when tab is pressed
  useEffect(() => {
    setShowForm(true);
  }, []);

  const handleCreateEvent = async (eventData: EventFormData) => {
    if (!currentUser) return;

    try {
      await createEvent(eventData, currentUser.id);
      setShowForm(false);
      // Navigate to find page with "my events" filter
      router.push({
        pathname: '/(tabs)/find',
        params: { filterMyEvents: 'true' },
      });
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleClose = () => {
    setShowForm(false);
    // Navigate back to previous tab
    router.back();
  };

  return (
    <View style={styles.container}>
      {!showForm && (
        <View style={styles.content}>
          <Text style={styles.icon}>📅</Text>
          <Text style={styles.title}>Create an Event</Text>
          <Text style={styles.description}>
            Share your event with the community
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      )}

      <CreateEventForm
        visible={showForm}
        onClose={handleClose}
        onSubmit={handleCreateEvent}
      />
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

