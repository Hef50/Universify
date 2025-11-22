import { EventCategory } from './event';

export type SearchMode = 'names' | 'all' | 'semantic';

export interface DateRange {
  start: string;
  end: string;
}

export interface FilterState {
  categories: EventCategory[];
  dateRange?: DateRange;
  eventTypes: {
    clubEvents: boolean;
    socialEvents: boolean;
  };
  searchQuery: string;
  searchMode: SearchMode;
  location?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  hasAvailability?: boolean;
}

export interface CategoryDefinition {
  id: EventCategory;
  name: string;
  color: string;
  icon: string;
  description: string;
}

export interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  defaultHomePage: 'index' | 'calendar' | 'find' | 'explore';
  calendarViewDays: number; // 1, 3, 7, or custom
  colorScheme: string;
  fontSize: 'small' | 'medium' | 'large';
  accessibility: {
    highContrast: boolean;
    reduceMotion: boolean;
  };
}

export interface AppSettings {
  version: string;
  apiEndpoint?: string;
  features: {
    googleCalendarSync: boolean;
    slackIntegration: boolean;
    discordIntegration: boolean;
    instagramScraping: boolean;
  };
}
