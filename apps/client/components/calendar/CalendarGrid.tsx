import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, PanResponder, Animated, Platform } from 'react-native';
import { router } from 'expo-router';
import { Event } from '@/types/event';
import { TimeColumn } from './TimeColumn';
import { EventBlock } from './EventBlock';
import { calculateEventPosition } from '@/utils/dateHelpers';
import { getEventsByDay } from '@/utils/eventHelpers';

interface CalendarGridProps {
  days: Date[];
  events: Event[];
  suggestedEvents?: Event[];
  onEventPress: (event: Event) => void;
  onDragCreate?: (day: Date, startHour: number, endHour: number) => void;
  onRecommendationDragEnd?: (day: Date, startTime: Date, endTime: Date) => void;
  recommendationMode?: boolean;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  events,
  suggestedEvents = [],
  onEventPress,
  onDragCreate,
  onRecommendationDragEnd,
  recommendationMode = false,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [dragState, setDragState] = useState<{
    active: boolean;
    dayIndex: number;
    startY: number;
    currentY: number;
  } | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const dragStateRef = useRef(dragState);
  
  // Keep ref in sync with state
  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const eventsByDay = useMemo(() => {
    return days.map((day) => getEventsByDay(events, day));
  }, [days, events]);

  const suggestedEventsByDay = useMemo(() => {
    return days.map((day) => getEventsByDay(suggestedEvents, day));
  }, [days, suggestedEvents]);

