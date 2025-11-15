import { useState, useCallback, useMemo } from 'react';
import { Event, EventCategory } from '@/types/event';
import { FilterState, SearchMode } from '@/types/settings';
import { filterEvents, searchEvents, sortEvents } from '@/utils/eventHelpers';

const initialFilterState: FilterState = {
  categories: [],
  eventTypes: {
    clubEvents: true,
    socialEvents: true,
  },
  searchQuery: '',
  searchMode: 'semantic',
};

export const useEventFilters = (events: Event[]) => {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);

  const toggleCategory = useCallback((category: EventCategory) => {
    setFilters((prev) => {
      const categories = prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories };
    });
  }, []);

  const setCategories = useCallback((categories: EventCategory[]) => {
    setFilters((prev) => ({ ...prev, categories }));
  }, []);

  const toggleEventType = useCallback((type: 'clubEvents' | 'socialEvents') => {
    setFilters((prev) => ({
      ...prev,
      eventTypes: {
        ...prev.eventTypes,
        [type]: !prev.eventTypes[type],
      },
    }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const setSearchMode = useCallback((mode: SearchMode) => {
    setFilters((prev) => ({ ...prev, searchMode: mode }));
  }, []);

  const setDateRange = useCallback((start: string, end: string) => {
    setFilters((prev) => ({ ...prev, dateRange: { start, end } }));
  }, []);

  const clearDateRange = useCallback(() => {
    setFilters((prev) => {
      const { dateRange, ...rest } = prev;
      return rest as FilterState;
    });
  }, []);

  const setLocation = useCallback((location: string) => {
    setFilters((prev) => ({ ...prev, location }));
  }, []);

  const setTimeOfDay = useCallback(
    (timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | undefined) => {
      setFilters((prev) => ({ ...prev, timeOfDay }));
    },
    []
  );

  const setHasAvailability = useCallback((hasAvailability: boolean) => {
    setFilters((prev) => ({ ...prev, hasAvailability }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilterState);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      ...initialFilterState,
      searchQuery: filters.searchQuery, // Keep search query
      searchMode: filters.searchMode,
    });
  }, [filters.searchQuery, filters.searchMode]);

  const filteredEvents = useMemo(() => {
    let result = events;

    // Apply search first
    if (filters.searchQuery.trim()) {
      result = searchEvents(result, filters.searchQuery, filters.searchMode);
    }

    // Apply other filters
    result = filterEvents(result, filters);

    // Sort by date
    result = sortEvents(result, 'date');

    return result;
  }, [events, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (!filters.eventTypes.clubEvents || !filters.eventTypes.socialEvents) count++;
    if (filters.dateRange) count++;
    if (filters.location) count++;
    if (filters.timeOfDay) count++;
    if (filters.hasAvailability) count++;
    return count;
  }, [filters]);

  return {
    filters,
    filteredEvents,
    activeFilterCount,
    toggleCategory,
    setCategories,
    toggleEventType,
    setSearchQuery,
    setSearchMode,
    setDateRange,
    clearDateRange,
    setLocation,
    setTimeOfDay,
    setHasAvailability,
    clearFilters,
    clearAllFilters,
  };
};

