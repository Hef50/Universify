import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Event } from '@/types/event';
import { formatTime } from '@/utils/dateHelpers';

interface EventBlockProps {
  event: Event;
  top: number;
  height: number;
  onPress: () => void;
  isSuggested?: boolean;
}

export const EventBlock: React.FC<EventBlockProps> = ({
  event,
  top,
  height,
  onPress,
  isSuggested = false,
}) => {
  const showDetails = height > 40;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSuggested && styles.suggestedContainer,
        {
          top,
          height,
          backgroundColor: isSuggested ? '#FFD93D' : event.color,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={showDetails ? 2 : 1}>
          {event.title}
        </Text>
        {showDetails && (
          <>
            <Text style={styles.time} numberOfLines={1}>
              {formatTime(event.startTime)} - {formatTime(event.endTime)}
            </Text>
            {event.location && (
              <Text style={styles.location} numberOfLines={1}>
                📍 {event.location}
              </Text>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 6,
    padding: 6,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(0, 0, 0, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  time: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  location: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  suggestedContainer: {
    borderLeftColor: 'rgba(0, 0, 0, 0.3)',
    borderStyle: 'dashed',
    borderWidth: 2,
  },
});