  // Scroll to 7 AM on mount
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 7 * 60, animated: false });
    }, 100);
  }, []);

  // Store positions of day columns for position calculation
  const dayColumnPositions = useRef<{ [key: number]: { top: number; height: number } }>({});

  // Handle mouse/touch move and release globally to track drag even when mouse leaves component
  useEffect(() => {
    if (!dragState?.active) return;

    const handleMouseMove = (e: MouseEvent) => {
      const current = dragStateRef.current;
      if (!current?.active) return;

      // Get the day column position info
      const columnPos = dayColumnPositions.current[current.dayIndex];
      if (!columnPos) return;

      // Get the grid container to calculate relative position
      const gridElement = scrollViewRef.current;
      if (!gridElement || Platform.OS !== 'web') return;

      // For web, we need to get the actual DOM element
      const domNode = (gridElement as any)._nativeNode || (gridElement as any).__domNode;
      if (!domNode) return;

      const gridRect = domNode.getBoundingClientRect();
      const globalY = e.clientY;
      
      // Calculate Y relative to the grid container, then adjust for scroll
      const scrollY = domNode.scrollTop || 0;
      const relativeY = globalY - gridRect.top + scrollY - columnPos.top;
      
      // Clamp to valid range (0 to column height)
      const clampedY = Math.max(0, Math.min(columnPos.height, relativeY));
      
      // Update drag state
      handleDragMove(clampedY);
    };

    const handleMouseUp = () => {
      const current = dragStateRef.current;
      if (current?.active) {
        // Re-enable scrolling
        setScrollEnabled(true);
        const startHour = Math.floor(Math.min(current.startY, current.currentY) / 60);
        const endHour = Math.ceil(Math.max(current.startY, current.currentY) / 60);
        
        if (endHour > startHour) {
          const selectedDay = days[current.dayIndex];
          const startTime = new Date(selectedDay);
          startTime.setHours(startHour, 0, 0, 0);
          
          const endTime = new Date(selectedDay);
          endTime.setHours(endHour, 0, 0, 0);
          
          // Always call recommendation handler when dragging (auto-trigger suggestions)
          if (onRecommendationDragEnd) {
            onRecommendationDragEnd(selectedDay, startTime, endTime);
          } else if (onDragCreate) {
            // Fallback to create event if no recommendation handler
            router.push({
              pathname: '/(tabs)/create',
              params: {
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
              },
            });
          }
        }
        dragStateRef.current = null;
        setDragState(null);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const current = dragStateRef.current;
      if (!current?.active) return;

      const columnPos = dayColumnPositions.current[current.dayIndex];
      if (!columnPos) return;

      const gridElement = scrollViewRef.current;
      if (!gridElement || Platform.OS !== 'web') return;

      const domNode = (gridElement as any)._nativeNode || (gridElement as any).__domNode;
      if (!domNode) return;

      const gridRect = domNode.getBoundingClientRect();
      const globalY = e.touches[0].clientY;
      const scrollY = domNode.scrollTop || 0;
      const relativeY = globalY - gridRect.top + scrollY - columnPos.top;
      const clampedY = Math.max(0, Math.min(columnPos.height, relativeY));
      
      handleDragMove(clampedY);
    };

    const handleTouchEnd = handleMouseUp;

    // Add listeners to document/window for web
    if (Platform.OS === 'web') {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }

    // For native, we rely on PanResponder
    return () => {};
  }, [dragState?.active, dragState?.dayIndex, days, recommendationMode, onRecommendationDragEnd, onDragCreate]);

  const handleDragStart = (dayIndex: number, y: number) => {
    // Immediately disable scrolling
    setScrollEnabled(false);
    const newState = {
      active: true,
      dayIndex,
      startY: y,
      currentY: y,
    };
    dragStateRef.current = newState;
    setDragState(newState);
  };

  const handleDragMove = (y: number) => {
    const current = dragStateRef.current;
    if (current && current.active) {
      const newState = { ...current, currentY: y };
      dragStateRef.current = newState;
      setDragState(newState);
    }
  };

  const handleDragEnd = () => {
    console.log('handleDragEnd called');
    const current = dragStateRef.current;
    console.log('Current drag state:', current);
    // Re-enable scrolling
    setScrollEnabled(true);
    if (current && current.active) {
      const startHour = Math.floor(Math.min(current.startY, current.currentY) / 60);
      const endHour = Math.ceil(Math.max(current.startY, current.currentY) / 60);
      console.log('Calculated hours:', { startHour, endHour, startY: current.startY, currentY: current.currentY });
      
      if (endHour > startHour) {
        const selectedDay = days[current.dayIndex];
        const startTime = new Date(selectedDay);
        startTime.setHours(startHour, 0, 0, 0);
        
        const endTime = new Date(selectedDay);
        endTime.setHours(endHour, 0, 0, 0);
        
        // Always call recommendation handler when dragging (auto-trigger suggestions)
        if (onRecommendationDragEnd) {
          console.log('Calling onRecommendationDragEnd', { selectedDay, startTime, endTime });
          onRecommendationDragEnd(selectedDay, startTime, endTime);
        } else if (onDragCreate) {
          console.log('No onRecommendationDragEnd, using onDragCreate');
          // Fallback to create event if no recommendation handler
          router.push({
            pathname: '/(tabs)/create',
            params: {
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
            },
          });
        }
      }
    }
    dragStateRef.current = null;
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
          scrollEnabled={scrollEnabled}
          nestedScrollEnabled={true}
          bounces={scrollEnabled}
        >
          <View style={styles.grid}>
            {days.map((day, dayIndex) => {
              const dayEvents = eventsByDay[dayIndex];
              const daySuggestedEvents = suggestedEventsByDay[dayIndex];
              return (
                <DayColumn
                  key={dayIndex}
                  dayIndex={dayIndex}
                  dayEvents={dayEvents}
                  suggestedEvents={daySuggestedEvents}
                  day={day}
                  onEventPress={onEventPress}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                  dragState={dragState}
                  recommendationMode={recommendationMode}
                  onLayout={(event) => {
                    const { y, height } = event.nativeEvent.layout;
                    dayColumnPositions.current[dayIndex] = { top: y, height };
                  }}
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
  suggestedEvents?: Event[];
  day: Date;
  onEventPress: (event: Event) => void;
  onDragStart: (dayIndex: number, y: number) => void;
  onDragMove: (y: number) => void;
  onDragEnd: () => void;
  dragState: { active: boolean; dayIndex: number; startY: number; currentY: number } | null;
  recommendationMode?: boolean;
  onLayout?: (event: any) => void;
}

const DayColumn: React.FC<DayColumnProps> = ({
  dayIndex,
  dayEvents,
  suggestedEvents = [],
  day,
  onEventPress,
  onDragStart,
  onDragMove,
  onDragEnd,
  dragState,
  recommendationMode = false,
  onLayout,
}) => {
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // If already dragging, continue
          if (dragStateRef.current?.active) return true;
          
          // Always allow dragging - it will trigger suggestions automatically
          // Check for vertical movement
          const { dx, dy } = gestureState;
          const isVerticalDrag = Math.abs(dy) > 3 && Math.abs(dy) > Math.abs(dx);
          return isVerticalDrag;
        },
        onPanResponderTerminationRequest: () => {
          // Don't allow termination once we've started dragging
          return !dragStateRef.current?.active;
        },
        onPanResponderGrant: (evt) => {
          const y = evt.nativeEvent.locationY;
          onDragStart(dayIndex, y);
        },
        onPanResponderMove: (evt) => {
          if (dragStateRef.current?.active) {
            const y = evt.nativeEvent.locationY;
            onDragMove(y);
          }
        },
        onPanResponderRelease: () => {
          if (dragStateRef.current?.active) {
            onDragEnd();
          }
        },
        onPanResponderTerminate: () => {
          if (dragStateRef.current?.active) {
            onDragEnd();
          }
        },
        onPanResponderReject: () => {
          if (dragStateRef.current?.active) {
            onDragEnd();
          }
        },
      }),
    [dayIndex, recommendationMode, onDragStart, onDragMove, onDragEnd]
  );

  const showDragPreview = dragState?.active && dragState.dayIndex === dayIndex;
  const dragTop = showDragPreview ? Math.min(dragState.startY, dragState.currentY) : 0;
  const dragHeight = showDragPreview ? Math.abs(dragState.currentY - dragState.startY) : 0;

  return (
    <View style={styles.dayColumn} onLayout={onLayout} {...panResponder.panHandlers}>
      {/* Time slots background - 24 hours */}
      {Array.from({ length: 24 }).map((_, slotIndex) => (
        <View key={slotIndex} style={styles.timeSlot} />
      ))}

      {/* Drag preview */}
      {showDragPreview && (
        <View
          style={[
            styles.dragPreview,
            recommendationMode ? styles.recommendationDragPreview : undefined,
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
        {/* Suggested Events */}
        {suggestedEvents.map((event) => {
          const { top, height } = calculateEventPosition(
            event.startTime,
            event.endTime,
            day
          );
          return (
            <EventBlock
              key={`suggested-${event.id}`}
              event={event}
              top={top}
              height={height}
              onPress={() => onEventPress(event)}
              isSuggested={true}
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
  recommendationDragPreview: {
    backgroundColor: '#FFD93D',
    borderColor: '#FFD93D',
    opacity: 0.5,
  },
});

