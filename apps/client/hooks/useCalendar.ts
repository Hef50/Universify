import { useState, useCallback, useMemo } from 'react';
import { getWeekDays, getStartOfWeek, addDays, subtractDays, isToday } from '@/utils/dateHelpers';

export interface CalendarState {
  currentDate: Date;
  viewDays: number;
  displayDays: Date[];
  selectedDate: Date | null;
}

export interface CalendarActions {
  setViewDays: (days: number) => void;
  goToToday: () => void;
  goToDate: (date: Date) => void;
  nextPeriod: () => void;
  previousPeriod: () => void;
  selectDate: (date: Date) => void;
  clearSelection: () => void;
}

export const useCalendar = (initialViewDays: number = 7) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewDays, setViewDays] = useState<number>(initialViewDays);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const displayDays = useMemo(() => {
    const startDate = getStartOfWeek(currentDate);
    return getWeekDays(startDate, viewDays);
  }, [currentDate, viewDays]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const nextPeriod = useCallback(() => {
    setCurrentDate((prev) => addDays(prev, viewDays));
  }, [viewDays]);

  const previousPeriod = useCallback(() => {
    setCurrentDate((prev) => subtractDays(prev, viewDays));
  }, [viewDays]);

  const selectDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDate(null);
  }, []);

  const handleSetViewDays = useCallback((days: number) => {
    if (days >= 1 && days <= 15) {
      setViewDays(days);
    }
  }, []);

  const state: CalendarState = {
    currentDate,
    viewDays,
    displayDays,
    selectedDate,
  };

  const actions: CalendarActions = {
    setViewDays: handleSetViewDays,
    goToToday,
    goToDate,
    nextPeriod,
    previousPeriod,
    selectDate,
    clearSelection,
  };

  return { ...state, ...actions };
};

