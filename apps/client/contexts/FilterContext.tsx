import React, { createContext, useContext, ReactNode } from 'react';
import { Event, EventCategory } from '@/types/event';
import { DateRange, SearchMode } from '@/types/settings';
import { useEventFilters } from '@/hooks/useEventFilters';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

interface FilterContextType {
  filteredEvents: Event[];
  activeFilterCount: number;
  searchQuery: string;
  searchMode: SearchMode;
  selectedCategories: EventCategory[];
  clubEvents: boolean;
  socialEvents: boolean;
  dateRange?: DateRange;
  location?: string;
  timeOfDay?: TimeOfDay;
  hasAvailability?: boolean;
  setSearchQuery: (query: string) => void;
  setSearchMode: (mode: SearchMode) => void;
  toggleCategory: (category: EventCategory) => void;
  setCategories: (categories: EventCategory[]) => void;
  toggleEventType: (type: 'clubEvents' | 'socialEvents') => void;
  setDateRange: (start: string, end: string) => void;
  clearDateRange: () => void;
  setLocation: (location: string) => void;
  setTimeOfDay: (timeOfDay: TimeOfDay | undefined) => void;
  setHasAvailability: (hasAvailability: boolean) => void;
  clearFilters: () => void;
  clearAllFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

interface FilterProviderProps {
  children: ReactNode;
  events: Event[];
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ children, events }) => {
  const {
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
  } = useEventFilters(events);

  const value: FilterContextType = {
    filteredEvents,
    activeFilterCount,
    searchQuery: filters.searchQuery,
    searchMode: filters.searchMode,
    selectedCategories: filters.categories,
    clubEvents: filters.eventTypes.clubEvents,
    socialEvents: filters.eventTypes.socialEvents,
    dateRange: filters.dateRange,
    location: filters.location,
    timeOfDay: filters.timeOfDay,
    hasAvailability: filters.hasAvailability,
    setSearchQuery,
    setSearchMode,
    toggleCategory,
    setCategories,
    toggleEventType,
    setDateRange,
    clearDateRange,
    setLocation,
    setTimeOfDay,
    setHasAvailability,
    clearFilters,
    clearAllFilters,
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilters = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};
