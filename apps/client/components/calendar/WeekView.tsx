import React, { useMemo, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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
const TIME_COLUMN_WIDTH = 60;
const MIN_DAY_WIDTH = 140; // Increased min width for better readability

export const WeekView: React.FC<WeekViewProps> = ({ weekDays, events, onEventPress }) => {
  const [dayColumnWidth, setDayColumnWidth] = useState(MIN_DAY_WIDTH);
  
  // Pre-calculate event layouts for each day
  const eventsByDay = useMemo(() => {
    const dayMap = new Map<number, EventWithLayout[]>();
    
    weekDays.forEach((day, dayIndex) => {
      const dayEvents = getEventsByDay(events, day);
      dayMap.set(dayIndex, layoutEvents(dayEvents));
    });
    
    return dayMap;
  }, [weekDays, events]);

  const getEventStyle = (event: EventWithLayout) => {
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
    // Use the actual measured width if available, otherwise min width
    const effectiveWidth = Math.max(dayColumnWidth, MIN_DAY_WIDTH); 
    const columnWidth = effectiveWidth / event.totalColumns;
    const left = event.column * columnWidth;
    const width = columnWidth - 4; // Subtract padding
    
    return {
      top: topPosition * HOUR_HEIGHT,
      height: duration * HOUR_HEIGHT,
      left: left + 2, // Add left padding
      width: width,
    };
  };

  const getEventForDay = (dayIndex: number) => {
    return eventsByDay.get(dayIndex) || [];
  };

  return (
    <View style={styles.container}>
      {/* 
         Structure:
         Outer Horizontal ScrollView -> Inner Vertical ScrollView
         Inner Vertical ScrollView has stickyHeaderIndices={[0]} for the Header Row.
         This ensures:
         1. Header scrolls horizontally with content (perfect alignment)
         2. Header stays fixed at top when scrolling vertically
         3. Time column moves with horizontal scroll (user can scroll back to see time)
      */}
      <ScrollView 
        horizontal 
        style={styles.horizontalScroll}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <ScrollView 
          vertical 
          style={styles.verticalScroll}
          stickyHeaderIndices={[0]}
          showsVerticalScrollIndicator={true}
        >
          {/* Sticky Header Row */}
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

          {/* Body Grid */}
          <View style={styles.gridBody}>
            {timeSlots.map((time, timeIndex) => (
              <View key={timeIndex} style={styles.timeRow}>
                {/* Time Label */}
                <View style={styles.timeSlot}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>

                {/* Day Cells */}
                {weekDays.map((day, dayIndex) => (
                  <View
                    key={`${timeIndex}-${dayIndex}`}
                    style={styles.dayCell}
                    onLayout={timeIndex === 0 && dayIndex === 0 ? (e) => {
                      const { width } = e.nativeEvent.layout;
                      if (width > 0) {
                        setDayColumnWidth(width);
                      }
                    } : undefined}
                  >
                    {/* Render events ONLY in the first time slot (they are absolute positioned) */}
                    {timeIndex === 0 && getEventForDay(dayIndex).map((event) => {
                        const eventStyle = getEventStyle(event);
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
          </View>
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
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF', // Must have background to hide scrolling content
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 100,
    ...Platform.select({
        web: {
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)', // Subtle shadow for depth
        },
        default: {
          elevation: 2,
        }
    })
  },
  timeColumnHeader: {
    width: TIME_COLUMN_WIDTH,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  dayHeader: {
    flex: 1,
    minWidth: MIN_DAY_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
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
  gridBody: {
    flexDirection: 'column',
  },
  timeRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  timeSlot: {
    width: TIME_COLUMN_WIDTH,
    height: HOUR_HEIGHT,
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingRight: 8,
    alignItems: 'flex-end',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  dayCell: {
    flex: 1,
    minWidth: MIN_DAY_WIDTH,
    height: HOUR_HEIGHT, // Must match timeSlot height
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    position: 'relative',
  },
  eventBlock: {
    position: 'absolute',
    borderRadius: 4,
    padding: 6,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
});
