import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTimeSlots } from '@/utils/dateHelpers';

export const TimeColumn: React.FC = () => {
  const timeSlots = getTimeSlots();

  return (
    <View style={styles.container}>
      <View style={styles.headerSpacer} />
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
    width: 70,
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  headerSpacer: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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

