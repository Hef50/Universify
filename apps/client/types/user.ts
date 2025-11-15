import { EventCategory, RSVPStatus } from './event';

export interface UserPreferences {
  categoryInterests: EventCategory[];
  eventTypePreferences: {
    clubEvents: boolean;
    socialEvents: boolean;
  };
  defaultRSVPVisibility: 'public' | 'private';
  notificationPreferences: {
    email: boolean;
    push: boolean;
    eventReminders: boolean;
    newEventsInCategories: boolean;
  };
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  defaultHomePage: 'calendar' | 'recommendations';
  calendarViewDays: number; // 1-15
  colorScheme: string; // Color palette identifier
  fontSize: 'small' | 'medium' | 'large';
  accessibility: {
    highContrast: boolean;
    reduceMotion: boolean;
  };
}

export interface SavedEvent {
  eventId: string;
  rsvpStatus: RSVPStatus;
  savedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  university: string;
  profilePicture?: string;
  preferences: UserPreferences;
  settings: UserSettings;
  savedEvents: SavedEvent[];
  createdEvents: string[]; // Event IDs
  createdAt: string;
  lastLogin: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignupData extends AuthCredentials {
  name: string;
  university: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

export interface PasswordStrength {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

