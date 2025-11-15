import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getDayName, getMonthYear, isToday } from '@/utils/dateHelpers';

interface CalendarHeaderProps {
  days: Date[];
  currentDate: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewDaysChange?: (days: number) => void;
  viewDays: number;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  days,
  currentDate,
  onPrevious,
  onNext,
  onToday,
  onViewDaysChange,
  viewDays,
}) => {
  return (
    <View style={styles.container}>
      {/* Navigation */}
      <View style={styles.navigation}>
        <Text style={styles.monthYear}>{getMonthYear(currentDate)}</Text>
        <View style={styles.navButtons}>
          <TouchableOpacity style={styles.navButton} onPress={onPrevious}>
            <Text style={styles.navIcon}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.todayButton} onPress={onToday}>
            <Text style={styles.todayText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={onNext}>
            <Text style={styles.navIcon}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Day Headers */}
      <View style={styles.daysContainer}>
        <View style={styles.timeSpacer} />
        {days.map((day, index) => {
          const isTodayDate = isToday(day);
          return (
            <View key={index} style={styles.dayHeader}>
              <Text style={[styles.dayName, isTodayDate && styles.todayDayName]}>
                {getDayName(day)}
              </Text>
              <View
                style={[
                  styles.dayNumber,
                  isTodayDate && styles.todayDayNumber,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumberText,
                    isTodayDate && styles.todayDayNumberText,
                  ]}
                >
                  {day.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 24,
    color: '#374151',
    fontWeight: 'bold',
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#FF6B6B',
  },
  todayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  daysContainer: {
    flexDirection: 'row',
    height: 60,
  },
  timeSpacer: {
    width: 70,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  todayDayName: {
    color: '#FF6B6B',
  },
  dayNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayDayNumber: {
    backgroundColor: '#FF6B6B',
  },
  dayNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  todayDayNumberText: {
    color: '#FFFFFF',
  },
});

