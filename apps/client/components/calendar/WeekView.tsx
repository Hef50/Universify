import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Event } from '@/types/event';
import { layoutEvents, EventWithLayout } from '@/utils/eventLayout';
import { getEventsByDay } from '@/utils/eventHelpers';
import { formatTime } from '@/utils/dateHelpers';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

interface WeekViewProps {
  weekDays: Date[];
  events: Event[];
  onEventPress?: (event: Event) => void;
  onSelectionChange?: (selection: { startDate: Date; endDate: Date } | null) => void;
  externalSelection?: { startDate: Date; endDate: Date } | null;
}

interface SelectionBox {
  startDay: number;
  endDay: number;
  startTime: number; // hour + minute fraction
  endTime: number; // hour + minute fraction
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

export const WeekView: React.FC<WeekViewProps> = ({ weekDays, events, onEventPress, onSelectionChange, externalSelection }) => {
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);
  const [dayColumnWidth, setDayColumnWidth] = useState(MIN_DAY_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ dayIndex: number; timeIndex: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ dayIndex: number; timeIndex: number; y: number } | null>(null);
  const [finalSelection, setFinalSelection] = useState<SelectionBox | null>(null);
  const gridBodyRef = useRef<View>(null);
  const gridLayoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const verticalScrollRef = useRef<ScrollView>(null);
  const scrolledForRef = useRef<string>('');

  // The grid runs from midnight, which is always empty — open it on the first
  // event of the visible range instead (or the morning when there is none).
  useEffect(() => {
    const key = `${weekDays[0]?.toDateString() ?? ''}-${events.length > 0}`;
    if (scrolledForRef.current === key) return;
    scrolledForRef.current = key;

    const hours = events
      .map((event) => new Date(event.startTime))
      .filter((date) => !isNaN(date.getTime()))
      .map((date) => date.getHours());
    const earliest = hours.length > 0 ? Math.min(...hours) : 8;
    const target = Math.max(0, Math.min(earliest - 1, 20));

    requestAnimationFrame(() => {
      verticalScrollRef.current?.scrollTo({ y: target * HOUR_HEIGHT, animated: false });
    });
  }, [weekDays, events]);
  
