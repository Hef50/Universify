import { Event } from '@/types/event';

export interface EventWithLayout extends Event {
  column: number;
  totalColumns: number;
}

/**
 * Check if two events overlap in time
 */
const eventsOverlap = (event1: Event, event2: Event): boolean => {
  const start1 = new Date(event1.startTime).getTime();
  const end1 = new Date(event1.endTime).getTime();
  const start2 = new Date(event2.startTime).getTime();
  const end2 = new Date(event2.endTime).getTime();
  
  return start1 < end2 && start2 < end1;
};

/**
 * Layout events in columns to handle overlaps (Google Calendar algorithm)
 * This algorithm groups overlapping events and assigns them to columns
 * so they can be displayed side-by-side.
 */
export const layoutEvents = (dayEvents: Event[]): EventWithLayout[] => {
  if (dayEvents.length === 0) return [];
  
  // Sort events by start time, then by duration (longer first for tie-breaking)
  const sorted = [...dayEvents].sort((a, b) => {
    const startA = new Date(a.startTime).getTime();
    const startB = new Date(b.startTime).getTime();
    const startDiff = startA - startB;
    if (startDiff !== 0) return startDiff;
    
    const endA = new Date(a.endTime).getTime();
    const endB = new Date(b.endTime).getTime();
    return endB - endA; // Longer events first
  });

  const result: EventWithLayout[] = [];
  const columns: Event[][] = [];

  // First pass: assign events to columns
  for (const event of sorted) {
    // Find the first column where this event doesn't overlap with existing events
    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      const columnEvents = columns[i];
      const hasOverlap = columnEvents.some(existingEvent => eventsOverlap(event, existingEvent));
      
      if (!hasOverlap) {
        columnEvents.push(event);
        result.push({
          ...event,
          column: i,
          totalColumns: 1, // Will be updated in second pass
        });
        placed = true;
        break;
      }
    }

    // If no suitable column found, create a new one
    if (!placed) {
      columns.push([event]);
      result.push({
        ...event,
        column: columns.length - 1,
        totalColumns: 1, // Will be updated in second pass
      });
    }
  }

  // Second pass: find overlapping groups and calculate max columns for each group
  // Build a graph of overlapping events
  const overlappingGroups: Set<number>[] = [];
  const eventToGroup = new Map<number, number>();
  
  result.forEach((event, index) => {
    let groupIndex = eventToGroup.get(index);
    
    // Check all other events for overlaps
    result.forEach((otherEvent, otherIndex) => {
      if (index !== otherIndex && eventsOverlap(event, otherEvent)) {
        const otherGroupIndex = eventToGroup.get(otherIndex);
        
        if (groupIndex === undefined && otherGroupIndex === undefined) {
          // Create new group
          groupIndex = overlappingGroups.length;
          overlappingGroups.push(new Set([index, otherIndex]));
          eventToGroup.set(index, groupIndex);
          eventToGroup.set(otherIndex, groupIndex);
        } else if (groupIndex === undefined && otherGroupIndex !== undefined) {
          // Add to existing group
          groupIndex = otherGroupIndex;
          overlappingGroups[groupIndex].add(index);
          eventToGroup.set(index, groupIndex);
        } else if (groupIndex !== undefined && otherGroupIndex === undefined) {
          // Add other to this group
          overlappingGroups[groupIndex].add(otherIndex);
          eventToGroup.set(otherIndex, groupIndex);
        } else if (groupIndex !== undefined && otherGroupIndex !== undefined && groupIndex !== otherGroupIndex) {
          // Merge groups
          const groupToMerge = overlappingGroups[otherGroupIndex];
          groupToMerge.forEach(i => {
            overlappingGroups[groupIndex!].add(i);
            eventToGroup.set(i, groupIndex!);
          });
          overlappingGroups[otherGroupIndex] = new Set(); // Mark as merged
        }
      }
    });
    
    // If no overlaps found, create a single-event group
    if (groupIndex === undefined) {
      groupIndex = overlappingGroups.length;
      overlappingGroups.push(new Set([index]));
      eventToGroup.set(index, groupIndex);
    }
  });

  // Calculate max columns for each group
  const groupMaxColumns = new Map<number, number>();
  overlappingGroups.forEach((group, groupIndex) => {
    if (group.size === 0) return; // Skip merged groups
    
    // Find the maximum number of simultaneous events in this group
    const eventIndices = Array.from(group);
    let maxSimultaneous = 1;
    
    // Check each time point where events start or end
    const timePoints = new Set<number>();
    eventIndices.forEach(i => {
      const event = result[i];
      timePoints.add(new Date(event.startTime).getTime());
      timePoints.add(new Date(event.endTime).getTime());
    });
    
    Array.from(timePoints).forEach(timePoint => {
      const simultaneous = eventIndices.filter(i => {
        const event = result[i];
        const start = new Date(event.startTime).getTime();
        const end = new Date(event.endTime).getTime();
        return start <= timePoint && end > timePoint;
      }).length;
      maxSimultaneous = Math.max(maxSimultaneous, simultaneous);
    });
    
    groupMaxColumns.set(groupIndex, maxSimultaneous);
  });

  // Update totalColumns for all events based on their group
  return result.map((event, index) => {
    const groupIndex = eventToGroup.get(index);
    const maxColumns = groupIndex !== undefined ? (groupMaxColumns.get(groupIndex) || 1) : 1;
    return {
      ...event,
      totalColumns: maxColumns,
    };
  });
};

