import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const TimeColumn: React.FC = () => {
  // Generate time slots from 12 AM to 11 PM
  const timeSlots = Array.from({ length: 24 }).map((_, hour) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
  });

  return (
    <View style={styles.container}>
      {timeSlots.map((time, index) => (
        <View key={index} style={styles.timeSlot}>
          <Text style={styles.timeText}>{time}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 60,
    backgroundColor: '#FAFAFA',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  timeSlot: {
    height: 60,
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingRight: 8,
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
});
