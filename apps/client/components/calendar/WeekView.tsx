import React, { useMemo, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Event } from '@/types/event';
import { layoutEvents, EventWithLayout } from '@/utils/eventLayout';
import { getEventsByDay } from '@/utils/eventHelpers';
import { formatTime } from '@/utils/dateHelpers';

interface WeekViewProps {
  weekDays: Date[];
  events: Event[];
  onEventPress?: (event: Event) => void;
}

// Generate time slots from 12 AM to 11 PM
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    slots.push(`${displayHour} ${period}`);
  }
  return slots;
};

const timeSlots = generateTimeSlots();
const START_HOUR = 0; // Start from 12 AM (0:00)
const HOUR_HEIGHT = 64; // Height of each hour slot in pixels (4rem equivalent)

export const WeekView: React.FC<WeekViewProps> = ({ weekDays, events, onEventPress }) => {
  const [dayColumnWidth, setDayColumnWidth] = useState(100); // Default width
  const dayCellRef = useRef<View>(null);
  
  // Pre-calculate event layouts for each day
  const eventsByDay = useMemo(() => {
    const dayMap = new Map<number, EventWithLayout[]>();
    
    weekDays.forEach((day, dayIndex) => {
      const dayEvents = getEventsByDay(events, day);
      dayMap.set(dayIndex, layoutEvents(dayEvents));
    });
    
    return dayMap;
  }, [weekDays, events]);

  const getEventStyle = (event: EventWithLayout, day: Date) => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    
    const startHour = eventStart.getHours();
    const startMinute = eventStart.getMinutes();
    const endHour = eventEnd.getHours();
    const endMinute = eventEnd.getMinutes();
    
    // Calculate position from START_HOUR (0 = 12 AM)
    const topPosition = ((startHour - START_HOUR) * 60 + startMinute) / 60;
    const duration = ((endHour - startHour) * 60 + (endMinute - startMinute)) / 60;
    
    // Calculate width and left position based on column layout
    const columnWidth = dayColumnWidth / event.totalColumns;
    const left = event.column * columnWidth;
    const width = columnWidth - 8; // Subtract padding
    
    return {
      top: topPosition * HOUR_HEIGHT,
      height: duration * HOUR_HEIGHT,
      left: left + 4, // Add left padding
      width: width,
    };
  };

  const getEventForDay = (dayIndex: number) => {
    return eventsByDay.get(dayIndex) || [];
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.horizontalScroll}
      >
        <ScrollView
          showsVerticalScrollIndicator={true}
          style={styles.verticalScroll}
          contentContainerStyle={styles.verticalContent}
        >
          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={styles.timeColumnHeader} />
            {weekDays.map((day, index) => (
              <View key={index} style={styles.dayHeader}>
                <Text style={styles.dayName}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                </Text>
                <Text style={styles.dayNumber}>{day.getDate()}</Text>
              </View>
            ))}
          </View>

          {/* Time slots */}
          {timeSlots.map((time, timeIndex) => (
            <View key={timeIndex} style={styles.timeRow}>
              <View style={styles.timeSlot}>
                <Text style={styles.timeText}>{time}</Text>
              </View>
              {weekDays.map((day, dayIndex) => (
                <View
                  key={`${timeIndex}-${dayIndex}`}
                  style={styles.dayCell}
                  ref={timeIndex === 0 && dayIndex === 0 ? dayCellRef : undefined}
                  onLayout={timeIndex === 0 && dayIndex === 0 ? (e) => {
                    const { width } = e.nativeEvent.layout;
                    if (width > 0) {
                      setDayColumnWidth(width);
                    }
                  } : undefined}
                >
                  {/* Render events only in the first time slot row, but they span across all rows */}
                  {timeIndex === 0 && getEventForDay(dayIndex).map((event) => {
                      const eventStyle = getEventStyle(event, day);
                      return (
                        <TouchableOpacity
                          key={event.id}
                          style={[
                            styles.eventBlock,
                            {
                              top: eventStyle.top,
                              height: eventStyle.height,
                              left: eventStyle.left,
                              width: eventStyle.width,
                              backgroundColor: event.color,
                            },
                          ]}
                          onPress={() => onEventPress?.(event)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.eventTitle} numberOfLines={1}>
                            {event.title}
                          </Text>
                          <Text style={styles.eventTime} numberOfLines={1}>
                            {formatTime(event.startTime)} - {formatTime(event.endTime)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  horizontalScroll: {
    flex: 1,
  },
  verticalScroll: {
    flex: 1,
  },
  verticalContent: {
    minWidth: 700,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  timeColumnHeader: {
    width: 80,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: '300',
    color: '#1F2937',
  },
  timeRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  timeSlot: {
    width: 80,
    height: HOUR_HEIGHT,
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingRight: 8,
    alignItems: 'flex-end',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  dayCell: {
    flex: 1,
    minWidth: 100,
    height: HOUR_HEIGHT,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    position: 'relative',
  },
  eventBlock: {
    position: 'absolute',
    borderRadius: 4,
    padding: 6,
    marginLeft: 4,
    marginRight: 4,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});