  // Clear selection when externalSelection becomes null (reset button clicked)
  useEffect(() => {
    if (externalSelection === null && finalSelection !== null) {
      setFinalSelection(null);
      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);
    }
  }, [externalSelection, finalSelection]);
  
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

  // Calculate position from event coordinates
  const getPositionFromCoordinates = (x: number, y: number) => {
    if (!gridLayoutRef.current) return null;

    const { x: gridX, y: gridY } = gridLayoutRef.current;
    const relativeX = x - gridX;
    const relativeY = y - gridY;

    // The grid body's position already accounts for the header, so we use relativeY directly
    if (relativeY < 0) return null;

    // Ignore clicks/drags in the time column area (use <= to be more strict)
    if (relativeX <= TIME_COLUMN_WIDTH) return null;

    // Calculate day index
    const effectiveWidth = Math.max(dayColumnWidth, MIN_DAY_WIDTH);
    const dayIndex = Math.floor((relativeX - TIME_COLUMN_WIDTH) / effectiveWidth);
    // Ensure dayIndex is never negative
    if (dayIndex < 0) return null;
    const clampedDayIndex = Math.max(0, Math.min(dayIndex, weekDays.length - 1));

    // Calculate time index (which hour slot)
    const timeIndex = Math.floor(relativeY / HOUR_HEIGHT);
    const clampedTimeIndex = Math.max(0, Math.min(timeIndex, timeSlots.length - 1));

    // Calculate precise Y position within the time slot
    const yInSlot = relativeY - (clampedTimeIndex * HOUR_HEIGHT);

    return {
      dayIndex: clampedDayIndex,
      timeIndex: clampedTimeIndex,
      y: yInSlot,
    };
  };

  const handleDragStart = (event: any) => {
    // Clear previous selection when starting new drag
    setFinalSelection(null);
    if (onSelectionChange) {
      onSelectionChange(null);
    }
    
    if (!gridBodyRef.current) return;

    const nativeEvent = event.nativeEvent;

    if (Platform.OS === 'web') {
      // For web, get bounding rect
      if (gridBodyRef.current && typeof (gridBodyRef.current as any).getBoundingClientRect === 'function') {
        const rect = (gridBodyRef.current as any).getBoundingClientRect();
        gridLayoutRef.current = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
      }
      const pos = getPositionFromCoordinates(nativeEvent.clientX, nativeEvent.clientY);
      // Only start drag if position is valid and not in time column
      if (pos && pos.dayIndex >= 0) {
        setDragStart(pos);
        setDragCurrent(pos);
        setIsDragging(true);
      }
    } else {
      // For native, use measureInWindow to get window coordinates
      (gridBodyRef.current as any).measureInWindow((x: number, y: number, width: number, height: number) => {
        gridLayoutRef.current = { x, y, width, height };
        const pos = getPositionFromCoordinates(nativeEvent.pageX, nativeEvent.pageY);
        // Only start drag if position is valid and not in time column
        if (pos && pos.dayIndex >= 0) {
          setDragStart(pos);
          setDragCurrent(pos);
          setIsDragging(true);
        }
      });
    }
  };

  const handleDragMove = (event: any) => {
    if (!isDragging || !dragStart) return;

    const nativeEvent = event.nativeEvent;

    if (Platform.OS === 'web') {
      // For web, update layout if needed
      if (gridBodyRef.current && typeof (gridBodyRef.current as any).getBoundingClientRect === 'function') {
        const rect = (gridBodyRef.current as any).getBoundingClientRect();
        gridLayoutRef.current = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
      }
      const pos = getPositionFromCoordinates(nativeEvent.clientX, nativeEvent.clientY);
      // Only update if position is valid and not in time column
      // Clamp dayIndex to the starting day to prevent multi-day selection
      if (pos && pos.dayIndex >= 0) {
        setDragCurrent({
          ...pos,
          dayIndex: dragStart.dayIndex, // Force same day as drag start
        });
      }
    } else {
      // For native, use measureInWindow
      if (gridBodyRef.current) {
        (gridBodyRef.current as any).measureInWindow((x: number, y: number, width: number, height: number) => {
          gridLayoutRef.current = { x, y, width, height };
          const pos = getPositionFromCoordinates(nativeEvent.pageX, nativeEvent.pageY);
          // Only update if position is valid and not in time column
          // Clamp dayIndex to the starting day to prevent multi-day selection
          if (pos && pos.dayIndex >= 0) {
            setDragCurrent({
              ...pos,
              dayIndex: dragStart.dayIndex, // Force same day as drag start
            });
          }
        });
      }
    }
  };

  const handleDragEnd = () => {
    if (!dragStart || !dragCurrent) {
      setIsDragging(false);
      return;
    }

    // Calculate final selection box - restrict to single day
    // Use the starting day for both start and end to prevent multi-day selection
    const startDay = dragStart.dayIndex;
    const endDay = dragStart.dayIndex;
    
    // Calculate precise time positions
    const startTimeSlot = Math.min(dragStart.timeIndex, dragCurrent.timeIndex);
    const endTimeSlot = Math.max(dragStart.timeIndex, dragCurrent.timeIndex);
    
    // Calculate precise time within slots
    let startTime = startTimeSlot;
    let endTime = endTimeSlot + 1;
    
    if (dragStart.timeIndex === dragCurrent.timeIndex) {
      // Same time slot, use Y positions
      const minY = Math.min(dragStart.y, dragCurrent.y);
      const maxY = Math.max(dragStart.y, dragCurrent.y);
      startTime = startTimeSlot + (minY / HOUR_HEIGHT);
      endTime = startTimeSlot + (maxY / HOUR_HEIGHT);
    } else {
      // Different time slots
      if (dragStart.timeIndex < dragCurrent.timeIndex) {
        startTime = dragStart.timeIndex + (dragStart.y / HOUR_HEIGHT);
        endTime = dragCurrent.timeIndex + (dragCurrent.y / HOUR_HEIGHT);
      } else {
        startTime = dragCurrent.timeIndex + (dragCurrent.y / HOUR_HEIGHT);
        endTime = dragStart.timeIndex + (dragStart.y / HOUR_HEIGHT);
      }
    }

    setFinalSelection({
      startDay,
      endDay,
      startTime,
      endTime,
    });

    // Convert selection to actual dates and notify parent
    if (onSelectionChange && weekDays.length > 0 && startDay >= 0 && endDay >= 0) {
      const startDate = new Date(weekDays[startDay]);
      const startHours = Math.floor(startTime);
      const startMinutes = Math.round((startTime % 1) * 60);
      startDate.setHours(startHours, startMinutes, 0, 0);
      
      const endDate = new Date(weekDays[endDay]);
      const endHours = Math.floor(endTime);
      const endMinutes = Math.round((endTime % 1) * 60);
      endDate.setHours(endHours, endMinutes, 0, 0);
      
      onSelectionChange({ startDate, endDate });
    }

    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  // Calculate selection box style
  const getSelectionBoxStyle = (): any => {
    if (!dragStart || !dragCurrent) {
      if (!finalSelection) return null;
      
      // Use final selection - ensure it never extends into time column
      // Restrict to single day width
      const effectiveWidth = Math.max(dayColumnWidth, MIN_DAY_WIDTH);
      const left = TIME_COLUMN_WIDTH + (finalSelection.startDay * effectiveWidth);
      const width = effectiveWidth; // Single day width (selection is restricted to one day)
      const top = finalSelection.startTime * HOUR_HEIGHT;
      const height = (finalSelection.endTime - finalSelection.startTime) * HOUR_HEIGHT;

      // Ensure left is never less than TIME_COLUMN_WIDTH
      if (left < TIME_COLUMN_WIDTH) return null;

      return {
        position: 'absolute' as const,
        left,
        top,
        width,
        height,
        backgroundColor: '#F24A3D80',
        zIndex: 5,
        pointerEvents: 'none' as const,
      };
    }

    // Use current drag - ensure it never extends into time column
    // Restrict to single day (use starting day)
    const effectiveWidth = Math.max(dayColumnWidth, MIN_DAY_WIDTH);
    const startDay = dragStart.dayIndex;
    const endDay = dragStart.dayIndex; // Force same day
    
    // Ensure day indices are valid (not negative)
    if (startDay < 0 || endDay < 0) return null;
    
    const startTimeSlot = Math.min(dragStart.timeIndex, dragCurrent.timeIndex);
    const endTimeSlot = Math.max(dragStart.timeIndex, dragCurrent.timeIndex);
    
    let startTime = startTimeSlot;
    let endTime = endTimeSlot + 1;
    
    if (dragStart.timeIndex === dragCurrent.timeIndex) {
      const minY = Math.min(dragStart.y, dragCurrent.y);
      const maxY = Math.max(dragStart.y, dragCurrent.y);
      startTime = startTimeSlot + (minY / HOUR_HEIGHT);
      endTime = startTimeSlot + (maxY / HOUR_HEIGHT);
    } else {
      if (dragStart.timeIndex < dragCurrent.timeIndex) {
        startTime = dragStart.timeIndex + (dragStart.y / HOUR_HEIGHT);
        endTime = dragCurrent.timeIndex + (dragCurrent.y / HOUR_HEIGHT);
      } else {
        startTime = dragCurrent.timeIndex + (dragCurrent.y / HOUR_HEIGHT);
        endTime = dragStart.timeIndex + (dragStart.y / HOUR_HEIGHT);
      }
    }

    const left = TIME_COLUMN_WIDTH + (startDay * effectiveWidth);
    const width = effectiveWidth; // Single day width (endDay === startDay)
    const top = startTime * HOUR_HEIGHT;
    const height = (endTime - startTime) * HOUR_HEIGHT;

    // Ensure left is never less than TIME_COLUMN_WIDTH
    if (left < TIME_COLUMN_WIDTH) return null;

    return {
      position: 'absolute' as const,
      left,
      top,
      width,
      height,
      backgroundColor: '#F24A3D80',
      zIndex: 5,
      pointerEvents: 'none' as const,
    };
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
          ref={verticalScrollRef}
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
          <View
            ref={gridBodyRef}
            style={styles.gridBody}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            // Mouse handlers only exist on react-native-web's DOM views
            {...(Platform.OS === 'web'
              ? ({
                  onMouseDown: handleDragStart,
                  onMouseMove: isDragging ? handleDragMove : undefined,
                  onMouseUp: handleDragEnd,
                  onMouseLeave: handleDragEnd,
                } as object)
              : {})}
          >
            {/* Selection Box Overlay */}
            {(isDragging || finalSelection) && (() => {
              const boxStyle = getSelectionBoxStyle();
              return boxStyle ? <View style={boxStyle} /> : null;
            })()}

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

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: colors.surface, // Must have background to hide scrolling content
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
      borderRightColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    dayHeader: {
      flex: 1,
      minWidth: MIN_DAY_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      backgroundColor: colors.surface,
    },
    dayName: {
      fontSize: 11 * fontScale,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    dayNumber: {
      fontSize: 20 * fontScale,
      fontWeight: '300',
      color: colors.textPrimary,
    },
    gridBody: {
      flexDirection: 'column',
    },
    timeRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    timeSlot: {
      width: TIME_COLUMN_WIDTH,
      height: HOUR_HEIGHT,
      justifyContent: 'flex-start',
      paddingTop: 4,
      paddingRight: 8,
      alignItems: 'flex-end',
      borderRightWidth: 1,
      borderRightColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    timeText: {
      fontSize: 11 * fontScale,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    dayCell: {
      flex: 1,
      minWidth: MIN_DAY_WIDTH,
      height: HOUR_HEIGHT, // Must match timeSlot height
      borderRightWidth: 1,
      borderRightColor: colors.border,
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
      fontSize: 12 * fontScale,
      fontWeight: '700',
      color: colors.onPrimary,
      marginBottom: 2,
    },
    eventTime: {
      fontSize: 10 * fontScale,
      color: 'rgba(255, 255, 255, 0.9)',
      fontWeight: '500',
    },
  });
