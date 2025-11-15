export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const formatFullDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};

export const getWeekDays = (startDate: Date, numDays: number): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < numDays; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }
  return days;
};

export const getStartOfWeek = (date: Date): Date => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day;
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const getStartOfDay = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const getEndOfDay = (date: Date): Date => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const isEventInRange = (
  eventStart: string,
  eventEnd: string,
  rangeStart: Date,
  rangeEnd: Date
): boolean => {
  const eventStartDate = new Date(eventStart);
  const eventEndDate = new Date(eventEnd);
  return eventStartDate < rangeEnd && eventEndDate > rangeStart;
};

export const calculateEventPosition = (
  eventStart: string,
  eventEnd: string,
  dayStart: Date
): { top: number; height: number } => {
  const startDate = new Date(eventStart);
  const endDate = new Date(eventEnd);
  
  // Calculate hours from start of day (midnight = 0)
  const dayStartHour = 0;
  const startHour = startDate.getHours() + startDate.getMinutes() / 60;
  const endHour = endDate.getHours() + endDate.getMinutes() / 60;
  
  // Each hour is 60px
  const pixelsPerHour = 60;
  const top = (startHour - dayStartHour) * pixelsPerHour;
  const height = (endHour - startHour) * pixelsPerHour;
  
  return { top: Math.max(0, top), height: Math.max(30, height) };
};

/**
 * Calculate event position with column layout support
 * Returns position including left offset and width for column-based layout
 */
export const calculateEventPositionWithColumns = (
  eventStart: string,
  eventEnd: string,
  dayStart: Date,
  column: number,
  totalColumns: number,
  columnWidth: number = 150
): { top: number; height: number; left: number; width: number } => {
  const { top, height } = calculateEventPosition(eventStart, eventEnd, dayStart);
  
  // Calculate width and left position based on column layout
  const width = (columnWidth / totalColumns) - 8; // Subtract padding
  const left = (column * (columnWidth / totalColumns)) + 4; // Add left padding
  
  return { top, height, left, width };
};

export const getTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    slots.push(`${displayHour}:00 ${period}`);
  }
  return slots;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const subtractDays = (date: Date, days: number): Date => {
  return addDays(date, -days);
};

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

export const isPast = (isoString: string): boolean => {
  return new Date(isoString) < new Date();
};

export const getDayName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export const getMonthYear = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

