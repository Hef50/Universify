import { Event, EventCategory } from '@/types/event';
import { FilterState } from '@/types/settings';

export const filterEvents = (events: Event[], filters: FilterState): Event[] => {
  return events.filter((event) => {
    // Category filter
    if (filters.categories.length > 0) {
      const hasMatchingCategory = event.categories.some((cat) =>
        filters.categories.includes(cat)
      );
      if (!hasMatchingCategory) return false;
    }

    // Event type filter
    if (!filters.eventTypes.clubEvents && event.isClubEvent) return false;
    if (!filters.eventTypes.socialEvents && event.isSocialEvent) return false;

    // Date range filter
    if (filters.dateRange) {
      const eventStart = new Date(event.startTime);
      const rangeStart = new Date(filters.dateRange.start);
      const rangeEnd = new Date(filters.dateRange.end);
      if (eventStart < rangeStart || eventStart > rangeEnd) return false;
    }

    // Location filter
    if (filters.location) {
      const locationMatch = event.location
        .toLowerCase()
        .includes(filters.location.toLowerCase());
      if (!locationMatch) return false;
    }

    // Time of day filter
    if (filters.timeOfDay) {
      const eventHour = new Date(event.startTime).getHours();
      let matchesTimeOfDay = false;

      switch (filters.timeOfDay) {
        case 'morning':
          matchesTimeOfDay = eventHour >= 6 && eventHour < 12;
          break;
        case 'afternoon':
          matchesTimeOfDay = eventHour >= 12 && eventHour < 17;
          break;
        case 'evening':
          matchesTimeOfDay = eventHour >= 17 && eventHour < 21;
          break;
        case 'night':
          matchesTimeOfDay = eventHour >= 21 || eventHour < 6;
          break;
      }

      if (!matchesTimeOfDay) return false;
    }

    // Availability filter
    if (filters.hasAvailability && event.capacity) {
      const totalRSVPs =
        event.rsvpCounts.going + event.rsvpCounts.maybe;
      if (totalRSVPs >= event.capacity) return false;
    }

    return true;
  });
};

export const sortEvents = (
  events: Event[],
  sortBy: 'date' | 'popularity' | 'recent' = 'date'
): Event[] => {
  const sorted = [...events];

  switch (sortBy) {
    case 'date':
      sorted.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      break;
    case 'popularity':
      sorted.sort((a, b) => {
        const aPopularity = a.rsvpCounts.going + a.rsvpCounts.maybe;
        const bPopularity = b.rsvpCounts.going + b.rsvpCounts.maybe;
        return bPopularity - aPopularity;
      });
      break;
    case 'recent':
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
  }

  return sorted;
};

export const searchEvents = (
  events: Event[],
  query: string,
  mode: 'names' | 'all' | 'semantic' = 'semantic'
): Event[] => {
  if (!query.trim()) return events;

  const lowerQuery = query.toLowerCase();

  return events.filter((event) => {
    switch (mode) {
      case 'names':
        return event.title.toLowerCase().includes(lowerQuery);

      case 'all':
        return (
          event.title.toLowerCase().includes(lowerQuery) ||
          event.description.toLowerCase().includes(lowerQuery) ||
          event.location.toLowerCase().includes(lowerQuery) ||
          event.organizer.name.toLowerCase().includes(lowerQuery) ||
          event.categories.some((cat) =>
            cat.toLowerCase().includes(lowerQuery)
          ) ||
          event.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
        );

      case 'semantic':
        // Mock semantic search - in production, this would use embeddings/LLM
        const searchTerms = lowerQuery.split(' ');
        const relevanceScore = searchTerms.reduce((score, term) => {
          if (event.title.toLowerCase().includes(term)) score += 3;
          if (event.description.toLowerCase().includes(term)) score += 2;
          if (event.categories.some((cat) => cat.toLowerCase().includes(term)))
            score += 2;
          if (event.tags.some((tag) => tag.toLowerCase().includes(term)))
            score += 1;
          if (event.location.toLowerCase().includes(term)) score += 1;
          return score;
        }, 0);
        return relevanceScore > 0;

      default:
        return true;
    }
  });
};

export const colorGenerator = (seed: string): string => {
  const colors = [
    '#FF6B6B',
    '#8B7FFF',
    '#FF6BA8',
    '#FFA07A',
    '#FFD93D',
    '#6BCF7F',
    '#4ECDC4',
    '#FF8C94',
    '#95E1D3',
    '#C7A4FF',
    '#5B9BD5',
    '#A8E6CF',
  ];

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export const getEventsByDay = (
  events: Event[],
  date: Date
): Event[] => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return events.filter((event) => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    // Include events that start or end on this day, or span across it
    return (
      (eventStart >= startOfDay && eventStart <= endOfDay) ||
      (eventEnd >= startOfDay && eventEnd <= endOfDay) ||
      (eventStart < startOfDay && eventEnd > endOfDay)
    );
  });
};

export const getUpcomingEvents = (
  events: Event[],
  limit?: number
): Event[] => {
  const now = new Date();
  const upcoming = events
    .filter((event) => new Date(event.startTime) > now)
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

  return limit ? upcoming.slice(0, limit) : upcoming;
};

export const getEventDuration = (event: Event): number => {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  return (end.getTime() - start.getTime()) / (1000 * 60); // Duration in minutes
};

export const isEventFull = (event: Event): boolean => {
  if (!event.capacity) return false;
  const totalRSVPs = event.rsvpCounts.going + event.rsvpCounts.maybe;
  return totalRSVPs >= event.capacity;
};

export const getAvailableSpots = (event: Event): number | null => {
  if (!event.capacity) return null;
  const totalRSVPs = event.rsvpCounts.going + event.rsvpCounts.maybe;
  return Math.max(0, event.capacity - totalRSVPs);
};

export const groupEventsByCategory = (
  events: Event[]
): Record<EventCategory, Event[]> => {
  const grouped: Partial<Record<EventCategory, Event[]>> = {};

  events.forEach((event) => {
    event.categories.forEach((category) => {
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category]!.push(event);
    });
  });

  return grouped as Record<EventCategory, Event[]>;
};

export const getRandomEvents = (
  events: Event[],
  count: number
): Event[] => {
  const shuffled = [...events].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

