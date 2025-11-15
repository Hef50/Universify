import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, PanResponder, Animated } from 'react-native';
import { router } from 'expo-router';
import { Event } from '@/types/event';
import { TimeColumn } from './TimeColumn';
import { EventBlock } from './EventBlock';
import { calculateEventPosition } from '@/utils/dateHelpers';
import { getEventsByDay } from '@/utils/eventHelpers';

interface CalendarGridProps {
  days: Date[];
  events: Event[];
  onEventPress: (event: Event) => void;
  onDragCreate?: (day: Date, startHour: number, endHour: number) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  events,
  onEventPress,
  onDragCreate,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [dragState, setDragState] = useState<{
    active: boolean;
    dayIndex: number;
    startY: number;
    currentY: number;
  } | null>(null);

  const eventsByDay = useMemo(() => {
    return days.map((day) => getEventsByDay(events, day));
  }, [days, events]);

  // Scroll to 7 AM on mount
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 7 * 60, animated: false });
    }, 100);
  }, []);

  const handleDragStart = (dayIndex: number, y: number) => {
    setDragState({
      active: true,
      dayIndex,
      startY: y,
      currentY: y,
    });
  };

  const handleDragMove = (y: number) => {
    if (dragState) {
      setDragState({ ...dragState, currentY: y });
    }
  };

  const handleDragEnd = () => {
    if (dragState && onDragCreate) {
      const startHour = Math.floor(Math.min(dragState.startY, dragState.currentY) / 60);
      const endHour = Math.ceil(Math.max(dragState.startY, dragState.currentY) / 60);
      
      if (endHour > startHour) {
        const selectedDay = days[dragState.dayIndex];
        const startTime = new Date(selectedDay);
        startTime.setHours(startHour, 0, 0, 0);
        
        const endTime = new Date(selectedDay);
        endTime.setHours(endHour, 0, 0, 0);
        
        // Navigate to create event page with pre-filled times
        router.push({
          pathname: '/(tabs)/create',
          params: {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          },
        });
      }
    }
    setDragState(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        <TimeColumn />
        <ScrollView
          ref={scrollViewRef}
          style={styles.gridContainer}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.grid}>
            {days.map((day, dayIndex) => {
              const dayEvents = eventsByDay[dayIndex];
              return (
                <DayColumn
                  key={dayIndex}
                  dayIndex={dayIndex}
                  dayEvents={dayEvents}
                  day={day}
                  onEventPress={onEventPress}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                  dragState={dragState}
                />
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
};

interface DayColumnProps {
  dayIndex: number;
  dayEvents: Event[];
  day: Date;
  onEventPress: (event: Event) => void;
  onDragStart: (dayIndex: number, y: number) => void;
  onDragMove: (y: number) => void;
  onDragEnd: () => void;
  dragState: { active: boolean; dayIndex: number; startY: number; currentY: number } | null;
}

const DayColumn: React.FC<DayColumnProps> = ({
  dayIndex,
  dayEvents,
  day,
  onEventPress,
  onDragStart,
  onDragMove,
  onDragEnd,
  dragState,
}) => {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const y = evt.nativeEvent.locationY;
        onDragStart(dayIndex, y);
      },
      onPanResponderMove: (evt) => {
        const y = evt.nativeEvent.locationY;
        onDragMove(y);
      },
      onPanResponderRelease: () => {
        onDragEnd();
      },
    })
  ).current;

  const showDragPreview = dragState?.active && dragState.dayIndex === dayIndex;
  const dragTop = showDragPreview ? Math.min(dragState.startY, dragState.currentY) : 0;
  const dragHeight = showDragPreview ? Math.abs(dragState.currentY - dragState.startY) : 0;

  return (
    <View style={styles.dayColumn} {...panResponder.panHandlers}>
      {/* Time slots background - 24 hours */}
      {Array.from({ length: 24 }).map((_, slotIndex) => (
        <View key={slotIndex} style={styles.timeSlot} />
      ))}

      {/* Drag preview */}
      {showDragPreview && (
        <View
          style={[
            styles.dragPreview,
            {
              top: dragTop,
              height: dragHeight,
            },
          ]}
        />
      )}

      {/* Events */}
      <View style={styles.eventsContainer} pointerEvents="box-none">
        {dayEvents.map((event) => {
          const { top, height } = calculateEventPosition(
            event.startTime,
            event.endTime,
            day
          );
          return (
            <EventBlock
              key={event.id}
              event={event}
              top={top}
              height={height}
              onPress={() => onEventPress(event)}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  horizontalScroll: {
    flexDirection: 'row',
  },
  gridContainer: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    minHeight: 1440, // 24 hours * 60px
  },
  dayColumn: {
    width: 150,
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  timeSlot: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  eventsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  dragPreview: {
    position: 'absolute',
    left: 4,
    right: 4,
    backgroundColor: '#FF6B6B',
    opacity: 0.3,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
  },
});

